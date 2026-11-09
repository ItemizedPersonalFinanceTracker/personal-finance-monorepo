import type { ReceiptItemWrite } from "../../store/api/classes/receipt";
import { OTHER_CATEGORY } from "../../utility_functions/util";

export type BillItemDraft = {
    id: string;
    name: string;
    price: number | string;
    category: string | null;
};

let nextItemId = 0;

export function createBillItem(partial?: Partial<Omit<BillItemDraft, "id">>): BillItemDraft {
    nextItemId += 1;
    return {
        id: `bill-item-${nextItemId}`,
        name: partial?.name ?? "",
        price: partial?.price ?? "",
        category: partial?.category ?? OTHER_CATEGORY,
    };
}

export function billItemHasContent(item: BillItemDraft): boolean {
    return item.name.trim() !== "" || item.price !== "";
}

export function receiptItemsFromDrafts(
    items: BillItemDraft[],
): { items: ReceiptItemWrite[] } | { error: string } {
    const payload: ReceiptItemWrite[] = [];
    for (const item of items) {
        if (!billItemHasContent(item)) {
            continue;
        }
        const name = item.name.trim();
        const price = typeof item.price === "number" ? item.price : Number(item.price);
        if (!name || !Number.isFinite(price)) {
            return { error: "Each item needs a name and a price." };
        }
        let categoryName = item.category?.trim() ?? null;
        if (!categoryName || categoryName === OTHER_CATEGORY) {
            categoryName = null;
        }
        payload.push({ name, price, category_name: categoryName });
    }
    return { items: payload };
}
