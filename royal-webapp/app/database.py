# app/database.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# 1. The Location
# I'm using SQLite for now because it's built-in and simple.
# later, I can swap this string for a PostgreSQL URL.
DATABASE_URL = "sqlite:///./royal_library.db"

# 2. The Engine
# This is the actual connection to the database file.
# Note: check_same_thread=False is needed only for SQLite.
engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)

# 3. The Session
# This acts as the "staging area" for my changes before I commit them.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 4. The Base
# All my database models (tables) will inherit from this class.
Base = declarative_base()

# 5. Dependency
# I will use this helper function in my endpoints to get a database connection.
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()