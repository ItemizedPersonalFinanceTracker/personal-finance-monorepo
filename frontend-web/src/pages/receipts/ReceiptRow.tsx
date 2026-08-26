import { ActionIcon, Group, Paper, Stack, Text, Tooltip } from "@mantine/core";
import type { Receipt } from "../../store/api/classes/receipt";
import { PencilIcon, TrashIcon } from "@phosphor-icons/react";
import { useDeleteReceiptMutation } from "../../store/api/receiptApi";
import { useCallback } from "react";
import { categoryLabel } from "../../utility_functions/util";

function formatSpend(amount: string) {
    const value = Number(amount);
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
    }).format(Number.isFinite(value) ? value : 0);
}

function formatDate(dateBought: string) {
    const date = new Date(dateBought);
    if (Number.isNaN(date.getTime())) {
        return dateBought;
    }
    return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

export default function ReceiptRow({
    receipt,
    categoryName,
    openEditModal,
}: {
    receipt: Receipt;
    categoryName: string | null;
    openEditModal: (receipt: Receipt) => void;
}) {
    const [deleteReceipt, { isLoading: isDeleteLoading }] = useDeleteReceiptMutation();

    const handleDelete = useCallback(() => {
        void deleteReceipt({ receiptId: receipt.receipt_id });
    }, [deleteReceipt, receipt.receipt_id]);

    return (
        <Paper shadow="xs" p={{ base: "sm", sm: "md" }} radius="md" withBorder>
            <div className="grid grid-cols-[minmax(0,1fr)_6.5rem] items-center gap-x-3 gap-y-1 sm:grid-cols-[minmax(0,1fr)_8rem_7rem_auto] sm:gap-x-4 sm:gap-y-0">
                <Stack gap={2} className="min-w-0 max-sm:col-start-1 max-sm:row-start-1">
                    <Text fw={600} truncate>
                        {receipt.store_name}
                    </Text>
                    <Text size="sm" c="dimmed">
                        {formatDate(receipt.date_bought)}
                    </Text>
                </Stack>
                <Text size="sm" c="dimmed" ta="left" truncate className="max-sm:col-start-1 max-sm:row-start-2">
                    {categoryName ? categoryLabel(categoryName) : "Other"}
                </Text>
                <Text fw={700} ta="left" className="tabular-nums max-sm:col-start-2 max-sm:row-start-2">
                    {formatSpend(receipt.total_spend)}
                </Text>
                <Group gap={6} wrap="nowrap" className="max-sm:col-start-2 max-sm:row-start-1">
                    <Tooltip label="Edit receipt">
                        <ActionIcon
                            variant="outline"
                            size="sm"
                            color="blue"
                            aria-label="Edit receipt"
                            onClick={() => openEditModal(receipt)}
                        >
                            <PencilIcon size={16} />
                        </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Delete receipt">
                        <ActionIcon
                            variant="outline"
                            size="sm"
                            color="red"
                            aria-label="Delete receipt"
                            onClick={handleDelete}
                            disabled={isDeleteLoading}
                        >
                            <TrashIcon size={16} />
                        </ActionIcon>
                    </Tooltip>
                </Group>
            </div>
        </Paper>
    );
}
