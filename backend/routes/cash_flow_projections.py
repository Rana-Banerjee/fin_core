from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from datetime import datetime
from database import get_db
from models.cash_flow import CashFlow, StreamType, Frequency, AppreciationFrequency
from models.bank_account import BankAccount
from models.expense_source import ExpenseSource
from models.cash_flow_projection import CashFlowProjection


router = APIRouter(prefix="/api/projections/cash-flow", tags=["cash-flow-projections"])


class GenerateCashFlowProjectionRequest(BaseModel):
    months: int = 12


def calculate_amount_with_appreciation(
    base_amount: float,
    appreciation_rate: float | None,
    appreciation_frequency: AppreciationFrequency | None,
    month_index: int,
    frequency: Frequency,
) -> float:
    if not appreciation_rate or appreciation_rate == 0 or not appreciation_frequency:
        if frequency == Frequency.monthly:
            return base_amount
        elif frequency == Frequency.weekly:
            return base_amount * 4.33
        elif frequency == Frequency.quarterly:
            return base_amount / 3
        elif frequency == Frequency.annually:
            return base_amount / 12
        return base_amount

    periods_per_month = {
        AppreciationFrequency.monthly: 1,
        AppreciationFrequency.quarterly: 3,
        AppreciationFrequency.annually: 12,
    }
    periods = periods_per_month.get(appreciation_frequency, 1)
    period_rate = appreciation_rate / 100

    base_monthly = base_amount
    if frequency == Frequency.weekly:
        base_monthly = base_amount * 4.33
    elif frequency == Frequency.quarterly:
        base_monthly = base_amount / 3
    elif frequency == Frequency.annually:
        base_monthly = base_amount / 12

    compounded = base_monthly
    periods_passed = month_index // periods
    for _ in range(periods_passed):
        compounded *= 1 + period_rate

    return round(compounded, 2)


@router.post("/generate")
async def generate_cash_flow_projections(
    request: GenerateCashFlowProjectionRequest, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(CashFlow).where(CashFlow.is_active == True))
    cash_flows = result.scalars().all()

    if not cash_flows:
        raise HTTPException(status_code=400, detail="No active cash flows found")

    await db.execute(delete(CashFlowProjection))

    current_month = datetime.now().month
    projections = []

    for cf in cash_flows:
        if cf.end_date:
            end_month = (
                cf.end_date.month + (cf.end_date.year - datetime.now().year) * 12
            )
        else:
            end_month = current_month + request.months

        for month_idx in range(
            current_month, min(current_month + request.months, end_month + 1)
        ):
            if cf.start_date:
                start_month = (
                    cf.start_date.month
                    + (cf.start_date.year - datetime.now().year) * 12
                )
                if month_idx < start_month:
                    continue

            projected_amount = calculate_amount_with_appreciation(
                cf.amount,
                cf.appreciation_rate,
                cf.appreciation_frequency,
                month_idx - current_month,
                cf.frequency,
            )

            projections.append(
                CashFlowProjection(
                    cash_flow_id=cf.id,
                    month_index=month_idx,
                    projected_amount=projected_amount,
                    created_at=datetime.utcnow(),
                )
            )

    db.add_all(projections)
    await db.commit()

    return {
        "message": f"Generated {len(projections)} cash flow projections for {len(cash_flows)} streams",
        "cash_flows_count": len(cash_flows),
        "projections_count": len(projections),
        "months": request.months,
    }


@router.get("")
async def get_cash_flow_projections(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(CashFlowProjection).order_by(
            CashFlowProjection.month_index, CashFlowProjection.cash_flow_id
        )
    )
    projections = result.scalars().all()

    result = await db.execute(select(CashFlow))
    cash_flows = {cf.id: cf.to_dict() for cf in result.scalars().all()}

    return {
        "projections": [
            {**p.to_dict(), "cash_flow": cash_flows.get(p.cash_flow_id)}
            for p in projections
        ],
        "count": len(projections),
    }


@router.get("/summary")
async def get_cash_flow_summary(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CashFlow))
    cash_flows = result.scalars().all()

    result = await db.execute(select(CashFlowProjection))
    projections = result.scalars().all()

    cash_flow_map = {cf.id: cf for cf in cash_flows}

    monthly_data = {}
    for p in projections:
        cf = cash_flow_map.get(p.cash_flow_id)
        if not cf:
            continue

        key = p.month_index
        if key not in monthly_data:
            monthly_data[key] = {"income": 0, "expense": 0, "net": 0}

        if cf.stream_type == StreamType.income:
            monthly_data[key]["income"] += p.projected_amount
        else:
            monthly_data[key]["expense"] += p.projected_amount

    summary = []
    for month_idx in sorted(monthly_data.keys()):
        data = monthly_data[month_idx]
        data["net"] = data["income"] - data["expense"]
        data["month_index"] = month_idx
        summary.append(data)

    return {"months": summary, "count": len(summary)}


@router.delete("")
async def clear_cash_flow_projections(db: AsyncSession = Depends(get_db)):
    await db.execute(delete(CashFlowProjection))
    await db.commit()
    return {"message": "Cash flow projections cleared"}
