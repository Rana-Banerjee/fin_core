"use client";

import { useState, useEffect } from "react";
import { createCashFlow, updateCashFlow, CashFlowFormData, CashFlow, fetchBankAccounts, BankAccount } from "@/lib/api";

interface CashFlowFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editData?: CashFlow | null;
}

const INCOME_CATEGORIES = [
  { value: "salary", label: "Salary" },
  { value: "rental", label: "Rental" },
  { value: "business", label: "Business" },
  { value: "interest", label: "Interest" },
  { value: "dividends", label: "Dividends" },
  { value: "other", label: "Other" },
];

const EXPENSE_CATEGORIES = [
  { value: "rent", label: "Rent" },
  { value: "emi", label: "EMI" },
  { value: "utilities", label: "Utilities" },
  { value: "insurance", label: "Insurance" },
  { value: "groceries", label: "Groceries" },
  { value: "other", label: "Other" },
];

const FREQUENCIES = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annually", label: "Annually" },
];

const APPRECIATION_FREQUENCIES = [
  { value: "none", label: "None" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annually", label: "Annually" },
];

export default function CashFlowForm({ isOpen, onClose, onSuccess, editData }: CashFlowFormProps) {
  const [formData, setFormData] = useState<CashFlowFormData>({
    name: "",
    stream_type: "income",
    stream_category: "salary",
    amount: 0,
    frequency: "monthly",
    start_date: new Date().toISOString().split("T")[0],
    end_date: null,
    is_active: true,
    appreciation_rate: null,
    appreciation_frequency: null,
    bank_account_id: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

  const isEditing = !!editData;

  useEffect(() => {
    loadBankAccounts();
  }, []);

  useEffect(() => {
    if (editData) {
      setFormData({
        name: editData.name,
        stream_type: editData.stream_type,
        stream_category: editData.stream_category,
        amount: editData.amount,
        frequency: editData.frequency,
        start_date: editData.start_date,
        end_date: editData.end_date,
        is_active: editData.is_active,
        appreciation_rate: editData.appreciation_rate ?? null,
        appreciation_frequency: editData.appreciation_frequency ?? null,
        bank_account_id: editData.bank_account_id ?? 0,
      });
    } else {
      setFormData({
        name: "",
        stream_type: "income",
        stream_category: "salary",
        amount: 0,
        frequency: "monthly",
        start_date: new Date().toISOString().split("T")[0],
        end_date: null,
        is_active: true,
        appreciation_rate: null,
        appreciation_frequency: null,
        bank_account_id: bankAccounts.length > 0 ? bankAccounts[0].id : 0,
      });
    }
  }, [editData, isOpen, bankAccounts]);

  const loadBankAccounts = async () => {
    try {
      const accounts = await fetchBankAccounts();
      setBankAccounts(accounts);
    } catch (err) {
      console.error("Failed to load bank accounts:", err);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!formData.bank_account_id || formData.bank_account_id === 0) {
      setError("Please select a bank account");
      setLoading(false);
      return;
    }

    try {
      if (isEditing && editData) {
        await updateCashFlow(editData.id, formData);
      } else {
        await createCashFlow(formData);
      }
      onSuccess();
      onClose();
      if (!isEditing) {
        setFormData({
          name: "",
          stream_type: "income",
          stream_category: "salary",
          amount: 0,
          frequency: "monthly",
          start_date: new Date().toISOString().split("T")[0],
          end_date: null,
          is_active: true,
          appreciation_rate: null,
          appreciation_frequency: null,
          bank_account_id: bankAccounts.length > 0 ? bankAccounts[0].id : 0,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${isEditing ? "update" : "create"} cash flow`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === "stream_type") {
      const categories = value === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
      setFormData((prev) => ({
        ...prev,
        stream_type: value as "income" | "expense",
        stream_category: categories[0].value,
      }));
    } else if (name === "amount") {
      setFormData((prev) => ({
        ...prev,
        amount: parseFloat(value) || 0,
      }));
    } else if (name === "bank_account_id") {
      setFormData((prev) => ({
        ...prev,
        bank_account_id: parseInt(value) || 0,
      }));
    } else if (name === "is_active") {
      setFormData((prev) => ({
        ...prev,
        is_active: value === "true",
      }));
    } else if (name === "appreciation_rate") {
      setFormData((prev) => ({
        ...prev,
        appreciation_rate: value === "" ? null : parseFloat(value) || null,
      }));
    } else if (name === "appreciation_frequency") {
      setFormData((prev) => ({
        ...prev,
        appreciation_frequency: value === "none" ? null : value,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const categories = formData.stream_type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h2 style={titleStyle}>
          {isEditing ? "Edit" : "Add"} {formData.stream_type === "income" ? "Income" : "Expense"}
        </h2>
        <form onSubmit={handleSubmit}>
          <div style={formRowStyle}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Type</label>
              <select
                name="stream_type"
                value={formData.stream_type}
                onChange={handleChange}
                required
                style={inputStyle}
              >
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>Category</label>
              <select
                name="stream_category"
                value={formData.stream_category}
                onChange={handleChange}
                required
                style={inputStyle}
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              style={inputStyle}
              placeholder={formData.stream_type === "income" ? "e.g., Monthly Salary" : "e.g., House Rent"}
            />
          </div>

          <div style={formRowStyle}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Amount (₹/month)</label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                required
                step="0.01"
                min="0"
                style={inputStyle}
              />
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>Frequency</label>
              <select
                name="frequency"
                value={formData.frequency}
                onChange={handleChange}
                required
                style={inputStyle}
              >
                {FREQUENCIES.map((freq) => (
                  <option key={freq.value} value={freq.value}>
                    {freq.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={formRowStyle}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Start Date</label>
              <input
                type="date"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                required
                style={inputStyle}
              />
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>End Date (Optional)</label>
              <input
                type="date"
                name="end_date"
                value={formData.end_date || ""}
                onChange={handleChange}
                style={inputStyle}
              />
            </div>
          </div>

          {bankAccounts.length === 0 ? (
            <div style={errorStyle}>
              Please add a bank account first before creating income/expense streams.
            </div>
          ) : (
            <div style={formGroupStyle}>
              <label style={labelStyle}>Bank Account</label>
              <select
                name="bank_account_id"
                value={formData.bank_account_id || ""}
                onChange={handleChange}
                required
                style={inputStyle}
              >
                <option value="">Select...</option>
                {bankAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={formRowStyle}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Appreciation Rate (%)</label>
              <input
                type="number"
                name="appreciation_rate"
                value={formData.appreciation_rate ?? ""}
                onChange={handleChange}
                step="0.1"
                min="0"
                style={inputStyle}
                placeholder="e.g., 5"
              />
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>Appreciation Frequency</label>
              <select
                name="appreciation_frequency"
                value={formData.appreciation_frequency ?? "none"}
                onChange={handleChange}
                style={inputStyle}
              >
                {APPRECIATION_FREQUENCIES.map((freq) => (
                  <option key={freq.value} value={freq.value}>
                    {freq.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>Status</label>
            <select
              name="is_active"
              value={formData.is_active?.toString() ?? "true"}
              onChange={handleChange}
              required
              style={inputStyle}
            >
              <option value="true">Active</option>
              <option value="false">Inactive</option>
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
  maxWidth: "500px",
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