# app/routers/system.py
from fastapi import APIRouter, HTTPException
from app.schemas import HealthCheck
import os

router = APIRouter(tags=["System"])

@router.get("/", response_model=HealthCheck)
async def root():
    return {
        "status": "Healthy",
        "version": "1.0.0",
        "message": "Welcome to the Modular Kingdom!"
    }

@router.get("/royal-secret")
async def get_secret():
    secret_value = os.getenv("ROYAL_SECRET_KEY", "No Secret Found")
    return {"secret_data": f"The key is: {secret_value}"}