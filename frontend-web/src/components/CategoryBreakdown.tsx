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
        const color_array: string[] = ["#FF6384", "#36A2EB", "#FFCE56", "#FF6384", "#36A2EB", "#FFCE56"];
        return {
            labels: Object.keys(data),
            datasets: [{data: Object.values(data), label: "Category Breakdown", backgroundColor: color_array}],
        };
    }, [get_classification_data]);
    
    
    if (isLoading) {
        return (
        <div className="w-full min-w-0">
            <h1 className="text-2xl font-bold">Category Breakdown</h1>
            <Loader color="blue" />
        </div>
        )
    }
    
    return (
        <div className="w-full min-w-0">
            <h1 className="text-2xl font-bold">Category Breakdown</h1>
            <div className="flex w-full min-w-0 flex-col gap-2 md:flex-row">
                {Object.keys(get_classification_data()).length > 0 ? (
                    <div id="pie-chart" className="min-w-0 flex-1 basis-0">
                        <p>Pie Chart</p>
                        <Pie data={get_pie_data()}></Pie>
                    </div>
                ) : (
                    <div className="min-w-0 flex-1 basis-0">
                        <p>No data available</p>
                    </div>
                )}
                <div className="flex min-w-0 flex-1 basis-0 flex-col gap-2">
                    <div className="min-w-0 w-full">
                        <Select
                            w="25%"
                            data={timeFrames}
                            value={timeFrame}
                            onChange={(value) => setTimeFrame(value as string)}
                        />
                    </div>
                    <div></div>
                </div>
            </div>
        </div>
    );
}