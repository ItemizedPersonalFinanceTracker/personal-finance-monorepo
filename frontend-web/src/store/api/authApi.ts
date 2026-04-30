import { baseApi } from "./baseApi";
import type { loginRequest, loginResponse } from "./classes/auth_objects";

export const authApi = baseApi.injectEndpoints({
    endpoints: (build) => ({
        login: build.mutation<loginResponse, loginRequest>({
            query: (body) => ({
                url: "/users/login",
                method: "POST",
                body,
            }),
            invalidatesTags: ["Auth"],
        }),
        logout: build.mutation<void, void>({
            query: () => ({
                url: "/users/logout",
                method: "POST",
            }),
            invalidatesTags: ["Auth"],
        }),
    }),
    overrideExisting: false,
});

export const { useLoginMutation, useLogoutMutation } = authApi;
