"use client";

import { useEffect, useState } from "react";
import LineGraph from "@/components/LineGraph";
import { fetchGraph, GraphData } from "@/lib/api";

const GRAPH_IDS = ["revenue", "expenses"];

export default function Dashboard() {
  const [graphs, setGraphs] = useState<GraphData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadGraphs() {
      try {
        const graphData = await Promise.all(
          GRAPH_IDS.map((id) => fetchGraph(id))
        );
        setGraphs(graphData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load graphs");
      } finally {
        setLoading(false);
      }
    }
    loadGraphs();
  }, []);

  if (loading) {
    return (
      <div className="dashboard">
        <h1>FinCore Dashboard</h1>
        <div style={loadingStyle}>Loading graphs...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard">
        <h1>FinCore Dashboard</h1>
        <div style={errorStyle}>Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <h1>FinCore Dashboard</h1>
      <div className="graphs-grid">
        {graphs.map((graph) => (
          <LineGraph key={graph.id} data={graph} />
        ))}
      </div>
    </div>
  );
}

const loadingStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  minHeight: "200px",
  color: "#64748b",
  fontSize: "1rem",
};

const errorStyle: React.CSSProperties = {
  padding: "1rem",
  background: "#fef2f2",
  border: "1px solid #fecaca",
  borderRadius: "8px",
  color: "#dc2626",
};