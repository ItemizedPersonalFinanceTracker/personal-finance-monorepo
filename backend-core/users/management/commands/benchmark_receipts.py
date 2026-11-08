import json
import time
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path

from django.conf import settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management.base import BaseCommand, CommandError

from users.models import Category, Customer
from users.services.gemini_provider import GeminiProvider
from users.services.receipt_formatter import format_receipt

COMMAND_DIR = Path(__file__).resolve().parent
RECEIPTS_LIST = COMMAND_DIR / "benchmark_data" / "test_receipts.txt"
SETUPS = ("raw", "formatted")
MODELS = ( "gemini-3.5-flash-lite", "gemini-3.1-flash-lite")
TOTAL_TOLERANCE = 0.02
PAUSE_SECONDS = 30
# "gemini-3.8-flash",

def _normalize(value):
    return " ".join(str(value or "").casefold().split())


def _load_receipt_names(limit):
    if not RECEIPTS_LIST.is_file():
        raise CommandError(f"Missing receipt list: {RECEIPTS_LIST}")
    names = []
    for line in RECEIPTS_LIST.read_text(encoding="utf-8").splitlines():
        name = line.strip()
        if name and not name.startswith("#"):
            names.append(name)
    if limit is not None:
        if limit < 1:
            raise CommandError("--limit must be at least 1.")
        names = names[:limit]
    if not names:
        raise CommandError(f"No receipts listed in {RECEIPTS_LIST}")
    return names


def _image_path(name):
    path = Path(name)
    if path.is_file():
        return path
    return Path(settings.MEDIA_ROOT) / "receipts" / name


def _upload_from_path(path):
    content_type = "image/png" if path.suffix.lower() == ".png" else "image/jpeg"
    return SimpleUploadedFile(path.name, path.read_bytes(), content_type=content_type)


def _upload_formatted(path):
    image = format_receipt(_upload_from_path(path))
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    return SimpleUploadedFile(f"{path.stem}.png", buffer.getvalue(), content_type="image/png")


def _categories(options):
    if options["categories"]:
        names = [part.strip() for part in options["categories"].split(",") if part.strip()]
    elif options["user"]:
        try:
            user = Customer.objects.get(email=options["user"])
        except Customer.DoesNotExist as exc:
            raise CommandError(f"No customer with email {options['user']}") from exc
        names = list(
            Category.objects.filter(customer=user).order_by("category_name").values_list("category_name", flat=True)
        )
    else:
        names = []
    if not any(name.casefold() == "other" for name in names):
        names.append("Other")
    return names


def _load_expected(path):
    if not path:
        return None
    expected_path = Path(path)
    if not expected_path.is_file():
        raise CommandError(f"Expected file not found: {expected_path}")
    try:
        data = json.loads(expected_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise CommandError(f"Expected file is not valid JSON: {exc}") from exc
    if not isinstance(data, dict):
        raise CommandError("Expected file must be a JSON object keyed by receipt filename.")
    return data


def _item_match(expected_item, actual_item):
    same_name = _normalize(expected_item.get("name")) == _normalize(actual_item.get("name"))
    same_price = abs(float(expected_item.get("price", 0)) - float(actual_item.get("price", 0))) <= TOTAL_TOLERANCE
    return same_name and same_price


def _score_expected(result, expected):
    checks = {
        "title_match": _normalize(result.get("title")) == _normalize(expected.get("title")),
        "date_match": str(result.get("date")) == str(expected.get("date")),
        "total_match": abs(float(result.get("total", 0)) - float(expected.get("total", 0))) <= TOTAL_TOLERANCE,
        "category_match": _normalize(result.get("category")) == _normalize(expected.get("category")),
    }
    expected_items = list(expected.get("items") or [])
    actual_items = list(result.get("items") or [])
    unmatched = list(actual_items)
    matched = 0
    for expected_item in expected_items:
        for index, actual_item in enumerate(unmatched):
            if _item_match(expected_item, actual_item):
                matched += 1
                unmatched.pop(index)
                break
    precision = matched / len(actual_items) if actual_items else float(not expected_items)
    recall = matched / len(expected_items) if expected_items else float(not actual_items)
    f1 = (2 * precision * recall / (precision + recall)) if precision + recall else 0.0
    checks["field_accuracy"] = round(sum(checks.values()) / 4, 3)
    checks["item_precision"] = round(precision, 3)
    checks["item_recall"] = round(recall, 3)
    checks["item_f1"] = round(f1, 3)
    return checks


def _mean(values):
    if not values:
        return None
    return round(sum(values) / len(values), 3)


def _summarize(receipts, has_expected):
    totals = [receipt["seconds"]["total"] for receipt in receipts]
    extract_times = [
        receipt["seconds"]["extract"]
        for receipt in receipts
        if receipt["seconds"]["extract"] is not None
    ]
    format_times = [receipt["seconds"]["format"] for receipt in receipts]
    ok = [receipt for receipt in receipts if receipt["error"] is None]
    summary = {
        "count": len(receipts),
        "ok": len(ok),
        "failed": len(receipts) - len(ok),
        "total_seconds": round(sum(totals), 3),
        "mean_seconds": _mean(totals),
        "mean_extract_seconds": _mean(extract_times),
        "mean_format_seconds": _mean(format_times),
    }
    if has_expected:
        scored = [receipt["accuracy"] for receipt in ok if receipt.get("accuracy")]
        summary["mean_field_accuracy"] = _mean([score["field_accuracy"] for score in scored])
        summary["mean_item_f1"] = _mean([score["item_f1"] for score in scored])
    return summary


class Command(BaseCommand):
    help = "Time receipt extraction setups and write a JSON report of speed and accuracy."

    def add_arguments(self, parser):
        parser.add_argument(
            "--setup",
            action="append",
            choices=SETUPS,
            dest="setups",
            help="raw sends the original image. formatted runs receipt_formatter first. Repeat to compare. Defaults to both.",
        )
        parser.add_argument(
            "--model",
            action="append",
            dest="models",
            help="Gemini model name. Repeat to compare a subset. Defaults to gemini-3.8-flash, gemini-3.5-flash-lite, and gemini-2.5-flash-lite.",
        )
        parser.add_argument("--user", help="Customer email. That customer's categories are sent to the model.")
        parser.add_argument("--categories", help="Comma-separated categories. Used instead of --user when set.")
        parser.add_argument(
            "--expected",
            help="JSON object keyed by filename with the correct title, date, total, category, and items.",
        )
        parser.add_argument(
            "--output",
            help="JSON report path. Defaults to receipt_benchmark_<timestamp>.json in the working directory.",
        )
        parser.add_argument("--limit", type=int, help="Process only the first N receipts in the list.")

    def handle(self, *args, **options):
        setups = options["setups"] or list(SETUPS)
        models = options["models"] or list(MODELS)
        categories = _categories(options)
        expected = _load_expected(options["expected"])
        names = _load_receipt_names(options["limit"])
        providers = {}
        runs = []

        for model_index, model_name in enumerate(models):
            if model_name not in providers:
                try:
                    providers[model_name] = GeminiProvider(model=model_name)
                except ValueError as exc:
                    raise CommandError(str(exc)) from exc
            provider = providers[model_name]
            for setup_index, setup in enumerate(setups):
                receipts = []
                for name_index, name in enumerate(names):
                    receipts.append(self._process_receipt(provider, setup, name, categories, expected))
                    is_last = (
                        name_index == len(names) - 1
                        and setup_index == len(setups) - 1
                        and model_index == len(models) - 1
                    )
                    if not is_last:
                        self.stdout.write(f"Waiting {PAUSE_SECONDS}s before the next receipt.")
                        time.sleep(PAUSE_SECONDS)
                runs.append(
                    {
                        "setup": setup,
                        "model": provider.model,
                        "summary": _summarize(receipts, expected is not None),
                        "receipts": receipts,
                    }
                )

        created_at = datetime.now(timezone.utc)
        report = {
            "created_at": created_at.isoformat(),
            "receipts_file": str(RECEIPTS_LIST),
            "image_dir": str(Path(settings.MEDIA_ROOT) / "receipts"),
            "categories": categories,
            "runs": runs,
        }
        output = Path(options["output"] or f"receipt_benchmark_{created_at.strftime('%Y%m%dT%H%M%SZ')}.json")
        output.write_text(json.dumps(report, indent=2), encoding="utf-8")
        self.stdout.write(self.style.SUCCESS(f"Wrote {output.resolve()}"))
        for run in runs:
            summary = run["summary"]
            self.stdout.write(
                f"{run['setup']} / {run['model']}: "
                f"{summary['ok']}/{summary['count']} ok, "
                f"mean {summary['mean_seconds']}s"
            )

    def _process_receipt(self, provider, setup, name, categories, expected):
        started = time.perf_counter()
        format_seconds = 0.0
        extract_seconds = None
        try:
            path = _image_path(name)
            if not path.is_file():
                raise FileNotFoundError(path)
            if setup == "formatted":
                format_started = time.perf_counter()
                upload = _upload_formatted(path)
                format_seconds = time.perf_counter() - format_started
            else:
                upload = _upload_from_path(path)
            extract_started = time.perf_counter()
            result = provider.receipt_process(upload, categories).model_dump(mode="json")
            extract_seconds = time.perf_counter() - extract_started
            entry = {
                "file": name,
                "seconds": {
                    "format": round(format_seconds, 3),
                    "extract": round(extract_seconds, 3),
                    "total": round(time.perf_counter() - started, 3),
                },
                "result": result,
                "error": None,
            }
            if expected is not None:
                entry["accuracy"] = _score_expected(result, expected[name]) if name in expected else None
        except Exception as exc:
            entry = {
                "file": name,
                "seconds": {
                    "format": round(format_seconds, 3),
                    "extract": round(extract_seconds, 3) if extract_seconds is not None else None,
                    "total": round(time.perf_counter() - started, 3),
                },
                "result": None,
                "error": f"{type(exc).__name__}: {exc}",
            }
            if expected is not None:
                entry["accuracy"] = None
        status = entry["error"] or f"{entry['seconds']['total']}s"
        self.stdout.write(f"{setup} / {provider.model} / {name}: {status}")
        return entry
