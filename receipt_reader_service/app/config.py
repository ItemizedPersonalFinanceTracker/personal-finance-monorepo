from pydantic import BaseModel, Field


class Settings(BaseModel):
    port: int = Field(default=8000, ge=1, le=65535)
    service_name: str = "receipt_reader_service"


settings = Settings()
