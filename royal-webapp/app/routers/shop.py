# app/routers/shop.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from pydantic import BaseModel

router = APIRouter(prefix="/shop", tags=["Shop"])

# Define the cost of items
PRICES = {
    "upgrade_tower": 200, # Costs 200 Energy
    "hire_archer": 100,   # Costs 100 Energy
    "repair_wall": 50     # Costs 50 Energy
}

class PurchaseRequest(BaseModel):
    item_type: str # "upgrade_tower", "hire_archer", "repair_wall"

@router.post("/buy")
async def buy_item(request: PurchaseRequest, db: Session = Depends(get_db)):
    # 1. Get Player
    user = db.query(User).filter(User.id == 1).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    cost = PRICES.get(request.item_type)
    if not cost:
        raise HTTPException(status_code=400, detail="Invalid item")

    # 2. Check Funds
    if user.energy < cost:
        raise HTTPException(status_code=400, detail="Not enough energy!")

    # 3. Process Transaction
    user.energy -= cost
    
    if request.item_type == "upgrade_tower":
        user.tower_level += 1
    elif request.item_type == "hire_archer":
        user.archers += 1
    elif request.item_type == "repair_wall":
        user.wall_health = min(user.wall_health + 20, 100 + (user.tower_level * 50))

    db.commit()
    db.refresh(user)
    
    return {
        "status": "success", 
        "energy": user.energy,
        "tower_level": user.tower_level,
        "archers": user.archers,
        "wall_health": user.wall_health
    }

@router.get("/status")
async def get_defense_status(db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == 1).first()
    if not user:
        return {"tower_level": 1, "archers": 0, "wall_health": 100}
    return {
        "tower_level": user.tower_level,
        "archers": user.archers,
        "wall_health": user.wall_health
    }