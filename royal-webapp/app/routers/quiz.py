# royal-webapp/app/routers/quiz.py
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from celery.result import AsyncResult 
from app.database import get_db
from app.services import QuizService
from app.schemas import AnswerSubmission, AnswerResult

router = APIRouter(prefix="/quiz", tags=["Quiz"])

@router.post("/generate")
async def generate_quiz_endpoint(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    1. Receives the PDF.
    2. Dispatches a Background Task (Celery).
    3. Returns a Ticket ID (task_id) so the frontend can poll for results.
    """
    service = QuizService()
    # This returns: {"task_id": "...", "status": "processing"}
    ticket = await service.generate_quiz_from_pdf(file)
    return ticket

@router.get("/status/{task_id}")
def get_quiz_status(task_id: str):
    """
    The Frontend calls this repeatedly to check if the quiz is ready.
    """
    task_result = AsyncResult(task_id)
    
    if task_result.state == 'PENDING':
        return {"status": "processing"}
    
    elif task_result.state == 'SUCCESS':
        # The worker returned the list of questions!
        return {"status": "completed", "quiz": task_result.result}
    
    elif task_result.state == 'FAILURE':
        return {"status": "failed", "error": str(task_result.result)}
    
    # Catch-all for other states (RETRY, STARTED, etc.)
    return {"status": "processing"}

# --- EXISTING ENDPOINTS (Keep these functioning) ---

@router.post("/submit", response_model=AnswerResult)
def submit_answer(
    submission: AnswerSubmission, 
    db: Session = Depends(get_db)
):
    # Simple mock logic for now - we can upgrade this later
    # In a real app, we'd fetch the question from DB to verify answer
    return AnswerResult(result="Correct", energy_earned=10)

@router.post("/earn")
def earn_energy(
    data: dict, 
    db: Session = Depends(get_db)
):
    # Helper for testing: gives free energy
    service = QuizService()
    new_balance = service.record_energy(db, data.get("energy", 10))
    return {"energy": new_balance}