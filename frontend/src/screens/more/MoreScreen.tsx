import React from 'react';
import { Alert, View, Text, ScrollView, StatusBar, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackParamList, RootStackScreenProps } from '@/navigation/types';
import {
  Bot,
  Award,
  Banknote,
  Boxes,
  Camera,
  ChevronRight,
  CreditCard,
  FileText,
  History,
  Landmark,
  Mic,
  PackageSearch,
  ReceiptText,
  Settings,
  Shield,
  ShoppingCart,
  Store,
  TrendingUp,
  Truck,
  Users,
  Wallet,
  Share2,
  CheckCircle2,
} from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import AppHeader from '@/components/ui/AppHeader';

const MoreScreen = ({ navigation }: RootStackScreenProps<'More'>) => {
  const { signOut, user } = useAuth();
  const userName = user?.email
    ? user.email.split('@')[0].split(/[._-]/).map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    : 'Chidi Okonkwo';

  const navigationSections: Array<{
    title: string;
    items: Array<{
      label: string;
      caption: string;
      icon: typeof Settings;
      color: string;
      route: keyof RootStackParamList;
    }>;
  }> = [
    {
      title: 'Money',
      items: [
        { label: 'Wallet', caption: 'Balance, transfers, withdrawals', icon: Wallet, color: '#10B981', route: 'Wallet' },
        { label: 'Loans', caption: 'Active loans and applications', icon: Banknote, color: '#F97316', route: 'LoanDashboard' },
        { label: 'Apply for Loan', caption: 'Request working capital', icon: FileText, color: '#EA580C', route: 'ApplyLoan' },
        { label: 'Repayment', caption: 'Pay loan obligations', icon: ReceiptText, color: '#DC2626', route: 'Repayment' },
        { label: 'Withdrawal', caption: 'Move money to bank', icon: Landmark, color: '#059669', route: 'Withdrawal' },
        { label: 'Credit Score', caption: 'Trust score and drivers', icon: CreditCard, color: '#6366F1', route: 'CreditDashboard' },
        { label: 'Savings Goals', caption: 'Buckets and targets', icon: Landmark, color: '#0EA5E9', route: 'SavingsGoals' },
      ],
    },
    {
      title: 'Operations',
      items: [
        { label: 'Inventory', caption: 'Stock dashboard and alerts', icon: Boxes, color: '#D97706', route: 'InventoryManager' },
        { label: 'Products', caption: 'View and manage products', icon: PackageSearch, color: '#7C3AED', route: 'ProductList' },
        { label: 'Low Stock Alerts', caption: 'Critical restock list', icon: Shield, color: '#EF4444', route: 'LowStockAlerts' },
        { label: 'Purchase Orders', caption: 'Supplier ordering workflow', icon: FileText, color: '#0891B2', route: 'PurchaseOrders' },
        { label: 'Add Supplier', caption: 'Create supplier records', icon: Store, color: '#0F766E', route: 'AddSupplier' },
        { label: 'Scan stock in', caption: 'Point camera at barcode', icon: Camera, color: '#4F46E5', route: 'ScanShelve' },
        { label: 'Voice stock in', caption: 'Hold button & speak', icon: Mic, color: '#059669', route: 'VoiceStock' },
        { label: 'AI Insights', caption: 'Inventory recommendations', icon: Bot, color: '#16A34A', route: 'AIInsights' },
        { label: 'AI Assistant', caption: 'Ask the business intelligence agent', icon: Bot, color: '#059669', route: 'AIAssistant' },
        { label: 'Sales', caption: 'Daily sales and velocity', icon: TrendingUp, color: '#2563EB', route: 'SalesDashboard' },
        { label: 'Record Sale', caption: 'Create a new receipt', icon: ReceiptText, color: '#16A34A', route: 'RecordSale' },
        { label: 'Sales History', caption: 'Receipts and past sales', icon: ReceiptText, color: '#0891B2', route: 'SalesHistory' },
        { label: 'Sales Velocity', caption: 'Product movement analytics', icon: TrendingUp, color: '#7C3AED', route: 'SalesVelocity' },
      ],
    },
    {
      title: 'Growth',
      items: [
        { label: 'Insurance', caption: 'Budget Best cover and claims', icon: Shield, color: '#EF4444', route: 'InsuranceSummary' },
        { label: 'File Claim', caption: 'Start an insurance claim', icon: FileText, color: '#DC2626', route: 'FileClaim' },
        { label: 'Claim History', caption: 'Track claim activity', icon: History, color: '#BE123C', route: 'ClaimHistory' },
        { label: 'Budget Goals', caption: 'Savings plans and deposits', icon: Landmark, color: '#0EA5E9', route: 'BudgetBestGoals' },
        { label: 'Budget Policy', caption: 'Cover terms and consent', icon: Shield, color: '#64748B', route: 'BudgetBestPolicy' },
        { label: 'Group Buy', caption: 'Buying pools and pickups', icon: Users, color: '#DB2777', route: 'PoolList' },
        { label: 'Cluster Pickup', caption: 'Coordinate pool delivery', icon: Truck, color: '#0369A1', route: 'ClusterPickup' },
        { label: 'Shop', caption: 'Wholesale marketplace', icon: ShoppingCart, color: '#4F46E5', route: 'Shop' },
        { label: 'Cart', caption: 'Review marketplace order', icon: ShoppingCart, color: '#4338CA', route: 'Cart' },
        { label: 'Logistics', caption: 'VentureRoute deliveries', icon: Truck, color: '#0369A1', route: 'VentureRoute' },
      ],
    },
    {
      title: 'Account',
      items: [
        { label: 'Account Details', caption: 'KYC limits, trust score levels', icon: Award, color: '#F59E0B', route: 'AccountDetails' },
        { label: 'Profile', caption: 'Business and owner details', icon: Store, color: '#475569', route: 'Profile' },
        { label: 'Security & PIN', caption: 'PIN, pattern, biometric lock', icon: Shield, color: '#10B981', route: 'SecuritySettings' },
        { label: 'Settings', caption: 'Preferences and notifications', icon: Settings, color: '#6B7280', route: 'Settings' },
      ],
    },
  ];

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch {
      Alert.alert('Sign out failed', 'Please try again.');
    }
  };

  const trustChecklist = [
    'KYC Verified',
    'BVN Matched',
    '6-Month Sales History',
    'All Repayments Clean',
    'Consistent Sales Velocity',
  ];

  return (
    <SafeAreaView className="flex-1 bg-background-page" edges={['bottom', 'left', 'right']}>
      <AppHeader title="More" showBack={false} />

      {/* Header Area */}
      <TouchableOpacity 
        className="bg-ventureroot-green pt-12 pb-10 px-6 rounded-b-[40px] items-center"
        onPress={() => navigation.navigate('Profile')}
      >
         <View className="w-20 h-20 rounded-full border-4 border-white/20 bg-gray-200 overflow-hidden mb-4">
            <Image 
              source={{ uri: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Chidi' }} 
              className="w-full h-full"
            />
         </View>
         <Text className="text-white text-2xl font-bold mb-1">{userName}</Text>
         <Text className="text-white/60 text-xs mb-4">+234 *** *** 4821 · Member since Jan 2024</Text>
         
         <View className="bg-orange-500/20 px-4 py-1.5 rounded-full flex-row items-center border border-orange-500/30">
            <Award size={14} color="#F97316" />
            <Text className="text-orange-100 text-[10px] font-bold ml-1 uppercase tracking-wider">Gold — 1,240 pts</Text>
         </View>
      </TouchableOpacity>

      <ScrollView className="flex-1 px-4 pt-6" showsVerticalScrollIndicator={false}>
        {/* Trust Score Card */}
        <View className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm mb-6">
           <View className="flex-row justify-between items-baseline mb-4">
              <Text className="text-gray-900 font-bold text-lg">Trust Score</Text>
              <Text className="text-emerald-600 font-black text-2xl">87/100</Text>
           </View>

           <View className="h-2 bg-gray-100 rounded-full overflow-hidden mb-6">
              <View className="h-full bg-emerald-500 rounded-full w-[87%]" />
           </View>

           <View className="gap-3">
              {trustChecklist.map((item, i) => (
                 <View key={i} className="flex-row items-center">
                    <CheckCircle2 size={16} color="#10B981" />
                    <Text className="ml-3 text-gray-700 text-xs font-medium">{item}</Text>
                    <Text className="ml-1 text-emerald-500/50 text-[10px]">✓</Text>
                 </View>
              ))}
           </View>
        </View>

        {/* Refer & Earn */}
        <TouchableOpacity className="bg-emerald-50 rounded-2xl p-4 flex-row items-center mb-4 border border-emerald-100">
           <View className="w-10 h-10 bg-emerald-100 rounded-xl items-center justify-center mr-4">
              <Text className="text-xl">🎁</Text>
           </View>
           <View className="flex-1">
              <Text className="text-emerald-900 font-bold text-sm">Refer & Earn ₦2,000</Text>
              <Text className="text-emerald-800 text-[10px]">Your code: <Text className="font-bold">CHIDI22</Text></Text>
           </View>
           <TouchableOpacity className="bg-emerald-600 px-4 py-1.5 rounded-lg">
              <Text className="text-white font-bold text-[10px]">Share</Text>
           </TouchableOpacity>
        </TouchableOpacity>

        {/* Share Shopfront */}
        <TouchableOpacity 
          className="bg-indigo-50 rounded-2xl p-4 flex-row items-center mb-6 border border-indigo-100"
          onPress={() => {
            const shopUrl = `https://shop.ventureroot.ng/chidi-okonkwo`; // Hardcoded for demo, should use user id
            const message = `Check out my shop on VentureRoot! 🛍️\n${shopUrl}`;
            const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;
            require('react-native').Linking.openURL(whatsappUrl).catch(() => {
              require('react-native').Linking.openURL(`https://wa.me/?text=${encodeURIComponent(message)}`);
            });
          }}
        >
           <View className="w-10 h-10 bg-indigo-100 rounded-xl items-center justify-center mr-4">
              <Share2 size={20} color="#4F46E5" />
           </View>
           <View className="flex-1">
              <Text className="text-indigo-900 font-bold text-sm">Share Your Shopfront</Text>
              <Text className="text-indigo-800 text-[10px]">Grow your retail reach via WhatsApp</Text>
           </View>
           <View className="bg-indigo-600 px-4 py-1.5 rounded-lg">
              <Text className="text-white font-bold text-[10px]">Share</Text>
           </View>
        </TouchableOpacity>

        {navigationSections.map((section) => (
          <View key={section.title} className="mb-6">
            <Text className="text-gray-900 font-bold text-base mb-3 px-1">{section.title}</Text>
            <View className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {section.items.map((item, idx) => (
                <TouchableOpacity
                  key={item.route}
                  className={`flex-row items-center p-4 ${idx < section.items.length - 1 ? 'border-b border-gray-50' : ''}`}
                  onPress={() => navigation.navigate(item.route as any)}
                  activeOpacity={0.75}
                >
                  <View className="w-10 h-10 rounded-xl items-center justify-center mr-3" style={{ backgroundColor: `${item.color}18` }}>
                    <item.icon size={20} color={item.color} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-800 font-bold text-sm">{item.label}</Text>
                    <Text className="text-gray-400 text-[10px] mt-0.5">{item.caption}</Text>
                  </View>
                  <ChevronRight size={20} color="#D1D5DB" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Sign Out */}
        <TouchableOpacity 
          className="items-center mb-10"
          onPress={handleSignOut}
        >
           <Text className="text-red-500 font-bold">Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

    </SafeAreaView>
  );
};

export default MoreScreen;
