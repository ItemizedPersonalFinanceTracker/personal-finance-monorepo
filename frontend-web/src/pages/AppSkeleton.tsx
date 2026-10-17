import { Box, Burger, Group, Paper, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Outlet } from "react-router-dom";
import NavDrawer from "../components/NavDrawer";
import { useGetUserConfigsQuery } from "../store/api/configApi";
import { useAppSelector } from "../store/hooks";
import { selectAuthToken } from "../store/slices/authSlice";

export default function AppSkeleton() {
    const [opened, { toggle, close }] = useDisclosure(false);
    const token = useAppSelector(selectAuthToken);
    useGetUserConfigsQuery(undefined, { skip: !token });

    return (
        <div>
            <Paper shadow="xs" p="md" radius={0}>
                <Group justify="space-between" wrap="nowrap" align="center">
                    <Burger opened={opened} onClick={toggle} aria-label="Open navigation" />
                    <Title order={3} size="h4" lineClamp={1} ta="center" style={{ flex: 1, minWidth: 0 }}>
                        Manage your finances
                    </Title>
                    <Box w={40} miw={40} aria-hidden />
                </Group>
            </Paper>
            <NavDrawer opened={opened} onClose={close} />
            <Outlet />
        </div>
    );
}