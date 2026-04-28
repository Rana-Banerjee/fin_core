from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.bank_account import BankAccount

router = APIRouter(prefix="/api/bank-accounts", tags=["bank-accounts"])


@router.post("")
async def create_bank_account(
    name: str,
    account_number: str,
    current_balance: float,
    interest_rate: float,
    type: str,
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
