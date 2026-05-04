from sqlalchemy import Integer, Float, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime
from database import Base


class CashFlowProjection(Base):
    __tablename__ = "cash_flow_projections"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    cash_flow_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("cash_flows.id"), nullable=False
    )
    month_index: Mapped[int] = mapped_column(Integer, nullable=False)
    projected_amount: Mapped[float] = mapped_column(Float, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow
    )

    def to_dict(self):
        return {
            "id": self.id,
            "cash_flow_id": self.cash_flow_id,
            "month_index": self.month_index,
            "projected_amount": self.projected_amount,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
