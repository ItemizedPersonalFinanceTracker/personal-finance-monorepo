from datetime import date
from unicodedata import category
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
    


class ItemProcessModel(BaseModel):
    name: str
    price: float
    category: str

class ReceiptProcessModel(BaseModel):
    title: str 
    date: date
    total:float
    category: str
    items: list[ItemProcessModel]
