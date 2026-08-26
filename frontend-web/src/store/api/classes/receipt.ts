export interface CreateManualReceiptRequest {
    total: number;
    storeName: string;
    dateBought?: string | null;
    category_name?: string | null;
}

export interface UpdateManualReceiptRequest {
    receiptId: number;
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
