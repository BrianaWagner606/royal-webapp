# app/routers/quiz.py
from fastapi import APIRouter, UploadFile, File, Depends
from typing import List
from sqlalchemy.orm import Session 
from app.schemas import QuestionPublic, AnswerSubmission, AnswerResult
from app.services import QuizService
from app.database import get_db

# I am creating a router specifically for Quiz functionality
router = APIRouter(prefix="/quiz", tags=["Quiz"])
quiz_service = QuizService()

@router.post("/generate", response_model=List[QuestionPublic])
async def generate_quiz(file: UploadFile = File(...)):
    # I delegate the logic to my service
    return await quiz_service.generate_mock_quiz()

# app/routers/quiz.py

# ... (generate_quiz stays the same) ...

# REPLACE THE OLD submit_answer WITH THIS:
@router.post("/submit", response_model=AnswerResult)
async def submit_answer(
    submission: AnswerSubmission, 
    db: Session = Depends(get_db) # <--- We injected the database here
):
    """
    I accept the answer, check if it is right, and if so,
    I tell the service to update the database.
    """
    is_correct = quiz_service.check_answer(submission.question_id, submission.selected_option)
    
    if is_correct:
        # Calculate points (hardcoded 100 for now)
        points = 100
        
        # SAVE to Database
        new_total = quiz_service.record_energy(db, points)
        
        return {
            "result": "Correct", 
            "energy_earned": points,
        }
    else:
        return {"result": "Incorrect", "energy_earned": 0}