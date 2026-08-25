import type { ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useRequireAuth } from "./hooks/useRequireAuth";
import Login from "./pages/login/Login";
import Home from "./pages/home/Home";
import AppSkeleton from "./pages/AppSkeleton";
import AddBill from "./pages/add_bill/AddBill";
import Receipts from "./pages/receipts/Receipt";

function ProtectedRoutes({ children }: { children: ReactNode }) {
    useRequireAuth();
    return <>{children}</>;
}

export default function RouterWrapper() {
    return (
        <BrowserRouter>
            <ProtectedRoutes>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/home" element={<AppSkeleton />}>
                        <Route index element={<Home />} />
                        <Route path="add_bill" element={<AddBill />} />
                        <Route path="receipts" element={<Receipts />} />
                    </Route>
                    <Route path="/" element={<Navigate to="/home" replace />} />
                </Routes>
            </ProtectedRoutes>
        </BrowserRouter>
    );
}
