import React from 'react';
import { View, Text, ScrollView, StatusBar, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackScreenProps } from '@/navigation/types';
import { ShoppingBag, TrendingUp, DollarSign, ChevronRight, FileText, ChevronLeft } from 'lucide-react-native';
import { colors } from '@/theme/colors';
import StatCard from '@/components/ui/StatCard';

const SalesDashboardScreen = ({
  navigation,
}: RootStackScreenProps<'SalesDashboard'>) => {
  return (
    <SafeAreaView className="flex-1 bg-background-page">
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View className="bg-ventureroot-green pt-12 pb-6 px-4">
        <View className="flex-row items-center mb-4">
           <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
              <ChevronLeft color="white" size={24} />
           </TouchableOpacity>
           <View>
              <Text className="text-white/70 text-xs font-medium uppercase tracking-wider">Sales Performance</Text>
              <Text className="text-white text-2xl font-bold">Sales Dashboard</Text>
           </View>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Quick Stats Row */}
        <View className="flex-row px-4 gap-3 mt-4 mb-6">
           <StatCard 
            title="TODAY'S SALES" 
            value="₦18,400" 
            trend={{ direction: 'up', label: '+12% from yesterday' }}
           />
           <StatCard 
            title="UNITS SOLD" 
            value="24" 
            trend={{ direction: 'up', label: '+4 today' }}
           />
           <StatCard 
            title="NET PROFIT" 
            value="₦4,200" 
            trend={{ direction: 'neutral', label: 'Calculated daily' }}
           />
        </View>

        {/* 7-Day Trend Chart Area */}
        <View className="bg-white rounded-2xl mx-4 p-4 border border-gray-100 shadow-sm mb-6">
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-gray-900 font-bold text-base">7-Day Trend</Text>
            <View className="bg-emerald-50 px-2 py-1 rounded">
               <Text className="text-emerald-600 text-[10px] font-bold">↑ +12% this week</Text>
            </View>
          </View>
          
          <View className="flex-row items-end justify-between h-32 px-2">
            {[20, 45, 30, 60, 40, 35, 80].map((h, i) => (
              <View key={i} className="items-center">
                <View 
                    style={{ height: `${h}%` }} 
                    className={`w-8 rounded-t-lg ${i === 6 ? 'bg-ventureroot-green' : 'bg-gray-100'}`} 
                />
                <Text className="text-gray-400 text-[10px] mt-2">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Top Products Today */}
        <View className="px-4 mb-6">
          <View className="flex-row justify-between items-center mb-4">
             <Text className="text-gray-900 font-bold text-base">Top Products Today</Text>
             <TouchableOpacity>
                <Text className="text-ventureroot-green text-xs font-bold">View History</Text>
             </TouchableOpacity>
          </View>

          <View className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
             {[
               { id: 1, name: 'Indomie Noodles 70g', sales: '₦6,000', units: 'x40 units', share: '25%' },
               { id: 2, name: 'Peak Milk 400g', sales: '₦3,600', units: 'x12 units', share: '18%' },
               { id: 3, name: 'Milo 400g', sales: '₦2,800', units: 'x8 units', share: '22%' },
             ].map((item, idx) => (
                <View key={item.id} className={`flex-row items-center py-3 ${idx < 2 ? 'border-b border-gray-50' : ''}`}>
                   <View className="w-8 h-8 rounded-lg bg-gray-50 items-center justify-center mr-3">
                      <Text className="text-emerald-600 font-bold text-xs">#{item.id}</Text>
                   </View>
                   <View className="flex-1">
                      <Text className="text-gray-900 font-semibold text-sm">{item.name}</Text>
                      <Text className="text-gray-400 text-[10px]">{item.units}</Text>
                   </View>
                   <View className="items-end">
                      <Text className="text-gray-900 font-bold text-sm">{item.sales}</Text>
                      <Text className="text-emerald-500 text-[10px] font-bold">{item.share}</Text>
                   </View>
                </View>
             ))}
          </View>
        </View>

        {/* Tax & VAT Helper */}
        <TouchableOpacity className="mx-4 mb-10 overflow-hidden rounded-2xl bg-slate-900 h-24 flex-row items-center px-4">
            <View className="bg-white/10 w-12 h-12 rounded-xl items-center justify-center mr-4">
               <FileText size={24} color="white" />
            </View>
            <View className="flex-1">
               <View className="flex-row items-center gap-2">
                  <Text className="text-white font-bold text-base">Tax & VAT Helper</Text>
                  <View className="bg-blue-500 px-1.5 py-0.5 rounded">
                     <Text className="text-white text-[8px] font-bold">FIRS</Text>
                  </View>
               </View>
               <Text className="text-white/60 text-[10px] mt-1">
                 Today's VAT liability: <Text className="text-blue-400 font-bold">₦1,656</Text> (7.5% of ₦22,080 taxable sales)
               </Text>
            </View>
            <ChevronRight size={20} color="white" opacity={0.5} />
        </TouchableOpacity>
      </ScrollView>

      <TouchableOpacity 
        className="absolute bottom-6 right-6 w-14 h-14 bg-ventureroot-green rounded-full items-center justify-center shadow-lg"
        onPress={() => navigation.navigate('RecordSale')}
      >
         <Text className="text-white text-3xl font-light">+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default SalesDashboardScreen;
