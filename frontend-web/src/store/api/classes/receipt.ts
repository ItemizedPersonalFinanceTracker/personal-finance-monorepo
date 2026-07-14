export interface CreateManualReceiptRequest {
    total: number;
    storeName: string;
    dateBought?: string | null;
    category_name?: string | null;
}

export interface CreateImageReceiptRequest {
    receiptImage: File;
    total?: number | null;
    storeName?: string | null;
    dateBought?: string | null;
    category_name?: string | null;
}

export interface CreateReceiptResponse {
    receipt_id: number;
}
