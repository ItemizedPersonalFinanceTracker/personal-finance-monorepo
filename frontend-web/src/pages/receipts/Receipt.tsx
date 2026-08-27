import { useCallback, useEffect, useState } from "react";
import { ActionIcon, Alert, Group, Loader, Stack, Text, Title, Tooltip } from "@mantine/core";
import { useIntersection } from "@mantine/hooks";
import { DownloadIcon } from "@phosphor-icons/react";
import { useGetReceiptsInfiniteQuery } from "../../store/api/receiptApi";
import ReceiptRow from "./ReceiptRow";
import type { Receipt } from "../../store/api/classes/receipt";
import EditReceiptButtonModal from "./EditReceiptModal";
import { useGetCategoriesQuery } from "../../store/api/homeApi";
import ImportFromExcelModal from "./ImportFromExcelModal";

export default function Receipts() {
    const {
        data,
        isLoading,
        isError,
        hasNextPage,
        isFetchingNextPage,
        fetchNextPage,
    } = useGetReceiptsInfiniteQuery();
    const { ref, entry } = useIntersection({ threshold: 0 });
    const { data: categories = [], isLoading: categoriesLoading } = useGetCategoriesQuery();
    const receipts = data?.pages.flatMap((page) => page.results) ?? [];
    const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
    const [openImportFromExcelModal, setOpenImportFromExcelModal] = useState(false);

    const openEditModal = useCallback((receipt: Receipt) => {
        setSelectedReceipt(receipt);
    }, []);

    useEffect(() => {
        if (entry?.isIntersecting && hasNextPage && !isFetchingNextPage) {
            void fetchNextPage();
        }
    }, [entry?.isIntersecting, hasNextPage, isFetchingNextPage, fetchNextPage]);

    const closeEditModal = useCallback(() => {
        setSelectedReceipt(null);
    }, []);

    return (
        <div className="mx-auto w-full max-w-2xl px-4 py-6">
            <Group justify="space-between" mb="md">
                <Title order={2}>
                    Receipts
                </Title>
                <Tooltip label="Import receipts">
                    <ActionIcon
                        variant="outline"
                        size="sm"
                        color="blue"
                        aria-label="Import receipts"
                        onClick={() => setOpenImportFromExcelModal(true)}
                    >
                        <DownloadIcon size={16} />
                    </ActionIcon>
                </Tooltip>
            </Group>
            {isLoading ? (
                <Loader color="blue" />
            ) : isError ? (
                <Alert color="red" title="Could not load receipts">
                    Please try again.
                </Alert>
            ) : receipts.length === 0 ? (
                <Text c="dimmed">No receipts yet.</Text>
            ) : (
                <Stack gap="sm">
                    {receipts.map((receipt) => (
                        <ReceiptRow
                            key={receipt.receipt_id}
                            receipt={receipt}
                            categoryName={
                                categories.find((c) => c.category_id === receipt.category_id)?.category_name ?? null
                            }
                            openEditModal={openEditModal}
                        />
                    ))}
                    {hasNextPage ? (
                        <div ref={ref} className="flex justify-center py-3">
                            {isFetchingNextPage ? <Loader size="sm" color="blue" /> : null}
                        </div>
                    ) : (
                        <Text size="sm" c="dimmed" ta="center">
                            All receipts loaded
                        </Text>
                    )}
                </Stack>
            )}
            {selectedReceipt && !categoriesLoading ? (
                <EditReceiptButtonModal
                    opened
                    receipt={selectedReceipt}
                    categories={categories}
                    handleClose={closeEditModal}
                />
            ) : null}
            <ImportFromExcelModal
                open={openImportFromExcelModal}
                onClose={() => setOpenImportFromExcelModal(false)}
            />
        </div>
    );
}
