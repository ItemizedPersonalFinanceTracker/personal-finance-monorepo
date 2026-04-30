import { baseApi } from "./baseApi";
import type { accountSummaryResponse } from "./classes/home";

export const homeApi = baseApi.injectEndpoints({
    endpoints: (build) => ({
        getSummary: build.query<accountSummaryResponse, void>({
            query: () => ({ url: "/users/account_summary", method: "GET" }),
            providesTags: ["Summary"],
        }),
    }),
    overrideExisting: false,
});

export const { useGetSummaryQuery } = homeApi;
