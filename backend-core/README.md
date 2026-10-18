Local (from `backend-core/`):

```bash
uv run manage.py runserver 0.0.0.0:8000
```

Deploy Command:
uv run python manage.py migrate --noinput && uv run gunicorn financeproject.wsgi:application --bind 0.0.0.0:$PORT --worker-class gthread --threads 4 --timeout 160
