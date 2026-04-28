const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface VariableData {
  name: string;
  color: string;
  values: number[];
}

export interface GraphData {
  id: string;
  title: string;
  x_axis: string[];
  data: { month: string; [key: string]: string | number }[];
  variables: VariableData[];
  prior_month_cutoff: number;
}

export interface GraphConfig {
  id: string;
  title: string;
  variables: VariableData[];
  prior_month_cutoff: number;
}

export async function fetchGraph(graphId: string): Promise<GraphData> {
  const response = await fetch(`${API_BASE_URL}/api/graph/${graphId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch graph: ${response.statusText}`);
  }
  return response.json();
}

export async function fetchAllGraphs(): Promise<GraphConfig[]> {
  const response = await fetch(`${API_BASE_URL}/api/graphs`);
  if (!response.ok) {
    throw new Error(`Failed to fetch graphs: ${response.statusText}`);
  }
  const data = await response.json();
  return data.graphs;
}

export async function regenerateGraph(graphId: string): Promise<GraphData> {
  const response = await fetch(`${API_BASE_URL}/api/graph/${graphId}/regenerate`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`Failed to regenerate graph: ${response.statusText}`);
  }
  const data = await response.json();
  return data.graph;
}