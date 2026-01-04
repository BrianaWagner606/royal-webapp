# app/services.py (The Resilient Version)
import asyncio
import json
import os
import io
import traceback
import random
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
            
            # --- AUTO-DISCOVERY LOGIC ---
            print("🔍 Asking Google what models are allowed...")
            found_model = None
            for m in genai.list_models():
                if 'generateContent' in m.supported_generation_methods:
                    if 'flash' in m.name:
                        found_model = m.name
                        break
                    if not found_model:
                        found_model = m.name
            
            if found_model:
                print(f"✅ Success! Connected to: {found_model}")
                self.model = genai.GenerativeModel(found_model)
            else:
                print(f"❌ No chat models found.")
            # ---------------------------

        except Exception as e:
            print(f"❌ Connection Error: {e}")

    async def generate_quiz_from_pdf(self, file_object):
        if not self.model:
            return self._error_response("No AI model found.")

        try:
            # 1. READ PDF (Only do this once!)
            text = await asyncio.to_thread(self._smart_extract_text, file_object)

            if len(text) < 50:
                return self._error_response("PDF text is empty (Scanned image?).")

            # 2. ASK AI (With Retry Logic) ♻️
            # If the AI makes a typo, we try again up to 3 times!
            max_retries = 3
            
            for attempt in range(max_retries):
                try:
                    print(f"🧠 Asking AI (Attempt {attempt + 1}/{max_retries})...")
                    
                    prompt = f"""
                    You are a rigorous professor. I have extracted a RANDOM excerpt from a larger document.
                    
                    Identify 3 specific, distinct concepts in this text and generate difficult questions about them.
                    Focus on details found ONLY in this text chunk.
                    For each question, provide a clear "explanation" of why the answer is correct.
                    
                    TEXT CONTENT:
                    {text[:15000]} 
                    
                    Format as JSON array:
                    [
                      {{
                        "id": 1,
                        "question": "Question text?",
                        "options": ["Option A", "Option B", "Option C", "Option D"],
                        "answer": "Option A",
                        "explanation": "This is correct because...",
                        "points": 100
                      }}
                    ]
                    Return ONLY raw JSON. No markdown.
                    """

                    response = await asyncio.to_thread(self.model.generate_content, prompt)
                    
                    # Clean the response
                    clean_json = response.text.replace("```json", "").replace("```", "").strip()
                    
                    # Try to parse it - this is where it usually crashes
                    return json.loads(clean_json)

                except json.JSONDecodeError:
                    print(f"⚠️ AI Typo detected on attempt {attempt + 1}. Retrying...")
                    continue # Loop back and try again
                except Exception as e:
                    print(f"⚠️ Error on attempt {attempt + 1}: {e}")
                    continue

            # If we fail 3 times, show error
            return self._error_response("AI failed to write valid code 3 times. Please try again.")

        except Exception as e:
            print("❌ SYSTEM ERROR:")
            traceback.print_exc() 
            return self._error_response(f"System Error: {str(e)}")

    def _smart_extract_text(self, file_object):
        """ 
        Reads Page 1 + 15 Random Pages
        """
        try:
            if hasattr(file_object, 'read'):
                file_bytes = file_object.read()
            else:
                file_bytes = file_object  
            
            pdf_reader = PdfReader(io.BytesIO(file_bytes))
            total_pages = len(pdf_reader.pages)
            text = ""
            
            print(f"📖 Document has {total_pages} pages. Scavenging random sections...")

            indices = {0} 

            if total_pages > 1:
                remaining_pages = list(range(1, total_pages))
                num_to_pick = min(15, len(remaining_pages))
                random_picks = random.sample(remaining_pages, num_to_pick)
                indices.update(random_picks)

            sorted_indices = sorted(list(indices))
            
            for i in sorted_indices:
                page_text = pdf_reader.pages[i].extract_text()
                if page_text:
                    text += f"\n--- [Page {i+1}] ---\n" + page_text
            
            return text
        except Exception as e:
            print(f"PDF Read Error: {e}")
            return ""

    def _error_response(self, msg):
        return [{
            "id": 1,
            "question": f"⚠️ ERROR: {msg}", 
            "options": ["Retry", "Check File", "Wait", "Debug"],
            "answer": "Retry",
            "explanation": "Something went wrong in the code.",
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