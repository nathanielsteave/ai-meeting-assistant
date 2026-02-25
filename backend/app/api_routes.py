from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import json
import queue
import time
import uuid

from models import get_db, Meeting, TranscriptEntry, ActionItem
from schemas import MeetingCreate, MeetingResponse
from services.transcription import WhisperTranscriber
from services.sentiment import SentimentAnalyzer
from services.llm_processor import LLMProcessor

router = APIRouter()

# Global instances (singleton untuk Vercel)
_transcriber = None
_sentiment = None
_llm = None
_audio_queues: Dict[str, queue.Queue] = {}
_transcript_buffers: Dict[str, List[dict]] = {}

def get_services():
    global _transcriber, _sentiment, _llm
    if _transcriber is None:
        _transcriber = WhisperTranscriber()
        _sentiment = SentimentAnalyzer()
        _llm = LLMProcessor()
    return _transcriber, _sentiment, _llm

@router.post("/meetings", response_model=MeetingResponse)
async def create_meeting(meeting: MeetingCreate, db: Session = Depends(get_db)):
    """Create new meeting"""
    meeting_id = str(uuid.uuid4())[:8]
    db_meeting = Meeting(
        id=meeting_id,
        title=meeting.title,
        status="active"
    )
    db.add(db_meeting)
    db.commit()
    db.refresh(db_meeting)
    
    # Init queue untuk audio chunks
    _audio_queues[meeting_id] = queue.Queue()
    _transcript_buffers[meeting_id] = []
    
    return db_meeting

@router.get("/meetings/{meeting_id}")
async def get_meeting(meeting_id: str, db: Session = Depends(get_db)):
    """Get meeting details"""
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return meeting

@router.get("/meetings/{meeting_id}/transcript")
async def get_transcript(meeting_id: str, db: Session = Depends(get_db)):
    """Get transcript (polling endpoint)"""
    entries = db.query(TranscriptEntry).filter(
        TranscriptEntry.meeting_id == meeting_id
    ).order_by(TranscriptEntry.timestamp).all()
    return entries

@router.get("/meetings/{meeting_id}/action-items")
async def get_action_items(meeting_id: str, db: Session = Depends(get_db)):
    """Get action items"""
    items = db.query(ActionItem).filter(ActionItem.meeting_id == meeting_id).all()
    return items

@router.post("/meetings/{meeting_id}/audio")
async def upload_audio(
    meeting_id: str,
    background_tasks: BackgroundTasks,
    audio_data: bytes,
    db: Session = Depends(get_db)
):
    """Upload audio chunk untuk diproses"""
    if meeting_id not in _audio_queues:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    # Simpan ke queue untuk diproses async
    _audio_queues[meeting_id].put(audio_data)
    
    # Trigger processing
    background_tasks.add_task(process_audio_queue, meeting_id, db)
    
    return {"status": "received", "queue_size": _audio_queues[meeting_id].qsize()}

async def process_audio_queue(meeting_id: str, db: Session):
    """Process audio dari queue"""
    transcriber, sentiment_analyzer, llm = get_services()
    
    try:
        # Ambil semua audio dari queue
        audio_parts = []
        while not _audio_queues[meeting_id].empty():
            audio_parts.append(_audio_queues[meeting_id].get())
        
        if not audio_parts:
            return
        
        # Combine audio chunks
        combined_audio = b''.join(audio_parts)
        
        # Transcribe
        result = await transcriber.transcribe_chunk(combined_audio)
        
        if not result.get("text", "").strip():
            return
        
        # Analyze sentiment
        sentiment = await sentiment_analyzer.analyze(result["text"])
        
        # Save to DB
        entry = {
            "timestamp": result.get("start", 0),
            "speaker": result.get("speaker", "Speaker A"),
            "text": result["text"],
            "sentiment": sentiment
        }
        
        _transcript_buffers[meeting_id].append(entry)
        
        db_entry = TranscriptEntry(
            meeting_id=meeting_id,
            timestamp=entry["timestamp"],
            speaker=entry["speaker"],
            text=entry["text"],
            sentiment=entry["sentiment"]
        )
        db.add(db_entry)
        db.commit()
        
        # Extract insights setiap 5 entries
        if len(_transcript_buffers[meeting_id]) % 5 == 0:
            recent = _transcript_buffers[meeting_id][-5:]
            transcript_text = "\n".join([f"{r['speaker']}: {r['text']}" for r in recent])
            insights = await llm.extract_insights(transcript_text)
            
            # Save action items
            for item in insights.get("action_items", []):
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
            
    except Exception as e:
        print(f"Process error: {e}")

@router.post("/meetings/{meeting_id}/finalize")
async def finalize_meeting(meeting_id: str, db: Session = Depends(get_db)):
    """Generate summary dan complete meeting"""
    transcriber, sentiment_analyzer, llm = get_services()
    
    buffer = _transcript_buffers.get(meeting_id, [])
    if not buffer:
        raise HTTPException(status_code=400, detail="No transcript data")
    
    # Generate summary
    full_transcript = "\n".join([f"{b['speaker']}: {b['text']}" for b in buffer])
    summary = await llm.generate_summary(full_transcript)
    
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
    
    # Cleanup
    if meeting_id in _audio_queues:
        del _audio_queues[meeting_id]
    if meeting_id in _transcript_buffers:
        del _transcript_buffers[meeting_id]
    
    return summary

@router.get("/meetings/{meeting_id}/events")
async def event_stream(meeting_id: str, db: Session = Depends(get_db)):
    """Server-Sent Events untuk real-time updates (alternatif WebSocket)"""
    async def generate():
        last_count = 0
        
        while True:
            # Check new transcript entries
            entries = db.query(TranscriptEntry).filter(
                TranscriptEntry.meeting_id == meeting_id
            ).order_by(TranscriptEntry.timestamp).all()
            
            if len(entries) > last_count:
                new_entries = entries[last_count:]
                for entry in new_entries:
                    data = {
                        "type": "transcript",
                        "data": {
                            "timestamp": entry.timestamp,
                            "speaker": entry.speaker,
                            "text": entry.text,
                            "sentiment": entry.sentiment
                        }
                    }
                    yield f"data: {json.dumps(data)}\n\n"
                last_count = len(entries)
            
            # Check if meeting ended
            meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
            if meeting and meeting.status == "completed":
                yield f"data: {json.dumps({'type': 'ended'})}\n\n"
                break
            
            await asyncio.sleep(1)  # Poll every second
    
    return StreamingResponse(generate(), media_type="text/event-stream")