from sqlalchemy import (
    Integer,
    String,
    Float,
    Date,
    DateTime,
    ForeignKey,
    Enum as SQLEnum,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import date, datetime
from database import Base
import enum


class StreamType(str, enum.Enum):
    income = "income"
    expense = "expense"


class IncomeCategory(str, enum.Enum):
    salary = "salary"
    rental = "rental"
    business = "business"
    interest = "interest"
    dividends = "dividends"
    other = "other"


class ExpenseCategory(str, enum.Enum):
    rent = "rent"
    emi = "emi"
    utilities = "utilities"
    insurance = "insurance"
    groceries = "groceries"
    other = "other"


class Frequency(str, enum.Enum):
    weekly = "weekly"
    monthly = "monthly"
    quarterly = "quarterly"
    annually = "annually"
    none = "none"


class AppreciationFrequency(str, enum.Enum):
    monthly = "monthly"
    quarterly = "quarterly"
    annually = "annually"


class CashFlow(Base):
    __tablename__ = "cash_flows"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    stream_type: Mapped[StreamType] = mapped_column(SQLEnum(StreamType), nullable=False)
    stream_category: Mapped[str] = mapped_column(String(20), nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    frequency: Mapped[Frequency] = mapped_column(
        SQLEnum(Frequency), nullable=False, default=Frequency.monthly
    )
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    is_active: Mapped[bool] = mapped_column(Integer, nullable=False, default=True)
    appreciation_rate: Mapped[float | None] = mapped_column(
        Float, nullable=True, default=0.0
    )
    appreciation_frequency: Mapped[AppreciationFrequency | None] = mapped_column(
        SQLEnum(AppreciationFrequency), nullable=True
    )
    bank_account_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("bank_accounts.id"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow
    )

    bank_account: Mapped["BankAccount"] = relationship(
        "BankAccount", foreign_keys=[bank_account_id]
    )
    expense_sources: Mapped[list["ExpenseSource"]] = relationship(
        "ExpenseSource", back_populates="expense", cascade="all, delete-orphan"
    )

    def to_dict(
        self, include_expense_sources: bool = False, expense_sources_list: list = None
    ):
        result = {
            "id": self.id,
            "name": self.name,
            "stream_type": self.stream_type.value,
            "stream_category": self.stream_category,
            "amount": self.amount,
            "frequency": self.frequency.value,
            "start_date": self.start_date.isoformat() if self.start_date else None,
            "end_date": self.end_date.isoformat() if self.end_date else None,
            "is_active": bool(self.is_active),
            "appreciation_rate": self.appreciation_rate or 0.0,
            "appreciation_frequency": self.appreciation_frequency.value
            if self.appreciation_frequency
            else None,
            "bank_account_id": self.bank_account_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        if include_expense_sources:
            if expense_sources_list:
                result["expense_sources"] = [
                    es.to_dict() for es in expense_sources_list
                ]
            else:
                result["expense_sources"] = []
        return result
