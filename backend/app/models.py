from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text, Float, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime

from config import settings

engine = create_engine(settings.DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Meeting(Base):
    __tablename__ = "meetings"
    
    id = Column(String, primary_key=True, index=True)
    title = Column(String, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="active")  # active, completed
    summary = Column(Text, nullable=True)
    sentiment_overview = Column(JSON, nullable=True)

class TranscriptEntry(Base):
    __tablename__ = "transcript_entries"
    
    id = Column(Integer, primary_key=True, index=True)
    meeting_id = Column(String, index=True)
    timestamp = Column(Float)
    speaker = Column(String)
    text = Column(Text)
    sentiment = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)

class ActionItem(Base):
    __tablename__ = "action_items"
    
    id = Column(Integer, primary_key=True, index=True)
    meeting_id = Column(String, index=True)
    task = Column(Text)
    assignee = Column(String)
    deadline = Column(String, nullable=True)
    priority = Column(String, default="medium")
    status = Column(String, default="pending")

# Buat tabel
Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()