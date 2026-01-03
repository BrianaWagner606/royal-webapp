# app/routers/quiz.py
from fastapi import APIRouter, UploadFile, File, Depends
from typing import List
from sqlalchemy.orm import Session
from app.services import QuizService
from app.database import get_db
from app.models import User
from pydantic import BaseModel

router = APIRouter(prefix="/quiz", tags=["Quiz"])
quiz_service = QuizService()

# 1. Generate Quiz (Now reads the PDF!)
@router.post("/generate")
async def generate_quiz(file: UploadFile = File(...)):
    # Read the file into memory
    content = file.file
    return await quiz_service.generate_quiz_from_pdf(content)

# 2. Claim Points (New simplified endpoint)
class EarnRequest(BaseModel):
    energy: int

@router.post("/earn")
async def earn_energy(request: EarnRequest, db: Session = Depends(get_db)):
    """
    Frontend tells us they got it right. We reward them.
    """
    new_total = quiz_service.record_energy(db, request.energy)
    return {"status": "success", "total_energy": new_total}

# 3. Get Balance
@router.get("/energy")
async def get_current_energy(db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == 1).first()
    return {"energy": user.energy if user else 0}