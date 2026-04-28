from pydantic import BaseModel
from typing import List, Optional


class VariableData(BaseModel):
    name: str
    color: str
    values: List[float]


class GraphConfig(BaseModel):
    id: str
    title: str
    variables: List[VariableData]
    prior_month_cutoff: int


class GraphData(BaseModel):
    id: str
    title: str
    x_axis: List[str]
    data: List[dict]
    variables: List[VariableData]
    prior_month_cutoff: int


class AllGraphsResponse(BaseModel):
    graphs: List[GraphConfig]
