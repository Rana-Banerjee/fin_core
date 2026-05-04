const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface VariableData {
  name: string;
  color: string;
  values: number[];
}

export interface GraphData {
  id: string;
  title: string;
  x_axis: string[];
  data: { month: string; [key: string]: string | number }[];
  variables: VariableData[];
  prior_month_cutoff: number;
}

export interface GraphConfig {
  id: string;
  title: string;
  variables: VariableData[];
  prior_month_cutoff: number;
}

export interface BankAccount {
  id: number;
  name: string;
  account_number: string;
  current_balance: number;
  interest_rate: number;
  type: string;
  interest_credit_frequency: string;
}

export interface BankAccountFormData {
  name: string;
  account_number: string;
  current_balance: number;
  interest_rate: number;
  type: string;
  interest_credit_frequency: string;
}

export async function fetchGraph(graphId: string, accountIds: number[] = [], projectionMonths?: number): Promise<GraphData> {
  const params = new URLSearchParams();
  if (accountIds.length > 0) params.append("account_ids", accountIds.join(","));
  if (projectionMonths) params.append("projection_months", projectionMonths.toString());
  const queryString = params.toString();
  const response = await fetch(`${API_BASE_URL}/api/graph/${graphId}${queryString ? "?" + queryString : ""}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch graph: ${response.statusText}`);
  }
  return response.json();
}

export async function fetchAllGraphs(): Promise<GraphConfig[]> {
  const response = await fetch(`${API_BASE_URL}/api/graphs`);
  if (!response.ok) {
    throw new Error(`Failed to fetch graphs: ${response.statusText}`);
  }
  const data = await response.json();
  return data.graphs;
}

export async function regenerateGraph(graphId: string, accountIds: number[] = [], projectionMonths?: number): Promise<GraphData> {
  const params = new URLSearchParams();
  if (accountIds.length > 0) params.append("account_ids", accountIds.join(","));
  if (projectionMonths) params.append("projection_months", projectionMonths.toString());
  const queryString = params.toString();
  const response = await fetch(`${API_BASE_URL}/api/graph/${graphId}/regenerate${queryString ? "?" + queryString : ""}`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`Failed to regenerate graph: ${response.statusText}`);
  }
  const data = await response.json();
  return data.graph;
}

export async function createBankAccount(data: BankAccountFormData): Promise<BankAccount> {
  const params = new URLSearchParams({
    name: data.name,
    account_number: data.account_number,
    current_balance: data.current_balance.toString(),
    interest_rate: data.interest_rate.toString(),
    type: data.type,
    interest_credit_frequency: data.interest_credit_frequency,
  });
  const response = await fetch(`${API_BASE_URL}/api/bank-accounts?${params}`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`Failed to create bank account: ${response.statusText}`);
  }
  return response.json();
}

export async function fetchBankAccounts(): Promise<BankAccount[]> {
  const response = await fetch(`${API_BASE_URL}/api/bank-accounts`);
  if (!response.ok) {
    throw new Error(`Failed to fetch bank accounts: ${response.statusText}`);
  }
  return response.json();
}

export async function updateBankAccountBalances(): Promise<{ message: string; updated: Array<{ id: number; name: string; adjustment: number; new_balance: number }> }> {
  const response = await fetch(`${API_BASE_URL}/api/bank-accounts/update-balances`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`Failed to update balances: ${response.statusText}`);
  }
  return response.json();
}

export async function updateBankAccount(id: number, data: Partial<BankAccountFormData>): Promise<BankAccount> {
  const params = new URLSearchParams();
  if (data.name) params.append("name", data.name);
  if (data.account_number) params.append("account_number", data.account_number);
  if (data.current_balance !== undefined) params.append("current_balance", data.current_balance.toString());
  if (data.interest_rate !== undefined) params.append("interest_rate", data.interest_rate.toString());
  if (data.type) params.append("type", data.type);
  if (data.interest_credit_frequency) params.append("interest_credit_frequency", data.interest_credit_frequency);

  const response = await fetch(`${API_BASE_URL}/api/bank-accounts/${id}?${params}`, {
    method: "PUT",
  });
  if (!response.ok) {
    throw new Error(`Failed to update bank account: ${response.statusText}`);
  }
  return response.json();
}

export async function deleteBankAccount(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/bank-accounts/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(`Failed to delete bank account: ${response.statusText}`);
  }
}

export interface ProjectionStatus {
  generated: boolean;
  months: number;
  accounts_count: number;
}

export async function generateProjections(months: number = 12): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/projections/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ months }),
  });
  if (!response.ok) {
    throw new Error(`Failed to generate projections: ${response.statusText}`);
  }
}

export async function getProjectionStatus(): Promise<ProjectionStatus> {
  const response = await fetch(`${API_BASE_URL}/api/projections/status`);
  if (!response.ok) {
    throw new Error(`Failed to get projection status: ${response.statusText}`);
  }
  return response.json();
}

export async function clearProjections(): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/projections`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(`Failed to clear projections: ${response.statusText}`);
  }
}

export interface Installment {
  id: number;
  home_loan_id: number;
  disbursement_date: string;
  amount: number;
  disbursed_by: "bank" | "self";
  created_at: string;
}

export interface EffectiveEMI {
  principal: number;
  interest: number;
  total: number;
  effective_principal: number;
  od_deduction: number;
}

export interface HomeLoan {
  id: number;
  name: string;
  account_number: string;
  interest_rate: number;
  tenure_months: number;
  emi_start_date: string;
  od_account_id: number | null;
  od_impact_type: "none" | "emi" | "tenure";
  current_principal_outstanding: number;
  created_at: string;
  installments: Installment[];
  effective_pre_emi: EffectiveEMI | null;
  effective_emi: EffectiveEMI | null;
  impacted_tenure_months: number | null;
}

export interface HomeLoanFormData {
  name: string;
  account_number: string;
  interest_rate: number;
  tenure_months: number;
  emi_start_date: string;
  od_account_id: number | null;
  od_impact_type: "none" | "emi" | "tenure";
  current_principal_outstanding: number;
}

export async function createHomeLoan(data: HomeLoanFormData): Promise<HomeLoan> {
  const params = new URLSearchParams({
    name: data.name,
    account_number: data.account_number,
    interest_rate: data.interest_rate.toString(),
    tenure_months: data.tenure_months.toString(),
    emi_start_date: data.emi_start_date,
    current_principal_outstanding: data.current_principal_outstanding.toString(),
  });
  if (data.od_account_id) params.append("od_account_id", data.od_account_id.toString());
  if (data.od_impact_type && data.od_impact_type !== "none") params.append("od_impact_type", data.od_impact_type);

  const response = await fetch(`${API_BASE_URL}/api/home-loans?${params}`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`Failed to create home loan: ${response.statusText}`);
  }
  return response.json();
}

export async function fetchHomeLoans(): Promise<HomeLoan[]> {
  const response = await fetch(`${API_BASE_URL}/api/home-loans`);
  if (!response.ok) {
    throw new Error(`Failed to fetch home loans: ${response.statusText}`);
  }
  return response.json();
}

export async function updateHomeLoan(id: number, data: Partial<HomeLoanFormData>): Promise<HomeLoan> {
  const params = new URLSearchParams();
  if (data.name) params.append("name", data.name);
  if (data.account_number) params.append("account_number", data.account_number);
  if (data.interest_rate !== undefined) params.append("interest_rate", data.interest_rate.toString());
  if (data.tenure_months !== undefined) params.append("tenure_months", data.tenure_months.toString());
  if (data.emi_start_date) params.append("emi_start_date", data.emi_start_date);
  if (data.od_account_id !== undefined) params.append("od_account_id", data.od_account_id?.toString() || "");
  if (data.od_impact_type !== undefined) params.append("od_impact_type", data.od_impact_type);
  if (data.current_principal_outstanding !== undefined) params.append("current_principal_outstanding", data.current_principal_outstanding.toString());

  const response = await fetch(`${API_BASE_URL}/api/home-loans/${id}?${params}`, {
    method: "PUT",
  });
  if (!response.ok) {
    throw new Error(`Failed to update home loan: ${response.statusText}`);
  }
  return response.json();
}

export async function deleteHomeLoan(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/home-loans/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(`Failed to delete home loan: ${response.statusText}`);
  }
}

export interface InstallmentFormData {
  home_loan_id: number;
  disbursement_date: string;
  amount: number;
  disbursed_by: "bank" | "self";
}

export async function createInstallment(data: InstallmentFormData): Promise<Installment> {
  const params = new URLSearchParams({
    home_loan_id: data.home_loan_id.toString(),
    disbursement_date: data.disbursement_date,
    amount: data.amount.toString(),
    disbursed_by: data.disbursed_by,
  });

  const response = await fetch(`${API_BASE_URL}/api/installments?${params}`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`Failed to create installment: ${response.statusText}`);
  }
  return response.json();
}

export async function fetchInstallments(homeLoanId: number): Promise<Installment[]> {
  const response = await fetch(`${API_BASE_URL}/api/installments?home_loan_id=${homeLoanId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch installments: ${response.statusText}`);
  }
  return response.json();
}

export async function updateInstallment(
  id: number,
  data: Partial<{ disbursement_date: string; amount: number; disbursed_by: string }>
): Promise<Installment> {
  const params = new URLSearchParams();
  if (data.disbursement_date) params.append("disbursement_date", data.disbursement_date);
  if (data.amount !== undefined) params.append("amount", data.amount.toString());
  if (data.disbursed_by) params.append("disbursed_by", data.disbursed_by);

  const response = await fetch(`${API_BASE_URL}/api/installments/${id}?${params}`, {
    method: "PUT",
  });
  if (!response.ok) {
    throw new Error(`Failed to update installment: ${response.statusText}`);
  }
  return response.json();
}

export async function deleteInstallment(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/installments/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(`Failed to delete installment: ${response.statusText}`);
  }
}

export interface Investment {
  id: number;
  name: string;
  account_number: string;
  current_value: number;
  investment_type: string;
  appreciation_rate: number;
  sip_amount: number;
  purchase_date: string | null;
  created_at: string;
}

export interface InvestmentFormData {
  name: string;
  account_number: string;
  current_value: number;
  investment_type: string;
  appreciation_rate: number;
  sip_amount: number;
  purchase_date?: string;
}

export async function createInvestment(data: InvestmentFormData): Promise<Investment> {
  const response = await fetch(`${API_BASE_URL}/api/investments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`Failed to create investment: ${response.statusText}`);
  }
  return response.json();
}

export async function fetchInvestments(): Promise<Investment[]> {
  const response = await fetch(`${API_BASE_URL}/api/investments`);
  if (!response.ok) {
    throw new Error(`Failed to fetch investments: ${response.statusText}`);
  }
  return response.json();
}

export async function updateInvestment(id: number, data: Partial<InvestmentFormData>): Promise<Investment> {
  const response = await fetch(`${API_BASE_URL}/api/investments/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`Failed to update investment: ${response.statusText}`);
  }
  return response.json();
}

export async function deleteInvestment(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/investments/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(`Failed to delete investment: ${response.statusText}`);
  }
}

export interface PaymentSource {
  id: number;
  name: string;
  source_type: string;
  bank_account_id: number | null;
  investment_id: number | null;
  priority_order: number;
  is_active: boolean;
  created_at: string;
}

export interface PaymentSourceFormData {
  name: string;
  source_type: string;
  bank_account_id?: number;
  investment_id?: number;
  priority_order: number;
  is_active: boolean;
}

export async function createPaymentSource(data: PaymentSourceFormData): Promise<PaymentSource> {
  const response = await fetch(`${API_BASE_URL}/api/payment-sources`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`Failed to create payment source: ${response.statusText}`);
  }
  return response.json();
}

export async function fetchPaymentSources(): Promise<PaymentSource[]> {
  const response = await fetch(`${API_BASE_URL}/api/payment-sources`);
  if (!response.ok) {
    throw new Error(`Failed to fetch payment sources: ${response.statusText}`);
  }
  return response.json();
}

export async function updatePaymentSource(id: number, data: Partial<PaymentSourceFormData>): Promise<PaymentSource> {
  const response = await fetch(`${API_BASE_URL}/api/payment-sources/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`Failed to update payment source: ${response.statusText}`);
  }
  return response.json();
}

export async function deletePaymentSource(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/payment-sources/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(`Failed to delete payment source: ${response.statusText}`);
  }
}

export interface ExpenseSource {
  id: number;
  expense_id: number;
  source_type: "bank_account" | "investment";
  bank_account_id: number | null;
  investment_id: number | null;
  priority_order: number;
  bank_account_name?: string;
  investment_name?: string;
}

export interface ExpenseSourceFormData {
  expense_id: number;
  source_type: "bank_account" | "investment";
  bank_account_id?: number;
  investment_id?: number;
  priority_order?: number;
}

export async function createExpenseSource(data: ExpenseSourceFormData): Promise<ExpenseSource> {
  const params = new URLSearchParams({
    expense_id: data.expense_id.toString(),
    source_type: data.source_type,
  });
  if (data.bank_account_id) params.append("bank_account_id", data.bank_account_id.toString());
  if (data.investment_id) params.append("investment_id", data.investment_id.toString());
  if (data.priority_order) params.append("priority_order", data.priority_order.toString());

  const response = await fetch(`${API_BASE_URL}/api/expense-sources?${params}`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`Failed to create expense source: ${response.statusText}`);
  }
  return response.json();
}

export async function fetchExpenseSources(expenseId: number): Promise<ExpenseSource[]> {
  const response = await fetch(`${API_BASE_URL}/api/expense-sources?expense_id=${expenseId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch expense sources: ${response.statusText}`);
  }
  return response.json();
}

export async function updateExpenseSource(
  id: number,
  priorityOrder: number
): Promise<ExpenseSource> {
  const params = new URLSearchParams({
    priority_order: priorityOrder.toString(),
  });

  const response = await fetch(`${API_BASE_URL}/api/expense-sources/${id}?${params}`, {
    method: "PUT",
  });
  if (!response.ok) {
    throw new Error(`Failed to update expense source: ${response.statusText}`);
  }
  return response.json();
}

export async function deleteExpenseSource(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/expense-sources/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(`Failed to delete expense source: ${response.statusText}`);
  }
}

export interface CashFlow {
  id: number;
  name: string;
  stream_type: "income" | "expense";
  stream_category: string;
  amount: number;
  frequency: "weekly" | "monthly" | "quarterly" | "annually";
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  appreciation_rate?: number;
  appreciation_frequency?: "monthly" | "quarterly" | "annually" | null;
  bank_account_id: number | null;
  created_at: string;
  expense_sources?: ExpenseSource[];
}

export interface CashFlowFormData {
  name: string;
  stream_type: "income" | "expense";
  stream_category: string;
  amount: number;
  frequency?: "weekly" | "monthly" | "quarterly" | "annually";
  start_date?: string;
  end_date?: string | null;
  is_active?: boolean;
  appreciation_rate?: number | null;
  appreciation_frequency?: string | null;
  bank_account_id: number;
}

export async function createCashFlow(data: CashFlowFormData): Promise<CashFlow> {
  const params = new URLSearchParams({
    name: data.name,
    stream_type: data.stream_type,
    stream_category: data.stream_category,
    amount: data.amount.toString(),
  });
  if (data.frequency) params.append("frequency", data.frequency);
  if (data.start_date) params.append("start_date", data.start_date);
  if (data.end_date) params.append("end_date", data.end_date);
  if (data.is_active !== undefined) params.append("is_active", data.is_active.toString());
  if (data.appreciation_rate !== undefined && data.appreciation_rate !== null && data.appreciation_rate > 0) {
    params.append("appreciation_rate", data.appreciation_rate.toString());
  }
  if (data.appreciation_frequency && data.appreciation_frequency !== "none") {
    params.append("appreciation_frequency", data.appreciation_frequency);
  }
  params.append("bank_account_id", data.bank_account_id.toString());

  const response = await fetch(`${API_BASE_URL}/api/cash-flows?${params}`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`Failed to create cash flow: ${response.statusText}`);
  }
  return response.json();
}

export async function fetchCashFlows(streamType?: "income" | "expense"): Promise<CashFlow[]> {
  let url = `${API_BASE_URL}/api/cash-flows`;
  if (streamType) {
    url += `?stream_type=${streamType}`;
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch cash flows: ${response.statusText}`);
  }
  return response.json();
}

export async function updateCashFlow(id: number, data: Partial<CashFlowFormData>): Promise<CashFlow> {
  const params = new URLSearchParams();
  if (data.name) params.append("name", data.name);
  if (data.stream_type) params.append("stream_type", data.stream_type);
  if (data.stream_category) params.append("stream_category", data.stream_category);
  if (data.amount !== undefined) params.append("amount", data.amount.toString());
  if (data.frequency) params.append("frequency", data.frequency);
  if (data.start_date) params.append("start_date", data.start_date);
  if (data.end_date !== undefined) params.append("end_date", data.end_date || "");
  if (data.is_active !== undefined) params.append("is_active", data.is_active.toString());
  if (data.appreciation_rate !== undefined) {
    if (data.appreciation_rate === null || data.appreciation_rate === 0) {
      params.append("appreciation_rate", "0");
    } else {
      params.append("appreciation_rate", data.appreciation_rate.toString());
    }
  }
  if (data.appreciation_frequency !== undefined) {
    if (!data.appreciation_frequency || data.appreciation_frequency === "none") {
      params.append("appreciation_frequency", "none");
    } else {
      params.append("appreciation_frequency", data.appreciation_frequency);
    }
  }
  if (data.bank_account_id !== undefined) params.append("bank_account_id", data.bank_account_id?.toString() || "");

  const response = await fetch(`${API_BASE_URL}/api/cash-flows/${id}?${params}`, {
    method: "PUT",
  });
  if (!response.ok) {
    throw new Error(`Failed to update cash flow: ${response.statusText}`);
  }
  return response.json();
}

export async function deleteCashFlow(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/cash-flows/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(`Failed to delete cash flow: ${response.statusText}`);
  }
}

export interface CashFlowProjection {
  id: number;
  cash_flow_id: number;
  month_index: number;
  projected_amount: number;
  created_at: string;
  cash_flow?: CashFlow;
}

export interface CashFlowProjectionSummary {
  month_index: number;
  income: number;
  expense: number;
  net: number;
}

export async function generateCashFlowProjections(months: number = 12): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/projections/cash-flow/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ months }),
  });
  if (!response.ok) {
    throw new Error(`Failed to generate cash flow projections: ${response.statusText}`);
  }
}

export async function fetchCashFlowProjections(): Promise<{ projections: CashFlowProjection[]; count: number }> {
  const response = await fetch(`${API_BASE_URL}/api/projections/cash-flow`);
  if (!response.ok) {
    throw new Error(`Failed to fetch cash flow projections: ${response.statusText}`);
  }
  return response.json();
}

export async function fetchCashFlowSummary(): Promise<{ months: CashFlowProjectionSummary[]; count: number }> {
  const response = await fetch(`${API_BASE_URL}/api/projections/cash-flow/summary`);
  if (!response.ok) {
    throw new Error(`Failed to fetch cash flow summary: ${response.statusText}`);
  }
  return response.json();
}