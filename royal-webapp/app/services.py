# app/services.py (The Self-Healing Version)
import asyncio
import json
import os
import io
import traceback
from sqlalchemy.orm import Session
from app.models import User
from pypdf import PdfReader
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv() 

class QuizService:
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        self.model = None

        if not api_key:
            print("❌ ERROR: GEMINI_API_KEY is missing.")
            return

        try:
            genai.configure(api_key=api_key)
            
            # --- NEW: AUTO-DISCOVERY LOGIC ---
            # Instead of guessing 'gemini-pro', we ask for what is available.
            print("🔍 Searching for available AI models...")
            found_model = None
            for m in genai.list_models():
                if 'generateContent' in m.supported_generation_methods:
                    # Prefer 'flash' models if available (they are faster)
                    if 'flash' in m.name:
                        found_model = m.name
                        break
                    # Otherwise keep the first one we find as a backup
                    if not found_model:
                        found_model = m.name
            
            if found_model:
                print(f"✅ Auto-selected model: {found_model}")
                self.model = genai.GenerativeModel(found_model)
            else:
                print("❌ ERROR: Your API Key has access to 0 chat models.")
            # ---------------------------------

        except Exception as e:
            print(f"❌ Connection Error: {e}")

    async def generate_quiz_from_pdf(self, file_object):
        if not self.model:
            return self._error_response("No AI model found. Check terminal logs.")

        try:
            # Read PDF
            try:
                if hasattr(file_object, 'read'):
                    file_bytes = file_object.read()
                else:
                    file_bytes = file_object  
                pdf_reader = PdfReader(io.BytesIO(file_bytes))
            except Exception as e:
                return self._error_response(f"Unreadable PDF: {str(e)}")

            # Extract Text (First 10 pages)
            text = ""
            max_pages = min(10, len(pdf_reader.pages))
            print(f"📖 Reading {max_pages} pages...")
            
            for i in range(max_pages):
                page_text = pdf_reader.pages[i].extract_text()
                if page_text:
                    text += page_text

            if len(text.strip()) < 50:
                return self._error_response("PDF appears empty (maybe scanned image?)")

            clean_text = text[:8000]

            # Prompt
            prompt = f"""
            You are a quiz generator.
            Create a JSON array of 3 questions based on this text:
            {clean_text}
            
            Format:
            [
              {{
                "id": 1,
                "question": "Question text?",
                "options": ["A", "B", "C", "D"],
                "answer": "Correct Option Text",
                "points": 100
              }}
            ]
            Return ONLY raw JSON. No markdown formatting.
            """

            print("🧠 Sending text to AI...")
            response = await asyncio.to_thread(self.model.generate_content, prompt)
            
            clean_json = response.text.replace("```json", "").replace("```", "").strip()
            return json.loads(clean_json)

        except Exception as e:
            print("❌ GENERATION ERROR:")
            traceback.print_exc() 
            return self._error_response(f"System Error: {str(e)}")

    def _error_response(self, msg):
        return [{
            "id": 1,
            "question": f"⚠️ ERROR: {msg}", 
            "options": ["Check Terminal", "Retry", "Ok", "Debug"],
            "answer": "Retry",
            "points": 0
        }]

    async def generate_mock_quiz(self):
        return self._error_response("Mock Fallback")

    def record_energy(self, db: Session, energy_amount: int):
        user = db.query(User).filter(User.id == 1).first()
        if not user:
            user = User(id=1, username="PlayerOne", energy=0)
            db.add(user)
            db.commit()
            db.refresh(user)
        user.energy += energy_amount
        db.commit()
        db.refresh(user)
        return user.energy