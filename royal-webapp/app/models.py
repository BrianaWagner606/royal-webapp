from sqlalchemy import Column, Integer, String
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    energy = Column(Integer, default=0) # This is your Gold
    
    # --- NEW: DEFENSE STATS ---
    tower_level = Column(Integer, default=1)  # Your fortress tier
    archers = Column(Integer, default=0)      # Your DPS (Damage Per Second)
    wall_health = Column(Integer, default=100) # Your HP# This is the currency for the Tower Defense game