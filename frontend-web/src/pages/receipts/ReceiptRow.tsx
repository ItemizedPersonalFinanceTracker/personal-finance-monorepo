import { Button, Group, Paper, Stack, Text, Tooltip } from "@mantine/core";
import type { Receipt } from "../../store/api/classes/receipt";
import { PencilIcon, TrashIcon } from "@phosphor-icons/react";
import { useDeleteReceiptMutation } from "../../store/api/receiptApi";
import { useCallback } from "react";

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

export default function ReceiptRow({ receipt }: { receipt: Receipt }) {
    const [deleteReceipt, { isLoading: isDeleteLoading }] = useDeleteReceiptMutation();

    const handleDelete = useCallback(() => {
        void deleteReceipt({ receiptId: receipt.receipt_id });
    }, [deleteReceipt, receipt.receipt_id]);

    return (
        <Paper shadow="xs" p="md" radius="md" withBorder>
            <Group justify="space-between" wrap="nowrap" align="center">
                <Stack gap={2} className="min-w-0">
                    <Text fw={600} truncate>
                        {receipt.store_name}
                    </Text>
                    <Text size="sm" c="dimmed">
                        {formatDate(receipt.date_bought)}
                    </Text>
                </Stack>
                <Text fw={700} className="shrink-0 tabular-nums">
                    {formatSpend(receipt.total_spend)}
                </Text>
                <Group>
                    <Tooltip label="Edit receipt">
                        <Button variant="outline" size="xs">
                            <PencilIcon color="blue" />
                        </Button>
                    </Tooltip>
                    

                    <Tooltip label="Delete receipt">
                        <Button variant="outline" size="xs" onClick={handleDelete} disabled={isDeleteLoading}>
                            <TrashIcon color="red" />
                        </Button>
                    </Tooltip>
                </Group>
            </Group>
        </Paper>
    );
}
