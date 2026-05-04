"use client";

import { useState } from "react";
import { CashFlow, deleteCashFlow } from "@/lib/api";

interface CashFlowListProps {
  cashFlows: CashFlow[];
  onRefresh: () => void;
  onEdit: (cashFlow: CashFlow) => void;
}

export default function CashFlowList({ cashFlows, onRefresh, onEdit }: CashFlowListProps) {
  const [deleteConfirm, setDeleteConfirm] = useState<CashFlow | null>(null);

  const incomeFlows = cashFlows.filter((cf) => cf.stream_type === "income");
  const expenseFlows = cashFlows.filter((cf) => cf.stream_type === "expense");

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteCashFlow(deleteConfirm.id);
      setDeleteConfirm(null);
      onRefresh();
    } catch (err) {
      console.error("Failed to delete cash flow:", err);
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      salary: "Salary",
      rental: "Rental",
      business: "Business",
      interest: "Interest",
      dividends: "Dividends",
      rent: "Rent",
      emi: "EMI",
      utilities: "Utilities",
      insurance: "Insurance",
      groceries: "Groceries",
      other: "Other",
    };
    return labels[category] || category;
  };

  const getFrequencyLabel = (freq: string) => {
    const labels: Record<string, string> = {
      weekly: "Weekly",
      monthly: "Monthly",
      quarterly: "Quarterly",
      annually: "Annually",
    };
    return labels[freq] || freq;
  };

  const formatCurrency = (amount: number) => {
    return `₹${Math.abs(amount).toLocaleString("en-IN")}`;
  };

  if (cashFlows.length === 0) {
    return (
      <div style={emptyStateStyle}>
        No income or expense streams yet. Add your first stream to start tracking.
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      {incomeFlows.length > 0 && (
        <div style={subsectionStyle}>
          <div style={subsectionHeaderStyle}>
            <span style={subsectionTitleStyle}>Income</span>
            <span style={countBadgeStyle}>{incomeFlows.length}</span>
          </div>
          <div style={listStyle}>
            {incomeFlows.map((cf) => (
              <div key={cf.id} style={itemCardStyle}>
                <div style={itemInfoStyle}>
                  <div style={itemNameStyle}>{cf.name}</div>
                  <div style={itemDetailsStyle}>
                    <span style={incomeBadgeStyle}>{getCategoryLabel(cf.stream_category)}</span>
                    <span style={frequencyBadgeStyle}>{getFrequencyLabel(cf.frequency)}</span>
                    <span style={activeBadgeStyle}>{cf.is_active ? "Active" : "Inactive"}</span>
                    <span style={incomeAmountStyle}>+{formatCurrency(cf.amount)}</span>
                  </div>
                </div>
                <div style={itemActionsStyle}>
                  <button onClick={() => onEdit(cf)} style={editButtonStyle} title="Edit">
                    ✏️
                  </button>
                  <button onClick={() => setDeleteConfirm(cf)} style={deleteButtonStyle} title="Delete">
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {expenseFlows.length > 0 && (
        <div style={subsectionStyle}>
          <div style={subsectionHeaderStyle}>
            <span style={subsectionTitleStyle}>Expenses</span>
            <span style={countBadgeStyle}>{expenseFlows.length}</span>
          </div>
          <div style={listStyle}>
            {expenseFlows.map((cf) => (
              <div key={cf.id} style={itemCardStyle}>
                <div style={itemInfoStyle}>
                  <div style={itemNameStyle}>{cf.name}</div>
                  <div style={itemDetailsStyle}>
                    <span style={expenseBadgeStyle}>{getCategoryLabel(cf.stream_category)}</span>
                    <span style={frequencyBadgeStyle}>{getFrequencyLabel(cf.frequency)}</span>
                    <span style={activeBadgeStyle}>{cf.is_active ? "Active" : "Inactive"}</span>
                    <span style={expenseAmountStyle}>-{formatCurrency(cf.amount)}</span>
                  </div>
                </div>
                <div style={itemActionsStyle}>
                  <button onClick={() => onEdit(cf)} style={editButtonStyle} title="Edit">
                    ✏️
                  </button>
                  <button onClick={() => setDeleteConfirm(cf)} style={deleteButtonStyle} title="Delete">
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div style={modalOverlayStyle}>
          <div style={deleteModalStyle}>
            <h3 style={deleteModalTitleStyle}>Delete {deleteConfirm.stream_type === "income" ? "Income" : "Expense"}?</h3>
            <p style={deleteModalTextStyle}>
              Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? This action cannot be undone.
            </p>
            <div style={deleteModalButtonsStyle}>
              <button onClick={() => setDeleteConfirm(null)} style={cancelButtonStyle}>
                Cancel
              </button>
              <button onClick={handleDelete} style={confirmDeleteButtonStyle}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "1.5rem",
};

const subsectionStyle: React.CSSProperties = {};

const subsectionHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
  marginBottom: "0.75rem",
};

const subsectionTitleStyle: React.CSSProperties = {
  fontSize: "0.9375rem",
  fontWeight: 600,
  color: "#374151",
};

const countBadgeStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  padding: "0.125rem 0.5rem",
  background: "#f3f4f6",
  borderRadius: "9999px",
  color: "#6b7280",
};

const listStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.5rem",
};

const itemCardStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "0.75rem 1rem",
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
};

const itemInfoStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.25rem",
};

const itemNameStyle: React.CSSProperties = {
  fontSize: "0.9375rem",
  fontWeight: 500,
  color: "#1f2937",
};

const itemDetailsStyle: React.CSSProperties = {
  display: "flex",
  gap: "0.75rem",
  fontSize: "0.8125rem",
  color: "#6b7280",
  alignItems: "center",
};

const incomeBadgeStyle: React.CSSProperties = {
  background: "#dcfce7",
  color: "#16a34a",
  padding: "0.125rem 0.5rem",
  borderRadius: "4px",
  fontSize: "0.75rem",
  fontWeight: 500,
};

const expenseBadgeStyle: React.CSSProperties = {
  background: "#fee2e2",
  color: "#dc2626",
  padding: "0.125rem 0.5rem",
  borderRadius: "4px",
  fontSize: "0.75rem",
  fontWeight: 500,
};

const frequencyBadgeStyle: React.CSSProperties = {
  background: "#f0fdf4",
  color: "#16a34a",
  padding: "0.125rem 0.5rem",
  borderRadius: "4px",
  fontSize: "0.75rem",
  fontWeight: 500,
};

const activeBadgeStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  color: "#6b7280",
};

const incomeAmountStyle: React.CSSProperties = {
  fontWeight: 600,
  color: "#059669",
};

const expenseAmountStyle: React.CSSProperties = {
  fontWeight: 600,
  color: "#dc2626",
};

const itemActionsStyle: React.CSSProperties = {
  display: "flex",
  gap: "0.5rem",
};

const editButtonStyle: React.CSSProperties = {
  padding: "0.375rem",
  background: "#f3f4f6",
  border: "1px solid #d1d5db",
  borderRadius: "4px",
  cursor: "pointer",
  fontSize: "0.875rem",
};

const deleteButtonStyle: React.CSSProperties = {
  padding: "0.375rem",
  background: "#fef2f2",
  border: "1px solid #fecaca",
  borderRadius: "4px",
  cursor: "pointer",
  fontSize: "0.875rem",
};

const emptyStateStyle: React.CSSProperties = {
  textAlign: "center",
  padding: "2rem 1rem",
  color: "#9ca3af",
  fontSize: "0.9375rem",
  background: "#f9fafb",
  borderRadius: "8px",
  border: "1px dashed #d1d5db",
};

const modalOverlayStyle: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(0, 0, 0, 0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};

const deleteModalStyle: React.CSSProperties = {
  background: "#ffffff",
  borderRadius: "12px",
  padding: "1.5rem",
  width: "100%",
  maxWidth: "400px",
  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
};

const deleteModalTitleStyle: React.CSSProperties = {
  fontSize: "1.125rem",
  fontWeight: 600,
  color: "#1f2937",
  marginBottom: "0.75rem",
};

const deleteModalTextStyle: React.CSSProperties = {
  fontSize: "0.875rem",
  color: "#6b7280",
  marginBottom: "1.5rem",
  lineHeight: 1.5,
};

const deleteModalButtonsStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "0.75rem",
};

const confirmDeleteButtonStyle: React.CSSProperties = {
  padding: "0.625rem 1rem",
  background: "#dc2626",
  border: "none",
  borderRadius: "6px",
  fontSize: "0.875rem",
  fontWeight: 500,
  color: "#ffffff",
  cursor: "pointer",
};

const cancelButtonStyle: React.CSSProperties = {
  padding: "0.625rem 1rem",
  background: "#f3f4f6",
  border: "1px solid #d1d5db",
  borderRadius: "6px",
  fontSize: "0.875rem",
  fontWeight: 500,
  color: "#374151",
  cursor: "pointer",
};