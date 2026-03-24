// Centralized Mock Data for VentureRoot
// Simulates the backend state before the real API is integrated

export const UserProfile = {
  id: 'usr_12345',
  name: 'Chidi Okonkwo',
  businessName: 'Chidi Provisions Shop',
  tier: 'Gold',
  creditScore: 742,
  bvnVerified: true,
  avatar: 'https://i.pravatar.cc/150?u=chidi'
};

export const WalletData = {
  balance: 2450000, // in Naira
  availableCredit: 250000,
  creditInUse: 130000,
  recentTransactions: [
    { id: 'tx_1', type: 'Credit', amount: 45000, title: 'Sales Deposit', date: 'Today, 10:42 AM', status: 'Completed' },
    { id: 'tx_2', type: 'Debit', amount: 15000, title: 'Loan Repayment', date: 'Yesterday', status: 'Completed' },
    { id: 'tx_3', type: 'Debit', amount: 120000, title: 'Supplier Payment: Dangote', date: 'Oct 24', status: 'Completed' },
  ]
};

export const InventoryData = {
  totalItems: 842,
  totalValue: 3450000,
  lowStockItems: 3,
  items: [
    { id: 'inv_1', name: 'Dangote Flour 50kg', sku: 'DF-50', quantity: 30, unitPrice: 45000, category: 'Staples', lowStock: false },
    { id: 'inv_2', name: 'Peak Milk 40-pack', sku: 'PM-40', quantity: 5, unitPrice: 35000, category: 'Dairy', lowStock: true },
    { id: 'inv_3', name: 'Indomie Super Pack (Carton)', sku: 'IND-SP', quantity: 2, unitPrice: 12500, category: 'Staples', lowStock: true },
    { id: 'inv_4', name: 'Golden Penny Sugar 50kg', sku: 'GPS-50', quantity: 15, unitPrice: 52000, category: 'Staples', lowStock: false },
  ]
};

export const ActiveLoansData = [
  {
    id: 'loan_1',
    icon: '🌽',
    title: 'Dangote Flour 50kg',
    details: '50 units • ₦120,000',
    status: 'Active',
    repaidPercent: 60,
    nextDate: 'Dec 25',
    amount: 120000,
    insured: true
  },
  {
    id: 'loan_2',
    icon: '🥛',
    title: 'Peak Milk 40-pack',
    details: '20 units • ₦35,000',
    status: 'Active',
    repaidPercent: 20,
    nextDate: 'Dec 28',
    amount: 35000,
    insured: true
  },
];

export const CreditFactors = [
  { id: 'sales', label: 'Sales', weight: 35, title: 'Sales Velocity', status: 'Strong' },
  { id: 'repayment', label: 'Repayment', weight: 30, title: 'Repayment Consistency', status: 'Perfect' },
  { id: 'category', label: 'Category', weight: 20, title: 'Category Risk', status: 'Moderate' },
  { id: 'income', label: 'Income', weight: 15, title: 'Income Stability', status: 'Verified' }
];

export const BusinessMetrics = {
  dailySales: 125000,
  weeklySales: 850000,
  monthlySales: 3400000,
  salesStreakDays: 14,
  aiInsights: [
    { emoji: '⚠️', text: "Peak Milk 40-pack is running low. Usually sells out by Friday." },
    { emoji: '📅', text: "You have a loan repayment of ₦18,000 due in 2 days." }
  ]
};
