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
