import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser

class Role(models.TextChoices):
    BUSINESS_OWNER = 'BUSINESS_OWNER', 'Business Owner'
    INDIVIDUAL = 'INDIVIDUAL', 'Individual'

class KycStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending'
    APPROVED = 'APPROVED', 'Approved'
    REJECTED = 'REJECTED', 'Rejected'

class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.INDIVIDUAL)
    phone = models.CharField(max_length=20, unique=True, null=True, blank=True)
    
    # Auth & Security
    pin_hash = models.CharField(max_length=255, null=True, blank=True)
    biometric_enabled = models.BooleanField(default=False)
    
    # KYC
    kyc_status = models.CharField(max_length=20, choices=KycStatus.choices, default=KycStatus.PENDING)
    bvn = models.CharField(max_length=11, unique=True, null=True, blank=True)
    bvn_verified = models.BooleanField(default=False)
    
    # Credit Intelligence
    credit_score = models.IntegerField(default=0)

class Wallet(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='wallet')
    balance = models.IntegerField(default=0) # kobo
    currency = models.CharField(max_length=3, default='NGN')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class TransactionType(models.TextChoices):
    DEPOSIT = 'DEPOSIT', 'Deposit'
    WITHDRAWAL = 'WITHDRAWAL', 'Withdrawal'
    TRANSFER = 'TRANSFER', 'Transfer'
    LOAN_DISBURSEMENT = 'LOAN_DISBURSEMENT', 'Loan Disbursement'
    LOAN_REPAYMENT = 'LOAN_REPAYMENT', 'Loan Repayment'

class TransactionStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending'
    COMPLETED = 'COMPLETED', 'Completed'
    FAILED = 'FAILED', 'Failed'

class Transaction(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    wallet = models.ForeignKey(Wallet, on_delete=models.CASCADE, related_name='transactions')
    transaction_type = models.CharField(max_length=30, choices=TransactionType.choices)
    amount = models.IntegerField() # kobo
    status = models.CharField(max_length=20, choices=TransactionStatus.choices, default=TransactionStatus.PENDING)
    reference = models.CharField(max_length=100, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class SavingsGoal(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    wallet = models.ForeignKey(Wallet, on_delete=models.CASCADE, related_name='savings_goals')
    name = models.CharField(max_length=255)
    target_amount = models.IntegerField() # kobo
    current_amount = models.IntegerField(default=0) # kobo
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class LoanPool(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    total_funds = models.IntegerField() # kobo
    available_funds = models.IntegerField() # kobo
    interest_rate = models.IntegerField() # basis points
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class LoanStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending'
    APPROVED = 'APPROVED', 'Approved'
    REJECTED = 'REJECTED', 'Rejected'
    ACTIVE = 'ACTIVE', 'Active'
    PAID = 'PAID', 'Paid'
    DEFAULTED = 'DEFAULTED', 'Defaulted'

class LoanApplication(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='loan_applications')
    pool = models.ForeignKey(LoanPool, on_delete=models.CASCADE, related_name='applications')
    requested_amount = models.IntegerField() # kobo
    status = models.CharField(max_length=20, choices=LoanStatus.choices, default=LoanStatus.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class ActiveLoan(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    application = models.OneToOneField(LoanApplication, on_delete=models.CASCADE, related_name='active_loan')
    principal_amount = models.IntegerField() # kobo
    outstanding_balance = models.IntegerField() # kobo
    next_due_date = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class InventoryItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='inventory_items')
    name = models.CharField(max_length=255)
    stock_count = models.IntegerField(default=0)
    wholesale_price = models.IntegerField() # kobo
    retail_price = models.IntegerField() # kobo
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class SalesLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sales_logs')
    total_amount = models.IntegerField() # kobo
    date = models.DateTimeField(auto_now_add=True)
    created_at = models.DateTimeField(auto_now_add=True)

class InsurancePolicy(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='insurance_policies')
    policy_type = models.CharField(max_length=255)
    premium = models.IntegerField() # kobo
    coverage = models.IntegerField() # kobo
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
