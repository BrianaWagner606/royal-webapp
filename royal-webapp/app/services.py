# royal-webapp/app/services.py
import os
import json
import random
import PyPDF2
import io
import requests  
import time
from sqlalchemy.orm import Session
from app.models import User

# --- CONFIGURATION ---
API_KEY = "AIzaSyDvLiTB2iEFxU36fWo9u3htkiwgurTxGxc"

# --- EMERGENCY ARCHIVE (MOCK DATA) ---
FALLBACK_QUIZ = [
    {
        "id": 101,
        "question": "Which of these items is essential for silent takedowns?",
        "options": ["A) Chainsaw", "B) Crossbow", "C) Grenade", "D) Megaphone"],
        "answer": "B) Crossbow",
        "explanation": "Crossbows allow for distance kills without alerting the horde."
    },
    {
        "id": 102,
        "question": "What is the Rule of Three for survival?",
        "options": ["A) 3 mins air, 3 days water, 3 weeks food", "B) 3 guns, 3 knives, 3 bombs", "C) 3 friends, 3 cars, 3 houses", "D) 3 zombies, 3 bullets, 3 seconds"],
        "answer": "A) 3 mins air, 3 days water, 3 weeks food",
        "explanation": "This rule prioritizes immediate survival needs in order of urgency."
    },
    {
        "id": 103,
        "question": "Where is the safest place to sleep?",
        "options": ["A) Ground floor window", "B) The roof (if accessible)", "C) A car in an open field", "D) The mall entrance"],
        "answer": "B) The roof (if accessible)",
        "explanation": "High ground removes typical access points for the undead."
    },
    {
        "id": 104,
        "question": "Which signal indicates a safe zone?",
        "options": ["A) Black Smoke", "B) Red Flare", "C) Three fires in a triangle", "D) Screaming"],
        "answer": "C) Three fires in a triangle",
        "explanation": "Internationally recognized distress or safe zone signal."
    },
    {
        "id": 105,
        "question": "If bitten on the arm, what is the immediate action?",
        "options": ["A) Bandage it", "B) Apply ice", "C) Amputation (Tourniquet first)", "D) Sleep it off"],
        "answer": "C) Amputation (Tourniquet first)",
        "explanation": "Removing the infected limb before the virus spreads to the bloodstream is the only chance."
    }
]

class QuizService:

    def async_generate_quiz_from_pdf(self, file_content):
        pass 

    async def generate_quiz_from_pdf(self, file_content):
        """
        1. SPEED SCAN: Reads random 10 pages.
        2. DISPATCH: Sends the text to the Background Worker (Celery).
        3. RETURN TICKET: Gives the user a Task ID to check later.
        """
        # ⚠️ SURVIVOR NOTE: We import here to avoid a "Circular Import" crash
        # because tasks.py already talks to this file.
        from app.tasks import generate_quiz_task
        
        extracted_text = ""
        location_note = ""
        
        try:
            # --- 1. SPEED SCAN PDF ---
            # FIX: Removed 'await' because file.file reads instantly
            content = file_content.read() 
            
            pdf_reader = PyPDF2.PdfReader(io.BytesIO(content))
            total_pages = len(pdf_reader.pages)
            
            PAGES_TO_READ = 10
            if total_pages <= PAGES_TO_READ:
                start_page = 0
                end_page = total_pages
                location_note = "Scanning full document..."
            else:
                start_page = random.randint(0, total_pages - PAGES_TO_READ)
                end_page = start_page + PAGES_TO_READ
                location_note = f"Scanning sector: Pages {start_page}-{end_page}..."

            print(f"⚡ Speed Scan: Reading pages {start_page} to {end_page}...")

            for i in range(start_page, end_page):
                page_text = pdf_reader.pages[i].extract_text()
                if page_text:
                    extracted_text += page_text + "\n"

            # --- 2. DISPATCH TO WORKER ---
            # We use .delay() to send this to Redis. It returns immediately!
            print("🚚 Dispatching payload to Worker Queue...")
            task = generate_quiz_task.delay(extracted_text, location_note)
            
            # --- 3. RETURN TICKET ID ---
            # The API will now return this Ticket instead of the Quiz.
            print(f"🎫 Ticket Issued: {task.id}")
            return {"task_id": task.id, "status": "processing"}

        except Exception as e:
            print(f"PDF Read Error: {e}")
            return self._error_quiz(f"Read Error: {str(e)}")

    def _get_working_model(self):
        """
        SNIFFER: Hits the API to see what models are ACTUALLY available.
        """
        print("🕵️ Sniffing for available AI models...")
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models?key={API_KEY}"
            response = requests.get(url)
            
            if response.status_code != 200:
                print(f"⚠️ Sniffer failed ({response.status_code}). Defaulting to Flash.")
                return "models/gemini-1.5-flash"

            data = response.json()
            available_models = data.get("models", [])
            usable_models = [m for m in available_models if "generateContent" in m.get("supportedGenerationMethods", [])]
            
            if not usable_models:
                print("⚠️ No usable models found. Defaulting.")
                return "models/gemini-1.5-flash"

            for m in usable_models:
                if "gemini-1.5-flash" in m["name"]:
                    print(f"✅ Target Locked: {m['name']}")
                    return m["name"]
            
            best_choice = usable_models[0]["name"]
            print(f"✅ Target Locked (Fallback): {best_choice}")
            return best_choice

        except Exception as e:
            print(f"Sniffer Error: {e}")
            return "models/gemini-1.5-flash"

    def _generate_quiz_smart(self, text, location_note=""):
        """
        This method is now primarily used by the WORKER (tasks.py),
        not the main API thread.
        """
        model_name = self._get_working_model()
        if not model_name.startswith("models/"):
            model_name = f"models/{model_name}"

        url = f"https://generativelanguage.googleapis.com/v1beta/{model_name}:generateContent?key={API_KEY}"
        
        safe_text = text[:30000] 
        
        prompt_text = f"""
        You are a zombie apocalypse survival tutor.
        Create a difficult multiple-choice quiz (5 questions) based strictly on the text below.
        CONTEXT: {location_note}
        
        RULES:
        1. Return ONLY raw JSON. No markdown.
        2. Format: [{{ "id": 1, "question": "...", "options": ["A) ...", "B) ..."], "answer": "The full correct option string", "explanation": "..." }}]
        
        INTEL:
        {safe_text}
        """

        payload = {
            "contents": [{
                "parts": [{"text": prompt_text}]
            }]
        }

        # --- RETRY LOGIC (EXPONENTIAL BACKOFF) ---
        max_retries = 3
        base_delay = 2 

        for attempt in range(max_retries + 1):
            try:
                print(f"📡 Sending signal... (Attempt {attempt + 1})")
                response = requests.post(url, json=payload, headers={"Content-Type": "application/json"})
                
                if response.status_code == 429:
                    if attempt < max_retries:
                        wait_time = base_delay * (2 ** attempt)
                        print(f"⚠️ Signal Jammed (429). Holding position for {wait_time}s...")
                        time.sleep(wait_time)
                        continue 
                    else:
                        print("💀 Radio Dead. Switching to Cached Intel (Fallback Quiz).")
                        return FALLBACK_QUIZ

                if response.status_code != 200:
                    print(f"API Error {response.status_code}: {response.text}")
                    return FALLBACK_QUIZ 
                
                data = response.json()
                
                if "candidates" not in data or not data["candidates"]:
                    return FALLBACK_QUIZ

                raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
                clean_json = raw_text.strip()
                if clean_json.startswith("```json"): clean_json = clean_json[7:]
                if clean_json.startswith("```"): clean_json = clean_json[3:]
                if clean_json.endswith("```"): clean_json = clean_json[:-3]
                
                return json.loads(clean_json)

            except Exception as e:
                print(f"Network Error: {e}")
                return FALLBACK_QUIZ
        
        return FALLBACK_QUIZ

    def _error_quiz(self, reason):
        return [{
            "id": 1, 
            "question": f"⚠️ {reason}", 
            "options": ["Wait", "Retry"], 
            "answer": "Retry", 
            "explanation": "Something went wrong."
        }]

    def record_energy(self, db: Session, amount: int):
        user = db.query(User).filter(User.id == 1).first()
        if not user:
            user = User(id=1, username="PlayerOne", energy=0)
            db.add(user)
        user.energy += amount
        db.commit()
        return user.energy