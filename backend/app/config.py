from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    # OpenAI (optional - bisa kosong untuk mode gratis)
    OPENAI_API_KEY: str = ""
    
    # Groq (GRATIS - whisper + llm)
    GROQ_API_KEY: str = ""
    
    # Mode: "openai", "groq", atau "local"
    TRANSCRIPTION_MODE: str = "groq"  # Default ke gratis
    LLM_MODE: str = "groq"            # Default ke gratis
    
    DATABASE_URL: str = "sqlite:///./meetings.db"
    REDIS_URL: str = "redis://localhost:6379"
    
    class Config:
        env_file = ".env"

@lru_cache()
def get_settings():
    return Settings()

settings = get_settings()