from fastapi import APIRouter

from app.schemas import GetItemsResponse, ReceiptItem

router = APIRouter()


@router.post("/get_items", response_model=GetItemsResponse)
async def get_items() -> GetItemsResponse:
    return GetItemsResponse(
        items=[
            ReceiptItem(id="1", description="Milk", total=4.99),
            ReceiptItem(id="2", description="Bread", total=3.49),
        ],
    )