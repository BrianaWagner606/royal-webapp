# royal-webapp/tests/test_shop.py
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, StaticPool
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.database import Base, get_db

# 1. SETUP THE SIMULATION
TEST_DATABASE_url = "sqlite:///:memory:"

engine = create_engine(
    TEST_DATABASE_url, 
    connect_args={"check_same_thread": False},
    poolclass=StaticPool 
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 2. OVERRIDE THE DEPENDENCY
def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

# 3. INITIALIZE CLIENT
client = TestClient(app)

# 4. RESET DB BEFORE TESTS
@pytest.fixture(autouse=True)
def run_around_tests():
    Base.metadata.create_all(bind=engine) 
    yield
    Base.metadata.drop_all(bind=engine)   

# --- THE ACTUAL TESTS ---

def test_buy_archer_too_poor():
    """
    Scenario: A broke survivor tries to hire a Sniper (Cost: 100).
    Expected: 400 Bad Request (Not enough energy).
    """
    # FIX: Explicitly create the user by "earning" 0 energy first.
    # The 'earn' logic guarantees the user row exists.
    client.post("/quiz/earn", json={"energy": 0})
    
    # 2. Try to buy
    response = client.post("/shop/buy", json={"item_type": "hire_archer"})
    
    # 3. Assert failure
    assert response.status_code == 400
    assert response.json()["detail"] == "Not enough energy!"

def test_buy_archer_wealthy():
    """
    Scenario: A rich survivor buys a Sniper.
    Expected: Success, energy decreases, archers increase.
    """
    # 1. Give user 1000 energy (this also creates the user)
    client.post("/quiz/earn", json={"energy": 1000})
    
    # 2. Buy the Sniper
    response = client.post("/shop/buy", json={"item_type": "hire_archer"})
    
    # 3. Assert Victory
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["archers"] == 1
    assert data["energy"] == 900