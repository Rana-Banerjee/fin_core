from sqlalchemy import Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from database import Base


class PaymentSource(Base):
    __tablename__ = "payment_sources"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    source_type: Mapped[str] = mapped_column(String(20), nullable=False)
    bank_account_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("bank_accounts.id"), nullable=True
    )
    investment_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("investments.id"), nullable=True
    )
    priority_order: Mapped[int] = mapped_column(Integer, nullable=False, default=999)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow
    )

    bank_account: Mapped["BankAccount"] = relationship("BankAccount")
    investment: Mapped["Investment"] = relationship("Investment")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "source_type": self.source_type,
            "bank_account_id": self.bank_account_id,
            "investment_id": self.investment_id,
            "priority_order": self.priority_order,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
