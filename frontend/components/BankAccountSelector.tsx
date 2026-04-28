"use client";

import { BankAccount } from "@/lib/api";

interface BankAccountSelectorProps {
  accounts: BankAccount[];
  selectedIds: number[];
  onChange: (selectedIds: number[]) => void;
}

export default function BankAccountSelector({ accounts, selectedIds, onChange }: BankAccountSelectorProps) {
  const handleToggle = (accountId: number) => {
    if (selectedIds.includes(accountId)) {
      onChange(selectedIds.filter((id) => id !== accountId));
    } else {
      onChange([...selectedIds, accountId]);
    }
  };

  if (accounts.length === 0) {
    return (
      <div style={emptyStyle}>
        No bank accounts added yet. Add a bank account to see it in the graph.
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <span style={labelStyle}>Select accounts:</span>
      <div style={checkboxesStyle}>
        {accounts.map((account) => (
          <label key={account.id} style={checkboxLabelStyle}>
            <input
              type="checkbox"
              checked={selectedIds.includes(account.id)}
              onChange={() => handleToggle(account.id)}
              style={checkboxStyle}
            />
            <span style={accountNameStyle}>{account.name}</span>
            <span style={accountTypeStyle}>({account.type})</span>
          </label>
        ))}
      </div>
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  marginTop: "1rem",
  padding: "0.75rem",
  background: "#f9fafb",
  borderRadius: "6px",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.75rem",
  fontWeight: 600,
  color: "#6b7280",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  marginBottom: "0.5rem",
};

const checkboxesStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "0.75rem",
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

const emptyStyle: React.CSSProperties = {
  marginTop: "1rem",
  padding: "0.75rem",
  background: "#f9fafb",
  borderRadius: "6px",
  fontSize: "0.875rem",
  color: "#6b7280",
  textAlign: "center",
};