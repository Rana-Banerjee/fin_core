import random
from fastapi import APIRouter, HTTPException
from typing import List
import numpy as np

from models.graph_data import GraphConfig, GraphData, VariableData, AllGraphsResponse


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
    "revenue": GraphConfig(
        id="revenue",
        title="Revenue Overview",
        variables=[
            VariableData(name="Total Revenue", color="#2563eb", values=[]),
            VariableData(name="Net Profit", color="#16a34a", values=[]),
            VariableData(name="Operating Costs", color="#dc2626", values=[]),
        ],
        prior_month_cutoff=3,
    ),
    "expenses": GraphConfig(
        id="expenses",
        title="Expense Breakdown",
        variables=[
            VariableData(name="Marketing", color="#9333ea", values=[]),
            VariableData(name="R&D", color="#0891b2", values=[]),
            VariableData(name="Administrative", color="#f59e0b", values=[]),
        ],
        prior_month_cutoff=4,
    ),
}


def generate_random_values(
    base: float, variance: float, months: int = 12
) -> List[float]:
    return [
        round(base + random.uniform(-variance, variance) * (i + 1), 2)
        for i in range(months)
    ]


def populate_graph_data(config: GraphConfig) -> GraphData:
    for var in config.variables:
        if not var.values:
            base = random.randint(10000, 50000)
            variance = base * 0.3
            var.values = generate_random_values(base, variance)

    data = []
    for i, month in enumerate(MONTHS):
        row = {"month": month}
        for var in config.variables:
            row[var.name] = var.values[i]
        data.append(row)

    return GraphData(
        id=config.id,
        title=config.title,
        x_axis=MONTHS,
        data=data,
        variables=config.variables,
        prior_month_cutoff=config.prior_month_cutoff,
    )


@router.get("/graphs", response_model=AllGraphsResponse)
async def get_all_graphs():
    return AllGraphsResponse(graphs=list(GRAPH_CONFIGS.values()))


@router.get("/graph/{graph_id}", response_model=GraphData)
async def get_graph(graph_id: str):
    if graph_id not in GRAPH_CONFIGS:
        raise HTTPException(status_code=404, detail=f"Graph '{graph_id}' not found")
    return populate_graph_data(GRAPH_CONFIGS[graph_id])


@router.post("/graph/{graph_id}/regenerate")
async def regenerate_graph(graph_id: str):
    if graph_id not in GRAPH_CONFIGS:
        raise HTTPException(status_code=404, detail=f"Graph '{graph_id}' not found")

    config = GRAPH_CONFIGS[graph_id]
    for var in config.variables:
        base = random.randint(10000, 50000)
        variance = base * 0.3
        var.values = generate_random_values(base, variance)

    return {
        "message": f"Graph '{graph_id}' data regenerated",
        "graph": populate_graph_data(config),
    }
