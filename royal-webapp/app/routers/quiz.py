# app/routers/quiz.py
from fastapi import APIRouter, UploadFile, File
from typing import List
from app.schemas import QuestionPublic, AnswerSubmission, AnswerResult
from app.services import QuizService

# I am creating a router specifically for Quiz functionality
router = APIRouter(prefix="/quiz", tags=["Quiz"])
quiz_service = QuizService()

@router.post("/generate", response_model=List[QuestionPublic])
async def generate_quiz(file: UploadFile = File(...)):
    # I delegate the logic to my service
    return await quiz_service.generate_mock_quiz()

@router.post("/submit", response_model=AnswerResult)
async def submit_answer(submission: AnswerSubmission):
    is_correct = quiz_service.check_answer(submission.question_id, submission.selected_option)
    
    if is_correct:
        return {"result": "Correct", "energy_earned": 100}
    else:
        return {"result": "Incorrect", "energy_earned": 0}