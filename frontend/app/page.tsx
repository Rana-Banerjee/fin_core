"use client";

import { useEffect, useState } from "react";
import BankAccountForm from "@/components/BankAccountForm";
import HomeLoanForm from "@/components/HomeLoanForm";
import InvestmentList from "@/components/InvestmentList";
import PaymentSourceList from "@/components/PaymentSourceList";
import CashFlowForm from "@/components/CashFlowForm";
import CashFlowList from "@/components/CashFlowList";
import { fetchBankAccounts, deleteBankAccount, BankAccount, fetchHomeLoans, deleteHomeLoan, HomeLoan, fetchInvestments, fetchPaymentSources, Investment, PaymentSource, fetchCashFlows, deleteCashFlow, CashFlow, updateBankAccountBalances } from "@/lib/api";

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
  const [homeLoans, setHomeLoans] = useState<HomeLoan[]>([]);
  const [isLoanFormOpen, setIsLoanFormOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<HomeLoan | null>(null);
  const [deleteLoanConfirm, setDeleteLoanConfirm] = useState<HomeLoan | null>(null);
  const [bankAccountsCollapsed, setBankAccountsCollapsed] = useState(false);
  const [homeLoansCollapsed, setHomeLoansCollapsed] = useState(false);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [investmentsCollapsed, setInvestmentsCollapsed] = useState(false);
  const [paymentSources, setPaymentSources] = useState<PaymentSource[]>([]);
  const [paymentSourcesCollapsed, setPaymentSourcesCollapsed] = useState(false);
  const [cashFlows, setCashFlows] = useState<CashFlow[]>([]);
  const [cashFlowsCollapsed, setCashFlowsCollapsed] = useState(false);
  const [isCashFlowFormOpen, setIsCashFlowFormOpen] = useState(false);
  const [editingCashFlow, setEditingCashFlow] = useState<CashFlow | null>(null);
  const [cashFlowSummary, setCashFlowSummary] = useState({ totalIncome: 0, totalExpenses: 0, netFlow: 0 });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      await updateBankAccountBalances();
      
      const [accountsData, loansData, investmentsData, sourcesData, cashFlowsData] = await Promise.all([
        fetchBankAccounts(),
        fetchHomeLoans(),
        fetchInvestments(),
        fetchPaymentSources(),
        fetchCashFlows(),
      ]);
      setBankAccounts(accountsData);
      setHomeLoans(loansData);
      setInvestments(investmentsData);
      setPaymentSources(sourcesData);
      setCashFlows(cashFlowsData);
      calculateSummary(accountsData, loansData, investmentsData, cashFlowsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const calculateSummary = ( accounts: BankAccount[], loans: HomeLoan[], invs: Investment[] = [], cfs: CashFlow[] = [] ) => {
    let totalAssets = 0;
    let totalLiabilities = 0;
    let cashInHand = 0;

    accounts.forEach((account) => {
      if (account.type === "home_loan_od") {
        totalAssets += account.current_balance;
        cashInHand += account.current_balance;
      } else {
        totalAssets += account.current_balance;
        if (account.type === "savings" || account.type === "current") {
          cashInHand += account.current_balance;
        }
      }
    });

    invs.forEach((inv) => {
      totalAssets += inv.current_value;
    });

    loans.forEach((loan) => {
      totalLiabilities += loan.current_principal_outstanding;
    });

    const today = new Date();

    cfs.forEach((cf) => {
      const startDate = cf.start_date ? new Date(cf.start_date) : null;
      const isStarted = !startDate || startDate <= today;

      if (cf.stream_type === "income" && cf.is_active && isStarted) {
        totalAssets += cf.amount;
      } else if (cf.stream_type === "expense" && cf.is_active && isStarted) {
        totalLiabilities += cf.amount;
      }
    });

    const activeCfs = cfs.filter((cf) => {
      const startDate = cf.start_date ? new Date(cf.start_date) : null;
      return cf.is_active && (!startDate || startDate <= today);
    });
    const totalIncome = activeCfs.filter((cf) => cf.stream_type === "income").reduce((sum, cf) => sum + cf.amount, 0);
    const totalExpenses = activeCfs.filter((cf) => cf.stream_type === "expense").reduce((sum, cf) => sum + cf.amount, 0);
    setCashFlowSummary({
      totalIncome,
      totalExpenses,
      netFlow: totalIncome - totalExpenses,
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

  const handleLoanDelete = async () => {
    if (!deleteLoanConfirm) return;
    try {
      await deleteHomeLoan(deleteLoanConfirm.id);
      setDeleteLoanConfirm(null);
      loadData();
    } catch (err) {
      console.error("Failed to delete home loan:", err);
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
        <div style={summaryCardStyle}>
          <div style={summaryLabelStyle}>Monthly Income</div>
          <div style={summaryValuePositiveStyle}>{formatCurrency(cashFlowSummary.totalIncome)}</div>
        </div>
        <div style={summaryCardStyle}>
          <div style={summaryLabelStyle}>Monthly Expenses</div>
          <div style={summaryValueNegativeStyle}>{formatCurrency(cashFlowSummary.totalExpenses)}</div>
        </div>
        <div style={summaryCardStyle}>
          <div style={summaryLabelStyle}>Net Monthly Flow</div>
          <div style={cashFlowSummary.netFlow >= 0 ? summaryValuePositiveStyle : summaryValueNegativeStyle}>
            {cashFlowSummary.netFlow < 0 && "-"}{formatCurrency(cashFlowSummary.netFlow)}
          </div>
        </div>
      </div>

      <div style={bankAccountsSectionStyle}>
        <div style={sectionHeaderStyle}>
          <div style={sectionHeaderLeftStyle}>
            <button onClick={() => setBankAccountsCollapsed(!bankAccountsCollapsed)} style={collapseButtonStyle}>
              {bankAccountsCollapsed ? "▶" : "▼"}
            </button>
            <h2 style={sectionTitleStyle}>Bank Accounts</h2>
            <span style={accountsCountStyle}>
              {bankAccounts.length} account{bankAccounts.length !== 1 ? "s" : ""}
            </span>
          </div>
          <button onClick={() => setIsFormOpen(true)} style={addButtonStyle}>
            + Add Bank Account
          </button>
        </div>

        {!bankAccountsCollapsed && bankAccounts.length > 0 ? (
        <div style={accountsListStyle}>
          {bankAccounts.map((account) => (
            <div key={account.id} style={accountCardStyle}>
              <div style={accountInfoStyle}>
                <div style={accountNameStyle}>{account.name}</div>
                <div style={accountDetailsStyle}>
                  <span style={accountTypeStyle}>{getAccountTypeLabel(account.type)}</span>
                  <span style={frequencyBadgeStyle}>{getFrequencyLabel(account.interest_credit_frequency)}</span>
                  <span style={accountNumberStyle}>••{account.account_number.slice(-4)}</span>
                  <span style={accountBalancePositiveStyle}>
                    ₹{account.current_balance.toLocaleString("en-IN")}
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
        !bankAccountsCollapsed && (
          <div style={emptyStateStyle}>
            No bank accounts yet. Add your first account to get started.
          </div>
        )
      )}
      </div>

      <BankAccountForm
        isOpen={isFormOpen || !!editingAccount}
        onClose={() => {
          setIsFormOpen(false);
          setEditingAccount(null);
        }}
        onSuccess={handleFormSuccess}
        editData={editingAccount}
      />

      <div style={homeLoansSectionStyle}>
        <div style={sectionHeaderStyle}>
          <div style={sectionHeaderLeftStyle}>
            <button onClick={() => setHomeLoansCollapsed(!homeLoansCollapsed)} style={collapseButtonStyle}>
              {homeLoansCollapsed ? "▶" : "▼"}
            </button>
            <h2 style={sectionTitleStyle}>Home Loans</h2>
            <span style={accountsCountStyle}>
              {homeLoans.length} loan{homeLoans.length !== 1 ? "s" : ""}
            </span>
          </div>
          <button onClick={() => setIsLoanFormOpen(true)} style={addButtonStyle}>
            + Add Home Loan
          </button>
        </div>

        {!homeLoansCollapsed && homeLoans.length > 0 ? (
        <div style={accountsListStyle}>
          {homeLoans.map((loan) => (
            <div key={loan.id} style={accountCardStyle}>
              <div style={accountInfoStyle}>
                <div style={accountNameStyle}>{loan.name}</div>
                <div style={accountDetailsStyle}>
                  <span style={accountTypeStyle}>Home Loan</span>
                  <span style={accountNumberStyle}>••{loan.account_number.slice(-4)}</span>
                  <span style={loanInterestBadgeStyle}>{loan.interest_rate}%</span>
                  <span style={loanTenureStyle}>{loan.tenure_months} months</span>
                  <span style={accountBalanceNegativeStyle}>-₹{loan.current_principal_outstanding.toLocaleString("en-IN")}</span>
                  {loan.od_account_id && loan.od_impact_type !== "none" && (
                    <span style={odImpactBadgeStyle}>
                      OD: {loan.od_impact_type === "emi" ? "Impacts EMI" : "Impacts Tenure"}
                    </span>
                  )}
                </div>
                {(loan.effective_pre_emi || loan.effective_emi) && (
                  <div style={loanEmiDetailsStyle}>
                    {loan.emi_start_date > new Date().toISOString().split("T")[0] ? (
                      loan.effective_pre_emi ? (
                        <span>
                          Pre-EMI: ₹{loan.effective_pre_emi.total.toLocaleString("en-IN")}/mo
                          <span style={effectiveDetailStyle}> (Effective)</span>
                        </span>
                      ) : null
                    ) : (
                      loan.effective_emi ? (
                        <span>
                          EMI: ₹{loan.effective_emi.total.toLocaleString("en-IN")}/mo
                          <span style={effectiveDetailStyle}> (Effective)</span>
                        </span>
                      ) : null
                    )}
                  </div>
                )}
                {loan.od_impact_type === "tenure" && loan.impacted_tenure_months && loan.impacted_tenure_months !== loan.tenure_months && (
                  <div style={loanEmiDetailsStyle}>
                    <span>
                      Tenure: {loan.impacted_tenure_months} months
                      <span style={effectiveDetailStyle}> (Extended from {loan.tenure_months} months)</span>
                    </span>
                  </div>
                )}
              </div>
              <div style={accountActionsStyle}>
                <button
                  onClick={() => setEditingLoan(loan)}
                  style={editButtonStyle}
                  title="Edit"
                >
                  ✏️
                </button>
                <button
                  onClick={() => setDeleteLoanConfirm(loan)}
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
        !homeLoansCollapsed && (
          <div style={emptyStateStyle}>
            No home loans yet. Add your first loan to track it.
          </div>
        )
      )}
      </div>

      <HomeLoanForm
        isOpen={isLoanFormOpen || !!editingLoan}
        onClose={() => {
          setIsLoanFormOpen(false);
          setEditingLoan(null);
        }}
        onSuccess={handleFormSuccess}
        editData={editingLoan}
      />

      <div style={homeLoansSectionStyle}>
        <div style={sectionHeaderStyle}>
          <div style={sectionHeaderLeftStyle}>
            <button onClick={() => setCashFlowsCollapsed(!cashFlowsCollapsed)} style={collapseButtonStyle}>
              {cashFlowsCollapsed ? "▶" : "▼"}
            </button>
            <h2 style={sectionTitleStyle}>Income & Expenses</h2>
            <span style={accountsCountStyle}>
              {cashFlows.length} stream{cashFlows.length !== 1 ? "s" : ""}
            </span>
          </div>
          <button onClick={() => setIsCashFlowFormOpen(true)} style={addButtonStyle}>
              + Add Income/Expense
            </button>
        </div>

        {!cashFlowsCollapsed && (
          <>
            <CashFlowList 
              cashFlows={cashFlows} 
              onRefresh={loadData} 
              onEdit={(cf) => setEditingCashFlow(cf)} 
            />
          </>
        )}
      </div>

      <CashFlowForm
        isOpen={isCashFlowFormOpen || !!editingCashFlow}
        onClose={() => {
          setIsCashFlowFormOpen(false);
          setEditingCashFlow(null);
        }}
        onSuccess={handleFormSuccess}
        editData={editingCashFlow}
      />

      <div style={homeLoansSectionStyle}>
        <div style={sectionHeaderStyle}>
          <div style={sectionHeaderLeftStyle}>
            <button onClick={() => setInvestmentsCollapsed(!investmentsCollapsed)} style={collapseButtonStyle}>
              {investmentsCollapsed ? "▶" : "▼"}
            </button>
            <h2 style={sectionTitleStyle}>Investments</h2>
            <span style={accountsCountStyle}>
              {investments.length} holding{investments.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        {!investmentsCollapsed && (
          <InvestmentList investments={investments} onRefresh={loadData} />
        )}
      </div>

      <div style={homeLoansSectionStyle}>
        <div style={sectionHeaderStyle}>
          <div style={sectionHeaderLeftStyle}>
            <button onClick={() => setPaymentSourcesCollapsed(!paymentSourcesCollapsed)} style={collapseButtonStyle}>
              {paymentSourcesCollapsed ? "▶" : "▼"}
            </button>
            <h2 style={sectionTitleStyle}>Payment Priority</h2>
            <span style={accountsCountStyle}>
              {paymentSources.length} source{paymentSources.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        {!paymentSourcesCollapsed && (
          <PaymentSourceList onRefresh={loadData} />
        )}
      </div>

      {deleteLoanConfirm && (
        <div style={modalOverlayStyle}>
          <div style={deleteModalStyle}>
            <h3 style={deleteModalTitleStyle}>Delete Home Loan?</h3>
            <p style={deleteModalTextStyle}>
              Are you sure you want to delete <strong>{deleteLoanConfirm.name}</strong>? This action cannot be undone.
            </p>
            <div style={deleteModalButtonsStyle}>
              <button onClick={() => setDeleteLoanConfirm(null)} style={cancelButtonStyle}>
                Cancel
              </button>
              <button onClick={handleLoanDelete} style={confirmDeleteButtonStyle}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

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

const bankAccountsSectionStyle: React.CSSProperties = {
  marginBottom: "1.5rem",
};

const homeLoansSectionStyle: React.CSSProperties = {
  marginBottom: "1.5rem",
};

const sectionHeaderLeftStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
};

const collapseButtonStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  fontSize: "0.75rem",
  cursor: "pointer",
  padding: "0.25rem",
  color: "#6b7280",
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

const addLoanButtonStyle: React.CSSProperties = {
  marginLeft: "auto",
  padding: "0.625rem 1rem",
  background: "#7c3aed",
  border: "none",
  borderRadius: "6px",
  fontSize: "0.875rem",
  fontWeight: 500,
  color: "#ffffff",
  cursor: "pointer",
};

const loanInterestBadgeStyle: React.CSSProperties = {
  background: "#fef3c7",
  color: "#d97706",
  padding: "0.125rem 0.5rem",
  borderRadius: "4px",
  fontSize: "0.75rem",
  fontWeight: 500,
};

const loanTenureStyle: React.CSSProperties = {
  color: "#6b7280",
  fontSize: "0.8125rem",
};

const loanEmiDetailsStyle: React.CSSProperties = {
  marginTop: "0.25rem",
  fontSize: "0.75rem",
  color: "#059669",
  fontWeight: 500,
};

const odImpactBadgeStyle: React.CSSProperties = {
  padding: "0.125rem 0.5rem",
  background: "#fef3c7",
  color: "#92400e",
  borderRadius: "9999px",
  fontSize: "0.6875rem",
  fontWeight: 500,
};

const effectiveDetailStyle: React.CSSProperties = {
  color: "#6b7280",
  fontWeight: 400,
};