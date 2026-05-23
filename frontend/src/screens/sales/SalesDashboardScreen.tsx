import React from 'react';
import { View, Text, ScrollView, StatusBar, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { 
  ShoppingBag, 
  TrendingUp, 
  DollarSign, 
  ChevronRight, 
  FileText, 
  ChevronLeft, 
  Zap, 
  AlertCircle, 
  Sparkles,
  ShoppingBasket
} from 'lucide-react-native';
import { FlashList } from '@shopify/flash-list';
const TypedFlashList = FlashList as any;

import type { RootStackScreenProps } from '@/navigation/types';
import { colors } from '@/theme/colors';
import ScreenHeader from '@/components/ui/ScreenHeader';
import StatCard from '@/components/ui/StatCard';
import { useInventoryDashboard } from '@/hooks/useInventory';

const SalesDashboardScreen = ({
  navigation,
}: RootStackScreenProps<'SalesDashboard'>) => {
  const { data: dashboardData, isLoading } = useInventoryDashboard();

  const metrics = {
    todaySales: dashboardData?.total_revenue_kobo || 0,
    unitsSold: dashboardData?.recent_transactions?.reduce((acc: number, tx: any) => acc + tx.quantity, 0) || 0,
    netProfit: dashboardData?.total_profit_kobo || 0,
  };

  const recommendations = dashboardData?.global_recommendations || [];

  const renderRecommendation = ({ item }: { item: any }) => (
    <TouchableOpacity 
      className="mr-4 w-72 rounded-3xl overflow-hidden"
      onPress={() => navigation.navigate(item.action_route as any, item.metadata)}
    >
      <BlurView intensity={20} tint="light" className="p-5 h-full bg-white/20 border border-white/30">
        <View className="flex-row items-center mb-3">
          <View className={`p-2 rounded-xl ${item.type === 'restock' ? 'bg-orange-500/20' : 'bg-indigo-500/20'}`}>
            {item.type === 'restock' ? <Zap size={16} color="#F97316" /> : <Sparkles size={16} color="#6366F1" />}
          </View>
          <View className="ml-3">
             <Text className="text-gray-900 font-bold text-sm">{item.title}</Text>
             <View className="flex-row items-center">
                <Text className={`text-[8px] font-bold uppercase tracking-widest ${item.impact === 'high' ? 'text-red-500' : 'text-indigo-500'}`}>
                   {item.impact} IMPACT
                </Text>
             </View>
          </View>
        </View>
        <Text className="text-gray-700 text-xs leading-5 mb-4" numberOfLines={2}>
          {item.description}
        </Text>
        <View className="flex-row items-center justify-between mt-auto">
           <View className="flex-row -space-x-2">
              {[1, 2, 3].map(i => (
                <View key={i} className="w-6 h-6 rounded-full border-2 border-white bg-gray-200" />
              ))}
           </View>
           <View className="bg-slate-900 px-3 py-1.5 rounded-lg flex-row items-center">
              <Text className="text-white font-bold text-[10px]">{item.action_text}</Text>
              <ChevronRight size={10} color="white" style={{ marginLeft: 4 }} />
           </View>
        </View>
      </BlurView>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-background-page">
      <StatusBar barStyle="light-content" />
      
      <ScreenHeader
        title="Sales Center"
        subtitle="Business Performance"
        navigation={navigation}
      />
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        
        {/* Glassmorphic Recommendations Carousel */}
        {recommendations.length > 0 && (
          <View className="mt-4">
             <View className="px-4 mb-3 flex-row items-center justify-between">
                <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">AI Strategic Insights</Text>
                <Sparkles size={14} color="#4F46E5" />
             </View>
             <TypedFlashList
                data={recommendations}
                renderItem={renderRecommendation}
                horizontal
                estimatedItemSize={288}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16 }}
             />
          </View>
        )}

        <View className="flex-row px-4 gap-3 mt-8 mb-6">
           <StatCard 
            title="TODAY'S SALES" 
            value={`₦${(metrics.todaySales / 100).toLocaleString()}`} 
            trend={{ direction: 'up', label: '+12% from yesterday' }}
           />
           <StatCard 
            title="UNITS SOLD" 
            value={metrics.unitsSold.toString()} 
            trend={{ direction: 'up', label: '+4 today' }}
           />
           <StatCard 
            title="NET PROFIT" 
            value={`₦${(metrics.netProfit / 100).toLocaleString()}`} 
            trend={{ direction: 'neutral', label: 'Last 30D' }}
           />
        </View>

        {/* 7-Day Trend Chart Area */}
        <View className="bg-white rounded-3xl mx-4 p-6 border border-gray-100 shadow-sm mb-6">
          <View className="flex-row justify-between items-center mb-6">
            <View>
              <Text className="text-gray-900 font-bold text-base">Revenue Trend</Text>
              <Text className="text-gray-400 text-[10px]">Rolling 7-day volume</Text>
            </View>
            <TouchableOpacity className="bg-emerald-50 px-3 py-1.5 rounded-xl">
               <Text className="text-emerald-600 text-[10px] font-bold">↑ +12.5%</Text>
            </TouchableOpacity>
          </View>
          
          <View className="flex-row items-end justify-between h-32 px-2">
            {(() => {
              const trend = dashboardData?.revenue_trend || [];
              if (trend.length === 0) {
                return (
                  <View className="flex-1 items-center justify-center h-full">
                    <Text className="text-gray-400 text-xs italic">No sales data for this period</Text>
                  </View>
                );
              }
              const maxRev = Math.max(...trend.map((t: any) => t.revenue), 1);
              
              return trend.map((item: any, i: number) => {
                const height = (item.revenue / maxRev) * 100;
                return (
                  <View key={i} className="items-center">
                    <View 
                        style={{ height: `${Math.max(height, 5)}%` }} 
                        className={`w-8 rounded-t-xl ${i === trend.length - 1 ? 'bg-ventureroot-green' : 'bg-gray-100'}`} 
                    />
                    <Text className="text-gray-400 text-[9px] mt-3 font-bold uppercase">
                        {item.day}
                    </Text>
                  </View>
                );
              });
            })()}
          </View>
        </View>

        {/* Top Products Today */}
        <View className="px-4 mb-6">
          <View className="flex-row justify-between items-center mb-4">
             <Text className="text-gray-900 font-bold text-base">Top Performers</Text>
             <TouchableOpacity onPress={() => navigation.navigate('SalesHistory')}>
                <Text className="text-ventureroot-green text-xs font-bold">Sales History</Text>
             </TouchableOpacity>
          </View>

          <View className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
             {dashboardData?.best_sellers?.slice(0, 3).map((item: any, idx: number) => (
                <View key={item.product_id} className={`flex-row items-center py-4 ${idx < 2 ? 'border-b border-gray-50' : ''}`}>
                   <View className="w-10 h-10 rounded-xl bg-gray-50 items-center justify-center mr-4">
                      <ShoppingBasket size={20} color="#10B981" />
                   </View>
                   <View className="flex-1">
                      <Text className="text-gray-900 font-bold text-sm" numberOfLines={1}>{item.name}</Text>
                      <Text className="text-gray-400 text-[10px] uppercase font-bold">{item.sku}</Text>
                   </View>
                   <View className="items-end">
                      <Text className="text-gray-900 font-black text-sm">{item.total_sold} units</Text>
                      <View className="bg-emerald-50 px-1.5 py-0.5 rounded mt-1">
                         <Text className="text-emerald-600 text-[8px] font-bold">Trending</Text>
                      </View>
                   </View>
                </View>
             ))}
             {(!dashboardData?.best_sellers || dashboardData.best_sellers.length === 0) && (
                <View className="py-6 items-center">
                  <Text className="text-gray-400 text-xs italic">Awaiting more sales data...</Text>
                </View>
             )}
          </View>
        </View>

        {/* Tax & VAT Helper */}
        <TouchableOpacity className="mx-4 mb-10 overflow-hidden rounded-3xl bg-slate-900 h-28 flex-row items-center px-5">
            <View className="bg-white/10 w-14 h-14 rounded-2xl items-center justify-center mr-5">
               <FileText size={28} color="white" />
            </View>
            <View className="flex-1">
               <View className="flex-row items-center gap-2 mb-1">
                  <Text className="text-white font-bold text-base">Tax & VAT Ledger</Text>
                  <View className="bg-blue-500 px-2 py-0.5 rounded-full">
                     <Text className="text-white text-[8px] font-black">FIRS</Text>
                  </View>
               </View>
               <Text className="text-white/60 text-[10px] leading-4">
                 Your automated VAT liability for this month is <Text className="text-blue-400 font-bold">₦{(metrics.todaySales * 0.075 / 100).toLocaleString()}</Text>. Keep your records compliant.
               </Text>
            </View>
            <ChevronRight size={20} color="white" opacity={0.5} />
        </TouchableOpacity>
        <View className="h-40" />
      </ScrollView>

      <TouchableOpacity 
        className="absolute bottom-28 right-6 w-16 h-16 bg-ventureroot-green rounded-full items-center justify-center shadow-xl"
        onPress={() => navigation.navigate('RecordSale' as any)}
      >
         <ShoppingBag color="white" size={28} />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default SalesDashboardScreen;
