export interface CreateReceiptRequest {
    total: number;
    storeName: string;
    dateBought?: string | null;
    category_name?: string | null;
    image?: File | null;
}

export interface UpdateManualReceiptRequest {
    receiptId: number;
    total: number;
    storeName: string;
    dateBought?: string | null;
    category_name?: string | null;
}

export interface CreateReceiptResponse {
    receipt_id: number;
}

export interface CreateReceiptBulkRequest {
    receipts: CreateReceiptRequest[];
}

export interface CreateReceiptBulkResponse {
    receipt_ids: number[];
}

export interface Receipt {
    receipt_id: number;
    total_spend: string;
    store_name: string;
    date_bought: string;
    category_id: number | null;
}

export interface GetReceiptsResponse {
    count: number;
    next: string | null;
    previous: string | null;
    results: Receipt[];
}

export interface ScannedReceiptItem {
    name: string;
    price: number;
    category: string;
}

export interface ScanReceiptResponse {
    title: string;
    date: string;
    total: number;
    category: string;
    items: ScannedReceiptItem[];
}
