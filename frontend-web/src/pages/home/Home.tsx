import CategoryBreakdown from "../../components/CategoryBreakdown"
import SummaryBreakdown from "../../components/SummaryBreakdown"
import TimeBreakdown from "../../components/TimeBreakdown"

export default function Home(){

    return <>
      <div className="mx-4 flex flex-col gap-10 pt-4 pb-32 md:mx-8 lg:mx-[25%]">
        <SummaryBreakdown />
        <CategoryBreakdown />
        <TimeBreakdown />
      </div>
    </>
}
