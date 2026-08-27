import { ActionIcon, Alert, Button, Modal, NumberInput, Select, Stack, Table, Textarea, TextInput, Tooltip, Text } from "@mantine/core";
import { TrashIcon } from "@phosphor-icons/react";
import { useCallback, useMemo, useState } from "react";
import { useGetCategoriesQuery } from "../../store/api/homeApi";
import { apiErrorMessage, categoryLabel, OTHER_CATEGORY, toDateBought } from "../../utility_functions/util";
import { useCreateReceiptBulkMutation } from "../../store/api/receiptApi";
import type { CreateManualReceiptRequest } from "../../store/api/classes/receipt";
import { notifications } from "@mantine/notifications";

type ImportRow = {
    id: string;
    storeName: string;
    amount: number | string;
    category: string | null;
    pastedCategory: string;
    categoryEdited: boolean;
    date: string;
};

function parsePastedAmount(raw: string): number | string {
    const cleaned = raw.replace(/[$,\s]/g, "");
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : "";
}

function parsePastedDate(raw: string): string {
    const trimmed = raw.trim();
    if (!trimmed) {
        return "";
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        return trimmed;
    }

    const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (slashMatch) {
        const month = slashMatch[1].padStart(2, "0");
        const day = slashMatch[2].padStart(2, "0");
        let year = slashMatch[3];
        if (year.length === 2) {
            year = `${Number(year) > 50 ? "19" : "20"}${year}`;
        }
        return `${year}-${month}-${day}`;
    }

    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) {
        return "";
    }

    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

const COMMON_GROUPS = [["Groceries", "Grocery"], ["Eating Out", "Dining Out"]]

function matchCategory(raw: string, categoryNames: string[]): string | null {
    const trimmed = raw.trim();
    if (!trimmed) {
        return null;
    }
    for (const names of COMMON_GROUPS) {
        for(const catName of categoryNames) {
            if(names.some((name) => name.toLowerCase() === catName.toLowerCase()) && names.some((name) => name.toLowerCase() === trimmed.toLowerCase())) {
                return catName;
            }
        }
    }
    
    return categoryNames.find((name) => name.toLowerCase() === trimmed.toLowerCase()) ?? null;
}

function resolveRowCategory(row: ImportRow, categoryNames: string[]): string | null {
    if (row.categoryEdited) {
        return row.category;
    }
    return matchCategory(row.pastedCategory, categoryNames);
}

export default function ImportFromExcelModal({ open, onClose }: { open: boolean; onClose: () => void }) {
    const [value, setValue] = useState("");
    const [processedValues, setProcessedValues] = useState<ImportRow[]>([]);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const { data: categories = [], isLoading: categoriesLoading } = useGetCategoriesQuery();
    const [createReceiptBulk, { isLoading: createReceiptBulkLoading }] = useCreateReceiptBulkMutation();

    const categoryNames = useMemo(() => categories.map((category) => category.category_name), [categories]);
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

    const processValues = useCallback((nextValue: string, names: string[]) => {
        setErrorMessage(null);
        setValue(nextValue);
        const rows: ImportRow[] = [];
        for (const row of nextValue.split(/\r?\n/)) {
            const cells = row.split("\t");
            if (cells.length < 4) {
                continue;
            }

            const amount = parsePastedAmount(cells[1]);
            const date = parsePastedDate(cells[3] ?? "");
            if (typeof amount !== "number" || !date) {
                continue;
            }

            const pastedCategory = (cells[2] ?? "").trim();
            rows.push({
                id: crypto.randomUUID(),
                storeName: cells[0].trim(),
                amount: amount,
                pastedCategory,
                category: matchCategory(pastedCategory, names),
                categoryEdited: false,
                date,
            });
        }
        setProcessedValues(rows);
    }, []);

    const updateRow = useCallback((id: string, patch: Partial<ImportRow>) => {
        setProcessedValues((rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
    }, []);

    const removeRow = useCallback((id: string) => {
        setProcessedValues((rows) => rows.filter((row) => row.id !== id));
    }, []);

    const handleClose = useCallback(() => {
        setValue("");
        setProcessedValues([]);
        setErrorMessage(null);
        onClose();
    }, [onClose]);

    const handleSubmit = useCallback(() => {
        if (processedValues.length === 0) {
            setErrorMessage("Paste at least one receipt to import.");
            return;
        }

        const receipts: CreateManualReceiptRequest[] = [];
        for (const row of processedValues) {
            const trimmedStoreName = row.storeName.trim();
            const parsedAmount = typeof row.amount === "number" ? row.amount : Number(row.amount);
            let cleanedCategory: string | null = resolveRowCategory(row, categoryNames)?.trim() ?? null;
            if (cleanedCategory === OTHER_CATEGORY || !cleanedCategory) {
                cleanedCategory = null;
            }

            if (!trimmedStoreName || !row.date) {
                setErrorMessage("Each receipt needs a store name, amount, and date.");
                return;
            }
            if (!Number.isFinite(parsedAmount)) {
                setErrorMessage("Each receipt needs a valid amount.");
                return;
            }

            receipts.push({
                storeName: trimmedStoreName,
                total: parsedAmount,
                category_name: cleanedCategory,
                dateBought: toDateBought(row.date),
            });
        }

        setErrorMessage(null);
        createReceiptBulk({ receipts }).unwrap().then(() => {
            notifications.show({
                title: "Success",
                message: "Receipts imported.",
                color: "green",
            });
            handleClose();
        }).catch((error) => {
            notifications.show({
                title: "Error",
                message: apiErrorMessage(error, "Could not import receipts. Please try again."),
                color: "red",
            });
        });
    }, [processedValues, categoryNames, createReceiptBulk, handleClose]);

    return (
        <Modal opened={open} onClose={handleClose} title="Import Receipts From Excel" size="xl" centered>
            <Stack>
                <Text>
                    Copy and paste the Excel cells into the text area below. <br />
                    The format should be: StoreName  Amount  Category    Date. <br />
                    The date should be in the format of YYYY-MM-DD. <br />
                    For example: Farm Boy{"\t"}100{"\t"}Groceries{"\t"}2026-01-01
                </Text>
                {errorMessage ? (
                    <Alert color="red" title="Could not import receipts">
                        {errorMessage}
                    </Alert>
                ) : null}
                <Textarea
                    label="Excel Cells"
                    placeholder="StoreName  Amount  Category    Date"
                    minRows={4}
                    value={value}
                    onChange={(event) => processValues(event.currentTarget.value, categoryNames)}
                />
                {processedValues.length > 0 && (
                    <Table.ScrollContainer minWidth={640} maxHeight={320}>
                        <Table
                            striped
                            highlightOnHover
                            withTableBorder
                            stickyHeader
                            horizontalSpacing="xs"
                            verticalSpacing={6}
                        >
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Store</Table.Th>
                                    <Table.Th w={110}>Amount</Table.Th>
                                    <Table.Th w={150}>Category</Table.Th>
                                    <Table.Th w={140}>Date</Table.Th>
                                    <Table.Th w={40} />
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {processedValues.map((row) => (
                                    <Table.Tr key={row.id}>
                                        <Table.Td>
                                            <TextInput
                                                size="xs"
                                                variant="filled"
                                                aria-label="Store name"
                                                value={row.storeName}
                                                onChange={(event) =>
                                                    updateRow(row.id, { storeName: event.currentTarget.value })
                                                }
                                            />
                                        </Table.Td>
                                        <Table.Td>
                                            <NumberInput
                                                size="xs"
                                                variant="filled"
                                                aria-label="Amount"
                                                value={row.amount}
                                                onChange={(next) => updateRow(row.id, { amount: next })}
                                                decimalScale={2}
                                                hideControls
                                                prefix="$"
                                            />
                                        </Table.Td>
                                        <Table.Td>
                                            <Select
                                                size="xs"
                                                variant="filled"
                                                aria-label="Category"
                                                data={categoryOptions}
                                                value={resolveRowCategory(row, categoryNames)}
                                                onChange={(next) =>
                                                    updateRow(row.id, { category: next, categoryEdited: true })
                                                }
                                                searchable
                                                clearable
                                                disabled={categoriesLoading}
                                            />
                                        </Table.Td>
                                        <Table.Td>
                                            <TextInput
                                                size="xs"
                                                variant="filled"
                                                aria-label="Date"
                                                type="date"
                                                value={row.date}
                                                onChange={(event) =>
                                                    updateRow(row.id, { date: event.currentTarget.value })
                                                }
                                            />
                                        </Table.Td>
                                        <Table.Td>
                                            <Tooltip label="Remove row">
                                                <ActionIcon
                                                    variant="subtle"
                                                    color="red"
                                                    size="sm"
                                                    aria-label="Remove row"
                                                    onClick={() => removeRow(row.id)}
                                                >
                                                    <TrashIcon size={14} />
                                                </ActionIcon>
                                            </Tooltip>
                                        </Table.Td>
                                    </Table.Tr>
                                ))}
                            </Table.Tbody>
                        </Table>
                    </Table.ScrollContainer>
                )}
                <Button
                    onClick={handleSubmit}
                    loading={createReceiptBulkLoading}
                    disabled={processedValues.length === 0}
                >
                    Import Receipts
                </Button>
            </Stack>
        </Modal>
    );
}
