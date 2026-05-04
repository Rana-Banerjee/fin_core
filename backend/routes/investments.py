from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
from pydantic import BaseModel

from database import get_db
from models.investment import Investment, InvestmentType


class InvestmentCreate(BaseModel):
    name: str
    account_number: str
    current_value: float
    investment_type: str
    appreciation_rate: float = 0.0
    sip_amount: float = 0.0
    purchase_date: str | None = None


class InvestmentUpdate(BaseModel):
    name: str | None = None
    account_number: str | None = None
    current_value: float | None = None
    investment_type: str | None = None
    appreciation_rate: float | None = None
    sip_amount: float | None = None
    purchase_date: str | None = None


router = APIRouter(prefix="/api/investments", tags=["investments"])


@router.post("")
async def create_investment(
    investment: InvestmentCreate,
    db: AsyncSession = Depends(get_db),
):
    purchase_date = None
    if investment.purchase_date:
        purchase_date = datetime.fromisoformat(investment.purchase_date).date()

    inv = Investment(
        name=investment.name,
        account_number=investment.account_number,
        current_value=investment.current_value,
        investment_type=InvestmentType(investment.investment_type),
        appreciation_rate=investment.appreciation_rate,
        sip_amount=investment.sip_amount,
        purchase_date=purchase_date,
    )
    db.add(inv)
    await db.commit()
    await db.refresh(inv)
    return inv.to_dict()


@router.get("")
async def get_investments(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Investment))
    investments = result.scalars().all()
    return [inv.to_dict() for inv in investments]


@router.get("/{investment_id}")
async def get_investment(investment_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Investment).where(Investment.id == investment_id))
    inv = result.scalar_one_or_none()
    if not inv:
        raise HTTPException(status_code=404, detail="Investment not found")
    return inv.to_dict()


@router.put("/{investment_id}")
async def update_investment(
    investment_id: int,
    investment: InvestmentUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Investment).where(Investment.id == investment_id))
    inv = result.scalar_one_or_none()
    if not inv:
        raise HTTPException(status_code=404, detail="Investment not found")

    if investment.name is not None:
        inv.name = investment.name
    if investment.account_number is not None:
        inv.account_number = investment.account_number
    if investment.current_value is not None:
        inv.current_value = investment.current_value
    if investment.investment_type is not None:
        inv.investment_type = InvestmentType(investment.investment_type)
    if investment.appreciation_rate is not None:
        inv.appreciation_rate = investment.appreciation_rate
    if investment.sip_amount is not None:
        inv.sip_amount = investment.sip_amount
    if investment.purchase_date is not None:
        inv.purchase_date = datetime.fromisoformat(investment.purchase_date).date()

    await db.commit()
    await db.refresh(inv)
    return inv.to_dict()


@router.delete("/{investment_id}")
async def delete_investment(investment_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Investment).where(Investment.id == investment_id))
    inv = result.scalar_one_or_none()
    if not inv:
        raise HTTPException(status_code=404, detail="Investment not found")

    await db.delete(inv)
    await db.commit()
    return {"message": "Investment deleted successfully"}
