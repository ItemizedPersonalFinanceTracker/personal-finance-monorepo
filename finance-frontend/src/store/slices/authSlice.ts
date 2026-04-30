import { createSlice } from "@reduxjs/toolkit";
import { authApi } from "../api/authApi";
import { clearAllTokens, getRefreshToken, getToken, setRefreshToken, setToken } from "../api/tokenStorage";


export const AuthenticationStatusEnum = {
    Authenticated: "Authenticated",
    Unauthenticated: "Unauthenticated",
    Pending: "Pending",
} as const;
export type AuthenticationStatusEnum =
    (typeof AuthenticationStatusEnum)[keyof typeof AuthenticationStatusEnum];

export interface AuthState {
    auth_token: string | null;
    refresh_token: string | null;
    is_authenticated: AuthenticationStatusEnum;
}

const initialState: AuthState = {
    auth_token: getToken(),
    refresh_token: getRefreshToken(),
    is_authenticated: AuthenticationStatusEnum.Pending,
};

const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        signedOut(state) {
            state.auth_token = null;
            state.refresh_token = null;
            state.is_authenticated = AuthenticationStatusEnum.Unauthenticated;
            clearAllTokens();
        },
    },
    extraReducers: (builder) => {
        builder.addMatcher(
            authApi.endpoints.login.matchFulfilled,
            (state, { payload }) => {
                state.auth_token = payload.access;
                state.refresh_token = payload.refresh;
                setToken(payload.access);
                setRefreshToken(payload.refresh);
                state.is_authenticated = AuthenticationStatusEnum.Authenticated;
            }
        );
    },
});

export const { signedOut } = authSlice.actions;

export const selectAuthToken = (state: { auth: AuthState }) => state.auth.auth_token;
export const selectRefreshToken = (state: { auth: AuthState }) => state.auth.refresh_token;
export const selectAuthenticationStatus = (state: { auth: AuthState }) => state.auth.is_authenticated === AuthenticationStatusEnum.Authenticated;

export default authSlice.reducer;
