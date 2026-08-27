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
    
    
    if (isLoading) {
        return (
        <div className="flex w-full min-w-0 flex-col items-center">
            <h1 className="text-2xl font-bold text-center">Category Breakdown</h1>
            <Loader color="blue" />
        </div>
        )
    }
    
    return (
        <div className="flex w-full min-w-0 flex-col items-center">
            <h1 className="text-2xl font-bold text-center">Category Breakdown</h1>
            <div className="flex w-full min-w-0 flex-col items-center gap-2 md:flex-row md:justify-center">
                <div className="order-1 flex w-full min-w-0 justify-center md:order-2 md:w-auto">
                    <Select
                        w={140}
                        data={timeFrames}
                        value={timeFrame}
                        onChange={(value) => setTimeFrame(value as string)}
                    />
                </div>
                {Object.keys(get_classification_data()).length > 0 ? (
                    <div id="pie-chart" className="order-2 mx-auto min-w-0 w-full max-w-md max-h-156 md:order-1">
                        <p className="text-center">Pie Chart</p>
                        <Pie data={get_pie_data()}></Pie>
                    </div>
                ) : (
                    <div className="order-2 min-w-0 w-full text-center md:order-1">
                        <p>No data available</p>
                    </div>
                )}
            </div>
        </div>
    );
}