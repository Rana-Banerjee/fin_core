"use client";

import { useState } from "react";
import { Investment, deleteInvestment } from "@/lib/api";
import InvestmentForm from "./InvestmentForm";

interface InvestmentListProps {
  investments: Investment[];
  onRefresh: () => void;
}

const TYPE_LABELS: { [key: string]: string } = {
  stock: "Stock",
  mutual_fund: "Mutual Fund",
  etf: "ETF",
  ppf: "PPF",
  nps: "NPS",
  bonds: "Bonds",
  fixed_deposit: "Fixed Deposit",
};

export default function InvestmentList({ investments, onRefresh }: InvestmentListProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Investment | null>(null);

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteInvestment(deleteConfirm.id);
      setDeleteConfirm(null);
      onRefresh();
    } catch (err) {
      console.error("Failed to delete investment:", err);
    }
  };

  const handleEdit = (investment: Investment) => {
    setEditingInvestment(investment);
    setIsFormOpen(true);
  };

  const totalValue = investments.reduce((sum, inv) => sum + inv.current_value, 0);

  return (
    <>
      <div style={containerStyle}>
        <div style={headerStyle}>
          <div>
            <h3 style={titleStyle}>Investments</h3>
            <p style={subtitleStyle}>
              {investments.length} holding{investments.length !== 1 ? "s" : ""} • ₹{totalValue.toLocaleString()} total value
            </p>
          </div>
          <button onClick={() => { setEditingInvestment(null); setIsFormOpen(true); }} style={addButtonStyle}>
            + Add Investment
          </button>
        </div>

        {investments.length === 0 ? (
          <div style={emptyStyle}>No investments added yet</div>
        ) : (
          <div style={listStyle}>
            {investments.map((inv) => (
              <div key={inv.id} style={itemStyle}>
                <div style={itemInfoStyle}>
                  <div style={itemNameStyle}>{inv.name}</div>
                  <div style={itemMetaStyle}>
                    {TYPE_LABELS[inv.investment_type] || inv.investment_type} • {inv.account_number}
                  </div>
                </div>
                <div style={itemValueStyle}>
                  <div style={valueStyle}>₹{inv.current_value.toLocaleString()}</div>
                  {inv.appreciation_rate > 0 && (
                    <div style={rateStyle}>+{inv.appreciation_rate}%/yr</div>
                  )}
                  {inv.sip_amount > 0 && (
                    <div style={sipStyle}>SIP: ₹{inv.sip_amount.toLocaleString()}/mo</div>
                  )}
                </div>
                <div style={actionStyle}>
                  <button onClick={() => handleEdit(inv)} style={editButtonStyle}>Edit</button>
                  <button onClick={() => setDeleteConfirm(inv)} style={deleteButtonStyle}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <InvestmentForm
        isOpen={isFormOpen}
        onClose={() => { setIsFormOpen(false); setEditingInvestment(null); }}
        onSuccess={() => { onRefresh(); setIsFormOpen(false); setEditingInvestment(null); }}
        editData={editingInvestment}
      />

      {deleteConfirm && (
        <div style={overlayStyle}>
          <div style={confirmModalStyle}>
            <h3 style={confirmTitleStyle}>Delete Investment</h3>
            <p style={confirmTextStyle}>
              Are you sure you want to delete "{deleteConfirm.name}"? This action cannot be undone.
            </p>
            <div style={confirmButtonGroupStyle}>
              <button onClick={() => setDeleteConfirm(null)} style={cancelButtonStyle}>Cancel</button>
              <button onClick={handleDelete} style={confirmDeleteButtonStyle}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const containerStyle: React.CSSProperties = {
  background: "#ffffff",
  borderRadius: "12px",
  padding: "1.5rem",
  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "1rem",
};

const titleStyle: React.CSSProperties = {
  fontSize: "1.125rem",
  fontWeight: 600,
  color: "#1e293b",
  margin: 0,
};

const subtitleStyle: React.CSSProperties = {
  fontSize: "0.875rem",
  color: "#6b7280",
  margin: "0.25rem 0 0 0",
};

const addButtonStyle: React.CSSProperties = {
  padding: "0.5rem 1rem",
  background: "#2563eb",
  border: "none",
  borderRadius: "6px",
  fontSize: "0.875rem",
  fontWeight: 500,
  color: "#ffffff",
  cursor: "pointer",
};

const emptyStyle: React.CSSProperties = {
  textAlign: "center",
  padding: "2rem",
  color: "#6b7280",
  fontSize: "0.875rem",
};

const listStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.75rem",
};

const itemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  padding: "1rem",
  background: "#f9fafb",
  borderRadius: "8px",
  gap: "1rem",
};

const itemInfoStyle: React.CSSProperties = {
  flex: 1,
};

const itemNameStyle: React.CSSProperties = {
  fontSize: "0.9375rem",
  fontWeight: 500,
  color: "#1f2937",
};

const itemMetaStyle: React.CSSProperties = {
  fontSize: "0.8125rem",
  color: "#6b7280",
  marginTop: "0.25rem",
};

const itemValueStyle: React.CSSProperties = {
  textAlign: "right" as const,
};

const valueStyle: React.CSSProperties = {
  fontSize: "0.9375rem",
  fontWeight: 600,
  color: "#1f2937",
};

const rateStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  color: "#16a34a",
};

const sipStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  color: "#6b7280",
};

const actionStyle: React.CSSProperties = {
  display: "flex",
  gap: "0.5rem",
};

const editButtonStyle: React.CSSProperties = {
  padding: "0.375rem 0.75rem",
  background: "transparent",
  border: "1px solid #d1d5db",
  borderRadius: "4px",
  fontSize: "0.8125rem",
  color: "#374151",
  cursor: "pointer",
};

const deleteButtonStyle: React.CSSProperties = {
  padding: "0.375rem 0.75rem",
  background: "transparent",
  border: "1px solid #fecaca",
  borderRadius: "4px",
  fontSize: "0.8125rem",
  color: "#dc2626",
  cursor: "pointer",
};

const overlayStyle: React.CSSProperties = {
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

const confirmModalStyle: React.CSSProperties = {
  background: "#ffffff",
  borderRadius: "12px",
  padding: "1.5rem",
  width: "100%",
  maxWidth: "400px",
  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
};

const confirmTitleStyle: React.CSSProperties = {
  fontSize: "1.125rem",
  fontWeight: 600,
  color: "#1e293b",
  marginBottom: "0.75rem",
};

const confirmTextStyle: React.CSSProperties = {
  fontSize: "0.875rem",
  color: "#6b7280",
  marginBottom: "1.5rem",
};

const confirmButtonGroupStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "0.75rem",
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