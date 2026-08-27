from pydantic import BaseModel, RootModel
from typing import Dict

class TimeFrameBreakdown(BaseModel):
    total: float
    categories: Dict[str, float]
    # average: Optional[float] = None


# "week", "month", "year"
class SummaryDataModel(RootModel[Dict[str, TimeFrameBreakdown]]):
    pass
    # total: float
    # categories: Dict[str, float]
    # week: TimeFrameBreakdown
    # month: TimeFrameBreakdown
    # year: TimeFrameBreakdown

    # "week", "month", "year"
    # __root__: Dict[str, TimeFrameBreakdown]
    