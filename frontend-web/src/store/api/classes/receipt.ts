export interface ReceiptItemWrite {
    name: string;
    price: number;
    category_name?: string | null;
}

export interface CreateReceiptRequest {
    total: number;
    storeName: string;
    dateBought?: string | null;
    category_name?: string | null;
    image?: File | null;
    items?: ReceiptItemWrite[];
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

export interface ReceiptItem {
    id: number;
    name: string;
    price: string;
    category_name: string | null;
}

export interface ReceiptDetail {
    receipt_id: number;
    total_spend: string;
    image_url: string | null;
    date_bought: string;
    store_name: string;
    category_name: string | null;
    image_processed: boolean;
    last_updated: string;
    items: ReceiptItem[];
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
