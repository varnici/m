import { createNativeStackNavigator } from '@react-navigation/native-stack';
import WelcomeScreen from '@/screens/auth/WelcomeScreen';
import LoginScreen from '@/screens/auth/LoginScreen';
import RoleSelectionScreen from '@/screens/auth/RoleSelectionScreen';
import BVNVerificationScreen from '@/screens/auth/BVNVerificationScreen';
import PINSetupScreen from '@/screens/auth/PINSetupScreen';
import BiometricSetupScreen from '@/screens/auth/BiometricSetupScreen';
import SalesDashboardScreen from '@/screens/sales/SalesDashboardScreen';
import LoanDashboardScreen from '@/screens/loans/LoanDashboardScreen';
import CreditDashboardScreen from '@/screens/credit/CreditDashboardScreen';
import CreditBreakdownScreen from '@/screens/credit/CreditBreakdownScreen';
import WalletScreen from '@/screens/wallet/WalletScreen';
import MoreScreen from '@/screens/more/MoreScreen';
import DashboardScreen from '@/screens/DashboardScreen';
// New Screens
import ApplyLoanScreen from '@/screens/loans/ApplyLoanScreen';
import ActiveLoanScreen from '@/screens/loans/ActiveLoanScreen';
import ContractViewerScreen from '@/screens/loans/ContractViewerScreen';
import RecordSaleScreen from '@/screens/sales/RecordSaleScreen';
import SalesHistoryScreen from '@/screens/sales/SalesHistoryScreen';
import SalesVelocityScreen from '@/screens/sales/SalesVelocityScreen';
import RepaymentScreen from '@/screens/wallet/RepaymentScreen';

// Phase 2 Expansion - Inventory
import InventoryDashboardScreen from '@/screens/inventory/InventoryDashboardScreen';
import StockLodgerScreen from '@/screens/inventory/StockLodgerScreen';
import VoiceStockScreen from '@/screens/inventory/VoiceStockScreen';
import ScanShelveScreen from '@/screens/inventory/ScanShelveScreen';

// Phase 2 Expansion - Insurance
import InsuranceSummaryScreen from '@/screens/insurance/InsuranceSummaryScreen';
import FileClaimScreen from '@/screens/insurance/FileClaimScreen';
import ClaimHistoryScreen from '@/screens/insurance/ClaimHistoryScreen';

// Phase 2 Expansion - Pools
import PoolListScreen from '@/screens/pools/PoolListScreen';
import PoolDetailScreen from '@/screens/pools/PoolDetailScreen';
import ClusterPickupScreen from '@/screens/pools/ClusterPickupScreen';

// Phase 2 Expansion - Wallet
import WithdrawalScreen from '@/screens/wallet/WithdrawalScreen';
import SavingsGoalsScreen from '@/screens/wallet/SavingsGoalsScreen';


const Stack = createNativeStackNavigator();

const RootNavigator = () => {
  return (
    <Stack.Navigator
        initialRouteName="Welcome"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#F8F9FA' },
        }}
      >
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
        <Stack.Screen name="BVNVerification" component={BVNVerificationScreen} />
        <Stack.Screen name="PINSetup" component={PINSetupScreen} />
        <Stack.Screen name="BiometricSetup" component={BiometricSetupScreen} />
        <Stack.Screen name="SalesDashboard" component={SalesDashboardScreen} />
        <Stack.Screen name="LoanDashboard" component={LoanDashboardScreen} />
        <Stack.Screen name="CreditDashboard" component={CreditDashboardScreen} />
        <Stack.Screen name="CreditBreakdown" component={CreditBreakdownScreen} />
        <Stack.Screen name="Wallet" component={WalletScreen} />
        <Stack.Screen name="More" component={MoreScreen} />
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        
        {/* Sub-screens */}
        <Stack.Screen name="ApplyLoan" component={ApplyLoanScreen} />
        <Stack.Screen name="ActiveLoan" component={ActiveLoanScreen} />
        <Stack.Screen name="ContractViewer" component={ContractViewerScreen} />
        <Stack.Screen name="RecordSale" component={RecordSaleScreen} />
        <Stack.Screen name="SalesHistory" component={SalesHistoryScreen} />
        <Stack.Screen name="SalesVelocity" component={SalesVelocityScreen} />
        <Stack.Screen name="Repayment" component={RepaymentScreen} />

        {/* Inventory Module */}
        <Stack.Screen name="InventoryDashboard" component={InventoryDashboardScreen} />
        <Stack.Screen name="StockLodger" component={StockLodgerScreen} />
        <Stack.Screen name="VoiceStock" component={VoiceStockScreen} />
        <Stack.Screen name="ScanShelve" component={ScanShelveScreen} />

        {/* Insurance Module */}
        <Stack.Screen name="InsuranceSummary" component={InsuranceSummaryScreen} />
        <Stack.Screen name="FileClaim" component={FileClaimScreen} />
        <Stack.Screen name="ClaimHistory" component={ClaimHistoryScreen} />

        {/* Pools Module */}
        <Stack.Screen name="PoolList" component={PoolListScreen} />
        <Stack.Screen name="PoolDetail" component={PoolDetailScreen} />
        <Stack.Screen name="ClusterPickup" component={ClusterPickupScreen} />

        {/* Advanced Wallet */}
        <Stack.Screen name="Withdrawal" component={WithdrawalScreen} />
        <Stack.Screen name="SavingsGoals" component={SavingsGoalsScreen} />
      </Stack.Navigator>
  );
};

export default RootNavigator;
