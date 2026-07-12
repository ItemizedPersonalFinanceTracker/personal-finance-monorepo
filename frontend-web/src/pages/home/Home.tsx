import CategoryBreakdown from "../../components/CategoryBreakdown"
import SummaryBreakdown from "../../components/SummaryBreakdown"

export default function Home(){

    return <>
      <div className="mx-24 flex flex-col gap-10 md:mx-8">
        <SummaryBreakdown />
        <CategoryBreakdown />

      </div>
    </>
}
