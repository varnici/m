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

// ─── Mock Data ───────────────────────────────────────────────

const QUICK_ACCESS_ITEMS = [
  { icon: Banknote, label: 'Loans', bgColor: '#D1FAE5', iconColor: '#004D2C' },
  { icon: BarChart3, label: 'Sales', bgColor: '#DBEAFE', iconColor: '#2563EB' },
  { icon: Package, label: 'Inventory', bgColor: '#FEF3C7', iconColor: '#D97706' },
  { icon: Users, label: 'Group Buy', bgColor: '#FCE7F3', iconColor: '#DB2777' },
  { icon: Shield, label: 'Insurance', bgColor: '#FEE2E2', iconColor: '#EF4444' },
  { icon: Bot, label: 'AI Assist', bgColor: '#D1FAE5', iconColor: '#059669' },
  { icon: Store, label: 'Market', bgColor: '#E0E7FF', iconColor: '#4F46E5' },
  { icon: Mic, label: 'Voice Stock', bgColor: '#F3E8FF', iconColor: '#9333EA' },
];

const MARKET_TICKER = [
  { symbol: 'AG', change: '+1.9%', positive: true },
  { symbol: 'Zenith', price: '₦36.15', change: '-0.9%', positive: false },
  { symbol: 'Airtel NG', price: '₦2,140', change: '+0.7%', positive: true },
  { symbol: 'NGX ASI', price: '58,210', change: '+0.3%', positive: true },
];

const INTELLIGENCE_ITEMS = [
  {
    category: 'Trade Alert',
    source: 'BusinessDay NG',
    timeAgo: '2h ago',
    headline: 'Dangote Flour drops 8% — best time to restock for Q1',
    subtitle: '↑ Buy opportunity',
  },
  {
    category: 'CBN Update',
    source: 'Nairametrics',
    timeAgo: '4h ago',
    headline: 'CBN holds MPR at 27.5% — lending rates stable this quarter',
    subtitle: '→ No change to rates',
  },
  {
    category: 'For You',
    source: 'VR Insights',
    timeAgo: '6h ago',
    headline: 'FMCG traders in Lagos report 15% revenue boost from group buying',
    subtitle: '↑ Relevant to you',
  },
];

const ACTIVITY_ITEMS = [
  {
    title: 'Sale Proceeds',
    subtitle: 'Indomie · 40 units',
    amount: 18400,
    type: 'credit' as const,
    timeAgo: '2m ago',
  },
  {
    title: 'Repayment Sweep',
    subtitle: 'Auto-deducted · GTBank',
    amount: 16000,
    type: 'debit' as const,
    timeAgo: 'Dec 15',
  },
  {
    title: 'Loan Disbursed',
    subtitle: 'Dangote Flour Pool',
    amount: 120000,
    type: 'loan' as const,
    timeAgo: 'Dec 1',
  },
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
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [activeIntelTab, setActiveIntelTab] = useState('For You');

  return (
    <View className="flex-1 bg-ventureroot-surface">
      <StatusBar barStyle="light-content" backgroundColor={colors.ventureroot.green} />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* ═══ GREEN HEADER SECTION ═══ */}
        <View className="bg-ventureroot-green pt-12 pb-6">
          {/* Greeting Row */}
          <View className="flex-row items-center justify-between px-4 mb-4">
            <TouchableOpacity 
              className="flex-row items-center"
              onPress={() => navigation.navigate('More')}
              activeOpacity={0.7}
            >
              {/* Avatar with border */}
              <View className="w-10 h-10 rounded-full bg-white/20 items-center justify-center mr-3 border border-white/40">
                <Text className="text-white font-bold text-sm">CO</Text>
              </View>
              <View>
                <Text className="text-white/70 text-xs font-medium">Good evening 👋</Text>
                <Text className="text-white font-bold text-base">Chidi Okonkwo</Text>
              </View>
            </TouchableOpacity>

            <View className="flex-row items-center gap-3">
              {/* Gold Badge */}
              <View className="bg-ventureroot-gold rounded-full px-2.5 py-1 flex-row items-center">
                <Text className="text-xs font-bold text-gray-900">🏆 GOLD</Text>
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
            balance={45200.0}
            dailyChange={18400}
            loanDueDate="Dec 25"
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
          {MARKET_TICKER.map((item, index) => (
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
                value="742"
                subtitle="/1000"
                progress={{ current: 742, max: 1000 }}
                badge="Gold · 158 pts → Platinum"
            />
          </TouchableOpacity>
          <TouchableOpacity 
            className="flex-1" 
            onPress={() => navigation.navigate('SalesDashboard')}
          >
            <StatCard
                title="TODAY'S SALES"
                value="₦18,400"
                trend={{ direction: 'up', label: '+12% vs yesterday' }}
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
          <SalesStreakCard streakDays={5} totalDays={7} pointsEarned={50} nextReward="Silver" />
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
          {INTELLIGENCE_ITEMS.map((item, index) => (
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
            memberCount="14,400"
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
            {ACTIVITY_ITEMS.map((item, index) => (
              <ActivityItem
                key={index}
                title={item.title}
                subtitle={item.subtitle}
                amount={item.amount}
                type={item.type}
                timeAgo={item.timeAgo}
                icon={
                  <View
                    className={`w-10 h-10 rounded-full items-center justify-center ${
                      item.type === 'credit'
                        ? 'bg-emerald-100'
                        : item.type === 'debit'
                        ? 'bg-blue-100'
                        : 'bg-orange-100'
                    }`}
                  >
                    {item.type === 'credit' && <CheckCircle size={18} color="#10B981" />}
                    {item.type === 'debit' && <RefreshCw size={18} color="#3B82F6" />}
                    {item.type === 'loan' && <Flame size={18} color="#F97316" />}
                  </View>
                }
              />
            ))}
          </View>
        </View>

        {/* ═══ REPAYMENT BANNER ═══ */}
        <View className="mb-6">
          <RepaymentBanner
            daysUntilDue={9}
            amount={16000}
            dueDate="Dec 25"
            bank="GTBank"
            onPayNow={() => navigation.navigate('Repayment')}
          />
        </View>

        {/* Bottom spacing for tab bar */}
        <View className="h-20" />
      </ScrollView>

      {/* ═══ BOTTOM TAB BAR ═══ */}
      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex-row py-2 pb-6 px-4">
        {FOOTER_TABS.map((tab, index) => (
          <TouchableOpacity
            key={index}
            className="flex-1 items-center"
            onPress={() => navigation.navigate(tab.screen as never)}
            accessible={true}
            accessibilityLabel={tab.label}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab.active }}
          >
            <tab.icon
              size={22}
              color={tab.active ? colors.ventureroot.green : '#9CA3AF'}
            />
            <Text
              className={`text-xs mt-1 ${
                tab.active
                  ? 'text-ventureroot-green font-medium'
                  : 'text-gray-400'
              }`}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

export default DashboardScreen;
