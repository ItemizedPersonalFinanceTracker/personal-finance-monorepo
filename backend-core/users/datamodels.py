from pydantic import BaseModel, RootModel, field_validator
from typing import Dict

class TimeFrameBreakdown(BaseModel):
    total: float
    categories: Dict[str, float]
    # average: Optional[float] = None

    @field_validator("total")
    def total_must_be_positive(cls, v):
        if v < 0:
            raise ValueError("total must be non-negative")
        return v


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
    