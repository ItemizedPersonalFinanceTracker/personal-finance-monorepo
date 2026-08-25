import { Button, Drawer, Stack } from "@mantine/core";
import { useNavigate } from "react-router-dom";
import { useLogoutMutation } from "../store/api/authApi";
import { useAppDispatch } from "../store/hooks";
import { signedOut } from "../store/slices/authSlice";

export interface NavDrawerProps {
    opened: boolean;
    onClose: () => void;
}

export default function NavDrawer({ opened, onClose }: NavDrawerProps) {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const [logout] = useLogoutMutation();

    const goHome = () => {
        navigate("/home");
        onClose();
    };

    const goAddBill = () => {
        navigate("/home/add_bill");
        onClose();
    };

    const goReceipts = () => {
        navigate("/home/receipts");
        onClose();
    };

    const handleSignOut = async () => {
        onClose();
        try {
            await logout().unwrap();
        } catch {
            // Local sign-out still applies if the server call fails.
        }
        dispatch(signedOut());
        navigate("/login");
    };

    return (
        <Drawer
            opened={opened}
            onClose={onClose}
            title="Menu"
            position="left"
            styles={{
                content: { display: "flex", flexDirection: "column", height: "100%" },
                body: { flex: 1, display: "flex", flexDirection: "column", minHeight: 0 },
            }}
        >
            <Stack gap="sm" style={{ flex: 1 }}>
                <Button fullWidth variant="default" onClick={goHome}>
                    Home
                </Button>
                <Button fullWidth variant="default" onClick={goAddBill}>
                    Add a bill
                </Button>
                <Button fullWidth variant="default" onClick={goReceipts}>
                    Receipts
                </Button>
                <Button
                    fullWidth
                    color="red"
                    variant="light"
                    onClick={handleSignOut}
                    mt="auto"
                >
                    Sign out
                </Button>
            </Stack>
        </Drawer>
    );
}
