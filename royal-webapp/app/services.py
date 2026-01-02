# app/services.py
import asyncio

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