from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from contextlib import asynccontextmanager
import json
import uuid
from datetime import datetime
from typing import Dict, List
import asyncio
import time

from config import settings
from models import get_db, Meeting, TranscriptEntry, ActionItem
from schemas import MeetingCreate, MeetingResponse, TranscriptEntryCreate
from services.transcription import WhisperTranscriber
from services.sentiment import SentimentAnalyzer
from services.llm_processor import LLMProcessor

# Global instances
transcriber = None
sentiment_analyzer = None
llm_processor = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global transcriber, sentiment_analyzer, llm_processor
    print("🚀 Starting up AI Meeting Assistant...")
    
    transcriber = WhisperTranscriber()
    sentiment_analyzer = SentimentAnalyzer()
    llm_processor = LLMProcessor()
    
    print("✅ Services initialized")
    yield
    print("🛑 Shutting down...")

app = FastAPI(
    title="AI Meeting Assistant",
    description="Real-time transcription, sentiment analysis, and meeting insights",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.meeting_buffers: Dict[str, List[dict]] = {}
        self.audio_buffers: Dict[str, bytes] = {}  # Buffer untuk accumulate audio
        self.last_process_time: Dict[str, float] = {}  # Rate limiting
    
    async def connect(self, websocket: WebSocket, meeting_id: str):
        await websocket.accept()
        self.active_connections[meeting_id] = websocket
        self.meeting_buffers[meeting_id] = []
        self.audio_buffers[meeting_id] = b''
        self.last_process_time[meeting_id] = 0
        print(f"🔗 Meeting {meeting_id} connected")
    
    def disconnect(self, meeting_id: str):
        for key in [self.active_connections, self.meeting_buffers, 
                   self.audio_buffers, self.last_process_time]:
            if meeting_id in key:
                del key[meeting_id]
        print(f"❌ Meeting {meeting_id} disconnected")
    
    async def send_message(self, meeting_id: str, message: dict):
        if meeting_id in self.active_connections:
            try:
                await self.active_connections[meeting_id].send_json(message)
            except:
                pass

manager = ConnectionManager()

@app.post("/meetings", response_model=MeetingResponse)
async def create_meeting(meeting: MeetingCreate, db: Session = Depends(get_db)):
    meeting_id = str(uuid.uuid4())[:8]
    db_meeting = Meeting(
        id=meeting_id,
        title=meeting.title,
        status="active"
    )
    db.add(db_meeting)
    db.commit()
    db.refresh(db_meeting)
    return db_meeting

@app.get("/meetings/{meeting_id}", response_model=MeetingResponse)
async def get_meeting(meeting_id: str, db: Session = Depends(get_db)):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return meeting

@app.get("/meetings/{meeting_id}/transcript")
async def get_transcript(meeting_id: str, db: Session = Depends(get_db)):
    entries = db.query(TranscriptEntry).filter(
        TranscriptEntry.meeting_id == meeting_id
    ).order_by(TranscriptEntry.timestamp).all()
    return entries

@app.get("/meetings/{meeting_id}/action-items")
async def get_action_items(meeting_id: str, db: Session = Depends(get_db)):
    items = db.query(ActionItem).filter(ActionItem.meeting_id == meeting_id).all()
    return items

@app.websocket("/ws/meeting/{meeting_id}")
async def websocket_endpoint(websocket: WebSocket, meeting_id: str, db: Session = Depends(get_db)):
    await manager.connect(websocket, meeting_id)
    
    try:
        while True:
            message = await websocket.receive()
            
            if message["type"] == "websocket.receive":
                if "bytes" in message:
                    audio_data = message["bytes"]
                    
                    # Accumulate audio chunks (buffering)
                    manager.audio_buffers[meeting_id] += audio_data
                    
                    # Process setiap 3 detik (rate limiting)
                    current_time = time.time()
                    time_since_last = current_time - manager.last_process_time.get(meeting_id, 0)
                    
                    # Process jika buffer cukup besar (>5 detik audio) atau sudah 3 detik sejak terakhir
                    buffer_duration = len(manager.audio_buffers[meeting_id]) / (16000 * 2)  # 16kHz, 16-bit
                    
                    if buffer_duration >= 5.0 or (time_since_last >= 3.0 and buffer_duration >= 2.0):
                        await process_audio_buffer(meeting_id, db)
                        manager.last_process_time[meeting_id] = current_time
                        
                elif "text" in message:
                    data = json.loads(message["text"])
                    command = data.get("command")
                    
                    if command == "finalize":
                        # Process sisa buffer
                        if manager.audio_buffers.get(meeting_id):
                            await process_audio_buffer(meeting_id, db)
                        await finalize_meeting(meeting_id, db)
                    elif command == "ping":
                        await manager.send_message(meeting_id, {"type": "pong"})
                        
    except WebSocketDisconnect:
        manager.disconnect(meeting_id)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(meeting_id)

async def process_audio_buffer(meeting_id: str, db: Session):
    """Process accumulated audio buffer"""
    global transcriber, sentiment_analyzer
    
    audio_data = manager.audio_buffers.get(meeting_id, b'')
    if len(audio_data) < 32000:  # Minimal 1 detik audio (16kHz * 2 bytes)
        return
    
    # Clear buffer
    manager.audio_buffers[meeting_id] = b''
    
    try:
        # 1. Transcribe
        transcript_result = await transcriber.transcribe_chunk(audio_data)
        
        if not transcript_result.get("text", "").strip():
            return
        
        text = transcript_result["text"]
        print(f"📝 Transcribed: {text[:100]}...")
        
        # 2. Analyze sentiment
        sentiment = await sentiment_analyzer.analyze(text)
        
        # 3. Create entry
        entry = {
            "timestamp": transcript_result.get("start", 0),
            "speaker": transcript_result.get("speaker", "Speaker A"),
            "text": text,
            "sentiment": sentiment
        }
        
        # 4. Save to buffer dan database
        manager.meeting_buffers[meeting_id].append(entry)
        
        db_entry = TranscriptEntry(
            meeting_id=meeting_id,
            timestamp=entry["timestamp"],
            speaker=entry["speaker"],
            text=entry["text"],
            sentiment=entry["sentiment"]
        )
        db.add(db_entry)
        db.commit()
        
        # 5. Send to client
        await manager.send_message(meeting_id, {
            "type": "transcript",
            "data": entry
        })
        
        # 6. Periodic insight extraction (every 3 entries)
        if len(manager.meeting_buffers[meeting_id]) % 3 == 0:
            asyncio.create_task(extract_insights(meeting_id, db))
            
    except Exception as e:
        print(f"Process buffer error: {e}")
        await manager.send_message(meeting_id, {
            "type": "error",
            "message": str(e)
        })

async def extract_insights(meeting_id: str, db: Session):
    """Extract insights dari buffer terakhir"""
    global llm_processor
    
    buffer = manager.meeting_buffers.get(meeting_id, [])
    if len(buffer) < 2:
        return
    
    # Ambil 5 entry terakhir
    recent = buffer[-5:]
    transcript_text = "\n".join([f"{r['speaker']}: {r['text']}" for r in recent])
    
    try:
        insights = await llm_processor.extract_insights(transcript_text)
        
        # Save action items ke database
        for item in insights.get("action_items", []):
            # Cek duplicate
            existing = db.query(ActionItem).filter(
                ActionItem.meeting_id == meeting_id,
                ActionItem.task == item["task"]
            ).first()
            
            if not existing:
                db_item = ActionItem(
                    meeting_id=meeting_id,
                    task=item["task"],
                    assignee=item["assignee"],
                    deadline=item.get("deadline"),
                    priority=item.get("priority", "medium")
                )
                db.add(db_item)
        
        db.commit()
        
        # Send ke client
        await manager.send_message(meeting_id, {
            "type": "insights",
            "data": insights
        })
        
    except Exception as e:
        print(f"Insight extraction error: {e}")

async def finalize_meeting(meeting_id: str, db: Session):
    """Generate final summary dan complete meeting"""
    global llm_processor
    
    buffer = manager.meeting_buffers.get(meeting_id, [])
    if not buffer:
        await manager.send_message(meeting_id, {
            "type": "error",
            "message": "No transcript data to summarize"
        })
        return
    
    # Build full transcript
    full_transcript = "\n".join([f"{b['speaker']}: {b['text']}" for b in buffer])
    
    try:
        # Generate summary
        summary = await llm_processor.generate_summary(full_transcript)
        
        # Update meeting
        meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
        if meeting:
            meeting.status = "completed"
            meeting.summary = json.dumps(summary)
            meeting.sentiment_overview = json.dumps({
                "overall_tone": summary.get("sentiment_overview", "neutral"),
                "participants": summary.get("participants_engagement", "unknown")
            })
            db.commit()
        
        # Send summary
        await manager.send_message(meeting_id, {
            "type": "summary",
            "data": summary
        })
        
        print(f"✅ Meeting {meeting_id} finalized")
        
    except Exception as e:
        print(f"Finalize error: {e}")
        await manager.send_message(meeting_id, {
            "type": "error",
            "message": f"Failed to generate summary: {str(e)}"
        })

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)