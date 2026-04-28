from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from datetime import datetime

from database import get_db
from models.graph_data import GraphData, VariableData
from models.bank_account import BankAccount
from models.projection import Projection


router = APIRouter(prefix="/api", tags=["graphs"])

MONTHS = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
]

GRAPH_CONFIGS = {
    "assets_liabilities": {
        "id": "assets_liabilities",
        "title": "Assets & Liabilities",
        "prior_month_cutoff": 3,
    },
    "cashflow": {
        "id": "cashflow",
        "title": "Cashflow",
        "prior_month_cutoff": 4,
    },
}

COLORS = [
    "#2563eb",
    "#16a34a",
    "#dc2626",
    "#9333ea",
    "#0891b2",
    "#f59e0b",
    "#8b5cf6",
    "#ec4899",
    "#14b8a6",
    "#f97316",
]

SUMMARY_COLORS = {
    "Asset": "#7c3aed",
    "Liability": "#ef4444",
    "Cash in Hand": "#0d9488",
}


async def populate_graph_data(
    graph_id: str,
    account_ids: List[int],
    db: AsyncSession,
    projection_months: int = 12,
) -> GraphData:
    if graph_id not in GRAPH_CONFIGS:
        raise HTTPException(status_code=404, detail=f"Graph '{graph_id}' not found")

    config = GRAPH_CONFIGS[graph_id]
    prior_month_cutoff = config["prior_month_cutoff"]

    current_month = datetime.now().month

    result = await db.execute(select(Projection).limit(1))
    has_projections = result.scalar() is not None

    if has_projections:
        result = await db.execute(
            select(Projection.bank_account_id, func.count(Projection.id)).group_by(
                Projection.bank_account_id
            )
        )
        counts = result.all()
        if counts:
            projection_months = max(c[1] for c in counts)

    total_months = projection_months
    current = datetime.now()
    x_axis = []
    for i in range(projection_months):
        month_num = ((current.month - 1 + i) % 12) + 1
        year_offset = (current.month - 1 + i) // 12
        x_axis.append(f"{MONTHS[month_num - 1]} {current.year + year_offset}")

    variables = []
    total_balance = 0.0

    if account_ids:
        result = await db.execute(
            select(BankAccount).where(BankAccount.id.in_(account_ids))
        )
        accounts = result.scalars().all()

        for i, account in enumerate(accounts):
            if has_projections:
                result = await db.execute(
                    select(Projection)
                    .where(Projection.bank_account_id == account.id)
                    .order_by(Projection.month_index)
                )
                projections = result.scalars().all()

                if projections:
                    values = [account.current_balance]
                    values.extend([p.projected_balance for p in projections])
                else:
                    values = [account.current_balance] * total_months
            else:
                values = [account.current_balance] * total_months

            variables.append(
                VariableData(
                    name=account.name,
                    color=COLORS[i % len(COLORS)],
                    values=values,
                )
            )
            total_balance += account.current_balance

    if has_projections:
        total_balance_values = [total_balance]
        for month_idx in range(1, total_months):
            month_total = 0.0
            if account_ids:
                for acc_id in account_ids:
                    result = await db.execute(
                        select(Projection)
                        .where(Projection.bank_account_id == acc_id)
                        .where(Projection.month_index == current_month + month_idx -1)
                    )
                    proj = result.scalar_one_or_none()
                    if proj:
                        month_total += proj.projected_balance
            total_balance_values.append(
                month_total if month_total > 0 else total_balance
            )
    else:
        total_balance_values = [total_balance] * total_months

    if graph_id == "assets_liabilities":
        variables.append(
            VariableData(
                name="Asset",
                color=SUMMARY_COLORS["Asset"],
                values=total_balance_values,
            )
        )
        variables.append(
            VariableData(
                name="Liability",
                color=SUMMARY_COLORS["Liability"],
                values=[0] * total_months,
            )
        )
    elif graph_id == "cashflow":
        variables.append(
            VariableData(
                name="Cash in Hand",
                color=SUMMARY_COLORS["Cash in Hand"],
                values=total_balance_values,
            )
        )

    data = []
    for i in range(total_months):
        row = {"month": x_axis[i]}
        for var in variables:
            row[var.name] = var.values[i]
        data.append(row)

    return GraphData(
        id=config["id"],
        title=config["title"],
        x_axis=x_axis,
        data=data,
        variables=variables,
        prior_month_cutoff=0,
    )


@router.get("/graphs")
async def get_all_graphs():
    return {"graphs": list(GRAPH_CONFIGS.values())}


@router.get("/graph/{graph_id}")
async def get_graph(
    graph_id: str,
    account_ids: str = Query(default=""),
    projection_months: int = Query(default=12),
    db: AsyncSession = Depends(get_db),
):
    account_id_list = []
    if account_ids:
        account_id_list = [
            int(x.strip()) for x in account_ids.split(",") if x.strip().isdigit()
        ]

    return await populate_graph_data(graph_id, account_id_list, db, projection_months)


@router.post("/graph/{graph_id}/regenerate")
async def regenerate_graph(
    graph_id: str,
    account_ids: str = Query(default=""),
    projection_months: int = Query(default=12),
    db: AsyncSession = Depends(get_db),
):
    account_id_list = []
    if account_ids:
        account_id_list = [
            int(x.strip()) for x in account_ids.split(",") if x.strip().isdigit()
        ]

    return {
        "message": f"Graph '{graph_id}' data regenerated",
        "graph": await populate_graph_data(
            graph_id, account_id_list, db, projection_months
        ),
    }
