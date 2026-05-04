from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.cash_flow import CashFlow, StreamType
from models.expense_source import ExpenseSource
from models.bank_account import BankAccount
from models.investment import Investment

router = APIRouter(prefix="/api/expense-sources", tags=["expense-sources"])


@router.post("")
async def create_expense_source(
    expense_id: int,
    source_type: str,
    bank_account_id: int | None = None,
    investment_id: int | None = None,
    priority_order: int = 1,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(CashFlow).where(CashFlow.id == expense_id))
    expense = result.scalar_one_or_none()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    if expense.stream_type != StreamType.expense:
        raise HTTPException(
            status_code=400, detail="Can only add sources to expense streams"
        )

    if source_type not in ["bank_account", "investment"]:
        raise HTTPException(
            status_code=400, detail="source_type must be 'bank_account' or 'investment'"
        )

    if source_type == "bank_account":
        if not bank_account_id:
            raise HTTPException(
                status_code=400,
                detail="bank_account_id is required for bank_account source_type",
            )
        result = await db.execute(
            select(BankAccount).where(BankAccount.id == bank_account_id)
        )
        bank_account = result.scalar_one_or_none()
        if not bank_account:
            raise HTTPException(status_code=400, detail="Bank account not found")
        investment_id = None
    else:
        if not investment_id:
            raise HTTPException(
                status_code=400,
                detail="investment_id is required for investment source_type",
            )
        result = await db.execute(
            select(Investment).where(Investment.id == investment_id)
        )
        investment = result.scalar_one_or_none()
        if not investment:
            raise HTTPException(status_code=400, detail="Investment not found")
        bank_account_id = None

    existing_result = await db.execute(
        select(ExpenseSource)
        .where(ExpenseSource.expense_id == expense_id)
        .order_by(ExpenseSource.priority_order.desc())
    )
    existing = existing_result.first()
    if existing and priority_order == 1:
        priority_order = existing[0].priority_order + 1

    expense_source = ExpenseSource(
        expense_id=expense_id,
        source_type=source_type,
        bank_account_id=bank_account_id,
        investment_id=investment_id,
        priority_order=priority_order,
    )
    db.add(expense_source)
    await db.commit()
    await db.refresh(expense_source)
    return expense_source.to_dict()


@router.get("")
async def get_expense_sources(
    expense_id: int = Query(..., description="Filter by expense_id"),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ExpenseSource)
        .where(ExpenseSource.expense_id == expense_id)
        .order_by(ExpenseSource.priority_order)
    )
    sources = result.scalars().all()
    return [es.to_dict() for es in sources]


@router.get("/{source_id}")
async def get_expense_source(source_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ExpenseSource).where(ExpenseSource.id == source_id)
    )
    source = result.scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=404, detail="Expense source not found")
    return source.to_dict()


@router.put("/{source_id}")
async def update_expense_source(
    source_id: int,
    priority_order: int | None = None,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ExpenseSource).where(ExpenseSource.id == source_id)
    )
    source = result.scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=404, detail="Expense source not found")

    if priority_order is not None:
        source.priority_order = priority_order

    await db.commit()
    await db.refresh(source)
    return source.to_dict()


@router.delete("/{source_id}")
async def delete_expense_source(source_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ExpenseSource).where(ExpenseSource.id == source_id)
    )
    source = result.scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=404, detail="Expense source not found")

    await db.delete(source)
    await db.commit()
    return {"message": "Expense source deleted successfully"}
