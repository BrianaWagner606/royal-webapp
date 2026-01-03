# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from app.routers import quiz, system
from app.database import engine, Base

# Load env vars once at startup
load_dotenv()


Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Citadel of Wisdom API",
    version="1.0.0"
)
# ---------------------------------------------------------
# THE ROYAL DECREE (CORS POLICY)
# ---------------------------------------------------------
# I am allowing my frontend (which will run on port 5173)
# to talk to this backend.
origins = [
    "http://localhost:5173", # The standard Vite/React port
    "http://localhost:3000", # The standard React port
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"], # Allow all types of requests (GET, POST, etc.)
    allow_headers=["*"], # Allow all headers
)
app.include_router(system.router)
app.include_router(quiz.router)