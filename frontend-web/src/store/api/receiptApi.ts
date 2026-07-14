import { baseApi } from "./baseApi";
import type {
    CreateImageReceiptRequest,
    CreateManualReceiptRequest,
    CreateReceiptResponse,
} from "./classes/receipt";

export const receiptApi = baseApi.injectEndpoints({
    endpoints: (build) => ({
        createManualReceipt: build.mutation<CreateReceiptResponse, CreateManualReceiptRequest>({
            query: (body) => ({
                url: "/users/receipts",
                method: "POST",
                body,
            }),
            invalidatesTags: ["Summary", "Categories", "Receipts"],
        }),
        createImageReceipt: build.mutation<CreateReceiptResponse, CreateImageReceiptRequest>({
            query: ({ receiptImage, total, storeName, dateBought, category_name }) => {
                const body = new FormData();
                body.append("receiptImage", receiptImage);
                if (total != null) {
                    body.append("total", String(total));
                }
                if (storeName != null) {
                    body.append("storeName", storeName);
                }
                if (dateBought != null) {
                    body.append("dateBought", dateBought);
                }
                if (category_name != null) {
                    body.append("category_name", category_name);
                }
                return {
                    url: "/users/receipts/scan",
                    method: "POST",
                    body,
                };
            },
            invalidatesTags: ["Summary", "Categories", "Receipts"],
        }),
    }),
    overrideExisting: false,
});

export const { useCreateManualReceiptMutation, useCreateImageReceiptMutation } = receiptApi;
