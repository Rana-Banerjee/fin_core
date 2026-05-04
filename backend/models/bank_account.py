from sqlalchemy import Integer, String, Float
from sqlalchemy.orm import Mapped, mapped_column
from database import Base


class BankAccount(Base):
    __tablename__ = "bank_accounts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    account_number: Mapped[str] = mapped_column(String(50), nullable=False)
    current_balance: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    interest_rate: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    type: Mapped[str] = mapped_column(String(20), nullable=False)
    interest_credit_frequency: Mapped[str] = mapped_column(
        String(20), nullable=False, default="annually"
    )
    priority_order: Mapped[int | None] = mapped_column(Integer, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "account_number": self.account_number,
            "current_balance": self.current_balance,
            "interest_rate": self.interest_rate,
            "type": self.type,
            "interest_credit_frequency": self.interest_credit_frequency,
        }
