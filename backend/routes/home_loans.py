from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date as date_type

from database import get_db
from models.home_loan import HomeLoan

router = APIRouter(prefix="/api/home-loans", tags=["home-loans"])


@router.post("")
async def create_home_loan(
    name: str,
    account_number: str,
    interest_rate: float,
    tenure_months: int,
    emi_start_date: str,
    current_principal_outstanding: float,
    od_account_id: int | None = None,
    current_pre_emi_principal: float | None = None,
    current_pre_emi_interest: float | None = None,
    current_emi_principal: float | None = None,
    current_emi_interest: float | None = None,
    db: AsyncSession = Depends(get_db),
):
    emi_start = date_type.fromisoformat(emi_start_date)
    home_loan = HomeLoan(
        name=name,
        account_number=account_number,
        interest_rate=interest_rate,
        tenure_months=tenure_months,
        emi_start_date=emi_start,
        od_account_id=od_account_id,
        current_principal_outstanding=current_principal_outstanding,
        current_pre_emi_principal=current_pre_emi_principal,
        current_pre_emi_interest=current_pre_emi_interest,
        current_emi_principal=current_emi_principal,
        current_emi_interest=current_emi_interest,
    )
    db.add(home_loan)
    await db.commit()
    await db.refresh(home_loan)
    return home_loan.to_dict()


@router.get("")
async def get_home_loans(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(HomeLoan))
    loans = result.scalars().all()
    return [loan.to_dict() for loan in loans]


@router.get("/{loan_id}")
async def get_home_loan(loan_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(HomeLoan).where(HomeLoan.id == loan_id))
    loan = result.scalar_one_or_none()
    if not loan:
        raise HTTPException(status_code=404, detail="Home loan not found")
    return loan.to_dict()


@router.put("/{loan_id}")
async def update_home_loan(
    loan_id: int,
    name: str | None = None,
    account_number: str | None = None,
    interest_rate: float | None = None,
    tenure_months: int | None = None,
    emi_start_date: str | None = None,
    od_account_id: int | None = None,
    current_principal_outstanding: float | None = None,
    current_pre_emi_principal: float | None = None,
    current_pre_emi_interest: float | None = None,
    current_emi_principal: float | None = None,
    current_emi_interest: float | None = None,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(HomeLoan).where(HomeLoan.id == loan_id))
    loan = result.scalar_one_or_none()
    if not loan:
        raise HTTPException(status_code=404, detail="Home loan not found")

    if name is not None:
        loan.name = name
    if account_number is not None:
        loan.account_number = account_number
    if interest_rate is not None:
        loan.interest_rate = interest_rate
    if tenure_months is not None:
        loan.tenure_months = tenure_months
    if emi_start_date is not None:
        loan.emi_start_date = date_type.fromisoformat(emi_start_date)
    if od_account_id is not None:
        loan.od_account_id = od_account_id if od_account_id > 0 else None
    if current_principal_outstanding is not None:
        loan.current_principal_outstanding = current_principal_outstanding
    if current_pre_emi_principal is not None:
        loan.current_pre_emi_principal = current_pre_emi_principal
    if current_pre_emi_interest is not None:
        loan.current_pre_emi_interest = current_pre_emi_interest
    if current_emi_principal is not None:
        loan.current_emi_principal = current_emi_principal
    if current_emi_interest is not None:
        loan.current_emi_interest = current_emi_interest

    await db.commit()
    await db.refresh(loan)
    return loan.to_dict()


@router.delete("/{loan_id}")
async def delete_home_loan(loan_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(HomeLoan).where(HomeLoan.id == loan_id))
    loan = result.scalar_one_or_none()
    if not loan:
        raise HTTPException(status_code=404, detail="Home loan not found")

    await db.delete(loan)
    await db.commit()
    return {"message": "Home loan deleted successfully"}
