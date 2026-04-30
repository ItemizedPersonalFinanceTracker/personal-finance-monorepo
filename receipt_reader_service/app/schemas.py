from pydantic import BaseModel, Field


class ReceiptItem(BaseModel):
    id: str
    description: str
    total: float = Field(..., description="Line total amount")


class GetItemsResponse(BaseModel):
    items: list[ReceiptItem]
