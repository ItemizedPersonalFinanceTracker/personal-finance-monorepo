import { useGetSummaryQuery } from "../../store/api/homeApi"

export default function Home(){

    const { isLoading, data } = useGetSummaryQuery()

    return <>
      <div>
        <p>
          Home
        </p>
        {
        isLoading ? <span>Loading...</span> :
        <span>How much you have spent this year: {data?.year.total_spend}</span>
        }

      </div>
    </>
}
