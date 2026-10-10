import { baseApi } from "./baseApi";
import type {
    CreateReceiptRequest,
    CreateReceiptBulkRequest,
    CreateReceiptBulkResponse,
    CreateReceiptResponse,
    GetReceiptsResponse,
    UpdateManualReceiptRequest,
} from "./classes/receipt";

const RECEIPT_PAGE_SIZE = 10;

export const receiptApi = baseApi.injectEndpoints({
    endpoints: (build) => ({
        createManualReceipt: build.mutation<CreateReceiptResponse, CreateReceiptRequest>({
            query: ({ image, total, storeName, dateBought, category_name }) => {
                if (!image) {
                    return {
                        url: "/users/receipts",
                        method: "POST" as const,
                        body: { total, storeName, dateBought, category_name },
                    };
                }
                const body = new FormData();
                body.append("total", String(total));
                body.append("storeName", storeName);
                body.append("image", image);
                if (dateBought != null) {
                    body.append("dateBought", dateBought);
                }
                if (category_name != null) {
                    body.append("category_name", category_name);
                }
                return {
                    url: "/users/receipts",
                    method: "POST" as const,
                    body,
                };
            },
            invalidatesTags: ["Summary", "Receipts"],
        }),
        updateManualReceipt: build.mutation<CreateReceiptResponse, UpdateManualReceiptRequest>({
            query: ({ receiptId, ...body }) => ({
                url: `/users/receipts/${receiptId}`,
                method: "PUT",
                body,
            }),
            invalidatesTags: ["Summary", "Receipts"],
        }),
        deleteReceipt: build.mutation<void, { receiptId: number }>({
            query: ({ receiptId }) => ({
                url: `/users/receipts/${receiptId}`,
                method: "DELETE",
            }),
            invalidatesTags: ["Summary", "Receipts"],
        }),
        getReceipts: build.infiniteQuery<GetReceiptsResponse, void, number>({
            infiniteQueryOptions: {
                initialPageParam: 1,
                getNextPageParam: (lastPage, _allPages, lastPageParam) =>
                    lastPage.next ? lastPageParam + 1 : undefined,
            },
            query: ({ pageParam }) => ({
                url: `/users/receipts?page=${pageParam}&page_size=${RECEIPT_PAGE_SIZE}`,
                method: "GET",
            }),
            providesTags: ["Receipts"],
        }),
        createReceiptBulk: build.mutation<CreateReceiptBulkResponse, CreateReceiptBulkRequest>({
            query: (body) => ({
                url: "/users/receipts/bulk",
                method: "POST",
                body,
            }),
            invalidatesTags: ["Summary", "Receipts"],
        }),
    }),
    overrideExisting: false,
});

export const {
    useCreateManualReceiptMutation,
    useUpdateManualReceiptMutation,
    useGetReceiptsInfiniteQuery,
    useDeleteReceiptMutation,
    useCreateReceiptBulkMutation,
} = receiptApi;
