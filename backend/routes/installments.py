from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date as date_type
from typing import Optional

from database import get_db
from models.installment import Installment, DisbursedBy
from models.home_loan import HomeLoan

router = APIRouter(prefix="/api/installments", tags=["installments"])


@router.post("")
async def create_installment(
    home_loan_id: int,
    disbursement_date: str,
    amount: float,
    disbursed_by: str,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(HomeLoan).where(HomeLoan.id == home_loan_id))
    loan = result.scalar_one_or_none()
    if not loan:
        raise HTTPException(status_code=404, detail="Home loan not found")

    disbursement_date_parsed = date_type.fromisoformat(disbursement_date)
    disbursed_by_enum = DisbursedBy.bank if disbursed_by == "bank" else DisbursedBy.self

    installment = Installment(
        home_loan_id=home_loan_id,
        disbursement_date=disbursement_date_parsed,
        amount=amount,
        disbursed_by=disbursed_by_enum,
    )
    db.add(installment)
    await db.commit()
    await db.refresh(installment)
    return installment.to_dict()


@router.get("")
async def get_installments(
    home_loan_id: int = Query(..., description="Filter by home loan ID"),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Installment)
        .where(Installment.home_loan_id == home_loan_id)
        .order_by(Installment.disbursement_date)
    )
    installments = result.scalars().all()
    return [inst.to_dict() for inst in installments]


@router.put("/{installment_id}")
async def update_installment(
    installment_id: int,
    disbursement_date: Optional[str] = None,
    amount: Optional[float] = None,
    disbursed_by: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Installment).where(Installment.id == installment_id)
    )
    installment = result.scalar_one_or_none()
    if not installment:
        raise HTTPException(status_code=404, detail="Installment not found")

    if disbursement_date is not None:
        installment.disbursement_date = date_type.fromisoformat(disbursement_date)
    if amount is not None:
        installment.amount = amount
    if disbursed_by is not None:
        installment.disbursed_by = (
            DisbursedBy.bank if disbursed_by == "bank" else DisbursedBy.self
        )

    await db.commit()
    await db.refresh(installment)
    return installment.to_dict()


@router.delete("/{installment_id}")
async def delete_installment(installment_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Installment).where(Installment.id == installment_id)
    )
    installment = result.scalar_one_or_none()
    if not installment:
        raise HTTPException(status_code=404, detail="Installment not found")

    await db.delete(installment)
    await db.commit()
    return {"message": "Installment deleted successfully"}
