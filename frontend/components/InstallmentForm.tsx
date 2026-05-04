"use client";

import { useState, useEffect } from "react";
import {
  fetchInstallments,
  createInstallment,
  updateInstallment,
  deleteInstallment,
  Installment,
} from "@/lib/api";

interface InstallmentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  homeLoanId: number;
}

export default function InstallmentForm({
  isOpen,
  onClose,
  onSuccess,
  homeLoanId,
}: InstallmentFormProps) {
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    disbursement_date: "",
    amount: 0,
    disbursed_by: "bank" as "bank" | "self",
  });

  useEffect(() => {
    if (isOpen && homeLoanId) {
      loadInstallments();
    }
  }, [isOpen, homeLoanId]);

  const loadInstallments = async () => {
    try {
      const data = await fetchInstallments(homeLoanId);
      setInstallments(data);
    } catch (err) {
      console.error("Failed to load installments:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (editingId) {
        await updateInstallment(editingId, {
          disbursement_date: formData.disbursement_date,
          amount: formData.amount,
          disbursed_by: formData.disbursed_by,
        });
      } else {
        await createInstallment({
          home_loan_id: homeLoanId,
          disbursement_date: formData.disbursement_date,
          amount: formData.amount,
          disbursed_by: formData.disbursed_by,
        });
      }
      await loadInstallments();
      onSuccess();
      setFormData({ disbursement_date: "", amount: 0, disbursed_by: "bank" });
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save installment");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (inst: Installment) => {
    setFormData({
      disbursement_date: inst.disbursement_date,
      amount: inst.amount,
      disbursed_by: inst.disbursed_by,
    });
    setEditingId(inst.id);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this installment?")) return;
    try {
      await deleteInstallment(id);
      await loadInstallments();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete installment");
    }
  };

  const handleCancel = () => {
    setFormData({ disbursement_date: "", amount: 0, disbursed_by: "bank" });
    setEditingId(null);
  };

  const getPastBankTotal = () => {
    const today = new Date().toISOString().split("T")[0];
    return installments
      .filter(
        (i) => i.disbursed_by === "bank" && i.disbursement_date <= today
      )
      .reduce((sum, i) => sum + i.amount, 0);
  };

  if (!isOpen) return null;

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h2 style={titleStyle}>Manage Installments</h2>

        <div style={summaryStyle}>
          <span>Total Bank Disbursements (Past): ₹{getPastBankTotal().toLocaleString()}</span>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={formGroupStyle}>
            <label style={labelStyle}>Disbursement Date</label>
            <input
              type="date"
              value={formData.disbursement_date}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, disbursement_date: e.target.value }))
              }
              required
              style={inputStyle}
            />
          </div>

          <div style={formRowStyle}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Amount (₹)</label>
              <input
                type="number"
                value={formData.amount || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    amount: parseFloat(e.target.value) || 0,
                  }))
                }
                required
                step="0.01"
                min="0"
                style={inputStyle}
                placeholder="Enter amount"
              />
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>Disbursed By</label>
              <select
                value={formData.disbursed_by}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    disbursed_by: e.target.value as "bank" | "self",
                  }))
                }
                style={inputStyle}
              >
                <option value="bank">Bank</option>
                <option value="self">Self</option>
              </select>
            </div>
          </div>

          {error && <div style={errorStyle}>{error}</div>}

          <div style={buttonGroupStyle}>
            {editingId && (
              <button
                type="button"
                onClick={handleCancel}
                style={cancelButtonStyle}
              >
                Cancel
              </button>
            )}
            <button type="submit" disabled={loading} style={submitButtonStyle}>
              {loading
                ? "Saving..."
                : editingId
                ? "Update"
                : "Add Installment"}
            </button>
          </div>
        </form>

        <div style={listSectionStyle}>
          <h3 style={listTitleStyle}>Installments</h3>
          {installments.length === 0 ? (
            <p style={emptyTextStyle}>No installments added yet.</p>
          ) : (
            <div style={listContainerStyle}>
              {installments.map((inst) => (
                <div key={inst.id} style={listItemStyle}>
                  <div style={listItemInfoStyle}>
                    <span style={listItemDateStyle}>
                      {new Date(inst.disbursement_date).toLocaleDateString()}
                    </span>
                    <span style={listItemAmountStyle}>
                      ₹{inst.amount.toLocaleString()}
                    </span>
                    <span
                      style={{
                        ...listItemBadgeStyle,
                        background:
                          inst.disbursed_by === "bank" ? "#dbeafe" : "#fef3c7",
                        color: inst.disbursed_by === "bank" ? "#1e40af" : "#92400e",
                      }}
                    >
                      {inst.disbursed_by === "bank" ? "Bank" : "Self"}
                    </span>
                  </div>
                  <div style={listItemActionsStyle}>
                    <button
                      onClick={() => handleEdit(inst)}
                      style={editButtonStyle}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(inst.id)}
                      style={deleteButtonStyle}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={closeButtonContainerStyle}>
          <button onClick={onClose} style={closeButtonStyle}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

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
  zIndex: 1001,
};

const modalStyle: React.CSSProperties = {
  background: "#ffffff",
  borderRadius: "12px",
  padding: "1.5rem",
  width: "100%",
  maxWidth: "500px",
  maxHeight: "90vh",
  overflowY: "auto",
  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
};

const titleStyle: React.CSSProperties = {
  fontSize: "1.25rem",
  fontWeight: 600,
  color: "#1e293b",
  marginBottom: "1rem",
};

const summaryStyle: React.CSSProperties = {
  padding: "0.75rem",
  background: "#eff6ff",
  border: "1px solid #bfdbfe",
  borderRadius: "6px",
  color: "#1e40af",
  fontSize: "0.875rem",
  fontWeight: 500,
  marginBottom: "1rem",
};

const formGroupStyle: React.CSSProperties = {
  marginBottom: "1rem",
  flex: 1,
};

const formRowStyle: React.CSSProperties = {
  display: "flex",
  gap: "1rem",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.875rem",
  fontWeight: 500,
  color: "#374151",
  marginBottom: "0.5rem",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.625rem",
  border: "1px solid #d1d5db",
  borderRadius: "6px",
  fontSize: "0.875rem",
  color: "#1f2937",
};

const buttonGroupStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "0.75rem",
  marginBottom: "1.5rem",
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

const submitButtonStyle: React.CSSProperties = {
  padding: "0.625rem 1rem",
  background: "#2563eb",
  border: "none",
  borderRadius: "6px",
  fontSize: "0.875rem",
  fontWeight: 500,
  color: "#ffffff",
  cursor: "pointer",
};

const errorStyle: React.CSSProperties = {
  padding: "0.75rem",
  background: "#fef2f2",
  border: "1px solid #fecaca",
  borderRadius: "6px",
  color: "#dc2626",
  fontSize: "0.875rem",
  marginBottom: "1rem",
};

const listSectionStyle: React.CSSProperties = {
  borderTop: "1px solid #e5e7eb",
  paddingTop: "1rem",
};

const listTitleStyle: React.CSSProperties = {
  fontSize: "1rem",
  fontWeight: 600,
  color: "#374151",
  marginBottom: "1rem",
};

const emptyTextStyle: React.CSSProperties = {
  color: "#6b7280",
  fontSize: "0.875rem",
  textAlign: "center",
  padding: "1rem",
};

const listContainerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.5rem",
};

const listItemStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "0.75rem",
  background: "#f9fafb",
  borderRadius: "6px",
  border: "1px solid #e5e7eb",
};

const listItemInfoStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.75rem",
};

const listItemDateStyle: React.CSSProperties = {
  fontSize: "0.875rem",
  color: "#374151",
};

const listItemAmountStyle: React.CSSProperties = {
  fontSize: "0.875rem",
  fontWeight: 500,
  color: "#1f2937",
};

const listItemBadgeStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  padding: "0.125rem 0.5rem",
  borderRadius: "9999px",
  fontWeight: 500,
};

const listItemActionsStyle: React.CSSProperties = {
  display: "flex",
  gap: "0.5rem",
};

const editButtonStyle: React.CSSProperties = {
  padding: "0.25rem 0.75rem",
  background: "#f3f4f6",
  border: "1px solid #d1d5db",
  borderRadius: "4px",
  fontSize: "0.75rem",
  fontWeight: 500,
  color: "#374151",
  cursor: "pointer",
};

const deleteButtonStyle: React.CSSProperties = {
  padding: "0.25rem 0.75rem",
  background: "#fef2f2",
  border: "1px solid #fecaca",
  borderRadius: "4px",
  fontSize: "0.75rem",
  fontWeight: 500,
  color: "#dc2626",
  cursor: "pointer",
};

const closeButtonContainerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
  marginTop: "1rem",
};

const closeButtonStyle: React.CSSProperties = {
  padding: "0.625rem 2rem",
  background: "#6b7280",
  border: "none",
  borderRadius: "6px",
  fontSize: "0.875rem",
  fontWeight: 500,
  color: "#ffffff",
  cursor: "pointer",
};