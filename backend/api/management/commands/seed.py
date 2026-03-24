from django.core.management.base import BaseCommand
from django.utils import timezone
from api.models import (
    User, Role, Wallet, Transaction, TransactionType, TransactionStatus,
    SavingsGoal, LoanPool, LoanApplication, LoanStatus, ActiveLoan,
    InventoryItem, SalesLog, InsurancePolicy
)
import random
from datetime import timedelta

class Command(BaseCommand):
    help = 'Seeds the database with realistic Nigerian mock data for VentureRoot'

    def handle(self, *args, **kwargs):
        self.stdout.write('Clearing existing data...')
        User.objects.all().delete()
        LoanPool.objects.all().delete()
        
        self.stdout.write('Seeding mock users...')
        users_data = [
            {
                'username': 'tobi.adebayo',
                'name': 'Tobi Adebayo',
                'phone': '+2348000000001',
                'role': Role.BUSINESS_OWNER,
                'email': 'tobi@example.com',
                'credit_score': 720
            },
            {
                'username': 'chioma.nwachukwu',
                'name': 'Chioma Nwachukwu',
                'phone': '+2348000000002',
                'role': Role.BUSINESS_OWNER,
                'email': 'chioma@example.com',
                'credit_score': 680
            },
            {
                'username': 'emeka.okafor',
                'name': 'Emeka Okafor',
                'phone': '+2348000000003',
                'role': Role.INDIVIDUAL,
                'email': 'emeka@example.com',
                'credit_score': 550
            }
        ]
        
        created_users = []
        for ud in users_data:
            first, last = ud['name'].split()
            user = User.objects.create_user(
                username=ud['username'],
                email=ud['email'],
                password='password123',
                first_name=first,
                last_name=last,
                phone=ud['phone'],
                role=ud['role'],
                credit_score=ud['credit_score']
            )
            created_users.append(user)
            
            # Create a wallet for each user
            Wallet.objects.create(
                user=user,
                balance=random.randint(5000000, 25000000) # 50,000 to 250,000 Naira
            )

        # Seeding Inventory Items
        self.stdout.write('Seeding inventory items...')
        inventory_items = [
            {'name': 'Dangote Flour 50kg', 'stock': 120, 'wholesale': 1800000, 'retail': 2200000},
            {'name': 'Peak Milk Refill', 'stock': 350, 'wholesale': 400000, 'retail': 450000},
            {'name': 'Golden Penny Pasta', 'stock': 200, 'wholesale': 650000, 'retail': 750000},
            {'name': 'Coca-Cola Crate', 'stock': 45, 'wholesale': 350000, 'retail': 400000},
        ]
        
        business_users = [u for u in created_users if u.role == Role.BUSINESS_OWNER]
        for user in business_users:
            for item in inventory_items:
                InventoryItem.objects.create(
                    user=user,
                    name=item['name'],
                    stock_count=random.randint(10, item['stock']),
                    wholesale_price=item['wholesale'],
                    retail_price=item['retail']
                )

            # Create some sales logs to affect sales velocity score
            for i in range(5):
                SalesLog.objects.create(
                    user=user,
                    total_amount=random.randint(1000000, 15000000) # 10k to 150k Naira in kobo
                )

        # Seeding Loan Pools
        self.stdout.write('Seeding Loan Pools...')
        pool = LoanPool.objects.create(
            name='Lagos Market Traders Fund',
            total_funds=5000000000, # 50 million Naira
            available_funds=3500000000, # 35 million Naira
            interest_rate=450 # 4.5%
        )

        # Seeding Active Loans
        self.stdout.write('Seeding Loans & Applications...')
        for user in business_users:
            application = LoanApplication.objects.create(
                user=user,
                pool=pool,
                requested_amount=random.choice([50000000, 100000000]), # 500k to 1m Naira
                status=LoanStatus.APPROVED
            )
            
            ActiveLoan.objects.create(
                application=application,
                principal_amount=application.requested_amount,
                outstanding_balance=int(application.requested_amount * 0.8), # paid 20%
                next_due_date=timezone.now() + timedelta(days=14)
            )

        self.stdout.write(self.style.SUCCESS('Successfully seeded the VentureRoot database!'))
