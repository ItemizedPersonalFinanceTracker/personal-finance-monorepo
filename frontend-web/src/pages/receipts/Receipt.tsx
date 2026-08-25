import { useEffect } from "react";
import { Alert, Loader, Stack, Text, Title } from "@mantine/core";
import { useIntersection } from "@mantine/hooks";
import { useGetReceiptsInfiniteQuery } from "../../store/api/receiptApi";
import ReceiptRow from "./ReceiptRow";

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

    const receipts = data?.pages.flatMap((page) => page.results) ?? [];

    useEffect(() => {
        if (entry?.isIntersecting && hasNextPage && !isFetchingNextPage) {
            void fetchNextPage();
        }
    }, [entry?.isIntersecting, hasNextPage, isFetchingNextPage, fetchNextPage]);

    return (
        <div className="mx-auto w-full max-w-2xl px-4 py-6">
            <Title order={2} mb="md">
                Receipts
            </Title>
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
                        <ReceiptRow key={receipt.receipt_id} receipt={receipt} />
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
        </div>
    );
}
