"use client";

import { useState, useEffect } from "react";
import { createBankAccount, updateBankAccount, BankAccountFormData, BankAccount } from "@/lib/api";

interface BankAccountFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editData?: BankAccount | null;
}

export default function BankAccountForm({ isOpen, onClose, onSuccess, editData }: BankAccountFormProps) {
  const [formData, setFormData] = useState<BankAccountFormData>({
    name: "",
    account_number: "",
    current_balance: 0,
    interest_rate: 0,
    type: "savings",
    interest_credit_frequency: "annually",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!editData;

  useEffect(() => {
    if (editData) {
      setFormData({
        name: editData.name,
        account_number: editData.account_number,
        current_balance: editData.current_balance,
        interest_rate: editData.interest_rate,
        type: editData.type,
        interest_credit_frequency: (editData as any).interest_credit_frequency || "annually",
      });
    } else {
      setFormData({
        name: "",
        account_number: "",
        current_balance: 0,
        interest_rate: 0,
        type: "savings",
        interest_credit_frequency: "annually",
      });
    }
  }, [editData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isEditing && editData) {
        await updateBankAccount(editData.id, formData);
      } else {
        await createBankAccount(formData);
      }
      onSuccess();
      onClose();
      if (!isEditing) {
        setFormData({
          name: "",
          account_number: "",
          current_balance: 0,
          interest_rate: 0,
          type: "savings",
          interest_credit_frequency: "annually",
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${isEditing ? "update" : "create"} bank account`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "current_balance" || name === "interest_rate" ? parseFloat(value) || 0 : value,
    }));
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h2 style={titleStyle}>{isEditing ? "Edit Bank Account" : "Add Bank Account"}</h2>
        <form onSubmit={handleSubmit}>
          <div style={formGroupStyle}>
            <label style={labelStyle}>Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              style={inputStyle}
              placeholder="e.g., Chase Savings"
            />
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>Account Number</label>
            <input
              type="text"
              name="account_number"
              value={formData.account_number}
              onChange={handleChange}
              required
              style={inputStyle}
              placeholder="e.g., ****4521"
            />
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>Current Balance (₹)</label>
            <input
              type="number"
              name="current_balance"
              value={formData.current_balance}
              onChange={handleChange}
              required
              step="0.01"
              min="0"
              style={inputStyle}
            />
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>Interest Rate (%)</label>
            <input
              type="number"
              name="interest_rate"
              value={formData.interest_rate}
              onChange={handleChange}
              step="0.01"
              min="0"
              style={inputStyle}
            />
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>Type</label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              required
              style={inputStyle}
            >
              <option value="savings">Savings</option>
              <option value="current">Current</option>
              <option value="home_loan_od">Home Loan OD</option>
            </select>
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>Interest Credit Frequency</label>
            <select
              name="interest_credit_frequency"
              value={formData.interest_credit_frequency}
              onChange={handleChange}
              required
              style={inputStyle}
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="annually">Annually</option>
            </select>
          </div>

          {error && <div style={errorStyle}>{error}</div>}

          <div style={buttonGroupStyle}>
            <button type="button" onClick={onClose} style={cancelButtonStyle}>
              Cancel
            </button>
            <button type="submit" disabled={loading} style={submitButtonStyle}>
              {loading ? (isEditing ? "Updating..." : "Creating...") : (isEditing ? "Update" : "Create")}
            </button>
          </div>
        </form>
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
  zIndex: 1000,
};

const modalStyle: React.CSSProperties = {
  background: "#ffffff",
  borderRadius: "12px",
  padding: "1.5rem",
  width: "100%",
  maxWidth: "450px",
  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
};

const titleStyle: React.CSSProperties = {
  fontSize: "1.25rem",
  fontWeight: 600,
  color: "#1e293b",
  marginBottom: "1.5rem",
};

const formGroupStyle: React.CSSProperties = {
  marginBottom: "1rem",
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
  marginTop: "1.5rem",
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
  marginTop: "1rem",
};