from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import select, delete, func
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from datetime import datetime, date
from math import pow
import calendar

from database import get_db
from models.bank_account import BankAccount
from models.projection import Projection
from models.cash_flow import CashFlow, StreamType, Frequency, AppreciationFrequency


def calculate_monthly_amount(amount: float, frequency: str) -> float:
    try:
        freq = Frequency[frequency]
    except KeyError:
        return amount
    if freq == Frequency.weekly:
        return amount * 52 / 12
    elif freq == Frequency.monthly:
        return amount
    elif freq == Frequency.quarterly:
        return amount / 3
    elif freq == Frequency.annually:
        return amount / 12
    return amount


def calculate_appreciated_amount(
    base_amount: float,
    appreciation_rate: float,
    appreciation_freq: str | None,
    months_passed: int,
) -> float:
    """Calculate appreciated amount based on appreciation frequency."""
    if not appreciation_rate or appreciation_rate == 0:
        return base_amount

    if not appreciation_freq:
        return base_amount

    periods_passed = 0
    try:
        freq = AppreciationFrequency[appreciation_freq]
    except KeyError:
        return base_amount

    if freq == AppreciationFrequency.monthly:
        periods_passed = months_passed
    elif freq == AppreciationFrequency.quarterly:
        periods_passed = months_passed // 3
    elif freq == AppreciationFrequency.annually:
        periods_passed = months_passed // 12

    return base_amount * pow(1 + appreciation_rate / 100, periods_passed)


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

    result = await db.execute(select(CashFlow).where(CashFlow.is_active == True))
    all_cash_flows = result.scalars().all()

    cash_flows_by_account = {}
    for cf in all_cash_flows:
        if cf.bank_account_id not in cash_flows_by_account:
            cash_flows_by_account[cf.bank_account_id] = []
        cash_flows_by_account[cf.bank_account_id].append(cf)

    current_date = date.today()
    current_month = datetime.now().month

    await db.execute(delete(Projection))

    projections = []
    for account in accounts:
        account_cash_flows = cash_flows_by_account.get(account.id, [])
        cumulative_cash_flow = 0.0

        for month_idx in range(current_month, current_month + request.months):
            base_balance = await calculate_monthly_balance(
                account.current_balance,
                account.interest_rate,
                account.interest_credit_frequency,
                month_idx - current_month,
            )

            months_passed = month_idx - current_month + 1
            projection_month_index = month_idx - current_month

            projected_month = ((month_idx - 1) % 12) + 1
            year_offset = (month_idx - 1) // 12
            projected_year = current_date.year + year_offset
            projected_date = date(projected_year, projected_month, 1)  # Start of month

            cash_flow_impact = 0.0
            for cf in account_cash_flows:
                if cf.start_date and cf.start_date > projected_date:
                    continue
                if cf.end_date and cf.end_date < projected_date:
                    continue

                base_monthly = calculate_monthly_amount(cf.amount, cf.frequency.value)
                appreciated_amount = calculate_appreciated_amount(
                    base_monthly,
                    cf.appreciation_rate,
                    cf.appreciation_frequency,
                    projection_month_index,
                )

                if cf.stream_type == StreamType.income:
                    cash_flow_impact += appreciated_amount
                else:
                    cash_flow_impact -= appreciated_amount

            cumulative_cash_flow += cash_flow_impact

            projected_balance = base_balance + cumulative_cash_flow
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
        select(
            func.min(Projection.month_index), func.max(Projection.month_index)
        ).select_from(Projection)
    )
    row = result.one()

    if row[0] is not None:
        min_month = row[0]
        max_month = row[1]
        result = await db.execute(select(Projection.bank_account_id).distinct())
        accounts_count = len(result.scalars().all())
        return {
            "generated": True,
            "months": max_month - min_month + 1,
            "accounts_count": accounts_count,
        }

    return {"generated": False, "months": 0, "accounts_count": 0}
