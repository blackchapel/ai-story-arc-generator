import asyncio
import json
import threading
import uuid
from typing import AsyncGenerator

from fastapi import APIRouter, BackgroundTasks, HTTPException, Depends, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from src.database import get_db
from src.services.arc_service import run_pipeline
from src.services.email_service import send_arc_ready_email
from src.models.arc_request_model import ArcRequestModel
from src.models.notification_model import NotifyRequestModel
from src.models.output_model import OutputModel, OutputSummaryModel
from src.schemas.output_schema import OutputSchema
from src.schemas.notification_schema import NotificationSchema

router = APIRouter()

# Last-known status per job — lets reconnecting SSE clients catch up instantly.
jobs: dict[str, dict] = {}

# One asyncio.Queue per connected SSE client, keyed by job_id.
# _sub_lock guards mutations from both the event loop and background threads.
_subscribers: dict[str, list[asyncio.Queue]] = {}
_sub_lock = threading.Lock()


def _broadcast(job_id: str, status: str, loop: asyncio.AbstractEventLoop) -> None:
    """Push a status string from a background thread to all SSE queues for this job."""
    async def _push() -> None:
        with _sub_lock:
            queues = list(_subscribers.get(job_id, []))
        for q in queues:
            await q.put(status)

    asyncio.run_coroutine_threadsafe(_push(), loop)


def _run_pipeline_bg(job_id: str, topic: str, loop: asyncio.AbstractEventLoop) -> None:
    def on_status(status: str) -> None:
        jobs[job_id]["status"] = status
        _broadcast(job_id, status, loop)

    run_pipeline(topic, job_id, on_status=on_status)


@router.get("/", response_model=list[OutputSummaryModel])
async def get_all_arcs(db: Session = Depends(get_db)):
    return db.query(OutputSchema).order_by(OutputSchema.created_at.desc()).all()


@router.get("/status/{job_id}")
async def get_status(job_id: str):
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    return jobs[job_id]


@router.get("/stream/{job_id}")
async def stream_status(job_id: str, request: Request):
    """SSE — seeds the current status on connect so reconnects never miss state."""
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
                    status: str = await asyncio.wait_for(q.get(), timeout=20.0)
                    yield f"data: {json.dumps({'status': status})}\n\n"
                    if status in ("COMPLETED", "FAILED"):
                        break
                except asyncio.TimeoutError:
                    yield ": keepalive\n\n"  # prevent proxy/Cloud Run idle timeout
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
            "X-Accel-Buffering": "no",  # disable nginx / Cloud Run response buffering
            "Connection": "keep-alive",
        },
    )


@router.post("/")
async def start_generation(request: ArcRequestModel, background_tasks: BackgroundTasks):
    job_id = str(uuid.uuid4())
    jobs[job_id] = {"status": "FETCHING_ARTICLES"}
    loop = asyncio.get_event_loop()
    background_tasks.add_task(_run_pipeline_bg, job_id, request.prompt, loop)
    return {"job_id": job_id, "status": "FETCHING_ARTICLES"}


@router.get("/{arc_id}", response_model=OutputModel)
async def get_arc(arc_id: str, db: Session = Depends(get_db)):
    output = db.query(OutputSchema).get(arc_id)
    if not output:
        raise HTTPException(status_code=404, detail="Arc not found")
    return output


@router.post("/notify")
async def register_notification(request: NotifyRequestModel, db: Session = Depends(get_db)):
    if request.job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    job = jobs[request.job_id]

    if job["status"] == "COMPLETED":
        try:
            send_arc_ready_email(request.email, request.job_id)
        except Exception as exc:
            raise HTTPException(status_code=500, detail="Failed to send email") from exc
        return {"message": "Arc is already ready — email sent now"}

    if job["status"] == "FAILED":
        raise HTTPException(status_code=410, detail="Job failed — no arc to notify about")

    db.add(NotificationSchema(job_id=request.job_id, email=request.email))
    db.commit()
    return {"message": "You'll receive an email when your arc is ready"}
