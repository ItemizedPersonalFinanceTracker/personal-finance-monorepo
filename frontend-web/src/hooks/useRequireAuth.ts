import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppSelector } from "../store/hooks";
import { selectAuthenticationStatus } from "../store/slices/authSlice";

const PUBLIC_PATH_PREFIXES = ["/login", "/register"] as const;

function isPublicPath(pathname: string): boolean {
    return PUBLIC_PATH_PREFIXES.some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );
}

/** Redirects to `/login` when there is no auth token (except on public routes). Returns whether the user is authenticated. */
export function useRequireAuth() {
    const authenticationStatus = useAppSelector(selectAuthenticationStatus);
    const navigate = useNavigate();
    const { pathname } = useLocation();

    useEffect(() => {
        console.log("authenticationStatus", authenticationStatus);
        if (!authenticationStatus && !isPublicPath(pathname)) {
            navigate("/login");
        }
    }, [authenticationStatus, navigate, pathname]);

    return authenticationStatus;
}
