import { baseApi } from "./baseApi";
import type {
    loginRequest,
    loginResponse,
    registerRequest,
    registerResponse,
} from "./classes/auth_objects";

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
        register: build.mutation<registerResponse, registerRequest>({
            query: (body) => ({
                url: "/users/register",
                method: "POST",
                body,
            }),
        }),
    }),
    overrideExisting: false,
});

export const { useLoginMutation, useLogoutMutation, useRegisterMutation } = authApi;
