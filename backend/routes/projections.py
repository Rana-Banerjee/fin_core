from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from datetime import datetime

from database import get_db
from models.bank_account import BankAccount
from models.projection import Projection


router = APIRouter(prefix="/api/projections", tags=["projections"])


class GenerateProjectionRequest(BaseModel):
    months: int = 12


class ProjectionResponse(BaseModel):
    id: int
    bank_account_id: int
    month_index: int
    projected_balance: float
    created_at: str


async def calculate_monthly_balance(
    current_balance: float, annual_rate: float, frequency: str, month_index: int
) -> float:
    """Calculate projected balance for a given month based on interest credit frequency."""

    if annual_rate == 0:
        return current_balance

    monthly_rate = annual_rate / 12 / 100
    quarterly_rate = annual_rate / 4 / 100
    annual_rate_decimal = annual_rate / 100

    balance = current_balance

    for m in range(month_index + 1):
        if frequency == "monthly":
            balance += balance * monthly_rate
        elif frequency == "quarterly":
            if (m + 1) % 3 == 0:
                balance += balance * quarterly_rate
        elif frequency == "annually":
            if m == 11:
                balance += balance * annual_rate_decimal

    return balance


@router.post("/generate")
async def generate_projections(
    request: GenerateProjectionRequest, db: AsyncSession = Depends(get_db)
):
    """Generate projection data for all bank accounts."""

    result = await db.execute(select(BankAccount))
    accounts = result.scalars().all()

    if not accounts:
        raise HTTPException(status_code=400, detail="No bank accounts found")

    current_month = datetime.now().month

    await db.execute(delete(Projection))

    projections = []
    for account in accounts:
        for month_idx in range(current_month, current_month + request.months):
            projected_balance = await calculate_monthly_balance(
                account.current_balance,
                account.interest_rate,
                account.interest_credit_frequency,
                month_idx - current_month,
            )
            projections.append(
                Projection(
                    bank_account_id=account.id,
                    month_index=month_idx,
                    projected_balance=projected_balance,
                    created_at=datetime.utcnow(),
                )
            )

    db.add_all(projections)
    await db.commit()

    return {
        "message": f"Generated projections for {len(accounts)} accounts for {request.months} months",
        "accounts_count": len(accounts),
        "months": request.months,
    }


@router.get("")
async def get_projections(db: AsyncSession = Depends(get_db)):
    """Get all projection data."""

    result = await db.execute(
        select(Projection).order_by(Projection.bank_account_id, Projection.month_index)
    )
    projections = result.scalars().all()

    return {
        "projections": [p.to_dict() for p in projections],
        "count": len(projections),
    }


@router.delete("")
async def clear_projections(db: AsyncSession = Depends(get_db)):
    """Clear all projection data."""

    await db.execute(delete(Projection))
    await db.commit()

    return {"message": "All projections cleared"}


@router.get("/status")
async def get_projection_status(db: AsyncSession = Depends(get_db)):
    """Get projection status - whether projections exist and for how many months."""

    result = await db.execute(
        select(Projection.month_index).order_by(Projection.month_index.desc()).limit(1)
    )
    max_month = result.scalar()

    if max_month is not None:
        result = await db.execute(select(Projection.bank_account_id).distinct())
        accounts_count = len(result.scalars().all())
        return {
            "generated": True,
            "months": max_month + 1,
            "accounts_count": accounts_count,
        }

    return {"generated": False, "months": 0, "accounts_count": 0}
