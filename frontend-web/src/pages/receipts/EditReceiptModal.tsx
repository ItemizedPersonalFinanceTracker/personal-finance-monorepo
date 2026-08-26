import { useCallback, useMemo, useState } from "react";
import type { Receipt } from "../../store/api/classes/receipt";
import type { Category } from "../../store/api/classes/home";
import { Alert, Button, Modal, NumberInput, Select, Stack, TextInput } from "@mantine/core";
import { apiErrorMessage, categoryLabel, OTHER_CATEGORY, toDateBought, toDateInputValue } from "../../utility_functions/util";
import { notifications } from "@mantine/notifications";
import { useUpdateManualReceiptMutation } from "../../store/api/receiptApi";

export default function EditReceiptButtonModal({ opened, receipt, categories, handleClose }: { opened: boolean, receipt: Receipt, categories: Category[], handleClose: () => void }) {
    const [storeName, setStoreName] = useState(receipt.store_name);
    const [categoryName, setCategoryName] = useState<string | null>(
        categories.find((c) => c.category_id === receipt.category_id)?.category_name || OTHER_CATEGORY,
    );
    const [amount, setAmount] = useState<number | string>(receipt.total_spend);
    const [date, setDate] = useState(toDateInputValue(receipt.date_bought));
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [updateManualReceipt, { isLoading: isUpdateLoading }] = useUpdateManualReceiptMutation();

    const categoryOptions = useMemo(
        () => [
            { value: OTHER_CATEGORY, label: "Other" },
            ...categories.map((c) => ({
                value: c.category_name,
                label: categoryLabel(c.category_name),
            })),
        ],
        [categories],
    );

    const handleSubmit = useCallback(async () => {
        setErrorMessage(null);

        const trimmedStoreName = storeName.trim();
        const parsedAmount = typeof amount === "number" ? amount : Number(amount);
        let cleanedCategory: string | null = categoryName?.trim() ?? null;
        if (cleanedCategory === OTHER_CATEGORY || !cleanedCategory) {
            cleanedCategory = null;
        }

        if (!trimmedStoreName || !date) {
            setErrorMessage("Enter a store name, amount, and date.");
            return;
        }
        if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
            setErrorMessage("Enter a valid amount.");
            return;
        }

        try {
            await updateManualReceipt({
                receiptId: receipt.receipt_id,
                total: parsedAmount,
                storeName: trimmedStoreName,
                dateBought: toDateBought(date),
                category_name: cleanedCategory,
            }).unwrap();

            notifications.show({
                title: "Success",
                message: "Receipt updated.",
                color: "green",
            });
            handleClose();
        } catch (err) {
            setErrorMessage(apiErrorMessage(err, "Could not update receipt. Please try again."));
        }
    }, [
        storeName,
        amount,
        date,
        categoryName,
        updateManualReceipt,
        handleClose,
        receipt.receipt_id,
    ]);

    return (
        <Modal opened={opened} onClose={handleClose} title="Edit receipt" centered>
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    void handleSubmit();
                }}
            >
                <Stack gap="md">
                    {errorMessage ? (
                        <Alert color="red" title="Could not update receipt">
                            {errorMessage}
                        </Alert>
                    ) : null}
                    <TextInput
                        label="Store name"
                        value={storeName}
                        onChange={(e) => setStoreName(e.currentTarget.value)}
                        disabled={isUpdateLoading}
                        required
                    />
                    <Select
                        label="Category"
                        data={categoryOptions}
                        value={categoryName}
                        onChange={setCategoryName}
                        clearable
                        searchable
                        disabled={isUpdateLoading}
                    />
                    <NumberInput
                        label="Amount"
                        value={amount}
                        onChange={setAmount}
                        min={0}
                        decimalScale={2}
                        fixedDecimalScale
                        prefix="$"
                        disabled={isUpdateLoading}
                        required
                    />
                    <TextInput
                        label="Date"
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.currentTarget.value)}
                        disabled={isUpdateLoading}
                        required
                    />
                    <Button type="submit" loading={isUpdateLoading} fullWidth className="mt-2">
                        {isUpdateLoading ? "Updating receipt..." : "Update receipt"}
                    </Button>
                </Stack>
            </form>
        </Modal>
    );
}
