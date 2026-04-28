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

export interface HomeLoan {
  id: number;
  name: string;
  account_number: string;
  interest_rate: number;
  tenure_months: number;
  emi_start_date: string;
  od_account_id: number | null;
  current_principal_outstanding: number;
  current_pre_emi_principal: number | null;
  current_pre_emi_interest: number | null;
  current_emi_principal: number | null;
  current_emi_interest: number | null;
  created_at: string;
}

export interface HomeLoanFormData {
  name: string;
  account_number: string;
  interest_rate: number;
  tenure_months: number;
  emi_start_date: string;
  od_account_id: number | null;
  current_principal_outstanding: number;
  current_pre_emi_principal: number | null;
  current_pre_emi_interest: number | null;
  current_emi_principal: number | null;
  current_emi_interest: number | null;
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
  if (data.current_pre_emi_principal !== null) params.append("current_pre_emi_principal", data.current_pre_emi_principal.toString());
  if (data.current_pre_emi_interest !== null) params.append("current_pre_emi_interest", data.current_pre_emi_interest.toString());
  if (data.current_emi_principal !== null) params.append("current_emi_principal", data.current_emi_principal.toString());
  if (data.current_emi_interest !== null) params.append("current_emi_interest", data.current_emi_interest.toString());

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
  if (data.current_principal_outstanding !== undefined) params.append("current_principal_outstanding", data.current_principal_outstanding.toString());
  if (data.current_pre_emi_principal !== undefined && data.current_pre_emi_principal !== null) params.append("current_pre_emi_principal", data.current_pre_emi_principal.toString());
  if (data.current_pre_emi_interest !== undefined && data.current_pre_emi_interest !== null) params.append("current_pre_emi_interest", data.current_pre_emi_interest.toString());
  if (data.current_emi_principal !== undefined && data.current_emi_principal !== null) params.append("current_emi_principal", data.current_emi_principal.toString());
  if (data.current_emi_interest !== undefined && data.current_emi_interest !== null) params.append("current_emi_interest", data.current_emi_interest.toString());

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