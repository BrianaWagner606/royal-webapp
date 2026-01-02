# app/main.py (Updated)
from fastapi import FastAPI
from dotenv import load_dotenv
from app.routers import quiz, system
from app.database import engine, Base # <--- New Import

# Load env vars
load_dotenv()

# I am creating the tables in the database if they don't exist yet.
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Citadel of Wisdom API",
    version="1.0.0"
)

app.include_router(system.router)
app.include_router(quiz.router)