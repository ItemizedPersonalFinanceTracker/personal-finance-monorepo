import { useMemo, useState } from "react";
import { Line } from "react-chartjs-2";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
} from "chart.js";
import { Loader, Select, TextInput } from "@mantine/core";
import { useGetSpendingTrackersQuery } from "../store/api/homeApi";
import { categoryLabel } from "../utility_functions/util";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const timeFrames = ["week", "month", "year"] as const;
const CATEGORY_COLORS = ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40", "#4CAF50", "#E91E63", "#00BCD4", "#795548"];
const TOTAL_COLOR = "#1f2937";

function firstDayOfCurrentYear(): string {
    return `${new Date().getFullYear()}-01-01`;
}

const options = {
    responsive: true,
    plugins: {
        legend: {
            position: "top" as const,
        },
        title: {
            display: true,
            text: "Time Breakdown",
        },
    },
    scales: {
        y: {
            beginAtZero: true,
        },
    },
};

function formatPeriodLabel(isoDate: string, trackerType: string): string {
    const date = new Date(isoDate);
    if (trackerType === "year") {
        return date.toLocaleDateString(undefined, { year: "numeric" });
    }
    if (trackerType === "month") {
        return date.toLocaleDateString(undefined, { month: "short", year: "numeric" });
    }
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function TimeBreakdown() {
    const [timeFrame, setTimeFrame] = useState<string>("month");
    const [startDate, setStartDate] = useState(firstDayOfCurrentYear);
    const { data: spendingTrackers, isLoading } = useGetSpendingTrackersQuery(
        { tracker_type: timeFrame, start_date: startDate },
        { skip: !startDate },
    );

    const chartData = useMemo(() => {
        const trackers = [...(spendingTrackers ?? [])].sort(
            (a, b) => new Date(a.starting_date).getTime() - new Date(b.starting_date).getTime(),
        );
        const labels = trackers.map((tracker) => formatPeriodLabel(tracker.starting_date, timeFrame));
        const categories = [...new Set(trackers.flatMap((tracker) => Object.keys(tracker.classification_data)))].sort();

        return {
            labels,
            datasets: [
                ...categories.map((category, index) => ({
                    label: categoryLabel(category),
                    data: trackers.map((tracker) => Number(tracker.classification_data[category] ?? 0)),
                    borderColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
                    backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
                    tension: 0.2,
                })),
                {
                    label: "Total",
                    data: trackers.map((tracker) => Number(tracker.total_spend)),
                    borderColor: TOTAL_COLOR,
                    backgroundColor: TOTAL_COLOR,
                    borderWidth: 3,
                    tension: 0.2,
                },
            ],
        };
    }, [spendingTrackers, timeFrame]);

    return (
        <div className="flex w-full min-w-0 flex-col items-center">
            <h1 className="text-2xl font-bold text-center">Time Breakdown</h1>
            <div className="flex w-full min-w-0 flex-col items-center gap-2">
                <div className="flex flex-wrap items-end justify-center gap-2">
                    <Select
                        w={140}
                        label="Time frame"
                        data={timeFrames}
                        value={timeFrame}
                        onChange={(value) => {
                            if (value) setTimeFrame(value);
                        }}
                    />
                    <TextInput
                        w={180}
                        label="Start from"
                        type="date"
                        value={startDate}
                        onChange={(event) => setStartDate(event.currentTarget.value)}
                    />
                </div>
                {isLoading ? (
                    <Loader color="blue" />
                ) : chartData.labels.length > 0 ? (
                    <div className="mx-auto min-w-0 w-full max-w-4xl max-h-156">
                        <Line options={options} data={chartData} />
                    </div>
                ) : (
                    <p className="text-center">No data available</p>
                )}
            </div>
        </div>
    );
}
