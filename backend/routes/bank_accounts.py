from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date, datetime

from database import get_db
from models.bank_account import BankAccount
from models.cash_flow import CashFlow, StreamType, Frequency

router = APIRouter(prefix="/api/bank-accounts", tags=["bank-accounts"])


@router.post("")
async def create_bank_account(
    name: str,
    account_number: str,
    current_balance: float = 0.0,
    interest_rate: float = 0.0,
    type: str = "savings",
    interest_credit_frequency: str = "annually",
    db: AsyncSession = Depends(get_db),
):
    account = BankAccount(
        name=name,
        account_number=account_number,
        current_balance=current_balance,
        interest_rate=interest_rate,
        type=type,
        interest_credit_frequency=interest_credit_frequency,
    )
    db.add(account)
    await db.commit()
    await db.refresh(account)
    return account.to_dict()


@router.get("")
async def get_bank_accounts(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(BankAccount))
    accounts = result.scalars().all()
    return [account.to_dict() for account in accounts]


@router.get("/{account_id}")
async def get_bank_account(account_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(BankAccount).where(BankAccount.id == account_id))
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Bank account not found")
    return account.to_dict()


@router.put("/{account_id}")
async def update_bank_account(
    account_id: int,
    name: str | None = None,
    account_number: str | None = None,
    current_balance: float | None = None,
    interest_rate: float | None = None,
    type: str | None = None,
    interest_credit_frequency: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(BankAccount).where(BankAccount.id == account_id))
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Bank account not found")

    if name is not None:
        account.name = name
    if account_number is not None:
        account.account_number = account_number
    if current_balance is not None:
        account.current_balance = current_balance
    if interest_rate is not None:
        account.interest_rate = interest_rate
    if type is not None:
        account.type = type
    if interest_credit_frequency is not None:
        account.interest_credit_frequency = interest_credit_frequency

    await db.commit()
    await db.refresh(account)
    return account.to_dict()


@router.delete("/{account_id}")
async def delete_bank_account(account_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(BankAccount).where(BankAccount.id == account_id))
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Bank account not found")

    await db.delete(account)
    await db.commit()
    return {"message": "Bank account deleted successfully"}


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
        return amount * 4
    elif freq == Frequency.annually:
        return amount / 12
    return amount


@router.post("/update-balances")
async def update_balances_from_cash_flows(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(BankAccount))
    accounts = result.scalars().all()

    today = date.today()
    updated = []

    for account in accounts:
        result = await db.execute(
            select(CashFlow).where(CashFlow.bank_account_id == account.id)
        )
        cash_flows = result.scalars().all()

        accumulated = 0.0

        for cf in cash_flows:
            if not cf.is_active:
                continue

            if cf.start_date > today:
                continue

            if cf.end_date and cf.end_date < today:
                continue

            months_active = (today.year - cf.start_date.year) * 12 + (
                today.month - cf.start_date.month
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

        if accumulated != 0:
            account.current_balance += accumulated
            updated.append(
                {
                    "id": account.id,
                    "name": account.name,
                    "adjustment": accumulated,
                    "new_balance": account.current_balance,
                }
            )

    await db.commit()

    for account in accounts:
        await db.refresh(account)

    return {"message": "Balances updated", "updated": updated}
