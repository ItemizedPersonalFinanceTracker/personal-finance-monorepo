import { useCallback, useState } from "react";
import { ActionIcon, Collapse, Group, Paper, Stack, Text, Tooltip } from "@mantine/core";
import { CaretRightIcon, PencilIcon, TrashIcon } from "@phosphor-icons/react";
import type { Receipt } from "../../store/api/classes/receipt";
import { useDeleteReceiptMutation } from "../../store/api/receiptApi";
import { categoryLabel } from "../../utility_functions/util";
import ReceiptDetails from "./ReceiptDetails";

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
    const [opened, setOpened] = useState(false);
    const [deleteReceipt, { isLoading: isDeleteLoading }] = useDeleteReceiptMutation();

    const handleDelete = useCallback(() => {
        void deleteReceipt({ receiptId: receipt.receipt_id });
    }, [deleteReceipt, receipt.receipt_id]);

    return (
        <Paper shadow="xs" p={{ base: "sm", sm: "md" }} radius="md" withBorder>
            <div
                className="grid cursor-pointer grid-cols-[minmax(0,1fr)_6.5rem] items-center gap-x-3 gap-y-1 sm:grid-cols-[minmax(0,1fr)_8rem_7rem_auto] sm:gap-x-4 sm:gap-y-0"
                onClick={() => setOpened((open) => !open)}
                aria-expanded={opened}
            >
                <Group gap={8} wrap="nowrap" align="flex-start" className="min-w-0 max-sm:col-start-1 max-sm:row-start-1">
                    <CaretRightIcon
                        size={14}
                        className="mt-1 shrink-0"
                        style={{
                            transform: opened ? "rotate(90deg)" : undefined,
                            transition: "transform 150ms ease",
                        }}
                    />
                    <Stack gap={2} className="min-w-0">
                        <Text fw={600} truncate>
                            {receipt.store_name}
                        </Text>
                        <Text size="sm" c="dimmed">
                            {formatDate(receipt.date_bought)}
                        </Text>
                    </Stack>
                </Group>
                <Text size="sm" c="dimmed" ta="left" truncate className="max-sm:col-start-1 max-sm:row-start-2">
                    {categoryName ? categoryLabel(categoryName) : "Other"}
                </Text>
                <Text fw={700} ta="left" className="tabular-nums max-sm:col-start-2 max-sm:row-start-2">
                    {formatSpend(receipt.total_spend)}
                </Text>
                <Group
                    gap={6}
                    wrap="nowrap"
                    className="max-sm:col-start-2 max-sm:row-start-1"
                    onClick={(event) => event.stopPropagation()}
                >
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
            <Collapse expanded={opened}>
                <div className="pt-3">
                    <ReceiptDetails receiptId={receipt.receipt_id} enabled={opened} />
                </div>
            </Collapse>
        </Paper>
    );
}
