"use client";

import { useState, useEffect } from "react";
import { PaymentSource, PaymentSourceFormData, BankAccount, Investment, fetchPaymentSources, createPaymentSource, updatePaymentSource, deletePaymentSource, fetchBankAccounts, fetchInvestments } from "@/lib/api";

interface PaymentSourceListProps {
  onRefresh: () => void;
}

export default function PaymentSourceList({ onRefresh }: PaymentSourceListProps) {
  const [sources, setSources] = useState<PaymentSource[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<PaymentSource | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<PaymentSource | null>(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState<PaymentSourceFormData>({
    name: "",
    source_type: "bank_account",
    bank_account_id: undefined,
    investment_id: undefined,
    priority_order: 1,
    is_active: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [sourcesData, accountsData, investmentsData] = await Promise.all([
        fetchPaymentSources(),
        fetchBankAccounts(),
        fetchInvestments(),
      ]);
      setSources(sourcesData);
      setBankAccounts(accountsData);
      setInvestments(investmentsData);
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSource) {
        await updatePaymentSource(editingSource.id, formData);
      } else {
        await createPaymentSource(formData);
      }
      setIsFormOpen(false);
      setEditingSource(null);
      resetForm();
      loadData();
      onRefresh();
    } catch (err) {
      console.error("Failed to save payment source:", err);
    }
  };

  const handleEdit = (source: PaymentSource) => {
    setEditingSource(source);
    setFormData({
      name: source.name,
      source_type: source.source_type,
      bank_account_id: source.bank_account_id || undefined,
      investment_id: source.investment_id || undefined,
      priority_order: source.priority_order,
      is_active: source.is_active,
    });
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deletePaymentSource(deleteConfirm.id);
      setDeleteConfirm(null);
      loadData();
      onRefresh();
    } catch (err) {
      console.error("Failed to delete payment source:", err);
    }
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const newSources = [...sources];
    const temp = newSources[index].priority_order;
    newSources[index].priority_order = newSources[index - 1].priority_order;
    newSources[index - 1].priority_order = temp;
    
    await updatePaymentSource(newSources[index].id, { priority_order: newSources[index].priority_order });
    await updatePaymentSource(newSources[index - 1].id, { priority_order: newSources[index - 1].priority_order });
    loadData();
    onRefresh();
  };

  const handleMoveDown = async (index: number) => {
    if (index === sources.length - 1) return;
    const newSources = [...sources];
    const temp = newSources[index].priority_order;
    newSources[index].priority_order = newSources[index + 1].priority_order;
    newSources[index + 1].priority_order = temp;
    
    await updatePaymentSource(newSources[index].id, { priority_order: newSources[index].priority_order });
    await updatePaymentSource(newSources[index + 1].id, { priority_order: newSources[index + 1].priority_order });
    loadData();
    onRefresh();
  };

  const resetForm = () => {
    setFormData({
      name: "",
      source_type: "bank_account",
      bank_account_id: undefined,
      investment_id: undefined,
      priority_order: sources.length + 1,
      is_active: true,
    });
  };

  const getSourceLabel = (source: PaymentSource): string => {
    if (source.source_type === "bank_account" && source.bank_account_id) {
      const acc = bankAccounts.find(a => a.id === source.bank_account_id);
      return acc ? acc.name : "Unknown Account";
    }
    if (source.source_type === "investment" && source.investment_id) {
      const inv = investments.find(i => i.id === source.investment_id);
      return inv ? inv.name : "Unknown Investment";
    }
    return "Unknown";
  };

  const getSourceTypeLabel = (type: string): string => {
    if (type === "bank_account") return "Bank Account";
    if (type === "investment") return "Investment";
    return type;
  };

  return (
    <>
      <div style={containerStyle}>
        <div style={headerStyle}>
          <div>
            <h3 style={titleStyle}>Payment Priority</h3>
            <p style={subtitleStyle}>
              Order in which monthly expenses are deducted
            </p>
          </div>
          <button 
            onClick={() => { setEditingSource(null); resetForm(); setIsFormOpen(true); }} 
            style={addButtonStyle}
          >
            + Add Source
          </button>
        </div>

        {loading ? (
          <div style={emptyStyle}>Loading...</div>
        ) : sources.length === 0 ? (
          <div style={emptyStyle}>
            No payment sources configured. Add sources to define payment priority.
          </div>
        ) : (
          <div style={listStyle}>
            {sources
              .sort((a, b) => a.priority_order - b.priority_order)
              .map((source, index) => (
                <div key={source.id} style={itemStyle}>
                  <div style={rankStyle}>{index + 1}</div>
                  <div style={itemInfoStyle}>
                    <div style={itemNameStyle}>{source.name}</div>
                    <div style={itemMetaStyle}>
                      {getSourceTypeLabel(source.source_type)} • {getSourceLabel(source)}
                    </div>
                  </div>
                  <div style={actionStyle}>
                    <button 
                      onClick={() => handleMoveUp(index)} 
                      disabled={index === 0}
                      style={moveButtonStyle}
                    >
                      ↑
                    </button>
                    <button 
                      onClick={() => handleMoveDown(index)} 
                      disabled={index === sources.length - 1}
                      style={moveButtonStyle}
                    >
                      ↓
                    </button>
                    <button onClick={() => handleEdit(source)} style={editButtonStyle}>Edit</button>
                    <button onClick={() => setDeleteConfirm(source)} style={deleteButtonStyle}>Delete</button>
                  </div>
                </div>
              ))}
          </div>
        )}

        {sources.length > 0 && (
          <div style={infoBoxStyle}>
            <strong>How it works:</strong> Monthly expenses are deducted from sources in order (1 = highest priority). 
            When a source is depleted, the next source is used. OD accounts from home loans are used automatically.
          </div>
        )}
      </div>

      {isFormOpen && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h2 style={titleStyle}>{editingSource ? "Edit Payment Source" : "Add Payment Source"}</h2>
            <form onSubmit={handleSubmit}>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  style={inputStyle}
                  placeholder="e.g., Primary Savings Account"
                />
              </div>

              <div style={formGroupStyle}>
                <label style={labelStyle}>Source Type</label>
                <select
                  value={formData.source_type}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    source_type: e.target.value,
                    bank_account_id: undefined,
                    investment_id: undefined,
                  })}
                  style={inputStyle}
                >
                  <option value="bank_account">Bank Account</option>
                  <option value="investment">Investment</option>
                </select>
              </div>

              {formData.source_type === "bank_account" && (
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Bank Account</label>
                  <select
                    value={formData.bank_account_id || ""}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      bank_account_id: e.target.value ? parseInt(e.target.value) : undefined 
                    })}
                    style={inputStyle}
                  >
                    <option value="">Select an account</option>
                    {bankAccounts
                      .filter(acc => acc.type !== "home_loan_od")
                      .map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.name} ({acc.account_number})</option>
                      ))}
                  </select>
                </div>
              )}

              {formData.source_type === "investment" && (
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Investment</label>
                  <select
                    value={formData.investment_id || ""}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      investment_id: e.target.value ? parseInt(e.target.value) : undefined 
                    })}
                    style={inputStyle}
                  >
                    <option value="">Select an investment</option>
                    {investments.map(inv => (
                      <option key={inv.id} value={inv.id}>{inv.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div style={formGroupStyle}>
                <label style={labelStyle}>Priority Order</label>
                <input
                  type="number"
                  value={formData.priority_order}
                  onChange={(e) => setFormData({ ...formData, priority_order: parseInt(e.target.value) || 1 })}
                  min="1"
                  style={inputStyle}
                />
              </div>

              <div style={formGroupStyle}>
                <label style={checkboxLabelStyle}>
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    style={checkboxStyle}
                  />
                  Active
                </label>
              </div>

              <div style={buttonGroupStyle}>
                <button type="button" onClick={() => { setIsFormOpen(false); setEditingSource(null); resetForm(); }} style={cancelButtonStyle}>
                  Cancel
                </button>
                <button type="submit" style={submitButtonStyle}>
                  {editingSource ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div style={overlayStyle}>
          <div style={confirmModalStyle}>
            <h3 style={confirmTitleStyle}>Delete Payment Source</h3>
            <p style={confirmTextStyle}>
              Are you sure you want to delete "{deleteConfirm.name}"?
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

const rankStyle: React.CSSProperties = {
  width: "2rem",
  height: "2rem",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#2563eb",
  color: "#ffffff",
  borderRadius: "50%",
  fontSize: "0.875rem",
  fontWeight: 600,
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

const actionStyle: React.CSSProperties = {
  display: "flex",
  gap: "0.5rem",
  alignItems: "center",
};

const moveButtonStyle: React.CSSProperties = {
  padding: "0.25rem 0.5rem",
  background: "transparent",
  border: "1px solid #d1d5db",
  borderRadius: "4px",
  fontSize: "0.875rem",
  color: "#374151",
  cursor: "pointer",
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

const infoBoxStyle: React.CSSProperties = {
  marginTop: "1rem",
  padding: "0.75rem",
  background: "#eff6ff",
  border: "1px solid #bfdbfe",
  borderRadius: "6px",
  fontSize: "0.8125rem",
  color: "#1e40af",
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

const modalStyle: React.CSSProperties = {
  background: "#ffffff",
  borderRadius: "12px",
  padding: "1.5rem",
  width: "100%",
  maxWidth: "450px",
  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
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

const checkboxLabelStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
  fontSize: "0.875rem",
  color: "#374151",
  cursor: "pointer",
};

const checkboxStyle: React.CSSProperties = {
  width: "1rem",
  height: "1rem",
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