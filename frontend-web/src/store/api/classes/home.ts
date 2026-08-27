
export interface summaryPayload {
    total_spend : number 
    tracker_type : string
    starting_date : string
    last_updated : string
    classification_data : Record<string, number>
}

export interface accountSummaryResponse {
    week: summaryPayload;
    month: summaryPayload;
    year: summaryPayload;
}

export interface Category {
    category_id: number;
    category_name: string;
}

export interface SpendingTracker {
    id: number;
    total_spend: number;
    tracker_type: string;
    starting_date: string;
    last_updated: string;
    classification_data: Record<string, number>;
}