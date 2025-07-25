from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import os
import shutil
import uuid
from typing import List, Dict, Any
import aiofiles
import asyncio
from concurrent.futures import ThreadPoolExecutor

from video_processing import process_video_background

app = FastAPI()
executor = ThreadPoolExecutor()

# CORS configuration
origins = [
    "http://localhost:3000",
    "http://localhost:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

APP_ROOT = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(APP_ROOT, 'uploads')
PROCESSED_FOLDER = os.path.join(APP_ROOT, 'processed')
ALLOWED_EXTENSIONS = {'mp4', 'webm', 'ogg', 'avi', 'mov'}

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(PROCESSED_FOLDER, exist_ok=True)

processing_status: Dict[str, Dict[str, Any]] = {}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.post("/upload")
async def upload_files(videos: List[UploadFile] = File(...)):
    if len(videos) != 5:
        raise HTTPException(status_code=400, detail="Exactly 5 videos are required")

    session_id = str(uuid.uuid4())
    session_folder = os.path.join(UPLOAD_FOLDER, session_id)
    os.makedirs(session_folder, exist_ok=True)

    processing_status[session_id] = {'status': 'uploading', 'step': 'Uploading files...', 'progress': 0}

    for i, video in enumerate(videos):
        if not allowed_file(video.filename):
            raise HTTPException(status_code=400, detail=f"Invalid file type: {video.filename}")
        
        filename = f"video{i+1}.mp4"
        filepath = os.path.join(session_folder, filename)
        
        try:
            async with aiofiles.open(filepath, 'wb') as out_file:
                content = await video.read()
                await out_file.write(content)
        except Exception as e:
            shutil.rmtree(session_folder)
            raise HTTPException(status_code=500, detail=f"Error uploading file: {str(e)}")

    processing_status[session_id] = {'status': 'uploaded', 'step': 'Upload complete', 'progress': 100}
    
    return {"message": "Files uploaded successfully", "session_id": session_id}

@app.post("/process")
async def process_video(
    session_id: str = Form(...),
    main_title: str = Form(...),
    main_title_color: str = Form(...),
    moment_titles: str = Form(...), # JSON string
    start_time: float = Form(...),
):
    import json
    moment_titles_list = json.loads(moment_titles)

    if not session_id or not os.path.exists(os.path.join(UPLOAD_FOLDER, session_id)):
        raise HTTPException(status_code=404, detail="Session not found")

    if len(moment_titles_list) != 5:
        raise HTTPException(status_code=400, detail="Exactly 5 moment titles are required")

    loop = asyncio.get_event_loop()
    loop.run_in_executor(
        executor,
        process_video_background,
        session_id,
        main_title,
        main_title_color,
        moment_titles_list,
        start_time,
        100, # Hardcoded Y position
        processing_status,
        UPLOAD_FOLDER,
        PROCESSED_FOLDER
    )

    return {"message": "Video processing started", "session_id": session_id, "status_url": f"/status/{session_id}"}

@app.get("/status/{session_id}")
async def get_processing_status(session_id: str):
    if session_id not in processing_status:
        raise HTTPException(status_code=404, detail="Session not found")
    return JSONResponse(content=processing_status[session_id])

@app.get("/download/{session_id}")
async def download_video(session_id: str):
    final_output = os.path.join(PROCESSED_FOLDER, session_id, "final_output.mp4")
    if not os.path.exists(final_output):
        raise HTTPException(status_code=404, detail="Processed video not found")
    return FileResponse(final_output, media_type='video/mp4', filename=f"merged_video_{session_id}.mp4")

@app.get("/preview/{session_id}")
async def preview_video(session_id: str):
    final_output = os.path.join(PROCESSED_FOLDER, session_id, "final_output.mp4")
    if not os.path.exists(final_output):
        raise HTTPException(status_code=404, detail="Processed video not found")
    return FileResponse(final_output, media_type='video/mp4')

@app.delete("/cleanup/{session_id}")
async def cleanup_session(session_id: str):
    if session_id in processing_status:
        del processing_status[session_id]
    
    upload_path = os.path.join(UPLOAD_FOLDER, session_id)
    if os.path.exists(upload_path):
        shutil.rmtree(upload_path)
    
    processed_path = os.path.join(PROCESSED_FOLDER, session_id)
    if os.path.exists(processed_path):
        shutil.rmtree(processed_path)
        
    return {"message": "Session cleaned up successfully"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
