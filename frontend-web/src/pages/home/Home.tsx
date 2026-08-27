import CategoryBreakdown from "../../components/CategoryBreakdown"
import SummaryBreakdown from "../../components/SummaryBreakdown"
import TimeBreakdown from "../../components/TimeBreakdown"

export default function Home(){

    return <>
      <div className="mx-24 flex flex-col gap-10 md:mx-8">
        <SummaryBreakdown />
        <CategoryBreakdown />
        <TimeBreakdown />
      </div>
    </>
}
