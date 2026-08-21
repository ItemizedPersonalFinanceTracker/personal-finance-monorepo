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
        createCategory: build.mutation<Category, { category_name: string }>({
            query: (body) => ({ url: "/users/categories", method: "POST", body }),
            invalidatesTags: ["Categories"],
            async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
                try {
                    const { data } = await queryFulfilled;
                    dispatch(
                        homeApi.util.updateQueryData("getCategories", undefined, (draft) => {
                            if (!draft.some((c) => c.category_id === data.category_id)) {
                                draft.push(data);
                                draft.sort((a, b) => a.category_name.localeCompare(b.category_name));
                            }
                        }),
                    );
                } catch {
                    // Create failed; cache stays unchanged.
                }
            },
        }),
    }),
    overrideExisting: false,
});

export const { useGetSummaryQuery, useGetCategoriesQuery, useCreateCategoryMutation } = homeApi;
