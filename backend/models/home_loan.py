from sqlalchemy import Integer, String, Float, DateTime, Date, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime
from database import Base


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
    current_pre_emi_principal: Mapped[float | None] = mapped_column(
        Float, nullable=True
    )
    current_pre_emi_interest: Mapped[float | None] = mapped_column(Float, nullable=True)
    current_emi_principal: Mapped[float | None] = mapped_column(Float, nullable=True)
    current_emi_interest: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow
    )

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "account_number": self.account_number,
            "interest_rate": self.interest_rate,
            "tenure_months": self.tenure_months,
            "emi_start_date": self.emi_start_date.isoformat()
            if self.emi_start_date
            else None,
            "od_account_id": self.od_account_id,
            "current_principal_outstanding": self.current_principal_outstanding,
            "current_pre_emi_principal": self.current_pre_emi_principal,
            "current_pre_emi_interest": self.current_pre_emi_interest,
            "current_emi_principal": self.current_emi_principal,
            "current_emi_interest": self.current_emi_interest,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
