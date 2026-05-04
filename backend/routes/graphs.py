from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from typing import List
from datetime import datetime, date
from collections import defaultdict
import calendar

from database import get_db
from models.graph_data import GraphData, VariableData
from models.bank_account import BankAccount
from models.projection import Projection
from models.home_loan import HomeLoan
from models.investment import Investment
from models.investment_projection import InvestmentProjection

from models.cash_flow import CashFlow, StreamType, Frequency, AppreciationFrequency
from math import pow
from services.emi_calculator import (
    calculate_pre_emi,
    calculate_emi,
    get_past_bank_installments_sum,
)

# Create a FastAPI router for graph-related endpoints with /api prefix and "graphs" tags
router = APIRouter(prefix="/api", tags=["graphs"])

# List of month abbreviations for x-axis labels
MONTHS = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
]

# Configuration for different graph types, including ID, title, and prior month cutoff
GRAPH_CONFIGS = {
    "assets_liabilities": {
        "id": "assets_liabilities",
        "title": "Assets & Liabilities",
        "prior_month_cutoff": 3,
    },
    "cashflow": {
        "id": "cashflow",
        "title": "Cashflow",
        "prior_month_cutoff": 4,
    },
}

# List of colors for chart variables
COLORS = [
    "#2563eb",
    "#16a34a",
    "#dc2626",
    "#9333ea",
    "#0891b2",
    "#f59e0b",
    "#8b5cf6",
    "#ec4899",
    "#14b8a6",
    "#f97316",
]

# Dictionary of summary colors for specific chart elements
SUMMARY_COLORS = {
    "Asset": "#7c3aed",
    "Liability": "#ef4444",
    "Cash in Hand": "#0d9488",
    "Home Loan Payment": "#f59e0b",
    "Home Loan OD": "#ec4899",
    "Loan Liability": "#b91c1c",
    "Expenses": "#f97316",
}


def calculate_monthly_amount(amount: float, frequency: str) -> float:
    try:
        freq = Frequency[frequency]
    except KeyError:
        return amount
    if freq == Frequency.weekly:
        return amount * 52 / 12
    elif freq == Frequency.monthly:
        return amount
    elif freq == Frequency.quarterly:
        return amount / 3
    elif freq == Frequency.annually:
        return amount / 12
    return amount


def calculate_appreciated_amount(
    base_amount: float,
    appreciation_rate: float,
    appreciation_freq: str | None,
    months_passed: int,
) -> float:
    if not appreciation_rate or appreciation_rate == 0:
        return base_amount

    if not appreciation_freq:
        return base_amount

    periods_passed = 0
    try:
        freq = AppreciationFrequency[appreciation_freq]
    except KeyError:
        return base_amount

    if freq == AppreciationFrequency.monthly:
        periods_passed = months_passed
    elif freq == AppreciationFrequency.quarterly:
        periods_passed = months_passed // 3
    elif freq == AppreciationFrequency.annually:
        periods_passed = months_passed // 12

    return base_amount * pow(1 + appreciation_rate / 100, periods_passed)


# Function to calculate projected investment values over months
def calculate_investment_projection(inv: Investment, months: int) -> List[float]:
    # Initialize list to hold projected values
    values = []
    # Calculate monthly appreciation rate
    monthly_appreciation = inv.appreciation_rate / 12 / 100

    # Loop over each month to calculate projected value
    for month_idx in range(months):
        # If appreciation rate is positive, calculate compound growth
        if monthly_appreciation > 0:
            # Growth from existing value
            existing_growth = inv.current_value * (
                (1 + monthly_appreciation) ** month_idx
            )
            # Growth from SIP contributions
            if monthly_appreciation > 0:
                sip_growth = inv.sip_amount * (
                    ((1 + monthly_appreciation) ** month_idx - 1) / monthly_appreciation
                )
            else:
                sip_growth = inv.sip_amount * month_idx
            # Total projected value
            projected_value = existing_growth + sip_growth
        else:
            # If no appreciation, just add SIP amounts
            projected_value = inv.current_value + (inv.sip_amount * (month_idx + 1))
        # Append the calculated value
        values.append(projected_value)

    # Return the list of projected values
    return values


# Function to retrieve home loans with calculated effective values including OD balances and EMI calculations
async def get_home_loans_with_effective_values(db: AsyncSession) -> List[dict]:
    # Query all home loans with their installments loaded
    result = await db.execute(
        select(HomeLoan).options(selectinload(HomeLoan.installments))
    )
    loans = result.scalars().all()

    # If no loans, return empty list
    if not loans:
        return []

    # Initialize list to hold processed loan data
    loan_data_list = []
    # Process each loan
    for loan in loans:
        # Convert loan to dictionary with installments
        loan_dict = loan.to_dict(include_installments=True)
        # Initialize OD balance
        od_balance = None
        # If loan has OD account, fetch its balance
        if loan.od_account_id:
            od_result = await db.execute(
                select(BankAccount).where(BankAccount.id == loan.od_account_id)
            )
            od_account = od_result.scalar_one_or_none()
            if od_account:
                od_balance = od_account.current_balance

        # Get installments data as list of dicts
        installments_data = [i.to_dict() for i in loan.installments]
        # Calculate pre-EMI and full EMI using service functions
        pre_emi = calculate_pre_emi(loan_dict, installments_data, od_balance)
        emi = calculate_emi(loan_dict, od_balance)

        # Append processed loan data to list
        loan_data_list.append(
            {
                "id": loan.id,
                "name": loan.name,
                "od_account_id": loan.od_account_id,
                "od_balance": od_balance if od_balance else 0.0,
                "od_impact_type": loan.od_impact_type.value,
                "emi_start_date": loan.emi_start_date,
                "current_principal_outstanding": loan.current_principal_outstanding,
                "pre_emi_total": pre_emi["total"],
                "emi_total": emi["total"],
                "interest_rate": loan.interest_rate,
            }
        )

    # Return the list of processed loan data
    return loan_data_list


# Main function to populate graph data for a given graph ID, account IDs, and projection months
async def populate_graph_data(
    graph_id: str,
    account_ids: List[int],
    db: AsyncSession,
    projection_months: int = 12,
) -> GraphData:
    # Check if graph_id is valid, raise 404 if not
    if graph_id not in GRAPH_CONFIGS:
        raise HTTPException(status_code=404, detail=f"Graph '{graph_id}' not found")

    # Get config for the graph
    config = GRAPH_CONFIGS[graph_id]
    prior_month_cutoff = config["prior_month_cutoff"]

    # Get current month
    current_month = datetime.now().month

    # Check if projections exist in database for the requested account IDs
    has_projections = False
    if account_ids:
        result = await db.execute(
            select(Projection)
            .where(Projection.bank_account_id.in_(account_ids))
            .limit(1)
        )
        has_projections = result.scalar() is not None

    # Set total months for projection - use parameter value
    total_months = projection_months
    # Get current datetime
    current = datetime.now()
    # Generate x-axis labels for months
    x_axis = []
    for i in range(projection_months):
        month_num = ((current.month - 1 + i) % 12) + 1
        year_offset = (current.month - 1 + i) // 12
        x_axis.append(f"{MONTHS[month_num - 1]} {current.year + year_offset}")

    # Initialize variables list and total balance
    variables = []
    total_balance = 0.0

    # If account IDs provided, fetch and process bank accounts
    if account_ids:
        result = await db.execute(
            select(BankAccount).where(BankAccount.id.in_(account_ids))
        )
        accounts = result.scalars().all()

        # For each account, calculate values based on projections or cash flows
        for i, account in enumerate(accounts):
            if has_projections:
                start_month = current_month
                end_month = current_month + total_months - 1
                result = await db.execute(
                    select(Projection)
                    .where(Projection.bank_account_id == account.id)
                    .where(Projection.month_index >= start_month)
                    .where(Projection.month_index <= end_month)
                    .order_by(Projection.month_index)
                )
                projections = result.scalars().all()

                if projections:
                    values = [account.current_balance]
                    for p in projections:
                        rel_idx = p.month_index - start_month
                        if rel_idx > 0 and rel_idx < total_months:
                            while len(values) < rel_idx:
                                values.append(account.current_balance)
                            values.append(p.projected_balance)
                    while len(values) < total_months:
                        values.append(
                            projections[-1].projected_balance
                            if projections
                            else account.current_balance
                        )
                else:
                    values = [account.current_balance] * total_months
            else:
                result = await db.execute(
                    select(CashFlow)
                    .where(CashFlow.bank_account_id == account.id)
                    .where(CashFlow.is_active == True)
                )
                cash_flows = result.scalars().all()

                values = []
                starting_balance = account.current_balance

                for month_idx in range(total_months):
                    # Use end of month for comparison
                    year = current.year + (current.month - 1 + month_idx) // 12
                    month = ((current.month - 1 + month_idx) % 12) + 1
                    _, last_day = calendar.monthrange(year, month)
                    month_date = date(year, month, last_day)
                    month_balance = starting_balance

                    for cf in cash_flows:
                        if cf.start_date and cf.start_date > month_date:
                            continue
                        if cf.end_date and cf.end_date < month_date:
                            continue

                        monthly_amount = calculate_monthly_amount(
                            cf.amount, cf.frequency.value
                        )

                        if cf.stream_type == StreamType.income:
                            month_balance += monthly_amount
                        else:
                            month_balance -= monthly_amount

                    values.append(month_balance)
                    starting_balance = month_balance

            # Track account balances per month for asset calculation
            if "account_balance_values" not in locals():
                account_balance_values = [0.0] * total_months

            if account_ids and len(accounts) > 0:
                for acc_idx, account in enumerate(accounts):
                    result = await db.execute(
                        select(CashFlow)
                        .where(CashFlow.bank_account_id == account.id)
                        .where(CashFlow.is_active == True)
                    )
                    cash_flows = result.scalars().all()

                    starting = account.current_balance
                    for month_idx in range(total_months):
                        # Use end of month for comparison
                        year = current.year + (current.month - 1 + month_idx) // 12
                        month = ((current.month - 1 + month_idx) % 12) + 1
                        _, last_day = calendar.monthrange(year, month)
                        month_date = date(year, month, last_day)
                        month_bal = starting

                        for cf in cash_flows:
                            if cf.start_date and cf.start_date > month_date:
                                continue
                            if cf.end_date and cf.end_date < month_date:
                                continue

                            monthly = calculate_monthly_amount(
                                cf.amount, cf.frequency.value
                            )
                            if cf.stream_type == StreamType.income:
                                month_bal += monthly
                            else:
                                month_bal -= monthly

                        account_balance_values[month_idx] += month_bal
                        starting = month_bal

            # Add variable data for the account
            variables.append(
                VariableData(
                    name=account.name,
                    color=COLORS[i % len(COLORS)],
                    values=values,
                )
            )
            if values:
                total_balance += values[0]

    # Fetch all investments
    result = await db.execute(select(Investment))
    investments = result.scalars().all()

    # Process each investment
    for i, inv in enumerate(investments):
        if has_projections:
            result = await db.execute(
                select(InvestmentProjection)
                .where(InvestmentProjection.investment_id == inv.id)
                .order_by(InvestmentProjection.month_index)
            )
            projections = result.scalars().all()

            if projections:
                values = [inv.current_value]
                values.extend([p.projected_value for p in projections])
            else:
                values = calculate_investment_projection(inv, total_months)
        else:
            values = calculate_investment_projection(inv, total_months)

        # Add variable data for the investment
        variables.append(
            VariableData(
                name=inv.name,
                color=COLORS[(len(accounts) + i) % len(COLORS)],
                values=values,
            )
        )
        total_balance += inv.current_value

    # Create map of investment values
    investment_values_map = {}
    investment_total_start = 0.0
    for inv in investments:
        investment_total_start += inv.current_value
        investment_values_map[inv.id] = values

    # Calculate total cash balance (excluding investments)
    total_cash_balance = total_balance - investment_total_start

    # Calculate total balance and cash balance values over months
    if has_projections:
        total_balance_values = [total_balance]
        total_cash_balance_values = [total_cash_balance]
        for month_idx in range(1, total_months):
            month_total = 0.0
            cash_month_total = 0.0
            if account_ids:
                for acc_id in account_ids:
                    result = await db.execute(
                        select(Projection)
                        .where(Projection.bank_account_id == acc_id)
                        .where(Projection.month_index == current_month + month_idx)
                    )
                    proj = result.scalar_one_or_none()
                    if proj:
                        month_total += proj.projected_balance
                        cash_month_total += proj.projected_balance
            for inv in investments:
                if month_idx < len(investment_values_map.get(inv.id, [])):
                    month_total += investment_values_map[inv.id][month_idx]
            total_balance_values.append(
                month_total if month_total > 0 else total_balance
            )
            total_cash_balance_values.append(
                cash_month_total if cash_month_total > 0 else total_cash_balance
            )
    elif account_balance_values:
        total_balance_values = account_balance_values
    else:
        total_balance_values = [total_balance] * total_months
        total_cash_balance_values = [total_cash_balance] * total_months

    # Fetch home loans with effective values
    home_loans = await get_home_loans_with_effective_values(db)

    # Initialize lists for home loan payment, liability, and OD depletion values
    home_loan_payment_values = []
    home_loan_liability_values = []
    od_depletion_values = []

    # Get current date
    current_date = datetime.now()
    # Initialize current OD balances
    current_od_balances = {}

    # Set initial OD balances for loans
    for loan in home_loans:
        if loan["od_balance"] > 0:
            current_od_balances[loan["id"]] = loan["od_balance"]

    # Initialize remaining principal for each loan
    remaining_principal = {}
    for loan in home_loans:
        remaining_principal[loan["id"]] = loan["current_principal_outstanding"]

    # Calculate values for each month
    for month_idx in range(total_months):
        # Calculate month date
        month_date = date(current_date.year, current_date.month, 1)
        month_date = month_date.replace(
            month=((current_date.month - 1 + month_idx) % 12) + 1
        )
        month_date = month_date.replace(
            year=current_date.year + (current_date.month - 1 + month_idx) // 12
        )

        # Initialize totals for the month
        total_payment = 0.0
        total_liability = 0.0
        total_od_impact = 0.0

        # Process each loan for the month
        for loan in home_loans:
            # Determine if pre-EMI or full EMI
            is_pre_emi = month_date < loan["emi_start_date"]
            payment = loan["pre_emi_total"] if is_pre_emi else loan["emi_total"]

            # Calculate OD usage
            od_used = 0.0
            if loan["od_account_id"] and loan["od_impact_type"] != "none":
                od_balance = current_od_balances.get(loan["id"], 0)
                od_used = min(payment, od_balance)
                if od_used > 0:
                    current_od_balances[loan["id"]] = od_balance - od_used

            # Add to total OD impact
            if loan["od_account_id"] and loan["od_impact_type"] != "none":
                total_od_impact += current_od_balances.get(loan["id"], 0)
            else:
                total_od_impact += 0

            # Add payment to total
            total_payment += payment

            # Calculate principal reduction if not pre-EMI
            if not is_pre_emi and payment > 0 and loan["interest_rate"] > 0:
                monthly_rate = loan["interest_rate"] / 100 / 12
                interest = remaining_principal.get(loan["id"], 0) * monthly_rate
                principal_paid = payment - interest
                if principal_paid > 0:
                    remaining_principal[loan["id"]] = max(
                        0, remaining_principal.get(loan["id"], 0) - principal_paid
                    )

            # Add remaining principal to total liability
            total_liability += remaining_principal.get(loan["id"], 0)

        # Append monthly totals
        home_loan_payment_values.append(total_payment)
        home_loan_liability_values.append(total_liability)
        od_depletion_values.append(total_od_impact)

    if graph_id == "assets_liabilities" and home_loans:
        od_account_ids = [
            loan["od_account_id"] for loan in home_loans if loan["od_account_id"]
        ]
        existing_account_ids_included = set()

        for acc in variables:
            existing_account_ids_included.add(acc.name)

        for loan in home_loans:
            if loan["od_account_id"] and loan["od_impact_type"] != "none":
                od_values = []
                for month_idx in range(total_months):
                    current_od = loan["od_balance"]
                    for m in range(month_idx):
                        payment = (
                            loan["pre_emi_total"]
                            if (
                                date(
                                    current_date.year
                                    + (current_date.month - 1 + m) // 12,
                                    ((current_date.month - 1 + m) % 12) + 1,
                                    1,
                                )
                                < loan["emi_start_date"]
                            )
                            else loan["emi_total"]
                        )
                        current_od = max(0, current_od - payment)
                    od_values.append(current_od)

                if loan["name"] not in existing_account_ids_included:
                    variables.append(
                        VariableData(
                            name=f"{loan['name']} OD",
                            color=SUMMARY_COLORS["Home Loan OD"],
                            values=od_values,
                        )
                    )

        liability_values = [max(0, lv) for lv in home_loan_liability_values]
        for var in variables:
            if var.name == "Liability":
                var.values = liability_values
                break
        else:
            variables.append(
                VariableData(
                    name="Liability",
                    color=SUMMARY_COLORS["Liability"],
                    values=liability_values,
                )
            )

    elif graph_id == "cashflow" and home_loans:
        od_account_names = {
            f"{loan['name']} OD"
            for loan in home_loans
            if loan["od_account_id"] and loan["od_impact_type"] != "none"
        }

        cash_in_hand_with_payments = []
        cash_expense_values = []
        for month_idx in range(total_months):
            non_od_cash = total_cash_balance_values[month_idx]
            for name in od_account_names:
                for var in variables:
                    if var.name == name:
                        non_od_cash -= var.values[month_idx]
                        break

            total_payment_needed = 0.0
            for loan in home_loans:
                total_payment_needed += home_loan_payment_values[month_idx]

            cash_after_payments = non_od_cash - total_payment_needed
            cash_in_hand_with_payments.append(cash_after_payments)
            cash_expense_values.append(total_payment_needed)

        for var in variables:
            if var.name == "Cash in Hand":
                var.values = cash_in_hand_with_payments
                break

        existing_payment = any(var.name == "Home Loan Payment" for var in variables)
        if not existing_payment:
            variables.append(
                VariableData(
                    name="Home Loan Payment",
                    color=SUMMARY_COLORS["Home Loan Payment"],
                    values=cash_expense_values,
                )
            )

    if graph_id == "assets_liabilities":
        asset_values = list(total_balance_values)
        for month_idx in range(total_months):
            for loan in home_loans:
                if loan["od_account_id"] and loan["od_impact_type"] != "none":
                    od_balance = loan["od_balance"]
                    for m in range(month_idx + 1):
                        payment = (
                            loan["pre_emi_total"]
                            if (
                                date(
                                    current_date.year
                                    + (current_date.month - 1 + m) // 12,
                                    ((current_date.month - 1 + m) % 12) + 1,
                                    1,
                                )
                                < loan["emi_start_date"]
                            )
                            else loan["emi_total"]
                        )
                        od_balance = max(0, od_balance - payment)
                    asset_values[month_idx] += od_balance

        asset_updated = False
        for var in variables:
            if var.name == "Asset":
                var.values = asset_values
                asset_updated = True
                break
        if not asset_updated:
            variables.append(
                VariableData(
                    name="Asset",
                    color=SUMMARY_COLORS["Asset"],
                    values=asset_values,
                )
            )

        liability_added = any(var.name == "Liability" for var in variables)
        if not liability_added:
            variables.append(
                VariableData(
                    name="Liability",
                    color=SUMMARY_COLORS["Liability"],
                    values=[0] * total_months,
                )
            )
    elif graph_id == "cashflow":
        if account_ids:
            result = await db.execute(
                select(CashFlow)
                .where(CashFlow.is_active == True)
                .where(CashFlow.bank_account_id.in_(account_ids))
            )
            all_cash_flows = result.scalars().all()
            income_cash_flows = [
                cf for cf in all_cash_flows if cf.stream_type == StreamType.income
            ]
            expense_cash_flows = [
                cf for cf in all_cash_flows if cf.stream_type == StreamType.expense
            ]

            income_values = []
            expense_values = []
            for month_idx in range(total_months):
                monthly_income = 0.0
                monthly_expense = 0.0

                for cf in income_cash_flows:
                    base_monthly = calculate_monthly_amount(
                        cf.amount, cf.frequency.value
                    )
                    appreciated = calculate_appreciated_amount(
                        base_monthly,
                        cf.appreciation_rate or 0,
                        cf.appreciation_frequency,
                        month_idx,
                    )
                    monthly_income += appreciated

                for cf in expense_cash_flows:
                    base_monthly = calculate_monthly_amount(
                        cf.amount, cf.frequency.value
                    )
                    appreciated = calculate_appreciated_amount(
                        base_monthly,
                        cf.appreciation_rate or 0,
                        cf.appreciation_frequency,
                        month_idx,
                    )
                    monthly_expense += appreciated

                income_values.append(monthly_income)
                expense_values.append(-monthly_expense)

            if income_cash_flows:
                income_added = any(var.name == "Income" for var in variables)
                if not income_added:
                    variables.append(
                        VariableData(
                            name="Income",
                            color="#16a34a",
                            values=income_values,
                        )
                    )

            if expense_cash_flows:
                expense_added = any(var.name == "Expenses" for var in variables)
                if not expense_added:
                    variables.append(
                        VariableData(
                            name="Expenses",
                            color=SUMMARY_COLORS["Expenses"],
                            values=expense_values,
                        )
                    )
        cashflow_updated = any(var.name == "Cash in Hand" for var in variables)
        if not cashflow_updated:
            variables.append(
                VariableData(
                    name="Cash in Hand",
                    color=SUMMARY_COLORS["Cash in Hand"],
                    values=total_balance_values,
                )
            )

    data = []
    for i in range(total_months):
        row = {"month": x_axis[i]}
        for var in variables:
            row[var.name] = var.values[i]
        data.append(row)

    return GraphData(
        id=config["id"],
        title=config["title"],
        x_axis=x_axis,
        data=data,
        variables=variables,
        prior_month_cutoff=0,
    )


@router.get("/graphs")
async def get_all_graphs():
    return {"graphs": list(GRAPH_CONFIGS.values())}


@router.get("/graph/{graph_id}")
async def get_graph(
    graph_id: str,
    account_ids: str = Query(default=""),
    projection_months: int = Query(default=12),
    db: AsyncSession = Depends(get_db),
):
    account_id_list = []
    if account_ids:
        account_id_list = [
            int(x.strip()) for x in account_ids.split(",") if x.strip().isdigit()
        ]

    return await populate_graph_data(graph_id, account_id_list, db, projection_months)


@router.post("/graph/{graph_id}/regenerate")
async def regenerate_graph(
    graph_id: str,
    account_ids: str = Query(default=""),
    projection_months: int = Query(default=12),
    db: AsyncSession = Depends(get_db),
):
    account_id_list = []
    if account_ids:
        account_id_list = [
            int(x.strip()) for x in account_ids.split(",") if x.strip().isdigit()
        ]

    return {
        "message": f"Graph '{graph_id}' data regenerated",
        "graph": await populate_graph_data(
            graph_id, account_id_list, db, projection_months
        ),
    }
