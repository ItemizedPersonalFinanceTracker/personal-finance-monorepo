import { useCallback, useState } from "react";
import { useGetSummaryQuery } from "../store/api/homeApi";
import { Loader, Select } from "@mantine/core";

const timeFrames = ["week", "month", "year"] as const;

export default function CategoryBreakdown() {
    const [timeFrame, setTimeFrame] = useState<string>("month");
    const { isLoading, data } = useGetSummaryQuery()
    
    
    const get_classification_data = useCallback(() => {
        return data?.[timeFrame as keyof typeof data].classification_data;
    }, [data, timeFrame]);
    
    
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
            <div className="flex flex-row gap-2 w-full min-w-0">
                <div id="pie-chart" className="min-w-0 flex-1 basis-0">
                    <p>Pie Chart</p>
                    <p>{JSON.stringify(get_classification_data())}</p>
                </div>
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