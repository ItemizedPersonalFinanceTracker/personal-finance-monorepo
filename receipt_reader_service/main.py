import asyncio
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI

from app.config import settings
from app.routes import router



@asynccontextmanager
async def lifespan(app: FastAPI):
    # if we want any startup logic, we can do it here
    yield


app = FastAPI(
    title="Document Page Classifier",
    description="Classifies pages of a PDF document fetched from GCS",
    version="1.0.0",
    lifespan=lifespan,
)

app.include_router(router)


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": settings.service_name}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=settings.port)