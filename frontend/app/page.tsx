"use client";

import { useEffect, useState } from "react";
import BankAccountForm from "@/components/BankAccountForm";
import { fetchBankAccounts, deleteBankAccount, BankAccount } from "@/lib/api";

interface SummaryData {
  totalAssets: number;
  totalLiabilities: number;
  cashInHand: number;
  netWorth: number;
}

export default function Dashboard() {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [summary, setSummary] = useState<SummaryData>({
    totalAssets: 0,
    totalLiabilities: 0,
    cashInHand: 0,
    netWorth: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<BankAccount | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const accountsData = await fetchBankAccounts();
      setBankAccounts(accountsData);
      calculateSummary(accountsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const calculateSummary = ( accounts: BankAccount[] ) => {
    let totalAssets = 0;
    let totalLiabilities = 0;
    let cashInHand = 0;

    accounts.forEach((account) => {
      if (account.type === "home_loan_od") {
        totalLiabilities += account.current_balance;
      } else {
        totalAssets += account.current_balance;
        if (account.type === "savings" || account.type === "current") {
          cashInHand += account.current_balance;
        }
      }
    });

    setSummary({
      totalAssets,
      totalLiabilities,
      cashInHand,
      netWorth: totalAssets - totalLiabilities,
    });
  };

  const handleFormSuccess = () => {
    loadData();
    setEditingAccount(null);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteBankAccount(deleteConfirm.id);
      setDeleteConfirm(null);
      loadData();
    } catch (err) {
      console.error("Failed to delete bank account:", err);
    }
  };

  const getAccountTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      savings: "Savings",
      current: "Current",
      home_loan_od: "Home Loan OD",
    };
    return labels[type] || type;
  };

  const getFrequencyLabel = (freq: string) => {
    const labels: Record<string, string> = {
      monthly: "Monthly",
      quarterly: "Quarterly",
      annually: "Annually",
    };
    return labels[freq] || freq;
  };

  const formatCurrency = (amount: number) => {
    return `₹${Math.abs(amount).toLocaleString("en-IN")}`;
  };

  if (loading) {
    return (
      <div className="dashboard">
        <h1>FinCore Dashboard</h1>
        <div style={loadingStyle}>Loading...</div>
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
      <div style={headerStyle}>
        <h1 style={pageTitleStyle}>FinCore Dashboard</h1>
        <button onClick={() => setIsFormOpen(true)} style={addButtonStyle}>
          + Add Bank Account
        </button>
      </div>

      <div style={summaryGridStyle}>
        <div style={summaryCardStyle}>
          <div style={summaryLabelStyle}>Total Assets</div>
          <div style={summaryValuePositiveStyle}>{formatCurrency(summary.totalAssets)}</div>
        </div>
        <div style={summaryCardStyle}>
          <div style={summaryLabelStyle}>Total Liabilities</div>
          <div style={summaryValueNegativeStyle}>{formatCurrency(summary.totalLiabilities)}</div>
        </div>
        <div style={summaryCardStyle}>
          <div style={summaryLabelStyle}>Cash in Hand</div>
          <div style={summaryValuePositiveStyle}>{formatCurrency(summary.cashInHand)}</div>
        </div>
        <div style={summaryCardStyle}>
          <div style={summaryLabelStyle}>Net Worth</div>
          <div style={summary.netWorth >= 0 ? summaryValuePositiveStyle : summaryValueNegativeStyle}>
            {summary.netWorth < 0 && "-"}{formatCurrency(summary.netWorth)}
          </div>
        </div>
      </div>

      <div style={sectionHeaderStyle}>
        <h2 style={sectionTitleStyle}>Bank Accounts</h2>
        <span style={accountsCountStyle}>
          {bankAccounts.length} account{bankAccounts.length !== 1 ? "s" : ""}
        </span>
      </div>

      {bankAccounts.length > 0 ? (
        <div style={accountsListStyle}>
          {bankAccounts.map((account) => (
            <div key={account.id} style={accountCardStyle}>
              <div style={accountInfoStyle}>
                <div style={accountNameStyle}>{account.name}</div>
                <div style={accountDetailsStyle}>
                  <span style={accountTypeStyle}>{getAccountTypeLabel(account.type)}</span>
                  <span style={frequencyBadgeStyle}>{getFrequencyLabel(account.interest_credit_frequency)}</span>
                  <span style={accountNumberStyle}>••{account.account_number.slice(-4)}</span>
                  <span style={account.type === "home_loan_od" ? accountBalanceNegativeStyle : accountBalancePositiveStyle}>
                    {account.type === "home_loan_od" ? "-" : ""}₹{account.current_balance.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
              <div style={accountActionsStyle}>
                <button
                  onClick={() => setEditingAccount(account)}
                  style={editButtonStyle}
                  title="Edit"
                >
                  ✏️
                </button>
                <button
                  onClick={() => setDeleteConfirm(account)}
                  style={deleteButtonStyle}
                  title="Delete"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={emptyStateStyle}>
          No bank accounts yet. Add your first account to get started.
        </div>
      )}

      <BankAccountForm
        isOpen={isFormOpen || !!editingAccount}
        onClose={() => {
          setIsFormOpen(false);
          setEditingAccount(null);
        }}
        onSuccess={handleFormSuccess}
        editData={editingAccount}
      />

      {deleteConfirm && (
        <div style={modalOverlayStyle}>
          <div style={deleteModalStyle}>
            <h3 style={deleteModalTitleStyle}>Delete Account?</h3>
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

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "1.5rem",
};

const pageTitleStyle: React.CSSProperties = {
  fontSize: "1.5rem",
  fontWeight: 600,
  color: "#1f2937",
};

const addButtonStyle: React.CSSProperties = {
  padding: "0.625rem 1rem",
  background: "#2563eb",
  border: "none",
  borderRadius: "6px",
  fontSize: "0.875rem",
  fontWeight: 500,
  color: "#ffffff",
  cursor: "pointer",
};

const summaryGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: "1rem",
  marginBottom: "2rem",
};

const summaryCardStyle: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  padding: "1.25rem",
};

const summaryLabelStyle: React.CSSProperties = {
  fontSize: "0.875rem",
  color: "#6b7280",
  marginBottom: "0.5rem",
};

const summaryValuePositiveStyle: React.CSSProperties = {
  fontSize: "1.5rem",
  fontWeight: 600,
  color: "#059669",
};

const summaryValueNegativeStyle: React.CSSProperties = {
  fontSize: "1.5rem",
  fontWeight: 600,
  color: "#dc2626",
};

const sectionHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "1rem",
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: "1.125rem",
  fontWeight: 600,
  color: "#1f2937",
};

const accountsCountStyle: React.CSSProperties = {
  fontSize: "0.875rem",
  color: "#6b7280",
};

const accountsListStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.5rem",
};

const accountCardStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "0.75rem 1rem",
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
};

const accountInfoStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.25rem",
};

const accountNameStyle: React.CSSProperties = {
  fontSize: "0.9375rem",
  fontWeight: 500,
  color: "#1f2937",
};

const accountDetailsStyle: React.CSSProperties = {
  display: "flex",
  gap: "1rem",
  fontSize: "0.8125rem",
  color: "#6b7280",
};

const accountTypeStyle: React.CSSProperties = {
  background: "#eff6ff",
  color: "#2563eb",
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

const accountNumberStyle: React.CSSProperties = {};

const accountBalancePositiveStyle: React.CSSProperties = {
  fontWeight: 500,
  color: "#059669",
};

const accountBalanceNegativeStyle: React.CSSProperties = {
  fontWeight: 500,
  color: "#dc2626",
};

const accountActionsStyle: React.CSSProperties = {
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
  padding: "3rem 1rem",
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