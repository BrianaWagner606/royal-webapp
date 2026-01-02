# app/main.py
from fastapi import FastAPI
from dotenv import load_dotenv
from app.routers import quiz, system

# Load env vars once at startup
load_dotenv()

app = FastAPI(
    title="Citadel of Wisdom API",
    version="1.0.0"
)

# I am connecting my routers (hallways) to the main app
app.include_router(system.router)
app.include_router(quiz.router)

# To run: poetry run uvicorn app.main:app --reload