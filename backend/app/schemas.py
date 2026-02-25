from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

class TranscriptEntryCreate(BaseModel):
    timestamp: float
    speaker: str
    text: str
    sentiment: Dict[str, Any]

class TranscriptEntryResponse(TranscriptEntryCreate):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class ActionItemCreate(BaseModel):
    task: str
    assignee: str
    deadline: Optional[str] = None
    priority: str = "medium"

class ActionItemResponse(ActionItemCreate):
    id: int
    status: str
    
    class Config:
        from_attributes = True

class MeetingCreate(BaseModel):
    title: str

class MeetingResponse(BaseModel):
    id: str
    title: str
    created_at: datetime
    status: str
    summary: Optional[str] = None
    
    class Config:
        from_attributes = True

class SentimentData(BaseModel):
    overall: str
    confidence: float
    emotions: Dict[str, float]
    meeting_tone: str
    urgency_detected: bool