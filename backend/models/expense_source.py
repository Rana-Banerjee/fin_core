from sqlalchemy import Integer, String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


class ExpenseSource(Base):
    __tablename__ = "expense_sources"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    expense_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("cash_flows.id"), nullable=False
    )
    source_type: Mapped[str] = mapped_column(String(20), nullable=False)
    bank_account_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("bank_accounts.id"), nullable=True
    )
    investment_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("investments.id"), nullable=True
    )
    priority_order: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    expense: Mapped["CashFlow"] = relationship(
        "CashFlow", back_populates="expense_sources"
    )
    bank_account: Mapped["BankAccount"] = relationship(
        "BankAccount", foreign_keys=[bank_account_id]
    )
    investment: Mapped["Investment"] = relationship(
        "Investment", foreign_keys=[investment_id]
    )

    def to_dict(self):
        result = {
            "id": self.id,
            "expense_id": self.expense_id,
            "source_type": self.source_type,
            "bank_account_id": self.bank_account_id,
            "investment_id": self.investment_id,
            "priority_order": self.priority_order,
        }
        if self.bank_account:
            result["bank_account_name"] = self.bank_account.name
        if self.investment:
            result["investment_name"] = self.investment.name
        return result
