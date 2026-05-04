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


class ODImpactType(str, enum.Enum):
    none = "none"
    emi = "emi"
    tenure = "tenure"


class HomeLoan(Base):
    __tablename__ = "home_loans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    account_number: Mapped[str] = mapped_column(String(50), nullable=False)
    interest_rate: Mapped[float] = mapped_column(Float, nullable=False)
    tenure_months: Mapped[int] = mapped_column(Integer, nullable=False)
    emi_start_date: Mapped[datetime] = mapped_column(Date, nullable=False)
    od_account_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("bank_accounts.id"), nullable=True
    )
    current_principal_outstanding: Mapped[float] = mapped_column(
        Float, nullable=False, default=0.0
    )
    od_impact_type: Mapped[ODImpactType] = mapped_column(
        SQLEnum(ODImpactType), nullable=False, default=ODImpactType.none
    )
    installments: Mapped[list["Installment"]] = relationship(
        "Installment", back_populates="home_loan", cascade="all, delete-orphan"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow
    )

    def to_dict(self, include_installments: bool = False):
        result = {
            "id": self.id,
            "name": self.name,
            "account_number": self.account_number,
            "interest_rate": self.interest_rate,
            "tenure_months": self.tenure_months,
            "emi_start_date": self.emi_start_date.isoformat()
            if self.emi_start_date
            else None,
            "od_account_id": self.od_account_id,
            "od_impact_type": self.od_impact_type.value,
            "current_principal_outstanding": self.current_principal_outstanding,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        if include_installments:
            result["installments"] = [i.to_dict() for i in self.installments]
        return result
