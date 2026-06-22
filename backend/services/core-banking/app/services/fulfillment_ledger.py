"""
Pre-built double-entry journal templates for the 4-party fulfillment cycle.

Flow: Worker funds order → Escrow splits to Distributor + Logistics + Platform →
      Delivery verified → Escrow released → Funds settled.

All amounts in kobo (₦1 = 100 kobo).
"""
from __future__ import annotations

from app.services.ledger_service import LedgerService

# Chart of Accounts codes
ESCROW_HOLDING = "1100"
INVESTOR_ESCROW_PAYABLE = "2300"
DISTRIBUTOR_AP = "2100"
LOGISTICS_AP = "2200"
PLATFORM_REVENUE = "4000"
PLATFORM_CASH = "1000"


class FulfillmentLedger:
    def __init__(self, ledger: LedgerService):
        self.ledger = ledger

    def record_order_funded(
        self, *, order_id: str, amount_kobo: int, investor_user_id: str,
    ):
        """
        Event A: 9-5 Worker deploys capital to a business cluster order.

        DR 1100 Escrow Holding        (amount_kobo)
        CR 2300 Investor Escrow Payable (amount_kobo)
        """
        return self.ledger.record_transaction(
            reference_type="order_funded",
            reference_id=order_id,
            description=f"Investor {investor_user_id} funded order {order_id}",
            idempotency_key=f"order_funded:{order_id}",
            created_by=investor_user_id,
            entries=[
                {"account_code": ESCROW_HOLDING, "debit_kobo": amount_kobo, "credit_kobo": 0, "memo": "Escrow lock"},
                {"account_code": INVESTOR_ESCROW_PAYABLE, "debit_kobo": 0, "credit_kobo": amount_kobo, "memo": "Investor deposit"},
            ],
        )

    def record_order_allocated(
        self,
        *,
        order_id: str,
        goods_value_kobo: int,
        logistics_fee_kobo: int,
        platform_commission_kobo: int,
    ):
        """
        Event B: Platform allocates escrow to distributor, logistics, and commission.

        Total must equal goods_value + logistics_fee + platform_commission.

        DR 2100 Distributor AP          (goods_value_kobo)
        DR 2200 Logistics Fees Payable  (logistics_fee_kobo)
        DR 4000 Platform Revenue        (platform_commission_kobo)
        CR 1100 Escrow Holding          (total)
        """
        total = goods_value_kobo + logistics_fee_kobo + platform_commission_kobo
        return self.ledger.record_transaction(
            reference_type="order_allocated",
            reference_id=order_id,
            description=f"Order {order_id} allocated: goods={goods_value_kobo}, logistics={logistics_fee_kobo}, commission={platform_commission_kobo}",
            idempotency_key=f"order_allocated:{order_id}",
            created_by="system",
            entries=[
                {"account_code": DISTRIBUTOR_AP, "debit_kobo": goods_value_kobo, "credit_kobo": 0, "memo": "Goods allocation"},
                {"account_code": LOGISTICS_AP, "debit_kobo": logistics_fee_kobo, "credit_kobo": 0, "memo": "Logistics allocation"},
                {"account_code": PLATFORM_REVENUE, "debit_kobo": platform_commission_kobo, "credit_kobo": 0, "memo": "Platform spread"},
                {"account_code": ESCROW_HOLDING, "debit_kobo": 0, "credit_kobo": total, "memo": "Escrow release to allocations"},
            ],
        )

    def record_distributor_paid(
        self, *, order_id: str, amount_kobo: int,
    ):
        """
        Event C (part 1): Distributor receives payout after delivery verification.

        DR 1000 Platform Cash Pool     (amount_kobo)  [cash leaves platform]
        CR 2100 Distributor AP         (amount_kobo)  [liability settled]
        """
        return self.ledger.record_transaction(
            reference_type="distributor_payout",
            reference_id=order_id,
            description=f"Distributor payout for order {order_id}",
            idempotency_key=f"distributor_payout:{order_id}",
            created_by="system",
            entries=[
                {"account_code": PLATFORM_CASH, "debit_kobo": amount_kobo, "credit_kobo": 0, "memo": "Cash disbursement"},
                {"account_code": DISTRIBUTOR_AP, "debit_kobo": 0, "credit_kobo": amount_kobo, "memo": "AP settled"},
            ],
        )

    def record_logistics_paid(
        self, *, order_id: str, amount_kobo: int,
    ):
        """
        Event C (part 2): Logistics partner receives payout after delivery verification.

        DR 1000 Platform Cash Pool     (amount_kobo)
        CR 2200 Logistics Fees Payable (amount_kobo)
        """
        return self.ledger.record_transaction(
            reference_type="logistics_payout",
            reference_id=order_id,
            description=f"Logistics payout for order {order_id}",
            idempotency_key=f"logistics_payout:{order_id}",
            created_by="system",
            entries=[
                {"account_code": PLATFORM_CASH, "debit_kobo": amount_kobo, "credit_kobo": 0, "memo": "Cash disbursement"},
                {"account_code": LOGISTICS_AP, "debit_kobo": 0, "credit_kobo": amount_kobo, "memo": "Logistics fee settled"},
            ],
        )

    def record_order_settled(
        self, *, order_id: str, investor_return_kobo: int,
    ):
        """
        Final settlement: investor's escrow obligation is released.

        DR 2300 Investor Escrow Payable (investor_return_kobo)
        CR 1000 Platform Cash Pool      (investor_return_kobo)
        """
        return self.ledger.record_transaction(
            reference_type="order_settled",
            reference_id=order_id,
            description=f"Order {order_id} fully settled, investor escrow released",
            idempotency_key=f"order_settled:{order_id}",
            created_by="system",
            entries=[
                {"account_code": INVESTOR_ESCROW_PAYABLE, "debit_kobo": investor_return_kobo, "credit_kobo": 0, "memo": "Escrow obligation released"},
                {"account_code": PLATFORM_CASH, "debit_kobo": 0, "credit_kobo": investor_return_kobo, "memo": "Investor return"},
            ],
        )
