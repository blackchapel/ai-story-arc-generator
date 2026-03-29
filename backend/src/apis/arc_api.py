import uuid
from fastapi import APIRouter, BackgroundTasks, HTTPException, Depends
from sqlalchemy.orm import Session

from src.database import get_db
from src.services.arc_service import run_pipeline
from src.models.arc_request_model import ArcRequestModel
from src.models.output_model import OutputModel
from src.schemas.output_schema import OutputSchema

router = APIRouter()

jobs = {}

def execute_generation(job_id: str, topic: str):
    run_pipeline(topic, job_id, jobs)

@router.get("/", response_model=list[OutputModel])
async def get_all_arcs(db: Session = Depends(get_db)):
    all_outputs = db.query(OutputSchema).all()
    return all_outputs

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