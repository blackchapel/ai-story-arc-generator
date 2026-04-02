import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, BackgroundTasks, HTTPException, Depends
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

jobs = {}

def execute_generation(job_id: str, topic: str):
    run_pipeline(topic, job_id, jobs)

@router.get("/", response_model=list[OutputSummaryModel])
async def get_all_arcs(db: Session = Depends(get_db)):
    all_outputs = db.query(OutputSchema).all()
    return all_outputs

@router.get("/{arc_id}", response_model=OutputModel)
async def get_all_arcs(arc_id: str, db: Session = Depends(get_db)):
    output = db.query(OutputSchema).get(arc_id)
    return output

@router.post("/")
async def start_generation(request: ArcRequestModel, background_tasks: BackgroundTasks):
    job_id = str(uuid.uuid4())
    jobs[job_id] = {"status": "queued", "output_url": ""}
    
    background_tasks.add_task(execute_generation, job_id, request.prompt)
    
    return {"job_id": job_id, "status": "queued"}

@router.get("/status/{job_id}")
async def get_status(job_id: str):
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    return jobs[job_id]


@router.post("/notify")
async def register_notification(
    request: NotifyRequestModel,
    db: Session = Depends(get_db),
):
    if request.job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    job = jobs[request.job_id]

    # Job already done — send immediately, no need to store
    if job["status"] == "COMPLETED":
        try:
            send_arc_ready_email(request.email, request.job_id)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to send email: {e}")
        return {"message": "Arc is already ready — email sent now"}

    if job["status"] == "FAILED":
        raise HTTPException(status_code=410, detail="Job failed — no arc to notify about")

    notification = NotificationSchema(job_id=request.job_id, email=request.email)
    db.add(notification)
    db.commit()
    return {"message": "You'll receive an email when your arc is ready"}