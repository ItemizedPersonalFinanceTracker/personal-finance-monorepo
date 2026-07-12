import { useCallback, useMemo, useState } from "react";
import {
    Alert,
    Button,
    NumberInput,
    Paper,
    Select,
    Stack,
    TextInput,
    Title,
} from "@mantine/core";
import { useGetCategoriesQuery } from "../../store/api/homeApi";

function todayDateValue(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

const OTHER_CATEGORY = "__other__";

export default function AddBill() {
    const { data: categories = [], isLoading: categoriesLoading } = useGetCategoriesQuery();
    const [storeName, setStoreName] = useState("");
    const [category, setCategory] = useState<string | null>(OTHER_CATEGORY);
    const [amount, setAmount] = useState<number | string>("");
    const [date, setDate] = useState(todayDateValue);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const categoryOptions = useMemo(
        () => [
            { value: OTHER_CATEGORY, label: "Other" },
            ...categories.map((c) => ({
                value: c.category_name,
                label: c.category_name.charAt(0).toUpperCase() + c.category_name.slice(1),
            })),
        ],
        [categories],
    );

    const handleSubmit = useCallback(() => {
        setErrorMessage(null);

        const trimmedStoreName = storeName.trim();
        const parsedAmount = typeof amount === "number" ? amount : Number(amount);
        let cleanedCategory: string | undefined | null = category?.trim();
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
        console.log({ trimmedStoreName, parsedAmount, date, cleanedCategory });
    }, [storeName, amount, date, category]);

    return (
        <div className="flex justify-center p-4">
            <Paper className="w-full max-w-sm" shadow="md" p="xl" radius="md" withBorder>
                <Title order={2} className="mb-6 text-center">
                    Add Bill
                </Title>
                <form onSubmit={(e) => e.preventDefault()}>
                    <Stack gap="md">
                        {errorMessage ? (
                            <Alert color="red" title="Could not add bill">
                                {errorMessage}
                            </Alert>
                        ) : null}
                        <TextInput
                            label="Store name"
                            value={storeName}
                            onChange={(e) => setStoreName(e.currentTarget.value)}
                            required
                        />
                        <Select
                            label="Category"
                            data={categoryOptions}
                            value={category}
                            onChange={setCategory}
                            clearable
                            searchable
                            disabled={categoriesLoading}
                        />
                        <NumberInput
                            label="Amount"
                            value={amount}
                            onChange={setAmount}
                            min={0}
                            decimalScale={2}
                            fixedDecimalScale
                            prefix="$"
                            required
                        />
                        <TextInput
                            label="Date"
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.currentTarget.value)}
                            required
                        />
                        <Button type="button" onClick={handleSubmit} fullWidth className="mt-2">
                            Add bill
                        </Button>
                    </Stack>
                </form>
            </Paper>
        </div>
    );
}
