from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from datetime import date as date_type

from database import get_db
from models.home_loan import HomeLoan, ODImpactType
from models.bank_account import BankAccount
from services.emi_calculator import (
    calculate_pre_emi,
    calculate_emi,
    calculate_impacted_tenure,
    get_past_bank_installments_sum,
)

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
    od_impact_type: str = "none",
    db: AsyncSession = Depends(get_db),
):
    emi_start = date_type.fromisoformat(emi_start_date)
    od_impact = ODImpactType.none
    if od_impact_type in ["emi", "tenure"]:
        od_impact = ODImpactType[od_impact_type]

    home_loan = HomeLoan(
        name=name,
        account_number=account_number,
        interest_rate=interest_rate,
        tenure_months=tenure_months,
        emi_start_date=emi_start,
        od_account_id=od_account_id,
        current_principal_outstanding=current_principal_outstanding,
        od_impact_type=od_impact,
    )
    db.add(home_loan)
    await db.commit()
    await db.refresh(home_loan)

    result_stmt = (
        select(HomeLoan)
        .options(selectinload(HomeLoan.installments))
        .where(HomeLoan.id == home_loan.id)
    )
    result = await db.execute(result_stmt)
    home_loan = result.scalar_one()

    result = home_loan.to_dict(include_installments=True)

    od_balance = None
    if home_loan.od_account_id:
        od_result = await db.execute(
            select(BankAccount).where(BankAccount.id == home_loan.od_account_id)
        )
        od_account = od_result.scalar_one_or_none()
        if od_account:
            od_balance = od_account.current_balance

    installments_data = [i.to_dict() for i in home_loan.installments]
    result["effective_pre_emi"] = calculate_pre_emi(
        result, installments_data, od_balance
    )
    result["effective_emi"] = calculate_emi(result, od_balance)
    result["impacted_tenure_months"] = calculate_impacted_tenure(result, od_balance)

    return result


@router.get("")
async def get_home_loans(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(HomeLoan).options(selectinload(HomeLoan.installments))
    )
    loans = result.scalars().all()

    response = []
    for loan in loans:
        loan_dict = loan.to_dict(include_installments=True)

        od_balance = None
        if loan.od_account_id:
            od_result = await db.execute(
                select(BankAccount).where(BankAccount.id == loan.od_account_id)
            )
            od_account = od_result.scalar_one_or_none()
            if od_account:
                od_balance = od_account.current_balance

        installments_data = [i.to_dict() for i in loan.installments]
        loan_dict["effective_pre_emi"] = calculate_pre_emi(
            loan_dict, installments_data, od_balance
        )
        loan_dict["effective_emi"] = calculate_emi(loan_dict, od_balance)
        loan_dict["impacted_tenure_months"] = calculate_impacted_tenure(
            loan_dict, od_balance
        )

        response.append(loan_dict)

    return response


@router.get("/{loan_id}")
async def get_home_loan(loan_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(HomeLoan)
        .options(selectinload(HomeLoan.installments))
        .where(HomeLoan.id == loan_id)
    )
    loan = result.scalar_one_or_none()
    if not loan:
        raise HTTPException(status_code=404, detail="Home loan not found")

    loan_dict = loan.to_dict(include_installments=True)

    od_balance = None
    if loan.od_account_id:
        od_result = await db.execute(
            select(BankAccount).where(BankAccount.id == loan.od_account_id)
        )
        od_account = od_result.scalar_one_or_none()
        if od_account:
            od_balance = od_account.current_balance

    installments_data = [i.to_dict() for i in loan.installments]
    loan_dict["effective_pre_emi"] = calculate_pre_emi(
        loan_dict, installments_data, od_balance
    )
    loan_dict["effective_emi"] = calculate_emi(loan_dict, od_balance)
    loan_dict["impacted_tenure_months"] = calculate_impacted_tenure(
        loan_dict, od_balance
    )

    return loan_dict


@router.put("/{loan_id}")
async def update_home_loan(
    loan_id: int,
    name: str | None = None,
    account_number: str | None = None,
    interest_rate: float | None = None,
    tenure_months: int | None = None,
    emi_start_date: str | None = None,
    od_account_id: int | None = None,
    od_impact_type: str | None = None,
    current_principal_outstanding: float | None = None,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(HomeLoan)
        .options(selectinload(HomeLoan.installments))
        .where(HomeLoan.id == loan_id)
    )
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
    if od_impact_type is not None:
        if od_impact_type in ["emi", "tenure"]:
            loan.od_impact_type = ODImpactType[od_impact_type]
        else:
            loan.od_impact_type = ODImpactType.none
    if current_principal_outstanding is not None:
        loan.current_principal_outstanding = current_principal_outstanding

    await db.commit()
    await db.refresh(loan)

    loan_dict = loan.to_dict(include_installments=True)

    od_balance = None
    if loan.od_account_id:
        od_result = await db.execute(
            select(BankAccount).where(BankAccount.id == loan.od_account_id)
        )
        od_account = od_result.scalar_one_or_none()
        if od_account:
            od_balance = od_account.current_balance

    installments_data = [i.to_dict() for i in loan.installments]
    loan_dict["effective_pre_emi"] = calculate_pre_emi(
        loan_dict, installments_data, od_balance
    )
    loan_dict["effective_emi"] = calculate_emi(loan_dict, od_balance)
    loan_dict["impacted_tenure_months"] = calculate_impacted_tenure(
        loan_dict, od_balance
    )

    return loan_dict


@router.delete("/{loan_id}")
async def delete_home_loan(loan_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(HomeLoan).where(HomeLoan.id == loan_id))
    loan = result.scalar_one_or_none()
    if not loan:
        raise HTTPException(status_code=404, detail="Home loan not found")

    await db.delete(loan)
    await db.commit()
    return {"message": "Home loan deleted successfully"}
