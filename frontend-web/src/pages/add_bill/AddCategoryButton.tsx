import { useCallback, useState } from "react";
import { ActionIcon, Button, Group, Modal, Stack, TextInput } from "@mantine/core";
import { useCreateCategoryMutation } from "../../store/api/homeApi";
import type { Category } from "../../store/api/classes/home";

type AddCategoryButtonProps = {
    categories: Category[];
    disabled?: boolean;
    onCreated: (categoryName: string) => void;
};

function categoryErrorMessage(error: unknown): string {
    if (
        error !== null &&
        typeof error === "object" &&
        "data" in error &&
        error.data !== null &&
        typeof error.data === "object"
    ) {
        const data = error.data as Record<string, unknown>;
        if (typeof data.error === "string") {
            return data.error;
        }
        if (typeof data.detail === "string") {
            return data.detail;
        }
        for (const value of Object.values(data)) {
            if (Array.isArray(value) && typeof value[0] === "string") {
                return value[0];
            }
        }
    }
    return "Could not add category.";
}

export default function AddCategoryButton({
    categories,
    disabled = false,
    onCreated,
}: AddCategoryButtonProps) {
    const [createCategory, { isLoading }] = useCreateCategoryMutation();
    const [opened, setOpened] = useState(false);
    const [name, setName] = useState("");
    const [error, setError] = useState<string | null>(null);

    const close = useCallback(() => {
        setOpened(false);
        setName("");
        setError(null);
    }, []);

    const handleCreate = useCallback(async () => {
        const trimmed = name.trim();
        if (!trimmed) {
            setError("Enter a category name.");
            return;
        }

        const normalized = trimmed.toLowerCase();
        const existing = categories.find((c) => c.category_name === normalized);
        if (existing) {
            onCreated(existing.category_name);
            close();
            return;
        }

        setError(null);
        try {
            const created = await createCategory({ category_name: trimmed }).unwrap();
            onCreated(created.category_name);
            close();
        } catch (err) {
            setError(categoryErrorMessage(err));
        }
    }, [name, categories, createCategory, onCreated, close]);

    return (
        <>
            <ActionIcon
                type="button"
                variant="default"
                size="input-sm"
                aria-label="Add category"
                disabled={disabled || isLoading}
                onClick={() => setOpened(true)}
            >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path
                        d="M8 3.5v9M3.5 8h9"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                    />
                </svg>
            </ActionIcon>
            <Modal opened={opened} onClose={close} title="Add category" centered>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        void handleCreate();
                    }}
                >
                    <Stack gap="md">
                        <TextInput
                            label="Category name"
                            placeholder="Groceries"
                            value={name}
                            onChange={(e) => {
                                setName(e.currentTarget.value);
                                if (error) {
                                    setError(null);
                                }
                            }}
                            error={error}
                            data-autofocus
                            disabled={isLoading}
                            maxLength={200}
                        />
                        <Group justify="flex-end" gap="xs">
                            <Button
                                type="button"
                                variant="default"
                                onClick={close}
                                disabled={isLoading}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" loading={isLoading}>
                                Create
                            </Button>
                        </Group>
                    </Stack>
                </form>
            </Modal>
        </>
    );
}
