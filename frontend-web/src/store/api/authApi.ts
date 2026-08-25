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
            async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
                try {
                    await queryFulfilled;
                    dispatch(baseApi.util.resetApiState());
                } catch {
                    // Login failed; keep existing cache.
                }
            },
        }),
        logout: build.mutation<void, void>({
            query: () => ({
                url: "/users/logout",
                method: "POST",
            }),
            // wipe state
            async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
                try {
                    await queryFulfilled;
                } catch {
                    // Local sign-out still applies if the server call fails.
                }
                dispatch(baseApi.util.resetApiState());
            },
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
