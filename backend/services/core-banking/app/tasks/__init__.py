"""
Batch processing tasks for the core banking service.
Contains scheduled jobs for metrics calculation and data aggregation.
"""

from .daily_inventory_rollup import run_daily_inventory_rollup
from .daily_loan_rollup import run_daily_loan_rollup
from .daily_sales_rollup import run_daily_sales_rollup

__all__ = [
    'run_daily_sales_rollup',
    'run_daily_inventory_rollup',
    'run_daily_loan_rollup',
]
