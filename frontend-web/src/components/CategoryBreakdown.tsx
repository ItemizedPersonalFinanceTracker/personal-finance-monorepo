import { useCallback, useState } from "react";
import { useGetSummaryQuery } from "../store/api/homeApi";
import { Loader, Select } from "@mantine/core";
import { Pie } from "react-chartjs-2";

import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const timeFrames = ["week", "month", "year"] as const;

export default function CategoryBreakdown() {
    const [timeFrame, setTimeFrame] = useState<string>("month");
    const { isLoading, data } = useGetSummaryQuery()
    
    
    const get_classification_data = useCallback(() => {
        if (!data) return {};
        let class_data = data?.[timeFrame as keyof typeof data].classification_data;
        const total = Object.values(class_data).reduce((acc, curr) => acc + curr, 0);
        const other = Number((data?.[timeFrame as keyof typeof data].total_spend - total).toFixed(2));
        if(other !== 0){
            class_data = { ...class_data, "Other": other };
        }
        return class_data;
    }, [data, timeFrame]);

    const get_pie_data = useCallback(() => {
        const data = get_classification_data();
        const color_array: string[] = ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40", "#4CAF50", "#E91E63", "#00BCD4", "#795548"];
        return {
            labels: Object.keys(data),
            datasets: [{data: Object.values(data), label: "Category Breakdown", backgroundColor: color_array}],
        };
    }, [get_classification_data]);
    
    
    const classData = get_classification_data();

    return (
        <div className="flex w-full min-w-0 flex-col items-center">
            <div className="flex w-full min-w-0 flex-col items-center gap-2 sm:grid sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:gap-0">
                <div className="hidden sm:block" />
                <h1 className="text-center text-lg font-bold sm:whitespace-nowrap sm:px-6 sm:text-2xl">Category Breakdown</h1>
                <Select
                    className="w-40 max-w-full sm:w-36 sm:justify-self-start"
                    size="sm"
                    data={timeFrames}
                    value={timeFrame}
                    onChange={(value) => {
                        if (value) setTimeFrame(value);
                    }}
                />
            </div>
            {isLoading ? (
                <Loader color="blue" />
            ) : Object.keys(classData).length > 0 ? (
                <div id="pie-chart" className="mx-auto min-w-0 w-full max-w-md max-h-156">
                    <p className="text-center">Pie Chart</p>
                    <Pie data={get_pie_data()}></Pie>
                </div>
            ) : (
                <div className="min-w-0 w-full text-center">
                    <p>No data available</p>
                </div>
            )}
        </div>
    );
}