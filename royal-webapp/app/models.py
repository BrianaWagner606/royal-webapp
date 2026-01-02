# app/models.py
from sqlalchemy import Column, Integer, String
from app.database import Base

class User(Base):
    """
    I am defining the 'users' table.
    This is where I track the player's progress and currency.
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    energy = Column(Integer, default=0) # This is the currency for the Tower Defense game