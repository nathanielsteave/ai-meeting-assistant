from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from models import Base, engine
from api_routes import router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("🚀 Starting AI Meeting Assistant...")
    Base.metadata.create_all(bind=engine)
    yield
    print("🛑 Shutting down...")

app = FastAPI(
    title="AI Meeting Assistant API",
    description="Real-time meeting transcription API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS - Allow all origins untuk public access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include router
app.include_router(router, prefix="/api")

@app.get("/")
async def root():
    return {
        "message": "AI Meeting Assistant API",
        "docs": "/docs",
        "status": "running"
    }

@app.get("/health")
async def health():
    return {"status": "healthy"}