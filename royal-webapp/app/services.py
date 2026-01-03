# app/services.py
import asyncio
from sqlalchemy.orm import Session  # <--- NEW
from app.models import User         # <--- NEW

# My Secret Answer Key (Eventually this moves to a DB)
SECRET_ANSWER_KEY = {
    1: "Ada Lovelace",
    2: "HyperText Transfer Protocol"
}

class QuizService:
    """
    I am grouping all Quiz-related logic here.
    """
    
    async def generate_mock_quiz(self):
        """Simulate AI generation"""
        await asyncio.sleep(1) # Thinking...
        return [
            {
                "id": 1,
                "question": "Who is considered the first computer programmer?",
                "options": ["Alan Turing", "Grace Hopper", "Ada Lovelace", "Steve Jobs"],
                "points": 100
            },
            {
                "id": 2,
                "question": "What does HTTP stand for?",
                "options": ["HyperText Transfer Protocol", "High Transfer Text Process", "None of the above"],
                "points": 100
            }
        ]

    def check_answer(self, question_id: int, selected_option: str):
        correct_answer = SECRET_ANSWER_KEY.get(question_id)
        if selected_option == correct_answer:
            return True
        return False
    
    class QuizService:
    # ... (generate_mock_quiz is here) ...
    # ... (check_answer is here) ...

    # PASTE THIS NEW METHOD AT THE END OF THE CLASS:
     def record_energy(self, db: Session, energy_amount: int):
        """
        I am updating the database.
        For MVP, I am hardcoding 'User 1'.
        """
        # 1. Try to find Player One
        user = db.query(User).filter(User.id == 1).first()
        
        # 2. If they don't exist, create them (The First Born)
        if not user:
            user = User(id=1, username="PlayerOne", energy=0)
            db.add(user)
            db.commit()
            db.refresh(user)
            
        # 3. Add the energy
        user.energy += energy_amount
        db.commit() # Save the change to the file
        db.refresh(user) # Reload to get the new total
        
        return user.energy