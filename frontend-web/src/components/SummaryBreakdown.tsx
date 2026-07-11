import { Loader, Paper, Stack, Text, Title } from "@mantine/core"
import { useGetSummaryQuery } from "../store/api/homeApi"
import type { accountSummaryResponse } from "../store/api/classes/home"

const TIMEFRAMES: { key: keyof accountSummaryResponse; label: string }[] = [
    { key: "week", label: "This week" },
    { key: "month", label: "This month" },
    { key: "year", label: "This year" },
]

function formatSpend(amount: number) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
    }).format(Number.isFinite(amount) ? amount : 0)
}

export default function SummaryBreakdown() {
    const { isLoading, data } = useGetSummaryQuery()

    if (isLoading || !data) {
        return (
            <div className="w-full min-w-0">
                <Title order={2} mb="sm">
                    Spending by period
                </Title>
                <Loader color="blue" />
            </div>
        )
    }

    return (
        <div className="w-full min-w-0">
            <Title order={2} mb="sm">
                Money Spent this:
            </Title>
            <div className="flex w-full min-w-0 flex-col items-stretch gap-8 md:flex-row md:flex-wrap md:items-start md:justify-center md:gap-10">
                {TIMEFRAMES.map(({ key, label }) => {
                    const payload = data[key]
                    const spent = Number(payload.total_spend)
                    const periodStart = payload.starting_date
                        ? new Date(payload.starting_date).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                          })
                        : null

                    return (
                        <Paper
                            key={key}
                            shadow="sm"
                            p="sm"
                            radius="md"
                            withBorder
                            className="mx-auto flex w-full max-w-[220px] flex-col md:mx-0"
                        >
                            <Stack gap={4} align="center">
                                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                                    {label}
                                </Text>
                                <Text className="text-center text-xl font-bold tabular-nums md:text-2xl">
                                    {formatSpend(spent)}
                                </Text>
                                {periodStart ? (
                                    <Text size="xs" c="dimmed" ta="center">
                                        Since {periodStart}
                                    </Text>
                                ) : null}
                            </Stack>
                        </Paper>
                    )
                })}
            </div>
        </div>
    )
}
