from sqlalchemy import (
    Integer,
    String,
    Float,
    DateTime,
    Date,
    ForeignKey,
    Enum as SQLEnum,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from database import Base
import enum


class DisbursedBy(str, enum.Enum):
    bank = "bank"
    self = "self"


class Installment(Base):
    __tablename__ = "installments"
    __allow_unmapped__ = True

    id = mapped_column(Integer, primary_key=True, autoincrement=True)
    home_loan_id = mapped_column(
        Integer, ForeignKey("home_loans.id", ondelete="CASCADE"), nullable=False
    )
    disbursement_date = mapped_column(Date, nullable=False)
    amount = mapped_column(Float, nullable=False)
    disbursed_by = mapped_column(
        SQLEnum(DisbursedBy), nullable=False, default=DisbursedBy.bank
    )
    created_at = mapped_column(DateTime, nullable=False, default=datetime.utcnow)

    home_loan = relationship("HomeLoan", back_populates="installments")

    def to_dict(self):
        return {
            "id": self.id,
            "home_loan_id": self.home_loan_id,
            "disbursement_date": self.disbursement_date.isoformat()
            if self.disbursement_date
            else None,
            "amount": self.amount,
            "disbursed_by": self.disbursed_by.value,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
