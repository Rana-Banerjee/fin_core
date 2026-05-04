from sqlalchemy import Integer, String, Float, DateTime, Date, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime
from database import Base
import enum


class InvestmentType(str, enum.Enum):
    stock = "stock"
    mutual_fund = "mutual_fund"
    etf = "etf"
    ppf = "ppf"
    nps = "nps"
    bonds = "bonds"
    fixed_deposit = "fixed_deposit"


class Investment(Base):
    __tablename__ = "investments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    account_number: Mapped[str] = mapped_column(String(50), nullable=False)
    current_value: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    investment_type: Mapped[InvestmentType] = mapped_column(
        SQLEnum(InvestmentType), nullable=False
    )
    appreciation_rate: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    sip_amount: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    purchase_date: Mapped[datetime | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow
    )

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "account_number": self.account_number,
            "current_value": self.current_value,
            "investment_type": self.investment_type.value,
            "appreciation_rate": self.appreciation_rate,
            "sip_amount": self.sip_amount,
            "purchase_date": self.purchase_date.isoformat()
            if self.purchase_date
            else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
