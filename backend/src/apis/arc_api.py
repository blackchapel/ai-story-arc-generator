import asyncio
import json
import logging
import secrets
import threading
import uuid
from datetime import datetime
from typing import AsyncGenerator, Annotated

from fastapi import APIRouter, BackgroundTasks, HTTPException, Depends, Request, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from src.database import get_db, SessionLocal
from src.dependencies.auth import get_current_user
from src.schemas.user_schema import UserSchema
from src.schemas.output_schema import OutputSchema
from src.schemas.notification_schema import NotificationSchema
from src.schemas.saved_arc_schema import SavedArcSchema
from src.schemas.job_schema import JobSchema
from src.services.arc_service import run_pipeline
from src.services.push_service import send_push_notification
from src.services.gcs_service import delete_blob
from src.models.arc_request_model import ArcRequestModel
from src.models.notification_model import NotifyRequestModel
from src.models.output_model import OutputModel, OutputSummaryModel
from src.models.job_model import ActiveJobModel

router = APIRouter()
logger = logging.getLogger(__name__)

# ── SSE state ─────────────────────────────────────────────────────────────────
# NOTE: Both dicts are process-local — they are NOT shared between replicas.
# In a multi-replica deployment, SSE streaming and in-memory status only work
# correctly when the client is routed to the same replica that owns the job.

jobs: dict[str, dict] = {}
_subscribers: dict[str, list[asyncio.Queue]] = {}
_sub_lock = threading.Lock()


def _broadcast(job_id: str, status_str: str, loop: asyncio.AbstractEventLoop) -> None:
    async def _push() -> None:
        with _sub_lock:
            queues = list(_subscribers.get(job_id, []))
        for q in queues:
            await q.put(status_str)
    asyncio.run_coroutine_threadsafe(_push(), loop)


def _update_job_status(job_id: str, status: str) -> None:
    db = SessionLocal()
    try:
        job = db.query(JobSchema).filter(JobSchema.id == job_id).first()
        if job:
            job.status = status
            # arc_id == job_id (see _save_arc_to_db in arc_service)
            if status == "COMPLETED":
                job.arc_id = job_id
            db.commit()
    except Exception as exc:
        db.rollback()
        logger.error("Failed to update job status in DB: %s", exc)
    finally:
        db.close()


def _run_pipeline_bg(
    job_id: str, topic: str, loop: asyncio.AbstractEventLoop, user_id: str
) -> None:
    def on_status(s: str) -> None:
        jobs[job_id]["status"] = s
        _broadcast(job_id, s, loop)
        _update_job_status(job_id, s)
    run_pipeline(topic, job_id, on_status=on_status, user_id=user_id)


# ── Helper: build OutputSummaryModel from ORM row ────────────────────────────

def _to_summary(arc: OutputSchema, is_saved: bool = False) -> OutputSummaryModel:
    return OutputSummaryModel(
        id=arc.id,
        user_id=arc.user_id,
        title=arc.title,
        description=arc.description,
        img=arc.img,
        source_names=arc.source_names or [],
        tag=arc.tag,
        tag_text_color=arc.tag_text_color,
        created_at=arc.created_at,
        is_shared=arc.is_shared,
        share_token=arc.share_token if arc.is_shared else None,
        is_saved=is_saved,
    )


def _to_detail(arc: OutputSchema, is_saved: bool = False) -> OutputModel:
    return OutputModel(
        id=arc.id,
        user_id=arc.user_id,
        title=arc.title,
        description=arc.description,
        img=arc.img,
        source_names=arc.source_names or [],
        tag=arc.tag,
        tag_text_color=arc.tag_text_color,
        created_at=arc.created_at,
        is_shared=arc.is_shared,
        share_token=arc.share_token if arc.is_shared else None,
        is_saved=is_saved,
        html=arc.html,
    )


# ── Public shared-arc routes (must come before /{arc_id}) ────────────────────

@router.get("/shared/{share_token}", response_model=OutputModel)
async def get_shared_arc(share_token: str, db: Session = Depends(get_db)):
    arc = db.query(OutputSchema).filter(
        OutputSchema.share_token == share_token,
        OutputSchema.is_shared == True,
    ).first()
    if not arc:
        raise HTTPException(status_code=404, detail="Arc not found or sharing has been disabled")
    return _to_detail(arc, is_saved=False)


@router.post("/shared/{share_token}/save")
async def save_shared_arc(
    share_token: str,
    current_user: Annotated[UserSchema, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    arc = db.query(OutputSchema).filter(
        OutputSchema.share_token == share_token,
        OutputSchema.is_shared == True,
    ).first()
    if not arc:
        raise HTTPException(status_code=404, detail="Arc not found or sharing has been disabled")
    if arc.user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You already own this arc")

    existing = db.query(SavedArcSchema).filter(
        SavedArcSchema.user_id == current_user.id,
        SavedArcSchema.arc_id == arc.id,
    ).first()
    if not existing:
        db.add(SavedArcSchema(user_id=current_user.id, arc_id=arc.id))
        db.commit()
    return {"message": "Arc saved to your library", "arc_id": arc.id}


# ── Authenticated arc routes ──────────────────────────────────────────────────

@router.get("/", response_model=list[OutputSummaryModel])
async def get_all_arcs(
    current_user: Annotated[UserSchema, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    own = (
        db.query(OutputSchema)
        .filter(OutputSchema.user_id == current_user.id)
        .order_by(OutputSchema.created_at.desc())
        .all()
    )

    saved_rows = db.query(SavedArcSchema).filter(
        SavedArcSchema.user_id == current_user.id
    ).all()
    saved_arc_ids = {s.arc_id for s in saved_rows}
    saved_arcs = (
        db.query(OutputSchema).filter(OutputSchema.id.in_(saved_arc_ids)).all()
        if saved_arc_ids else []
    )

    result = [_to_summary(a, is_saved=False) for a in own]
    result += [_to_summary(a, is_saved=True) for a in saved_arcs]
    result.sort(key=lambda x: x.created_at or datetime.min, reverse=True)
    return result


@router.post("/", status_code=status.HTTP_202_ACCEPTED)
async def start_generation(
    request: ArcRequestModel,
    background_tasks: BackgroundTasks,
    current_user: Annotated[UserSchema, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    job_id = str(uuid.uuid4())
    jobs[job_id] = {"status": "FETCHING_ARTICLES"}

    db.add(JobSchema(id=job_id, user_id=current_user.id, prompt=request.prompt, status="FETCHING_ARTICLES"))
    db.commit()

    loop = asyncio.get_running_loop()
    background_tasks.add_task(_run_pipeline_bg, job_id, request.prompt, loop, current_user.id)
    return {"job_id": job_id, "status": "FETCHING_ARTICLES"}


@router.get("/jobs/active", response_model=list[ActiveJobModel])
async def get_active_jobs(
    current_user: Annotated[UserSchema, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """Return all non-terminal jobs for the current user (cross-device)."""
    active = (
        db.query(JobSchema)
        .filter(
            JobSchema.user_id == current_user.id,
            JobSchema.status.notin_(["COMPLETED", "FAILED"]),
        )
        .order_by(JobSchema.created_at.desc())
        .all()
    )
    return [ActiveJobModel(job_id=j.id, prompt=j.prompt, status=j.status, created_at=j.created_at) for j in active]


@router.get("/status/{job_id}")
async def get_status(job_id: str, db: Session = Depends(get_db)):
    # In-memory dict is authoritative while the job is running in this process.
    # Fall back to DB for cross-device polling or after a server restart.
    if job_id in jobs:
        return jobs[job_id]
    record = db.query(JobSchema).filter(JobSchema.id == job_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"status": record.status}


@router.get("/stream/{job_id}")
async def stream_status(job_id: str, request: Request):
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    q: asyncio.Queue = asyncio.Queue()
    with _sub_lock:
        _subscribers.setdefault(job_id, []).append(q)
    await q.put(jobs[job_id]["status"])

    async def event_stream() -> AsyncGenerator[str, None]:
        try:
            while True:
                if await request.is_disconnected():
                    break
                try:
                    s: str = await asyncio.wait_for(q.get(), timeout=20.0)
                    yield f"data: {json.dumps({'status': s})}\n\n"
                    if s in ("COMPLETED", "FAILED"):
                        break
                except asyncio.TimeoutError:
                    yield ": keepalive\n\n"
        finally:
            with _sub_lock:
                subs = _subscribers.get(job_id, [])
                if q in subs:
                    subs.remove(q)

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@router.get("/{arc_id}", response_model=OutputModel)
async def get_arc(
    arc_id: str,
    current_user: Annotated[UserSchema, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    arc = db.query(OutputSchema).filter(OutputSchema.id == arc_id).first()
    if not arc:
        raise HTTPException(status_code=404, detail="Arc not found")

    is_owner = arc.user_id == current_user.id
    is_saved = db.query(SavedArcSchema).filter(
        SavedArcSchema.user_id == current_user.id,
        SavedArcSchema.arc_id == arc_id,
    ).first() is not None

    if not is_owner and not is_saved and not arc.is_shared:
        raise HTTPException(status_code=403, detail="Access denied")

    return _to_detail(arc, is_saved=is_saved)


@router.patch("/{arc_id}/share")
async def toggle_share(
    arc_id: str,
    current_user: Annotated[UserSchema, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    arc = db.query(OutputSchema).filter(OutputSchema.id == arc_id).first()
    if not arc:
        raise HTTPException(status_code=404, detail="Arc not found")
    if arc.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    if arc.is_shared:
        arc.is_shared    = False
        arc.share_token  = None
        db.commit()
        return {"is_shared": False, "share_token": None}
    else:
        token           = arc.share_token or secrets.token_urlsafe(48)
        arc.is_shared   = True
        arc.share_token = token
        db.commit()
        return {"is_shared": True, "share_token": token}


@router.post("/{arc_id}/regenerate", status_code=status.HTTP_202_ACCEPTED)
async def regenerate_arc(
    arc_id: str,
    background_tasks: BackgroundTasks,
    current_user: Annotated[UserSchema, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    arc = db.query(OutputSchema).filter(OutputSchema.id == arc_id).first()
    if not arc:
        raise HTTPException(status_code=404, detail="Arc not found")
    if arc.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Original prompt is stored in the job whose id == arc_id
    original_job = db.query(JobSchema).filter(JobSchema.id == arc_id).first()
    if not original_job or not original_job.prompt:
        raise HTTPException(status_code=422, detail="Original prompt not found — cannot regenerate")

    new_job_id = str(uuid.uuid4())
    jobs[new_job_id] = {"status": "FETCHING_ARTICLES"}
    db.add(JobSchema(id=new_job_id, user_id=current_user.id, prompt=original_job.prompt, status="FETCHING_ARTICLES"))
    db.commit()

    loop = asyncio.get_running_loop()
    background_tasks.add_task(_run_pipeline_bg, new_job_id, original_job.prompt, loop, current_user.id)
    return {"job_id": new_job_id, "status": "FETCHING_ARTICLES"}


@router.delete("/{arc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_arc(
    arc_id: str,
    current_user: Annotated[UserSchema, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    arc = db.query(OutputSchema).filter(OutputSchema.id == arc_id).first()
    if not arc:
        raise HTTPException(status_code=404, detail="Arc not found")
    if arc.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Best-effort GCS cleanup — derive the blob path from the public URL
    if arc.html and arc.html.startswith("https://storage.googleapis.com/"):
        # URL format: https://storage.googleapis.com/{bucket}/{path}
        parts = arc.html.split("/", 4)
        if len(parts) == 5:
            delete_blob(parts[4])

    # Delete associated notifications (no FK cascade on this table)
    db.query(NotificationSchema).filter(NotificationSchema.job_id == arc_id).delete()

    # saved_arcs cascade via FK; delete the output row last
    db.delete(arc)
    db.commit()


@router.post("/notify")
async def register_notification(
    request: NotifyRequestModel,
    current_user: Annotated[UserSchema, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> dict:
    # Verify job exists and belongs to current user
    job_record = db.query(JobSchema).filter(
        JobSchema.id == request.job_id,
        JobSchema.user_id == current_user.id,
    ).first()
    if not job_record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    # Check current job status (prefer in-memory over DB for freshness)
    in_memory = jobs.get(request.job_id)
    current_status: str = in_memory["status"] if in_memory else job_record.status

    if current_status == "COMPLETED":
        # Arc already ready — send immediately
        try:
            send_push_notification(request.fcm_token, request.job_id)
        except Exception as exc:
            logger.error("Immediate push failed for job %s: %s", request.job_id, exc)
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Failed to send push notification",
            ) from exc
        return {"message": "Arc is already ready — notification sent"}

    if current_status == "FAILED":
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Job failed — nothing to notify about",
        )

    # Upsert: one record per job+user, update token if it changed
    existing = db.query(NotificationSchema).filter(
        NotificationSchema.job_id == request.job_id,
        NotificationSchema.email == current_user.email,
        NotificationSchema.sent_at.is_(None),
    ).first()

    if existing:
        existing.fcm_token = request.fcm_token  # refresh token in case it rotated
    else:
        db.add(NotificationSchema(
            job_id=request.job_id,
            email=current_user.email,
            fcm_token=request.fcm_token,
        ))
    db.commit()
    return {"message": "You'll be notified when your arc is ready"}
