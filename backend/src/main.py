import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from src.apis.arc_api import router as arc_router
from src.database import engine, Base

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Arc API")

_allowed_origins = os.environ.get("ALLOWED_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=_allowed_origins != ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(arc_router, prefix="/api/arc", tags=["Arc"])


@app.get("/api")
async def health_check():
    return {"status": "online"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
