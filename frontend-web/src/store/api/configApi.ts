import { baseApi } from "./baseApi";
import type { UserConfig } from "./classes/config";

export const configApi = baseApi.injectEndpoints({
    endpoints: (build) => ({
        getUserConfigs: build.query<UserConfig[], void>({
            query: () => ({ url: "/users/configs", method: "GET" }),
            providesTags: ["UserConfigs"],
        }),
        updateUserConfig: build.mutation<UserConfig, UserConfig>({
            query: (body) => ({ url: "/users/configs", method: "PUT", body }),
            invalidatesTags: ["UserConfigs"],
            async onQueryStarted(arg, { dispatch, queryFulfilled }) {
                const patch = dispatch(
                    configApi.util.updateQueryData("getUserConfigs", undefined, (draft) => {
                        const row = draft.find((item) => item.config === arg.config);
                        if (row) {
                            row.value = arg.value;
                        }
                    }),
                );
                try {
                    await queryFulfilled;
                } catch {
                    patch.undo();
                }
            },
        }),
    }),
    overrideExisting: false,
});

export const { useGetUserConfigsQuery, useUpdateUserConfigMutation } = configApi;
