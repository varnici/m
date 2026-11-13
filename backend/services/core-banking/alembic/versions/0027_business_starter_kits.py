"""add business_starter_kits catalog + savings_goals.starter_kit_id

New feature for nine_to_five (worker) users: pay off a curated "business
starter kit" — a defined bundle of items needed to open a specific small
business (provision store, salon, etc.), with an all-in cost — over a
chosen period, instead of needing the full amount at once. This is a
pathway from "salary earner" to "business owner."

Deliberately reuses the existing, already-real Budget Best savings engine
(SavingsGoal + SavingsService.record_transaction, which moves real wallet
ledger money, plus the live daily auto-sweep cron in savings_tasks.py)
rather than building a second parallel money-movement system next to
worker_module.py's savings_plans table (whose own automated_rule field is
configured but has no consumer/cron — a known, separate gap). A starter-kit
plan is just a SavingsGoal with starter_kit_id set.

Kits are hand-seeded here, the same pattern business_clusters already uses
— there's no admin CRUD UI for either yet.

Revision ID: 0027
Revises: 0026
Create Date: 2026-08-17
"""
import uuid

from alembic import op
import sqlalchemy as sa

revision = "0027"
down_revision = "0026"
branch_labels = None
depends_on = None


def _has_table(name: str) -> bool:
    conn = op.get_bind()
    return sa.inspect(conn).has_table(name)


def _has_column(table: str, column: str) -> bool:
    conn = op.get_bind()
    return column in [c["name"] for c in sa.inspect(conn).get_columns(table)]


def _kit(slug, name, description, category, icon, duration_months, items):
    total = sum(i["estimated_cost_kobo"] for i in items)
    return {
        "id": str(uuid.uuid4()),
        "slug": slug,
        "name": name,
        "description": description,
        "business_category": category,
        "icon_name": icon,
        "total_cost_kobo": total,
        "suggested_duration_months": duration_months,
        "items": items,
    }


_KITS = [
    _kit(
        "provision-store", "Provision Store Starter Kit",
        "Everything you need to stock and open a neighborhood provision store.",
        "retail", "Store", 6,
        [
            {"name": "Shelving & display racks", "quantity": 1, "estimated_cost_kobo": 8_000_000},
            {"name": "Opening stock (rice, oil, soap, detergent, canned goods)", "quantity": 1, "estimated_cost_kobo": 18_000_000},
            {"name": "Digital weighing scale", "quantity": 1, "estimated_cost_kobo": 1_500_000},
            {"name": "POS device & signage", "quantity": 1, "estimated_cost_kobo": 2_000_000},
            {"name": "Security padlocks & grille", "quantity": 1, "estimated_cost_kobo": 2_500_000},
            {"name": "Market stall canopy/umbrella", "quantity": 1, "estimated_cost_kobo": 3_000_000},
        ],
    ),
    _kit(
        "salon-beauty", "Salon & Beauty Starter Kit",
        "Set up a hair and beauty salon with the core equipment and opening stock.",
        "retail", "Scissors", 5,
        [
            {"name": "Styling chair & mirror station", "quantity": 1, "estimated_cost_kobo": 7_000_000},
            {"name": "Hair dryer & steamer", "quantity": 1, "estimated_cost_kobo": 4_500_000},
            {"name": "Shampoo basin", "quantity": 1, "estimated_cost_kobo": 3_500_000},
            {"name": "Opening product stock (relaxers, dyes, extensions)", "quantity": 1, "estimated_cost_kobo": 6_000_000},
            {"name": "Small generator/inverter", "quantity": 1, "estimated_cost_kobo": 5_000_000},
            {"name": "Signage & interior finishing", "quantity": 1, "estimated_cost_kobo": 2_000_000},
        ],
    ),
    _kit(
        "phone-repair", "Phone Repair & Accessories Starter Kit",
        "Launch a phone repair and accessories stand with tools and starter stock.",
        "retail", "Smartphone", 4,
        [
            {"name": "Repair toolkit & soldering station", "quantity": 1, "estimated_cost_kobo": 6_000_000},
            {"name": "Diagnostic/flashing box", "quantity": 1, "estimated_cost_kobo": 4_500_000},
            {"name": "Display case & counter", "quantity": 1, "estimated_cost_kobo": 3_000_000},
            {"name": "Accessories stock (cases, chargers, screen protectors)", "quantity": 1, "estimated_cost_kobo": 5_500_000},
            {"name": "Replacement screens & parts stock", "quantity": 1, "estimated_cost_kobo": 3_000_000},
        ],
    ),
    _kit(
        "tailoring-fashion", "Tailoring & Fashion Starter Kit",
        "Set up a tailoring shop with an industrial machine and opening materials.",
        "retail", "Shirt", 6,
        [
            {"name": "Industrial sewing machine", "quantity": 1, "estimated_cost_kobo": 12_000_000},
            {"name": "Overlock/knitting machine", "quantity": 1, "estimated_cost_kobo": 7_000_000},
            {"name": "Cutting table & mannequins", "quantity": 1, "estimated_cost_kobo": 4_000_000},
            {"name": "Fabric & thread starter stock", "quantity": 1, "estimated_cost_kobo": 5_000_000},
            {"name": "Iron & pressing table", "quantity": 1, "estimated_cost_kobo": 2_000_000},
        ],
    ),
    _kit(
        "food-vendor", "Food Vendor Starter Kit",
        "Everything needed to start a small chops / food vending business.",
        "retail", "UtensilsCrossed", 5,
        [
            {"name": "Gas cooker & cylinder", "quantity": 1, "estimated_cost_kobo": 4_500_000},
            {"name": "Deep fryer & cooking utensils", "quantity": 1, "estimated_cost_kobo": 4_000_000},
            {"name": "Cooler/display cabinet", "quantity": 1, "estimated_cost_kobo": 5_000_000},
            {"name": "Food packaging & branding", "quantity": 1, "estimated_cost_kobo": 2_500_000},
            {"name": "Opening ingredient stock", "quantity": 1, "estimated_cost_kobo": 6_000_000},
            {"name": "Food cart/stand", "quantity": 1, "estimated_cost_kobo": 3_000_000},
        ],
    ),
    _kit(
        "laundry-drycleaning", "Laundry & Dry-Cleaning Starter Kit",
        "Open a laundry and dry-cleaning outlet with core machines and fit-out.",
        "retail", "Droplets", 8,
        [
            {"name": "Washing machine", "quantity": 1, "estimated_cost_kobo": 18_000_000},
            {"name": "Industrial iron/steam press", "quantity": 1, "estimated_cost_kobo": 9_000_000},
            {"name": "Generator/inverter", "quantity": 1, "estimated_cost_kobo": 7_000_000},
            {"name": "Detergents & starter supplies", "quantity": 1, "estimated_cost_kobo": 4_000_000},
            {"name": "Shelving & garment racks", "quantity": 1, "estimated_cost_kobo": 3_000_000},
            {"name": "Signage & shop fit-out", "quantity": 1, "estimated_cost_kobo": 4_000_000},
        ],
    ),
]


def upgrade() -> None:
    if not _has_table("business_starter_kits"):
        op.create_table(
            "business_starter_kits",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("slug", sa.String(), nullable=False, unique=True),
            sa.Column("name", sa.String(), nullable=False),
            sa.Column("description", sa.Text(), nullable=False),
            sa.Column("business_category", sa.String(), nullable=False),
            sa.Column("icon_name", sa.String(), nullable=False, server_default="Store"),
            sa.Column("total_cost_kobo", sa.BigInteger(), nullable=False),
            sa.Column("suggested_duration_months", sa.Integer(), nullable=False, server_default="6"),
            sa.Column("items", sa.JSON(), nullable=False),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("display_order", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.CheckConstraint("total_cost_kobo > 0", name="ck_business_starter_kits_cost_positive"),
        )
        op.create_index("ix_business_starter_kits_slug", "business_starter_kits", ["slug"])

        conn = op.get_bind()
        table = sa.table(
            "business_starter_kits",
            sa.column("id", sa.String()),
            sa.column("slug", sa.String()),
            sa.column("name", sa.String()),
            sa.column("description", sa.Text()),
            sa.column("business_category", sa.String()),
            sa.column("icon_name", sa.String()),
            sa.column("total_cost_kobo", sa.BigInteger()),
            sa.column("suggested_duration_months", sa.Integer()),
            sa.column("items", sa.JSON()),
            sa.column("display_order", sa.Integer()),
        )
        conn.execute(
            table.insert(),
            [
                {
                    "id": k["id"],
                    "slug": k["slug"],
                    "name": k["name"],
                    "description": k["description"],
                    "business_category": k["business_category"],
                    "icon_name": k["icon_name"],
                    "total_cost_kobo": k["total_cost_kobo"],
                    "suggested_duration_months": k["suggested_duration_months"],
                    "items": k["items"],
                    "display_order": idx,
                }
                for idx, k in enumerate(_KITS)
            ],
        )

    if _has_table("savings_goals") and not _has_column("savings_goals", "starter_kit_id"):
        op.add_column(
            "savings_goals",
            sa.Column("starter_kit_id", sa.String(), sa.ForeignKey("business_starter_kits.id", ondelete="SET NULL"), nullable=True),
        )
        op.create_index("ix_savings_goals_starter_kit_id", "savings_goals", ["starter_kit_id"])


def downgrade() -> None:
    if _has_table("savings_goals") and _has_column("savings_goals", "starter_kit_id"):
        op.drop_index("ix_savings_goals_starter_kit_id", table_name="savings_goals")
        op.drop_column("savings_goals", "starter_kit_id")

    if _has_table("business_starter_kits"):
        op.drop_index("ix_business_starter_kits_slug", table_name="business_starter_kits")
        op.drop_table("business_starter_kits")
