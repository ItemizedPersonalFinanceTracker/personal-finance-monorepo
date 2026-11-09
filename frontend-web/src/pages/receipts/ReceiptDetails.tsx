import { useEffect, useState } from "react";
import { Alert, Group, Loader, Stack, Text } from "@mantine/core";
import { useGetReceiptQuery } from "../../store/api/receiptApi";
import { categoryLabel } from "../../utility_functions/util";

function formatSpend(amount: string) {
    const value = Number(amount);
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
    }).format(Number.isFinite(value) ? value : 0);
}

function receiptImageSrc(url: string) {
    if (url.startsWith("/media/") || url.startsWith("media/")) {
        return url.startsWith("/") ? url : `/${url}`;
    }
    try {
        const parsed = new URL(url);
        if (parsed.pathname.startsWith("/media/")) {
            return `${parsed.pathname}${parsed.search}`;
        }
    } catch {
        return url;
    }
    return url;
}

export default function ReceiptDetails({
    receiptId,
    enabled,
}: {
    receiptId: number;
    enabled: boolean;
}) {
    const { data, isError } = useGetReceiptQuery(receiptId, { skip: !enabled });
    const [imageFailed, setImageFailed] = useState(false);

    useEffect(() => {
        setImageFailed(false);
    }, [data?.image_url]);

    if (!data && !enabled) {
        return null;
    }
    if (!data && isError) {
        return (
            <Alert color="red" title="Could not load receipt">
                Please try again.
            </Alert>
        );
    }
    if (!data) {
        return <Loader size="sm" color="blue" />;
    }

    const hasItems = data.items.length > 0;
    const hasImage = Boolean(data.image_url);

    const items = hasItems ? (
        <Stack gap="xs" className="min-w-0 flex-1">
            <Text size="sm" fw={600}>
                Items
            </Text>
            {data.items.map((item) => (
                <Group key={item.id} justify="space-between" wrap="nowrap" align="flex-start">
                    <Stack gap={0} className="min-w-0">
                        <Text size="sm" truncate>
                            {item.name}
                        </Text>
                        {item.category_name ? (
                            <Text size="xs" c="dimmed">
                                {categoryLabel(item.category_name)}
                            </Text>
                        ) : null}
                    </Stack>
                    <Text size="sm" fw={600} className="tabular-nums">
                        {formatSpend(item.price)}
                    </Text>
                </Group>
            ))}
        </Stack>
    ) : null;

    const receiptImage = hasImage ? (
        <Stack gap="xs" className={hasItems ? "w-2/5 shrink-0" : undefined}>
            <Text size="sm" fw={600}>
                Receipt
            </Text>
            {imageFailed ? (
                <Text size="sm" c="dimmed">
                    Could not load the receipt image.
                </Text>
            ) : (
                <img
                    src={receiptImageSrc(data.image_url ?? "")}
                    alt={`Receipt from ${data.store_name}`}
                    className="max-h-112 w-full rounded-md object-contain"
                    onError={() => setImageFailed(true)}
                />
            )}
        </Stack>
    ) : null;

    if (!hasItems && !hasImage) {
        return (
            <Text size="sm" c="dimmed">
                No additional details.
            </Text>
        );
    }

    if (hasItems && hasImage) {
        return (
            <div className="flex items-start gap-4">
                {receiptImage}
                {items}
            </div>
        );
    }

    return receiptImage ?? items;
}
