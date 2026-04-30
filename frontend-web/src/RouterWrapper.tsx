// import type { ReactNode } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { useRequireAuth } from "./hooks/useRequireAuth";
import Login from "./pages/login/Login";
import Home from "./pages/home/Home";
import type { ReactNode } from "react";


function ProtectedRoutes({ children }: { children: ReactNode }) {
    useRequireAuth();
    return <>{children}</>;
}

export default function RouterWrapper(){
    return <BrowserRouter>
        <ProtectedRoutes>
            <Routes>
                <Route path = "/login" element = {<Login/>} />
                <Route path = "/home" element = {<Home/>} />

            </Routes>
        </ProtectedRoutes>
    </BrowserRouter>
}
