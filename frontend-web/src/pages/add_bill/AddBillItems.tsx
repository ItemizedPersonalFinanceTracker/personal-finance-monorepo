import { useMemo } from "react";
import { ActionIcon, Button, Collapse, NumberInput, Select, Stack, Text, TextInput, UnstyledButton } from "@mantine/core";
import { CaretRightIcon, TrashIcon } from "@phosphor-icons/react";
import type { Category } from "../../store/api/classes/home";
import { categoryLabel, OTHER_CATEGORY } from "../../utility_functions/util";
import { createBillItem, type BillItemDraft } from "./billItem";

type AddBillItemsProps = {
    items: BillItemDraft[];
    onChange: (items: BillItemDraft[]) => void;
    opened: boolean;
    onOpenedChange: (opened: boolean) => void;
    categories: Category[];
    categoriesLoading?: boolean;
    disabled?: boolean;
};

export default function AddBillItems({
    items,
    onChange,
    opened,
    onOpenedChange,
    categories,
    categoriesLoading = false,
    disabled = false,
}: AddBillItemsProps) {
    const categoryOptions = useMemo(
        () => [
            { value: OTHER_CATEGORY, label: "Other" },
            ...categories.map((category) => ({
                value: category.category_name,
                label: categoryLabel(category.category_name),
            })),
        ],
        [categories],
    );

    const toggle = () => {
        if (!opened && items.length === 0) {
            onChange([createBillItem()]);
        }
        onOpenedChange(!opened);
    };

    const updateItem = (id: string, patch: Partial<Omit<BillItemDraft, "id">>) => {
        onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
    };

    return (
        <Stack gap="xs">
            <UnstyledButton
                type="button"
                onClick={toggle}
                disabled={disabled}
                aria-expanded={opened}
                className="flex w-full items-center gap-2 py-1"
            >
                <CaretRightIcon
                    size={14}
                    style={{
                        transform: opened ? "rotate(90deg)" : undefined,
                        transition: "transform 150ms ease",
                    }}
                />
                <Text size="sm" fw={500}>
                    Add items
                </Text>
            </UnstyledButton>
            <Collapse expanded={opened}>
                <Stack gap="sm">
                    {items.map((item) => (
                        <div key={item.id} className="flex flex-col gap-2 min-[480px]:flex-row min-[480px]:items-end">
                            <TextInput
                                label="Name"
                                className="min-[480px]:min-w-0 min-[480px]:flex-[1.4]"
                                value={item.name}
                                onChange={(event) => updateItem(item.id, { name: event.currentTarget.value })}
                                disabled={disabled}
                            />
                            <NumberInput
                                label="Price"
                                className="min-[480px]:w-28 min-[480px]:shrink-0"
                                value={item.price}
                                onChange={(price) => updateItem(item.id, { price })}
                                decimalScale={2}
                                fixedDecimalScale
                                prefix="$"
                                hideControls
                                disabled={disabled}
                            />
                            <Select
                                label="Category"
                                className="min-[480px]:min-w-0 min-[480px]:flex-1"
                                data={categoryOptions}
                                value={item.category}
                                onChange={(category) => updateItem(item.id, { category })}
                                searchable
                                clearable
                                disabled={categoriesLoading || disabled}
                            />
                            {items.length > 1 ? (
                                <ActionIcon
                                    type="button"
                                    variant="subtle"
                                    color="red"
                                    size="input-sm"
                                    aria-label="Remove item"
                                    className="self-end"
                                    disabled={disabled}
                                    onClick={() => onChange(items.filter((row) => row.id !== item.id))}
                                >
                                    <TrashIcon size={16} />
                                </ActionIcon>
                            ) : null}
                        </div>
                    ))}
                    <Button
                        type="button"
                        variant="light"
                        size="compact-sm"
                        disabled={disabled}
                        onClick={() => onChange([...items, createBillItem()])}
                    >
                        Add another row
                    </Button>
                </Stack>
            </Collapse>
        </Stack>
    );
}
