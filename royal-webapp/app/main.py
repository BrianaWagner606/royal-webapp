# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routers import quiz, shop, system # Make sure all your routers are here

# Create DB Tables (This is a comment now!)
Base.metadata.create_all(bind=engine)

app = FastAPI()

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register the Routers
app.include_router(quiz.router)
app.include_router(shop.router)
# app.include_router(system.router) # Uncomment if you are using system.py

@app.get("/")
def read_root():
    return {"status": "Healthy", "message": "The Citadel is open!"}