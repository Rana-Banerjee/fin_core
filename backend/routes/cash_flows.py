from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import select
from sqlalchemy.orm import selectinload, joinedload
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date as date_type

from database import get_db
from models.cash_flow import (
    CashFlow,
    StreamType,
    IncomeCategory,
    ExpenseCategory,
    Frequency,
    AppreciationFrequency,
)
from models.bank_account import BankAccount
from models.expense_source import ExpenseSource

router = APIRouter(prefix="/api/cash-flows", tags=["cash-flows"])

INCOME_CATEGORIES = [c.value for c in IncomeCategory]
EXPENSE_CATEGORIES = [c.value for c in ExpenseCategory]


def calculate_monthly_amount(amount: float, frequency: str) -> float:
    freq = Frequency[frequency]
    if freq == Frequency.weekly:
        return amount * 52 / 12
    elif freq == Frequency.monthly:
        return amount
    elif freq == Frequency.quarterly:
        return amount * 4
    elif freq == Frequency.annually:
        return amount / 12
    return amount


async def update_balances_for_account(db: AsyncSession, account_id: int):
    from datetime import date
    from sqlalchemy import select as sa_select

    result = await db.execute(
        sa_select(BankAccount).where(BankAccount.id == account_id)
    )
    account = result.scalar_one_or_none()
    if not account:
        return

    result = await db.execute(
        sa_select(CashFlow).where(CashFlow.bank_account_id == account_id)
    )
    cash_flows = result.scalars().all()

    today = date.today()
    accumulated = 0.0

    for cf in cash_flows:
        if not cf.is_active:
            continue
        if cf.start_date > today:
            continue
        if cf.end_date and cf.end_date < today:
            continue

        months_active = (
            (today.year - cf.start_date.year) * 12
            + (today.month - cf.start_date.month)
            + 1
        )

        if cf.end_date:
            months_until_end = (cf.end_date.year - cf.start_date.year) * 12 + (
                cf.end_date.month - cf.start_date.month
            )
            months_active = min(months_active, months_until_end)

        if months_active <= 0:
            continue

        monthly_amount = calculate_monthly_amount(cf.amount, cf.frequency.value)

        if cf.stream_type == StreamType.income:
            accumulated += monthly_amount * months_active
        else:
            accumulated -= monthly_amount * months_active

    account.current_balance = accumulated
    await db.commit()
    await db.refresh(account)


@router.post("")
async def create_cash_flow(
    name: str,
    stream_type: str,
    stream_category: str,
    amount: float,
    bank_account_id: int,
    frequency: str = "monthly",
    start_date: str | None = None,
    end_date: str | None = None,
    is_active: bool = True,
    appreciation_rate: float | None = None,
    appreciation_frequency: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    if stream_type not in ["income", "expense"]:
        raise HTTPException(
            status_code=400, detail="stream_type must be 'income' or 'expense'"
        )

    if stream_type == "income" and stream_category not in INCOME_CATEGORIES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid income category. Must be one of: {INCOME_CATEGORIES}",
        )

    if stream_type == "expense" and stream_category not in EXPENSE_CATEGORIES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid expense category. Must be one of: {EXPENSE_CATEGORIES}",
        )

    result = await db.execute(
        select(BankAccount).where(BankAccount.id == bank_account_id)
    )
    bank_account = result.scalar_one_or_none()
    if not bank_account:
        raise HTTPException(status_code=400, detail="Bank account not found")

    start = date_type.fromisoformat(start_date) if start_date else date_type.today()
    end = date_type.fromisoformat(end_date) if end_date else None

    stream_type_enum = (
        StreamType.income if stream_type == "income" else StreamType.expense
    )
    freq_enum = Frequency[frequency]
    app_freq_enum = None
    if appreciation_frequency and appreciation_frequency != "none":
        app_freq_enum = AppreciationFrequency[appreciation_frequency]

    cash_flow = CashFlow(
        name=name,
        stream_type=stream_type_enum,
        stream_category=stream_category,
        amount=amount,
        frequency=freq_enum,
        start_date=start,
        end_date=end,
        is_active=is_active,
        appreciation_rate=appreciation_rate
        if appreciation_rate and appreciation_rate > 0
        else 0.0,
        appreciation_frequency=app_freq_enum,
        bank_account_id=bank_account_id,
    )

    db.add(cash_flow)
    await db.commit()
    await db.refresh(cash_flow)

    return cash_flow.to_dict()


@router.get("")
async def get_cash_flows(
    stream_type: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(CashFlow)
    if stream_type:
        if stream_type not in ["income", "expense"]:
            raise HTTPException(
                status_code=400, detail="stream_type must be 'income' or 'expense'"
            )
        st = StreamType.income if stream_type == "income" else StreamType.expense
        query = query.where(CashFlow.stream_type == st)

    result = await db.execute(query)
    cash_flows = result.scalars().all()
    return [cf.to_dict() for cf in cash_flows]


@router.get("/{cash_flow_id}")
async def get_cash_flow(cash_flow_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(CashFlow)
        .options(selectinload(CashFlow.expense_sources))
        .where(CashFlow.id == cash_flow_id)
    )
    cash_flow = result.scalar_one_or_none()
    if not cash_flow:
        raise HTTPException(status_code=404, detail="Cash flow not found")
    return cash_flow.to_dict(
        include_expense_sources=True, expense_sources_list=cash_flow.expense_sources
    )


@router.put("/{cash_flow_id}")
async def update_cash_flow(
    cash_flow_id: int,
    name: str | None = None,
    stream_type: str | None = None,
    stream_category: str | None = None,
    amount: float | None = None,
    frequency: str | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
    is_active: bool | None = None,
    appreciation_rate: float | None = None,
    appreciation_frequency: str | None = None,
    bank_account_id: int | None = None,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(CashFlow).where(CashFlow.id == cash_flow_id))
    cash_flow = result.scalar_one_or_none()
    if not cash_flow:
        raise HTTPException(status_code=404, detail="Cash flow not found")

    old_bank_account_id = cash_flow.bank_account_id

    if name is not None:
        cash_flow.name = name
    if stream_type is not None:
        if stream_type not in ["income", "expense"]:
            raise HTTPException(
                status_code=400, detail="stream_type must be 'income' or 'expense'"
            )
        cash_flow.stream_type = (
            StreamType.income if stream_type == "income" else StreamType.expense
        )
    if stream_category is not None:
        cash_flow.stream_category = stream_category
    if amount is not None:
        cash_flow.amount = amount
    if frequency is not None:
        cash_flow.frequency = Frequency[frequency]
    if start_date is not None:
        cash_flow.start_date = date_type.fromisoformat(start_date)
    if end_date is not None:
        cash_flow.end_date = date_type.fromisoformat(end_date) if end_date else None
    if is_active is not None:
        cash_flow.is_active = is_active
    if appreciation_rate is not None:
        cash_flow.appreciation_rate = (
            appreciation_rate if appreciation_rate > 0 else 0.0
        )
    if appreciation_frequency is not None:
        if appreciation_frequency == "none" or not appreciation_frequency:
            cash_flow.appreciation_frequency = None
        else:
            cash_flow.appreciation_frequency = AppreciationFrequency[
                appreciation_frequency
            ]
    if bank_account_id is not None and bank_account_id > 0:
        cash_flow.bank_account_id = bank_account_id

    await db.commit()
    await db.refresh(cash_flow)

    await update_balances_for_account(db, cash_flow.bank_account_id)
    if old_bank_account_id != cash_flow.bank_account_id:
        await update_balances_for_account(db, old_bank_account_id)

    result = await db.execute(
        select(CashFlow)
        .options(selectinload(CashFlow.expense_sources))
        .where(CashFlow.id == cash_flow_id)
    )
    cash_flow = result.scalar_one()
    return cash_flow.to_dict(
        include_expense_sources=True, expense_sources_list=cash_flow.expense_sources
    )


@router.delete("/{cash_flow_id}")
async def delete_cash_flow(cash_flow_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CashFlow).where(CashFlow.id == cash_flow_id))
    cash_flow = result.scalar_one_or_none()
    if not cash_flow:
        raise HTTPException(status_code=404, detail="Cash flow not found")

    account_id = cash_flow.bank_account_id

    await db.delete(cash_flow)
    await db.commit()

    await update_balances_for_account(db, account_id)

    return {"message": "Cash flow deleted successfully"}
