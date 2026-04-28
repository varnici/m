import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import {
  Bell,
  Home,
  DollarSign,
  TrendingUp,
  Wallet,
  MoreHorizontal,
  Banknote,
  BarChart3,
  Package,
  Users,
  Shield,
  Bot,
  Store,
  Mic,
  Heart,
  Landmark,
  Trophy as FootballIcon,
  CheckCircle,
  RefreshCw,
  Flame,
  Star,
  Newspaper,
  TrendingUp as StocksIcon,
  Sprout,
} from 'lucide-react-native';

import VRWalletCard from '@/components/ui/VRWalletCard';
import StatCard from '@/components/ui/StatCard';
import QuickAccessIcon from '@/components/ui/QuickAccessIcon';
import AIBriefingCard from '@/components/ui/AIBriefingCard';
import VoiceStockCard from '@/components/ui/VoiceStockCard';
import SalesStreakCard from '@/components/ui/SalesStreakCard';
import IntelligenceCard from '@/components/ui/IntelligenceCard';
import CommunityCard from '@/components/ui/CommunityCard';
import ActivityItem from '@/components/ui/ActivityItem';
import RepaymentBanner from '@/components/ui/RepaymentBanner';
import { colors } from '@/theme/colors';

import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '@/services/dashboardService';

// ─── Quick Access Grid Config ───────────────────────────────

const QUICK_ACCESS_ITEMS = [
  { icon: Banknote, label: 'Loans', bgColor: '#D1FAE5', iconColor: '#004D2C' },
  { icon: BarChart3, label: 'Sales', bgColor: '#DBEAFE', iconColor: '#2563EB' },
  { icon: Package, label: 'Inventory', bgColor: '#FEF3C7', iconColor: '#D97706' },
  { icon: Users, label: 'Group Buy', bgColor: '#FCE7F3', iconColor: '#DB2777' },
  { icon: Shield, label: 'Insurance', bgColor: '#FEE2E2', iconColor: '#EF4444' },
  { icon: Bot, label: 'AI Assist', bgColor: '#D1FAE5', iconColor: '#059669' },
  { icon: Store, label: 'Shop', bgColor: '#E0E7FF', iconColor: '#4F46E5' },
  { icon: Mic, label: 'Voice Stock', bgColor: '#F3E8FF', iconColor: '#9333EA' },
];

const INTELLIGENCE_TABS = ['For You', 'News', 'Stocks', 'Trade'];

import type {
  RootStackParamList,
  RootStackScreenProps,
} from '@/navigation/types';

const FOOTER_TABS: Array<{
  icon: typeof Home;
  label: string;
  active: boolean;
  screen: keyof RootStackParamList;
}> = [
  { icon: Home, label: 'Home', active: true, screen: 'Dashboard' },
  { icon: DollarSign, label: 'Loans', active: false, screen: 'LoanDashboard' },
  { icon: TrendingUp, label: 'Sales', active: false, screen: 'SalesDashboard' },
  { icon: Wallet, label: 'Wallet', active: false, screen: 'Wallet' },
  { icon: MoreHorizontal, label: 'More', active: false, screen: 'More' },
];

// ─── Dashboard Screen ────────────────────────────────────────

const DashboardScreen = ({
  navigation,
}: RootStackScreenProps<'Dashboard'>) => {
  const { user } = useAuth();
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [activeIntelTab, setActiveIntelTab] = useState('For You');

  const { 
    data, 
    isLoading, 
    isError, 
    refetch 
  } = useQuery({
    queryKey: ['dashboard', user?.id],
    queryFn: () => dashboardService.getDashboardSummary(user!.id),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  if (isLoading) {
    return (
      <View className="flex-1 bg-ventureroot-surface items-center justify-center">
        <Text className="text-ventureroot-green font-bold">Syncing your business...</Text>
      </View>
    );
  }

  // Fallback to empty/default if data is missing
  const dashboard = data || {
    user: { full_name: user?.email?.split('@')[0] || 'Guest', trust_level: 'Bronze' },
    wallet: { balance_kobo: 0, daily_change_kobo: 0, available_credit_kobo: 0, total_debt_kobo: 0 },
    recent_activity: [],
    market_ticker: [],
    intelligence: []
  };

  return (
    <View className="flex-1 bg-ventureroot-surface">
      <StatusBar barStyle="light-content" backgroundColor={colors.ventureroot.green} />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* ═══ GREEN HEADER SECTION ═══ */}
        <View className="bg-ventureroot-green pt-16 pb-8">
          {/* Greeting Row */}
          <View className="flex-row items-center justify-between px-6 mb-6">
            <TouchableOpacity 
              className="flex-row items-center"
              onPress={() => navigation.navigate('More')}
              activeOpacity={0.7}
            >
              {/* Avatar with border */}
              <View className="w-12 h-12 rounded-2xl bg-white/20 items-center justify-center mr-4 border border-white/40 shadow-sm">
                <Text className="text-white font-black text-base">
                  {dashboard.user.avatar_initials || dashboard.user.full_name.substring(0, 2).toUpperCase()}
                </Text>
              </View>
              <View>
                <Text className="text-white/70 text-xs font-bold uppercase tracking-wider">Good evening 👋</Text>
                <Text className="text-white font-black text-xl">{dashboard.user.full_name}</Text>
              </View>
            </TouchableOpacity>

            <View className="flex-row items-center gap-3">
              {/* Gold Badge */}
              <View className="bg-ventureroot-gold rounded-full px-2.5 py-1 flex-row items-center">
                <Text className="text-xs font-bold text-gray-900">🏆 {dashboard.user.trust_level.toUpperCase()}</Text>
              </View>
              {/* Bell */}
              <TouchableOpacity
                accessible={true}
                accessibilityLabel="Notifications"
                accessibilityRole="button"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Bell size={22} color="white" />
                <View className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 border border-ventureroot-green" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Wallet Card */}
          <VRWalletCard
            balance={dashboard.wallet.balance_kobo / 100}
            dailyChange={dashboard.wallet.daily_change_kobo / 100}
            loanDueDate={dashboard.wallet.next_repayment_date || '--'}
            balanceVisible={balanceVisible}
            onToggleVisibility={() => setBalanceVisible(!balanceVisible)}
            onPress={() => navigation.navigate('Wallet')}
          />
        </View>

        {/* ═══ MARKET TICKER ═══ */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="bg-white py-2.5 px-4 border-b border-gray-100"
        >
          {dashboard.market_ticker.map((item, index) => (
            <View key={index} className="flex-row items-center mr-4">
              <Text className="text-gray-600 text-xs font-medium mr-1">
                {item.symbol}
              </Text>
              {item.price && (
                <Text className="text-gray-900 text-xs font-bold mr-1">
                  {item.price}
                </Text>
              )}
              <Text
                className={`text-xs font-medium ${
                  item.positive ? 'text-emerald-500' : 'text-red-500'
                }`}
              >
                {item.change}
              </Text>
            </View>
          ))}
        </ScrollView>

        {/* ═══ STAT CARDS ROW ═══ */}
        <View className="flex-row px-4 py-4 gap-3">
          <TouchableOpacity 
            className="flex-1" 
            onPress={() => navigation.navigate('CreditDashboard')}
          >
            <StatCard
                title="CREDIT SCORE"
                value={dashboard.credit_score?.total_score.toString() || '--'}
                subtitle="/1000"
                progress={{ current: dashboard.credit_score?.total_score || 0, max: 1000 }}
                badge={`${dashboard.credit_score?.tier || 'Bronze'} · Explore →`}
            />
          </TouchableOpacity>
          <TouchableOpacity 
            className="flex-1" 
            onPress={() => navigation.navigate('SalesDashboard')}
          >
            <StatCard
                title="TODAY'S SALES"
                value={`₦${(dashboard.today_sales?.total_amount_kobo || 0) / 100}`}
                trend={{ 
                  direction: (dashboard.today_sales?.vs_yesterday_percent || 0) >= 0 ? 'up' : 'down', 
                  label: `${Math.abs(dashboard.today_sales?.vs_yesterday_percent || 0)}% vs yesterday` 
                }}
            />
          </TouchableOpacity>
        </View>

        {/* ═══ QUICK ACCESS GRID ═══ */}
        <View className="px-4 mb-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-gray-900 font-bold text-base">Quick Access</Text>
            <TouchableOpacity
              accessible={true}
              accessibilityLabel="Edit quick access"
              accessibilityRole="button"
            >
              <Text className="text-gray-400 text-xs">Edit ✏️</Text>
            </TouchableOpacity>
          </View>
          <View className="flex-row flex-wrap justify-between">
            {QUICK_ACCESS_ITEMS.map((item, index) => (
              <View key={index} className="mb-4" style={{ width: '25%' }}>
                <QuickAccessIcon
                  icon={item.icon}
                  label={item.label}
                  bgColor={item.bgColor}
                  iconColor={item.iconColor}
                  onPress={() => {
                    if (item.label === 'Loans') navigation.navigate('LoanDashboard');
                    if (item.label === 'Sales') navigation.navigate('SalesDashboard');
                    if (item.label === 'Inventory') navigation.navigate('InventoryDashboard');
                    if (item.label === 'Insurance') navigation.navigate('InsuranceSummary');
                    if (item.label === 'Group Buy') navigation.navigate('PoolList');
                    if (item.label === 'Shop') navigation.navigate('Shop');
                  }}
                />
              </View>
            ))}
          </View>
        </View>

        {/* ═══ AI DAILY BRIEFING ═══ */}
        <View className="mb-4">
          <AIBriefingCard />
        </View>

        {/* ═══ VOICE STOCK ENTRY ═══ */}
        <View className="mb-4">
          <VoiceStockCard />
        </View>

        {/* ═══ SALES STREAK ═══ */}
        <View className="mb-4">
          <SalesStreakCard 
            streakDays={dashboard.sales_streak?.streak_days || 0} 
            totalDays={dashboard.sales_streak?.total_days || 7} 
            pointsEarned={dashboard.sales_streak?.points_earned || 0} 
            nextReward={dashboard.sales_streak?.next_reward_tier || 'Silver'} 
          />
        </View>

        {/* ═══ DAILY INTELLIGENCE ═══ */}
        <View className="mb-4">
          <View className="flex-row items-center justify-between px-4 mb-3">
            <View>
              <Text className="text-gray-900 font-bold text-base">Daily Intelligence</Text>
              <Text className="text-gray-400 text-xs mt-0.5">
                🟢 Auto updated every 2 hours
              </Text>
            </View>
            <TouchableOpacity
              accessible={true}
              accessibilityLabel="See all intelligence"
              accessibilityRole="button"
            >
              <Text className="text-ventureroot-green text-xs font-medium">See All →</Text>
            </TouchableOpacity>
          </View>

          {/* Tab Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="px-4 mb-3"
          >
            {INTELLIGENCE_TABS.map((tab) => (
              <TouchableOpacity
                key={tab}
                className={`rounded-full px-4 py-2 mr-2 ${
                  activeIntelTab === tab
                    ? 'bg-ventureroot-green'
                    : 'bg-gray-100'
                }`}
                onPress={() => setActiveIntelTab(tab)}
                accessible={true}
                accessibilityLabel={`${tab} tab`}
                accessibilityRole="tab"
                accessibilityState={{ selected: activeIntelTab === tab }}
              >
                <Text
                  className={`text-xs font-medium ${
                    activeIntelTab === tab ? 'text-white' : 'text-gray-600'
                  }`}
                >
                  {tab === 'For You' ? '★ ' : ''}
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Intelligence Cards */}
          {dashboard.intelligence.map((item, index) => (
            <IntelligenceCard
              key={index}
              category={item.category}
              source={item.source}
              timeAgo={item.timeAgo}
              headline={item.headline}
              subtitle={item.subtitle}
            />
          ))}
        </View>

        {/* ═══ VR COMMUNITY ═══ */}
        <View className="mb-4">
          <View className="px-4 mb-3">
            <Text className="text-gray-900 font-bold text-base">VR Community</Text>
            <Text className="text-gray-400 text-xs mt-0.5">
              Business · Finance · Entertainment · Networking
            </Text>
          </View>

          <CommunityCard
            platform="WhatsApp Business"
            icon={<Text className="text-lg">💬</Text>}
            description="Daily price alerts · Supplier deals · Trade tips"
            memberCount={(dashboard.community_stats?.total_members || 14400).toLocaleString()}
            isOfficial={true}
            bgColor="#D1FAE5"
          />
          <CommunityCard
            platform="Telegram"
            icon={<Text className="text-lg">✈️</Text>}
            description="Trade signals"
            memberCount="5,700"
            bgColor="#DBEAFE"
          />
        </View>

        {/* ═══ RECENT ACTIVITY ═══ */}
        <View className="mb-4 px-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-gray-900 font-bold text-base">Recent Activity</Text>
            <TouchableOpacity
              accessible={true}
              accessibilityLabel="View all activity"
              accessibilityRole="button"
            >
              <Text className="text-ventureroot-green text-xs font-medium">View All →</Text>
            </TouchableOpacity>
          </View>

          <View className="bg-white rounded-2xl px-4 border border-gray-100 shadow-sm">
            {dashboard.recent_activity.map((item, index) => (
              <ActivityItem
                key={index}
                title={item.description}
                subtitle={item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                amount={item.amount_kobo / 100}
                type={item.type === 'sale' ? 'credit' : 'debit'}
                timeAgo={new Date(item.created_at).toLocaleDateString()}
                icon={
                  <View
                    className={`w-10 h-10 rounded-full items-center justify-center ${
                      item.type === 'sale'
                        ? 'bg-emerald-100'
                        : item.type === 'repayment'
                        ? 'bg-blue-100'
                        : 'bg-orange-100'
                    }`}
                  >
                    {item.type === 'sale' && <CheckCircle size={18} color="#10B981" />}
                    {item.type === 'repayment' && <RefreshCw size={18} color="#3B82F6" />}
                    {item.type === 'loan' && <Flame size={18} color="#F97316" />}
                  </View>
                }
              />
            ))}
          </View>
        </View>

        {/* ═══ REPAYMENT BANNER (IF DEBT EXISTS) ═══ */}
        {dashboard.wallet.total_debt_kobo > 0 && (
          <View className="mb-4">
            <RepaymentBanner 
              amount={dashboard.wallet.repayment_amount_kobo / 100} 
              daysUntilDue={
                dashboard.wallet.next_repayment_date 
                  ? Math.max(0, Math.ceil((new Date(dashboard.wallet.next_repayment_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
                  : 0
              } 
              bank="VentureRoot Ledger"
              onPayNow={() => navigation.navigate('Repayment')}
            />
          </View>
        )}

        <View className="h-32" />
      </ScrollView>

    </View>
  );
};

export default DashboardScreen;
