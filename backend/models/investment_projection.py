from sqlalchemy import Integer, Float, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime
from database import Base


class InvestmentProjection(Base):
    __tablename__ = "investment_projections"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    investment_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("investments.id"), nullable=False
    )
    month_index: Mapped[int] = mapped_column(Integer, nullable=False)
    projected_value: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow
    )

    def to_dict(self):
        return {
            "id": self.id,
            "investment_id": self.investment_id,
            "month_index": self.month_index,
            "projected_value": self.projected_value,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
