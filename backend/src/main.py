import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from src.apis.arc_api import router as arc_router
from src.database import engine, Base
import src.schemas.output_schema        # noqa: F401 — registers OutputSchema with Base
import src.schemas.notification_schema  # noqa: F401 — registers NotificationSchema with Base

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Arc API")

current_dir = os.path.dirname(os.path.realpath(__file__))
output_path = os.path.join(current_dir, "../output")
app.mount("/output", StaticFiles(directory=output_path), name="output")

if not os.path.exists(output_path):
    os.makedirs(output_path, exist_ok=True)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(arc_router, prefix="/api/arc", tags=["Arc"])

@app.get("/api")
async def health_check():
    return {"status": "online", "message": "CORS and Database configured"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)