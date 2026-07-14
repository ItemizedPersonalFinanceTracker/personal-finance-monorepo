import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query";
import type { refreshTokenResponse } from "./classes/auth_objects";
import { getRefreshToken, getToken } from "./tokenStorage";
import { signedOut, tokensRefreshed } from "../slices/authSlice";

const REFRESH_PATH = "/users/token/refresh";

const rawBaseQuery = fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_BASE_URL,
    credentials: "include",
    timeout: 10000,
    prepareHeaders: (headers) => {
        const token = getToken();
        if (token) {
            headers.set("Authorization", `Bearer ${token}`);
        }
        return headers;
    },
});

/** No Authorization header — refresh uses body only. */
const refreshBaseQuery = fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_BASE_URL,
    credentials: "include",
    timeout: 10000,
});

let Refresh_Promise: Promise<boolean> | null = null;

function isRefreshRequest(args: string | FetchArgs): boolean {
    const url = typeof args === "string" ? args : args.url;
    return url === REFRESH_PATH || url.endsWith(REFRESH_PATH);
}

function enqueueRefresh(api: Parameters<BaseQueryFn>[1]): Promise<boolean> {
    if (!Refresh_Promise) {
        Refresh_Promise = (async (): Promise<boolean> => {
            const refresh = getRefreshToken();
            if (!refresh) {
                return false;
            }
            const refreshed = await refreshBaseQuery(
                {
                    url: REFRESH_PATH,
                    method: "POST",
                    body: { refresh },
                },
                api,
                {},
            );
            if (refreshed.error) {
                return false;
            }
            const data = refreshed.data as refreshTokenResponse;
            api.dispatch(
                tokensRefreshed({ access: data.access, refresh: data.refresh }),
            );
            return true;
        })().finally(() => {
            Refresh_Promise = null;
        });
    }
    return Refresh_Promise;
}

const baseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
    args,
    api,
    extraOptions,
) => {
    let result = await rawBaseQuery(args, api, extraOptions);

    if (result.error?.status === 401 && !isRefreshRequest(args)) {
        const ok = await enqueueRefresh(api);
        if (ok) {
            result = await rawBaseQuery(args, api, extraOptions);
        } else {
            api.dispatch(signedOut());
        }
    }

    return result;
};

export const baseApi = createApi({
    reducerPath: "api",
    baseQuery,
    tagTypes: ["Auth", "Summary", "Categories", "Receipts"],
    endpoints: () => ({}),
});
