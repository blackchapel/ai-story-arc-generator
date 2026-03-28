import os
import uuid
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi import FastAPI, BackgroundTasks, HTTPException
from pydantic import BaseModel

from src.services.generate_arc import run_pipeline

app = FastAPI(title="Story Arc Generator API")

current_dir = os.path.dirname(os.path.realpath(__file__))
output_path = os.path.join(current_dir, "../output")
app.mount("/output", StaticFiles(directory=output_path), name="output")

class TopicRequest(BaseModel):
    topic: str

jobs = {}

def execute_generation(job_id: str, topic: str):
    try:
        jobs[job_id]["status"] = "processing"
        
        run_pipeline(topic, job_id)
        
        jobs[job_id]["status"] = "completed"
        jobs[job_id]["output_url"] = f"http://localhost:8000/output/{job_id}/index.html"
    except Exception as e:
        jobs[job_id]["status"] = "failed"
        jobs[job_id]["error"] = str(e)

@app.post("/generate")
async def start_generation(request: TopicRequest, background_tasks: BackgroundTasks):
    """
    Accepts a new topic and triggers the full Story Arc pipeline.
    """
    job_id = str(uuid.uuid4())
    jobs[job_id] = {"status": "queued", "output_url": ""}
    
    background_tasks.add_task(execute_generation, job_id, request.topic)
    
    return {"job_id": job_id, "status": "queued"}

@app.get("/status/{job_id}")
async def get_status(job_id: str):
    """
    Check the progress of a specific generation job.
    """
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    return jobs[job_id]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)