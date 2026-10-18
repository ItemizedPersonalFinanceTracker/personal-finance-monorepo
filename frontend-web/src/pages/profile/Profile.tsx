import { useCallback } from "react";
import { Alert, Badge, Checkbox, Group, Loader, Paper, Stack, Table, Text, Title } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import AddCategoryButton from "../add_bill/AddCategoryButton";
import { useGetProfileQuery } from "../../store/api/authApi";
import { userConfigLabel, type UserConfig } from "../../store/api/classes/config";
import { useGetUserConfigsQuery, useUpdateUserConfigMutation } from "../../store/api/configApi";
import { useGetCategoriesQuery } from "../../store/api/homeApi";
import { apiErrorMessage, categoryLabel } from "../../utility_functions/util";

function formatJoinedDate(isoDate: string): string {
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) {
        return isoDate;
    }
    return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
}

export default function Profile() {
    const { data: profile, isLoading: profileLoading, isError: profileError } = useGetProfileQuery();
    const {
        data: categories = [],
        isLoading: categoriesLoading,
        isError: categoriesError,
    } = useGetCategoriesQuery();
    const { data: configs = [], isLoading: configsLoading, isError: configsError } = useGetUserConfigsQuery();
    const [updateUserConfig] = useUpdateUserConfigMutation();

    const toggleConfig = useCallback(async (row: UserConfig, value: boolean) => {
        try {
            await updateUserConfig({ config: row.config, value }).unwrap();
        } catch (err) {
            notifications.show({
                color: "red",
                message: apiErrorMessage(err, "Could not update that setting."),
            });
        }
    }, [updateUserConfig]);

    return (
        <div className="mx-auto w-full max-w-2xl px-4 py-6">
            <Stack gap="lg">
                <Paper withBorder p="md" radius="md">
                    <Title order={3} mb="sm">Profile</Title>
                    {profileLoading ? (
                        <Loader color="blue" size="sm" />
                    ) : profileError || !profile ? (
                        <Alert color="red" title="Could not load profile">
                            Please try again.
                        </Alert>
                    ) : (
                        <Stack gap="xs">
                            <div>
                                <Text size="sm" c="dimmed">Name</Text>
                                <Text>{profile.name}</Text>
                            </div>
                            <div>
                                <Text size="sm" c="dimmed">Joined</Text>
                                <Text>{formatJoinedDate(profile.created_at)}</Text>
                            </div>
                        </Stack>
                    )}
                </Paper>

                <Paper withBorder p="md" radius="md">
                    <Group justify="space-between" mb="sm">
                        <Title order={3}>Categories</Title>
                        <AddCategoryButton
                            categories={categories}
                            label="Add category"
                            disabled={categoriesLoading}
                        />
                    </Group>
                    {categoriesLoading ? (
                        <Loader color="blue" size="sm" />
                    ) : categoriesError ? (
                        <Alert color="red" title="Could not load categories">
                            Please try again.
                        </Alert>
                    ) : categories.length === 0 ? (
                        <Text c="dimmed">No categories yet.</Text>
                    ) : (
                        <Group gap="xs">
                            {categories.map((category) => (
                                <Badge key={category.category_id} variant="light" size="lg" tt="none">
                                    {categoryLabel(category.category_name)}
                                </Badge>
                            ))}
                        </Group>
                    )}
                </Paper>

                <Paper withBorder p="md" radius="md">
                    <Title order={3} mb="sm">Configurations</Title>
                    {configsLoading ? (
                        <Loader color="blue" size="sm" />
                    ) : configsError ? (
                        <Alert color="red" title="Could not load configs">
                            Please try again.
                        </Alert>
                    ) : (
                        <Table>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Setting</Table.Th>
                                    <Table.Th w={80}>On</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {configs.map((row) => {
                                    const label = userConfigLabel[row.config] ?? row.config;
                                    return (
                                        <Table.Tr key={row.config}>
                                            <Table.Td>{label}</Table.Td>
                                            <Table.Td>
                                                <Checkbox
                                                    checked={row.value}
                                                    onChange={(event) => {
                                                        void toggleConfig(row, event.currentTarget.checked);
                                                    }}
                                                    aria-label={label}
                                                />
                                            </Table.Td>
                                        </Table.Tr>
                                    );
                                })}
                            </Table.Tbody>
                        </Table>
                    )}
                </Paper>
            </Stack>
        </div>
    );
}
