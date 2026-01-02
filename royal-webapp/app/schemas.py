# app/schemas.py
from pydantic import BaseModel
from typing import List, Optional

# --- System Models ---
class HealthCheck(BaseModel):
    status: str
    version: str
    message: Optional[str] = None

# --- Quiz Models ---
class QuestionPublic(BaseModel):
    id: int
    question: str
    options: List[str]
    points: int

class AnswerSubmission(BaseModel):
    question_id: int
    selected_option: str

class AnswerResult(BaseModel):
    result: str
    energy_earned: int