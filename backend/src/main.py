import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.database import engine, Base, SessionLocal

# Import all schemas so Base.metadata includes every table before create_all
from src.schemas.user_schema import UserSchema            # noqa: F401
from src.schemas.refresh_token_schema import RefreshTokenSchema  # noqa: F401
from src.schemas.otp_schema import OtpSchema              # noqa: F401
from src.schemas.output_schema import OutputSchema        # noqa: F401
from src.schemas.notification_schema import NotificationSchema  # noqa: F401
from src.schemas.saved_arc_schema import SavedArcSchema   # noqa: F401
from src.schemas.job_schema import JobSchema              # noqa: F401

from src.apis.arc_api import router as arc_router
from src.apis.auth_api import router as auth_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Ensure all tables exist before anything else runs.
    Base.metadata.create_all(bind=engine)

    # Mark any jobs that were still processing when the server last stopped as FAILED.
    # Their background tasks died with the process and can never complete.
    db = SessionLocal()
    try:
        orphaned = (
            db.query(JobSchema)
            .filter(JobSchema.status.notin_(["COMPLETED", "FAILED"]))
            .all()
        )
        for job in orphaned:
            job.status = "FAILED"
        if orphaned:
            db.commit()
            logger.info("Marked %d orphaned job(s) as FAILED", len(orphaned))
    except Exception as exc:
        db.rollback()
        logger.error("Failed to clean up orphaned jobs: %s", exc)
    finally:
        db.close()
    yield


app = FastAPI(title="Arc API", lifespan=lifespan)

_allowed_origins = os.environ.get("ALLOWED_ORIGINS", "*").split(",")

_wildcard = _allowed_origins == ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=not _wildcard,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/auth", tags=["Auth"])
app.include_router(arc_router,  prefix="/api/arc",  tags=["Arc"])


@app.get("/api")
async def health_check():
    return {"status": "online"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
