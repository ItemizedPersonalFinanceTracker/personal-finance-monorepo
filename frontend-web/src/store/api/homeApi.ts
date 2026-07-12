import { baseApi } from "./baseApi";
import type { accountSummaryResponse, Category } from "./classes/home";

export const homeApi = baseApi.injectEndpoints({
    endpoints: (build) => ({
        getSummary: build.query<accountSummaryResponse, void>({
            query: () => ({ url: "/users/account_summary", method: "GET" }),
            providesTags: ["Summary"],
        }),
        getCategories: build.query<Category[], void>({
            query: () => ({ url: "/users/categories", method: "GET" }),
            providesTags: ["Categories"],
        }),
    }),
    overrideExisting: false,
});

export const { useGetSummaryQuery, useGetCategoriesQuery } = homeApi;
