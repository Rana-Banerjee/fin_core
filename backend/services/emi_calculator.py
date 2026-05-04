from datetime import date
from typing import Any
from decimal import Decimal, ROUND_HALF_UP


def _round_half_up(value: float) -> float:
    return float(Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def get_past_bank_installments_sum(installments: list[dict[str, Any]]) -> float:
    today = date.today()
    total = 0.0
    for inst in installments:
        inst_date = inst.get("disbursement_date")
        if isinstance(inst_date, str):
            inst_date = date.fromisoformat(inst_date)
        if inst.get("disbursed_by") == "bank" and inst_date and inst_date <= today:
            total += inst.get("amount", 0)
    return _round_half_up(total)


def get_effective_principal(
    loan: dict[str, Any],
    installments: list[dict[str, Any]],
    od_balance: float | None,
    is_pre_emi: bool,
) -> tuple[float, float]:
    if is_pre_emi:
        principal_disbursed = get_past_bank_installments_sum(installments)
    else:
        principal_disbursed = loan.get("current_principal_outstanding", 0)

    od_deduction = od_balance if od_balance else 0.0
    effective_principal = max(0, principal_disbursed - od_deduction)

    return _round_half_up(effective_principal), _round_half_up(od_deduction)


def calculate_pre_emi(
    loan: dict[str, Any],
    installments: list[dict[str, Any]],
    od_balance: float | None,
) -> dict[str, float]:
    effective_principal, od_deduction = get_effective_principal(
        loan, installments, od_balance, is_pre_emi=True
    )

    if effective_principal <= 0:
        return {
            "principal": 0,
            "interest": 0,
            "total": 0,
            "effective_principal": 0,
            "od_deduction": od_deduction,
        }

    interest_rate = loan.get("interest_rate", 0)
    monthly_rate = interest_rate / 100 / 12

    if not installments:
        return {
            "principal": effective_principal,
            "interest": 0,
            "total": effective_principal,
            "effective_principal": effective_principal,
            "od_deduction": od_deduction,
        }

    first_bank_disbursement_date = None
    for inst in sorted(installments, key=lambda x: x.get("disbursement_date", "")):
        if inst.get("disbursed_by") == "bank":
            inst_date = inst.get("disbursement_date")
            if isinstance(inst_date, str):
                first_bank_disbursement_date = date.fromisoformat(inst_date)
            else:
                first_bank_disbursement_date = inst_date
            break

    if not first_bank_disbursement_date:
        return {
            "principal": effective_principal,
            "interest": 0,
            "total": effective_principal,
            "effective_principal": effective_principal,
            "od_deduction": od_deduction,
        }

    # today = date.today()
    # months_elapsed = (today.year - first_bank_disbursement_date.year) * 12 + (
    #     today.month - first_bank_disbursement_date.month
    # )
    # months_elapsed = max(0, months_elapsed)

    interest = effective_principal * monthly_rate #* months_elapsed
    interest = _round_half_up(interest)

    total = interest

    return {
        "principal": effective_principal,
        "interest": interest,
        "total": total,
        "effective_principal": effective_principal,
        "od_deduction": od_deduction,
    }


def calculate_emi(
    loan: dict[str, Any],
    od_balance: float | None,
) -> dict[str, float]:
    effective_principal, od_deduction = get_effective_principal(
        loan, [], od_balance, is_pre_emi=False
    )

    if effective_principal <= 0:
        return {
            "principal": 0,
            "interest": 0,
            "total": 0,
            "effective_principal": 0,
            "od_deduction": od_deduction,
        }

    interest_rate = loan.get("interest_rate", 0)
    tenure_months = loan.get("tenure_months", 0)

    if interest_rate == 0 or tenure_months == 0:
        return {
            "principal": effective_principal,
            "interest": 0,
            "total": effective_principal,
            "effective_principal": effective_principal,
            "od_deduction": od_deduction,
        }

    monthly_rate = interest_rate / 100 / 12

    power_factor = (1 + monthly_rate) ** tenure_months
    emi = effective_principal * monthly_rate * power_factor / (power_factor - 1)

    total_emi = emi * tenure_months
    total_interest = total_emi - effective_principal

    emi_principal = emi * (
        1 - monthly_rate * ((power_factor - 1) / (power_factor * monthly_rate))
    )
    emi_interest = emi - emi_principal

    return {
        "principal": _round_half_up(emi_principal),
        "interest": _round_half_up(emi_interest),
        "total": _round_half_up(emi),
        "effective_principal": effective_principal,
        "od_deduction": od_deduction,
    }


def calculate_impacted_tenure(
    loan: dict[str, Any],
    od_balance: float | None,
) -> int | None:
    od_impact_type = loan.get("od_impact_type", "none")

    if od_impact_type != "tenure":
        return None

    if not od_balance or od_balance <= 0:
        return loan.get("tenure_months", 0)

    effective_principal, _ = get_effective_principal(
        loan, [], od_balance, is_pre_emi=False
    )

    if effective_principal <= 0:
        return loan.get("tenure_months", 0)

    interest_rate = loan.get("interest_rate", 0)
    if interest_rate == 0:
        return loan.get("tenure_months", 0)

    monthly_rate = interest_rate / 100 / 12
    original_tenure = loan.get("tenure_months", 0)

    original_emi = (
        effective_principal
        * monthly_rate
        * (1 + monthly_rate) ** original_tenure
        / ((1 + monthly_rate) ** original_tenure - 1)
    )

    if original_emi <= 0:
        return original_tenure

    new_tenure = 0
    balance = effective_principal
    while balance > 0:
        interest = balance * monthly_rate
        principal_paid = original_emi - interest
        balance -= principal_paid
        new_tenure += 1
        if new_tenure > 600:
            break

    return new_tenure
