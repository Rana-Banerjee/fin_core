"use client";

import { useState, useEffect } from "react";
import { createHomeLoan, updateHomeLoan, HomeLoanFormData, HomeLoan, fetchBankAccounts, BankAccount } from "@/lib/api";
import InstallmentForm from "./InstallmentForm";

interface HomeLoanFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editData?: HomeLoan | null;
}

export default function HomeLoanForm({ isOpen, onClose, onSuccess, editData }: HomeLoanFormProps) {
  const [formData, setFormData] = useState<HomeLoanFormData>({
    name: "",
    account_number: "",
    interest_rate: 0,
    tenure_months: 0,
    emi_start_date: "",
    od_account_id: null,
    od_impact_type: "none",
    current_principal_outstanding: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [odAccounts, setOdAccounts] = useState<BankAccount[]>([]);
  const [showInstallmentForm, setShowInstallmentForm] = useState(false);

  const isEditing = !!editData;

  useEffect(() => {
    loadOdAccounts();
  }, []);

  useEffect(() => {
    if (editData) {
      setFormData({
        name: editData.name,
        account_number: editData.account_number,
        interest_rate: editData.interest_rate,
        tenure_months: editData.tenure_months,
        emi_start_date: editData.emi_start_date,
        od_account_id: editData.od_account_id,
        od_impact_type: editData.od_impact_type,
        current_principal_outstanding: editData.current_principal_outstanding,
      });
    } else {
      setFormData({
        name: "",
        account_number: "",
        interest_rate: 0,
        tenure_months: 0,
        emi_start_date: "",
        od_account_id: null,
        od_impact_type: "none",
        current_principal_outstanding: 0,
      });
    }
  }, [editData, isOpen]);

  const loadOdAccounts = async () => {
    try {
      const accounts = await fetchBankAccounts();
      const odAccounts = accounts.filter((acc) => acc.type === "home_loan_od");
      setOdAccounts(odAccounts);
    } catch (err) {
      console.error("Failed to load OD accounts:", err);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isEditing && editData) {
        await updateHomeLoan(editData.id, formData);
      } else {
        await createHomeLoan(formData);
      }
      onSuccess();
      onClose();
      if (!isEditing) {
        setFormData({
          name: "",
          account_number: "",
          interest_rate: 0,
          tenure_months: 0,
          emi_start_date: "",
          od_account_id: null,
          od_impact_type: "none",
          current_principal_outstanding: 0,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${isEditing ? "update" : "create"} home loan`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === "od_account_id") {
      setFormData((prev) => ({
        ...prev,
        od_account_id: value === "" ? null : parseInt(value),
        od_impact_type: value === "" ? "none" : prev.od_impact_type,
      }));
    } else if (name === "od_impact_type") {
      setFormData((prev) => ({
        ...prev,
        od_impact_type: value as "none" | "emi" | "tenure",
      }));
    } else if (name === "tenure_months" || name === "interest_rate" || name === "current_principal_outstanding") {
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

  const getToday = () => {
    return new Date().toISOString().split("T")[0];
  };

  const isPreEmiApplicable = formData.emi_start_date && formData.emi_start_date > getToday();
  const isEmiApplicable = formData.emi_start_date && formData.emi_start_date <= getToday();
  const hasOdLinked = formData.od_account_id !== null;

  const getCalculatedDisplay = () => {
    if (!editData) return null;
    
    const preEmi = editData.effective_pre_emi;
    const emi = editData.effective_emi;
    const impactedTenure = editData.impacted_tenure_months;

    return { preEmi, emi, impactedTenure };
  };

  const calculated = editData ? getCalculatedDisplay() : null;

  return (
    <>
      <div style={overlayStyle}>
        <div style={modalStyle}>
          <h2 style={titleStyle}>{isEditing ? "Edit Home Loan" : "Add Home Loan"}</h2>
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
                placeholder="e.g., HDFC Home Loan"
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
                placeholder="e.g., HDFC123456"
              />
            </div>

            <div style={formRowStyle}>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Interest Rate (%)</label>
                <input
                  type="number"
                  name="interest_rate"
                  value={formData.interest_rate}
                  onChange={handleChange}
                  required
                  step="0.01"
                  min="0"
                  style={inputStyle}
                />
              </div>

              <div style={formGroupStyle}>
                <label style={labelStyle}>Tenure (months)</label>
                <input
                  type="number"
                  name="tenure_months"
                  value={formData.tenure_months}
                  onChange={handleChange}
                  required
                  min="1"
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={formRowStyle}>
              <div style={formGroupStyle}>
                <label style={labelStyle}>EMI Start Date</label>
                <input
                  type="date"
                  name="emi_start_date"
                  value={formData.emi_start_date}
                  onChange={handleChange}
                  required
                  style={inputStyle}
                />
              </div>

              <div style={formGroupStyle}>
                <label style={labelStyle}>OD Account (Optional)</label>
                <select
                  name="od_account_id"
                  value={formData.od_account_id ?? ""}
                  onChange={handleChange}
                  style={inputStyle}
                >
                  <option value="">None</option>
                  {odAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {hasOdLinked && (
              <div style={formGroupStyle}>
                <label style={labelStyle}>OD Impact Type</label>
                <select
                  name="od_impact_type"
                  value={formData.od_impact_type}
                  onChange={handleChange}
                  style={inputStyle}
                >
                  <option value="none">No Impact</option>
                  <option value="emi">Impacts EMI/Pre-EMI</option>
                  <option value="tenure">Impacts Tenure</option>
                </select>
              </div>
            )}

            <div style={formGroupStyle}>
              <label style={labelStyle}>Current Principal Outstanding (₹)</label>
              <input
                type="number"
                name="current_principal_outstanding"
                value={formData.current_principal_outstanding}
                onChange={handleChange}
                required
                step="0.01"
                min="0"
                style={inputStyle}
              />
            </div>

            {isEditing && editData && (
              <div style={installmentSectionStyle}>
                <button
                  type="button"
                  onClick={() => setShowInstallmentForm(true)}
                  style={manageInstallmentsButtonStyle}
                >
                  Manage Installments
                </button>
              </div>
            )}

            {calculated && calculated.preEmi && (
              <div style={calculatedBoxStyle}>
                <div style={calculatedTitleStyle}>Calculated Values (Backend)</div>
                {isPreEmiApplicable && calculated.preEmi && (
                  <div style={calculatedItemStyle}>
                    <span style={calculatedLabelStyle}>Pre-EMI (Effective):</span>
                    <span style={calculatedValueStyle}>
                      ₹{calculated.preEmi.total.toLocaleString()}/mo
                      <span style={calculatedDetailStyle}>
                        {" "}(Principal: ₹{calculated.preEmi.principal.toLocaleString()}, Interest: ₹{calculated.preEmi.interest.toLocaleString()})
                      </span>
                    </span>
                    <div style={effectivePrincipalStyle}>
                      Effective Principal: ₹{calculated.preEmi.effective_principal.toLocaleString()} 
                      {calculated.preEmi.od_deduction > 0 && ` (Original - ₹${calculated.preEmi.od_deduction.toLocaleString()} OD)`}
                    </div>
                  </div>
                )}
                {isEmiApplicable && calculated.emi && (
                  <div style={calculatedItemStyle}>
                    <span style={calculatedLabelStyle}>EMI (Effective):</span>
                    <span style={calculatedValueStyle}>
                      ₹{calculated.emi.total.toLocaleString()}/mo
                      <span style={calculatedDetailStyle}>
                        {" "}(Principal: ₹{calculated.emi.principal.toLocaleString()}, Interest: ₹{calculated.emi.interest.toLocaleString()})
                      </span>
                    </span>
                    <div style={effectivePrincipalStyle}>
                      Effective Principal: ₹{calculated.emi.effective_principal.toLocaleString()}
                      {calculated.emi.od_deduction > 0 && ` (Original - ₹{calculated.emi.od_deduction.toLocaleString()} OD)`}
                    </div>
                  </div>
                )}
                {formData.od_impact_type === "tenure" && calculated.impactedTenure && calculated.impactedTenure !== formData.tenure_months && (
                  <div style={calculatedItemStyle}>
                    <span style={calculatedLabelStyle}>Impacted Tenure:</span>
                    <span style={calculatedValueStyle}>
                      {calculated.impactedTenure} months
                      <span style={calculatedDetailStyle}>
                        {" "}(Extended from {formData.tenure_months} months)
                      </span>
                    </span>
                  </div>
                )}
              </div>
            )}

            {formData.emi_start_date && (
              <div style={infoBoxStyle}>
                {isPreEmiApplicable && <span>Pre-EMI is applicable (EMI starts after today)</span>}
                {isEmiApplicable && <span>EMI is applicable (EMI has started)</span>}
              </div>
            )}

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

      {isEditing && editData && (
        <InstallmentForm
          isOpen={showInstallmentForm}
          onClose={() => setShowInstallmentForm(false)}
          onSuccess={onSuccess}
          homeLoanId={editData.id}
        />
      )}
    </>
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
  maxWidth: "550px",
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

const installSectionStyle: React.CSSProperties = {
  marginTop: "1rem",
  marginBottom: "1rem",
};

const installmentSectionStyle: React.CSSProperties = {
  marginBottom: "1rem",
};

const manageInstallmentsButtonStyle: React.CSSProperties = {
  padding: "0.625rem 1rem",
  background: "#f0fdf4",
  border: "1px solid #86efac",
  borderRadius: "6px",
  fontSize: "0.875rem",
  fontWeight: 500,
  color: "#166534",
  cursor: "pointer",
};

const calculatedBoxStyle: React.CSSProperties = {
  padding: "1rem",
  background: "#f0fdf4",
  border: "1px solid #86efac",
  borderRadius: "6px",
  marginBottom: "1rem",
};

const calculatedTitleStyle: React.CSSProperties = {
  fontSize: "0.875rem",
  fontWeight: 600,
  color: "#166534",
  marginBottom: "0.75rem",
};

const calculatedItemStyle: React.CSSProperties = {
  marginBottom: "0.5rem",
};

const calculatedLabelStyle: React.CSSProperties = {
  fontSize: "0.875rem",
  fontWeight: 500,
  color: "#374151",
  marginRight: "0.5rem",
};

const calculatedValueStyle: React.CSSProperties = {
  fontSize: "0.875rem",
  fontWeight: 600,
  color: "#166534",
};

const calculatedDetailStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  fontWeight: 400,
  color: "#6b7280",
};

const effectivePrincipalStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  color: "#6b7280",
  marginTop: "0.25rem",
};

const infoBoxStyle: React.CSSProperties = {
  padding: "0.75rem",
  background: "#eff6ff",
  border: "1px solid #bfdbfe",
  borderRadius: "6px",
  color: "#1e40af",
  fontSize: "0.875rem",
  marginBottom: "1rem",
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