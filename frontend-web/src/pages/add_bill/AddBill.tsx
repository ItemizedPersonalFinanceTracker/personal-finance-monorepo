import { useCallback, useMemo, useState } from "react";
import {
    Alert,
    Button,
    Group,
    Image,
    NumberInput,
    Paper,
    Select,
    Stack,
    Text,
    TextInput,
    Title,
} from "@mantine/core";
import { Dropzone, IMAGE_MIME_TYPE } from "@mantine/dropzone";
import { notifications } from "@mantine/notifications";
import { useGetCategoriesQuery } from "../../store/api/homeApi";
import {
    useCreateImageReceiptMutation,
    useCreateManualReceiptMutation,
} from "../../store/api/receiptApi";
import AddCategoryButton from "./AddCategoryButton";
import ReceiptCameraModal from "./ReceiptCameraModal";
import { apiErrorMessage, categoryLabel, OTHER_CATEGORY, toDateBought, todayDateValue } from "../../utility_functions/util";





// function categoryLabel(name: string): string {
//     return name.charAt(0).toUpperCase() + name.slice(1);
// }

// export const OTHER_CATEGORY = "__other__";

export default function AddBill() {
    const { data: categories = [], isLoading: categoriesLoading } = useGetCategoriesQuery();
    const [createManualReceipt, { isLoading: isManualLoading }] = useCreateManualReceiptMutation();
    const [createImageReceipt, { isLoading: isImageLoading }] = useCreateImageReceiptMutation();
    const isLoading = isManualLoading || isImageLoading;

    const [storeName, setStoreName] = useState("");
    const [category, setCategory] = useState<string | null>(OTHER_CATEGORY);
    const [amount, setAmount] = useState<number | string>("");
    const [date, setDate] = useState(todayDateValue);
    const [image, setImage] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [cameraOpen, setCameraOpen] = useState(false);

    const assignImage = useCallback((file: File | null) => {
        setPreviewUrl((prev) => {
            if (prev) {
                URL.revokeObjectURL(prev);
            }
            return file ? URL.createObjectURL(file) : null;
        });
        setImage(file);
    }, []);

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

    const resetForm = useCallback(() => {
        setStoreName("");
        setCategory(OTHER_CATEGORY);
        setAmount("");
        setDate(todayDateValue());
        assignImage(null);
        setErrorMessage(null);
    }, [assignImage]);

    const handleSubmit = useCallback(async () => {
        setErrorMessage(null);

        const trimmedStoreName = storeName.trim();
        const parsedAmount = typeof amount === "number" ? amount : Number(amount);
        let cleanedCategory: string | null = category?.trim() ?? null;
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

        const dateBought = toDateBought(date);

        try {
            if (image) {
                await createImageReceipt({
                    receiptImage: image,
                    total: parsedAmount,
                    storeName: trimmedStoreName,
                    dateBought,
                    category_name: cleanedCategory,
                }).unwrap();
            } else {
                await createManualReceipt({
                    total: parsedAmount,
                    storeName: trimmedStoreName,
                    dateBought,
                    category_name: cleanedCategory,
                }).unwrap();
            }

            notifications.show({
                title: "Success",
                message: "Bill added.",
                color: "green",
            });
            resetForm();
        } catch (err) {
            setErrorMessage(apiErrorMessage(err, "Could not add bill. Please try again."));
        }
    }, [
        storeName,
        amount,
        date,
        category,
        image,
        createImageReceipt,
        createManualReceipt,
        resetForm,
    ]);

    return (
        <div className="flex justify-center p-4">
            <Paper className="w-full max-w-2xl" shadow="md" p="xl" radius="md" withBorder>
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
                        <Group align="flex-start" grow preventGrowOverflow={false}>
                            <Stack gap="md" className="min-w-0 flex-2 basis-0">
                                <TextInput
                                    label="Store name"
                                    value={storeName}
                                    onChange={(e) => setStoreName(e.currentTarget.value)}
                                    disabled={isLoading}
                                    required
                                />
                                <Group align="flex-end" gap="xs" wrap="nowrap">
                                    <Select
                                        label="Category"
                                        className="min-w-0 flex-1"
                                        data={categoryOptions}
                                        value={category}
                                        onChange={setCategory}
                                        clearable
                                        searchable
                                        disabled={categoriesLoading || isLoading}
                                    />
                                    <AddCategoryButton
                                        categories={categories}
                                        disabled={isLoading}
                                        onCreated={setCategory}
                                    />
                                </Group>
                                <NumberInput
                                    label="Amount"
                                    value={amount}
                                    onChange={setAmount}
                                    min={0}
                                    decimalScale={2}
                                    fixedDecimalScale
                                    prefix="$"
                                    disabled={isLoading}
                                    required
                                />
                                <TextInput
                                    label="Date"
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.currentTarget.value)}
                                    disabled={isLoading}
                                    required
                                />
                            </Stack>
                            <Stack gap="xs" className="min-w-0 flex-1 basis-0">
                                <Text size="sm" fw={500}>
                                    Receipt image
                                </Text>
                                <Dropzone
                                    accept={IMAGE_MIME_TYPE}
                                    multiple={false}
                                    maxFiles={1}
                                    onDrop={(files) => assignImage(files[0] ?? null)}
                                    disabled={isLoading}
                                    // h={220}
                                >
                                    <Stack
                                        align="center"
                                        justify="center"
                                        gap="xs"
                                        mih={160}
                                        style={{ pointerEvents: "none" }}
                                    >
                                        <Dropzone.Accept>
                                            <Text size="sm" c="dimmed">
                                                Drop image here
                                            </Text>
                                        </Dropzone.Accept>
                                        <Dropzone.Reject>
                                            <Text size="sm" c="red">
                                                Image files only
                                            </Text>
                                        </Dropzone.Reject>
                                        <Dropzone.Idle>
                                            {previewUrl ? (
                                                <Image
                                                    src={previewUrl}
                                                    alt="Receipt preview"
                                                    mah={180}
                                                    fit="contain"
                                                    radius="sm"
                                                />
                                            ) : (
                                                <Text size="sm" c="dimmed" ta="center">
                                                    Drag an image here or click to select
                                                </Text>
                                            )}
                                        </Dropzone.Idle>
                                    </Stack>
                                </Dropzone>
                                <Group gap="xs">
                                    <Button
                                        type="button"
                                        variant="light"
                                        size="compact-sm"
                                        disabled={isLoading}
                                        onClick={() => setCameraOpen(true)}
                                    >
                                        Take photo
                                    </Button>
                                    {image ? (
                                        <Button
                                            type="button"
                                            variant="subtle"
                                            size="compact-sm"
                                            disabled={isLoading}
                                            onClick={() => assignImage(null)}
                                        >
                                            Clear image
                                        </Button>
                                    ) : null}
                                </Group>
                            </Stack>
                        </Group>
                        <Button
                            type="button"
                            onClick={handleSubmit}
                            loading={isLoading}
                            fullWidth
                            className="mt-2"
                        >
                            {isLoading ? "Adding bill..." : "Add bill"}
                        </Button>
                    </Stack>
                </form>
            </Paper>
            <ReceiptCameraModal
                opened={cameraOpen}
                onClose={() => setCameraOpen(false)}
                onCapture={assignImage}
            />
        </div>
    );
}
