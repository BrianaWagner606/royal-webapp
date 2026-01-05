# royal-webapp/app/tasks.py
from app.celery_client import celery_app
from app.services import QuizService

# Survivor Reminder: This file defines the jobs our background worker can do.
# The main app will "dispatch" these tasks, and the worker will pick them up.

@celery_app.task(name="generate_quiz_task")
def generate_quiz_task(text: str, location_note: str):
    """
    This function runs in the background (on the Redis container).
    It effectively 'imports' the smart logic we wrote earlier.
    """
    print(f"🔧 Worker: Starting quiz generation for {location_note}...")
    
    # We instantiate the service fresh for this specific job
    service = QuizService()
    
    # We call the heavy logic (the one with the backoff armor)
    # Since this is in the background, it can take 20 seconds and the user won't freeze.
    quiz_data = service._generate_quiz_smart(text, location_note)
    
    print("✅ Worker: Job complete. Payload secured.")
    return quiz_data