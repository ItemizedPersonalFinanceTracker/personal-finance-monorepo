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
        }),
    }),
    overrideExisting: false,
});

export const { useGetUserConfigsQuery, useUpdateUserConfigMutation } = configApi;
