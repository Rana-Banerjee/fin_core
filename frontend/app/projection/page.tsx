"use client";

import { useEffect, useState } from "react";
import LineGraph from "@/components/LineGraph";
import { fetchGraph, fetchBankAccounts, GraphData, BankAccount, generateProjections, getProjectionStatus, ProjectionStatus } from "@/lib/api";

const GRAPH_IDS = ["assets_liabilities", "cashflow"];

export default function Projection() {
  const [graphs, setGraphs] = useState<GraphData[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAccountIds, setSelectedAccountIds] = useState<number[]>([]);
  const [projectionStatus, setProjectionStatus] = useState<ProjectionStatus | null>(null);
  const [projectionMonths, setProjectionMonths] = useState(12);
  const [generatedMonths, setGeneratedMonths] = useState(12);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadData();
    loadProjectionStatus();
  }, []);

  const loadProjectionStatus = async () => {
    try {
      const status = await getProjectionStatus();
      setProjectionStatus(status);
    } catch (err) {
      console.error("Failed to load projection status:", err);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const accountsData = await fetchBankAccounts();
      setBankAccounts(accountsData);

      const allIds = accountsData.map((a) => a.id);
      setSelectedAccountIds(allIds);

      const graphData = await Promise.all(
        GRAPH_IDS.map((id) => fetchGraph(id, allIds, generatedMonths))
      );
      setGraphs(graphData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectionChange = async (selectedIds: number[]) => {
    setSelectedAccountIds(selectedIds);
    
    try {
      const graphData = await Promise.all(
        GRAPH_IDS.map((id) => fetchGraph(id, selectedIds, generatedMonths))
      );
      setGraphs(graphData);
    } catch (err) {
      console.error("Failed to fetch graphs with selected accounts:", err);
    }
  };

  const handleSelectAll = () => {
    handleSelectionChange(bankAccounts.map((a) => a.id));
  };

  const handleUnselectAll = () => {
    handleSelectionChange([]);
  };

  const handleGenerateProjections = async () => {
    setGenerating(true);
    try {
      await generateProjections(projectionMonths);
      setGeneratedMonths(projectionMonths);
      await loadProjectionStatus();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate projections");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="projection">
        <h1>Financial Projection</h1>
        <div style={loadingStyle}>Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="projection">
        <h1>Financial Projection</h1>
        <div style={errorStyle}>Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="projection">
      <div style={headerRowStyle}>
        <h1 style={pageTitleStyle}>Financial Projection</h1>
        {projectionStatus && projectionStatus.generated && (
          <span style={statusBadgeStyle}>
            Generated for {projectionStatus.months} months
          </span>
        )}
      </div>
      
      {bankAccounts.length > 0 && (
        <div style={selectorContainerStyle}>
          <div style={selectorHeaderStyle}>
            <span style={selectorLabelStyle}>Select Accounts</span>
            <div style={selectorButtonsStyle}>
              <button onClick={handleSelectAll} style={selectorButtonStyle}>Select All</button>
              <button onClick={handleUnselectAll} style={selectorButtonStyle}>Unselect All</button>
            </div>
          </div>
          <div style={checkboxesStyle}>
            {bankAccounts.map((account) => (
              <label key={account.id} style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={selectedAccountIds.includes(account.id)}
                  onChange={() => {
                    const newIds = selectedAccountIds.includes(account.id)
                      ? selectedAccountIds.filter((id) => id !== account.id)
                      : [...selectedAccountIds, account.id];
                    handleSelectionChange(newIds);
                  }}
                  style={checkboxStyle}
                />
                <span style={accountNameStyle}>{account.name}</span>
                <span style={accountTypeStyle}>({account.type})</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div style={projectionControlsStyle}>
        <div style={projectionInputGroupStyle}>
          <label style={projectionLabelStyle}>Projection Months:</label>
          <input
            type="number"
            value={projectionMonths}
            onChange={(e) => setProjectionMonths(parseInt(e.target.value) || 12)}
            min={1}
            max={60}
            style={projectionInputStyle}
          />
        </div>
        <button 
          onClick={handleGenerateProjections} 
          disabled={generating || bankAccounts.length === 0}
          style={generateButtonStyle}
        >
          {generating ? "Generating..." : "Generate Projections"}
        </button>
      </div>

      <div className="graphs-grid">
        {GRAPH_IDS.map((graphId) => {
          const graph = graphs.find((g) => g.id === graphId);
          if (!graph) return null;

          return (
            <div key={graphId} style={graphCardStyle}>
              <LineGraph data={graph} />
              {graph.variables.length === 0 && (
                <div style={emptyGraphStyle}>
                  Select accounts above to display data
                </div>
              )}
            </div>
          );
        })}
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

const pageTitleStyle: React.CSSProperties = {
  fontSize: "1.5rem",
  fontWeight: 600,
  color: "#1f2937",
  marginBottom: "1.5rem",
};

const graphCardStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
};

const emptyGraphStyle: React.CSSProperties = {
  marginTop: "1rem",
  padding: "1rem",
  textAlign: "center",
  color: "#9ca3af",
  fontSize: "0.875rem",
  background: "#f9fafb",
  borderRadius: "6px",
};

const selectorContainerStyle: React.CSSProperties = {
  marginBottom: "1.5rem",
  padding: "1rem",
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
};

const selectorHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "0.75rem",
  flexWrap: "wrap",
  gap: "0.5rem",
};

const selectorLabelStyle: React.CSSProperties = {
  fontSize: "0.875rem",
  fontWeight: 600,
  color: "#374151",
};

const selectorButtonsStyle: React.CSSProperties = {
  display: "flex",
  gap: "0.5rem",
};

const selectorButtonStyle: React.CSSProperties = {
  padding: "0.375rem 0.75rem",
  fontSize: "0.75rem",
  fontWeight: 500,
  color: "#374151",
  background: "#f3f4f6",
  border: "1px solid #d1d5db",
  borderRadius: "4px",
  cursor: "pointer",
};

const checkboxesStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "1rem",
};

const checkboxLabelStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.375rem",
  cursor: "pointer",
  fontSize: "0.875rem",
};

const checkboxStyle: React.CSSProperties = {
  cursor: "pointer",
};

const accountNameStyle: React.CSSProperties = {
  color: "#1f2937",
  fontWeight: 500,
};

const accountTypeStyle: React.CSSProperties = {
  color: "#6b7280",
  fontSize: "0.75rem",
};

const headerRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "1rem",
  marginBottom: "1.5rem",
};

const statusBadgeStyle: React.CSSProperties = {
  padding: "0.375rem 0.75rem",
  background: "#dcfce7",
  color: "#16a34a",
  borderRadius: "9999px",
  fontSize: "0.75rem",
  fontWeight: 500,
};

const projectionControlsStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "1rem",
  marginBottom: "1.5rem",
  padding: "1rem",
  background: "#f0f9ff",
  borderRadius: "8px",
  border: "1px solid #bae6fd",
};

const projectionInputGroupStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
};

const projectionLabelStyle: React.CSSProperties = {
  fontSize: "0.875rem",
  fontWeight: 500,
  color: "#0369a1",
};

const projectionInputStyle: React.CSSProperties = {
  width: "60px",
  padding: "0.375rem",
  border: "1px solid #7dd3fc",
  borderRadius: "4px",
  fontSize: "0.875rem",
  textAlign: "center",
};

const generateButtonStyle: React.CSSProperties = {
  padding: "0.625rem 1rem",
  background: "#0284c7",
  border: "none",
  borderRadius: "6px",
  fontSize: "0.875rem",
  fontWeight: 500,
  color: "#ffffff",
  cursor: "pointer",
};