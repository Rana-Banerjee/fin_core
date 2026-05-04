from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from database import get_db
from models.payment_source import PaymentSource


class PaymentSourceCreate(BaseModel):
    name: str
    source_type: str
    bank_account_id: int | None = None
    investment_id: int | None = None
    priority_order: int = 999
    is_active: bool = True


class PaymentSourceUpdate(BaseModel):
    name: str | None = None
    source_type: str | None = None
    bank_account_id: int | None = None
    investment_id: int | None = None
    priority_order: int | None = None
    is_active: bool | None = None


router = APIRouter(prefix="/api/payment-sources", tags=["payment-sources"])


@router.post("")
async def create_payment_source(
    source: PaymentSourceCreate,
    db: AsyncSession = Depends(get_db),
):
    ps = PaymentSource(
        name=source.name,
        source_type=source.source_type,
        bank_account_id=source.bank_account_id,
        investment_id=source.investment_id,
        priority_order=source.priority_order,
        is_active=source.is_active,
    )
    db.add(ps)
    await db.commit()
    await db.refresh(ps)
    return ps.to_dict()


@router.get("")
async def get_payment_sources(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(PaymentSource).order_by(PaymentSource.priority_order)
    )
    sources = result.scalars().all()
    return [src.to_dict() for src in sources]


@router.get("/{source_id}")
async def get_payment_source(source_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(PaymentSource).where(PaymentSource.id == source_id)
    )
    src = result.scalar_one_or_none()
    if not src:
        raise HTTPException(status_code=404, detail="Payment source not found")
    return src.to_dict()


@router.put("/{source_id}")
async def update_payment_source(
    source_id: int,
    source: PaymentSourceUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PaymentSource).where(PaymentSource.id == source_id)
    )
    ps = result.scalar_one_or_none()
    if not ps:
        raise HTTPException(status_code=404, detail="Payment source not found")

    if source.name is not None:
        ps.name = source.name
    if source.source_type is not None:
        ps.source_type = source.source_type
    if source.bank_account_id is not None:
        ps.bank_account_id = source.bank_account_id
    if source.investment_id is not None:
        ps.investment_id = source.investment_id
    if source.priority_order is not None:
        ps.priority_order = source.priority_order
    if source.is_active is not None:
        ps.is_active = source.is_active

    await db.commit()
    await db.refresh(ps)
    return ps.to_dict()


@router.delete("/{source_id}")
async def delete_payment_source(source_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(PaymentSource).where(PaymentSource.id == source_id)
    )
    src = result.scalar_one_or_none()
    if not src:
        raise HTTPException(status_code=404, detail="Payment source not found")

    await db.delete(src)
    await db.commit()
    return {"message": "Payment source deleted successfully"}
