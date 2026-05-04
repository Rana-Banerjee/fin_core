"use client";

import { useState, useEffect } from "react";
import { createInvestment, updateInvestment, InvestmentFormData, Investment } from "@/lib/api";

interface InvestmentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editData?: Investment | null;
}

const INVESTMENT_TYPES = [
  { value: "stock", label: "Stock" },
  { value: "mutual_fund", label: "Mutual Fund" },
  { value: "etf", label: "ETF" },
  { value: "ppf", label: "PPF" },
  { value: "nps", label: "NPS" },
  { value: "bonds", label: "Bonds" },
  { value: "fixed_deposit", label: "Fixed Deposit" },
];

export default function InvestmentForm({ isOpen, onClose, onSuccess, editData }: InvestmentFormProps) {
  const [formData, setFormData] = useState<InvestmentFormData>({
    name: "",
    account_number: "",
    current_value: 0,
    investment_type: "mutual_fund",
    appreciation_rate: 0,
    sip_amount: 0,
    purchase_date: undefined,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!editData;

  useEffect(() => {
    if (editData) {
      setFormData({
        name: editData.name,
        account_number: editData.account_number,
        current_value: editData.current_value,
        investment_type: editData.investment_type,
        appreciation_rate: editData.appreciation_rate,
        sip_amount: editData.sip_amount,
        purchase_date: editData.purchase_date || undefined,
      });
    } else {
      setFormData({
        name: "",
        account_number: "",
        current_value: 0,
        investment_type: "mutual_fund",
        appreciation_rate: 0,
        sip_amount: 0,
        purchase_date: undefined,
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
        await updateInvestment(editData.id, formData);
      } else {
        await createInvestment(formData);
      }
      onSuccess();
      onClose();
      if (!isEditing) {
        setFormData({
          name: "",
          account_number: "",
          current_value: 0,
          investment_type: "mutual_fund",
          appreciation_rate: 0,
          sip_amount: 0,
          purchase_date: undefined,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${isEditing ? "update" : "create"} investment`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === "current_value" || name === "appreciation_rate" || name === "sip_amount") {
      setFormData((prev) => ({
        ...prev,
        [name]: parseFloat(value) || 0,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h2 style={titleStyle}>{isEditing ? "Edit Investment" : "Add Investment"}</h2>
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
              placeholder="e.g., HDFC Small Cap Fund"
            />
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>Account/Folio Number</label>
            <input
              type="text"
              name="account_number"
              value={formData.account_number}
              onChange={handleChange}
              required
              style={inputStyle}
              placeholder="e.g., 123456789"
            />
          </div>

          <div style={formRowStyle}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Investment Type</label>
              <select
                name="investment_type"
                value={formData.investment_type}
                onChange={handleChange}
                style={inputStyle}
              >
                {INVESTMENT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>Current Value (₹)</label>
              <input
                type="number"
                name="current_value"
                value={formData.current_value}
                onChange={handleChange}
                required
                step="0.01"
                min="0"
                style={inputStyle}
              />
            </div>
          </div>

          <div style={formRowStyle}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Expected Annual Appreciation (%)</label>
              <input
                type="number"
                name="appreciation_rate"
                value={formData.appreciation_rate}
                onChange={handleChange}
                step="0.01"
                min="0"
                style={inputStyle}
                placeholder="e.g., 12"
              />
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>Monthly SIP (₹)</label>
              <input
                type="number"
                name="sip_amount"
                value={formData.sip_amount}
                onChange={handleChange}
                step="0.01"
                min="0"
                style={inputStyle}
                placeholder="e.g., 5000"
              />
            </div>
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>Purchase Date (Optional)</label>
            <input
              type="date"
              name="purchase_date"
              value={formData.purchase_date || ""}
              onChange={handleChange}
              style={inputStyle}
            />
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
  maxWidth: "500px",
  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
  maxHeight: "90vh",
  overflowY: "auto",
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