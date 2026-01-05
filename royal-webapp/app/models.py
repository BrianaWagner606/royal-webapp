# royal-webapp/app/models.py
from sqlalchemy import Column, Integer, String, JSON, ForeignKey
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    energy = Column(Integer, default=0) 
    
    # --- DEFENSE STATS ---
    tower_level = Column(Integer, default=1) 
    archers = Column(Integer, default=0)     
    wall_health = Column(Integer, default=100) 

    # --- LEADERBOARD STATS ---
    days_survived = Column(Integer, default=0) 

class Mistake(Base):
    __tablename__ = "mistakes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    question = Column(String)
    answer = Column(String)
    explanation = Column(String)
    options = Column(JSON) # We store ["A", "B", "C"] as a JSON list