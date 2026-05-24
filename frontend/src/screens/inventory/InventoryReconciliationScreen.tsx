// @ts-nocheck
import React, { useState } from 'react';
import { View, Text, ScrollView, StatusBar, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackScreenProps } from '@/navigation/types';
import { ChevronLeft, AlertTriangle, CheckCircle2, ShieldCheck, ArrowRightLeft, Database } from 'lucide-react-native';
import { colors } from '@/theme/colors';
import { useReconcileInventory, useStockLevels } from '@/hooks/useInventory';
import { format } from 'date-fns';

const InventoryReconciliationScreen = ({
  navigation,
  route,
}: RootStackScreenProps<'InventoryReconciliation'>) => {
  const { storeId } = route.params || {};
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch reconciliation data
  const { data: reconciliationData, isLoading, refetch, isFetching } = useReconcileInventory(storeId);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  const discrepancies = reconciliationData?.filter((item: any) => item.drift !== 0) || [];
  const matches = reconciliationData?.filter((item: any) => item.drift === 0) || [];

  return (
    <SafeAreaView className="flex-1 bg-background-page">
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pt-4 pb-6">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-2">
          <ChevronLeft color="white" size={24} />
        </TouchableOpacity>
        <Text className="text-white text-lg font-bold">Ledger Reconciliation</Text>
        <TouchableOpacity className="p-2" onPress={onRefresh}>
          <ShieldCheck color="white" size={20} opacity={isFetching ? 0.5 : 1} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        className="flex-1 px-4" 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="white" />
        }
      >
        {/* Status Summary */}
        <View className="bg-white/10 rounded-3xl p-6 mb-6 border border-white/10 backdrop-blur-md">
          <View className="flex-row justify-between items-center mb-4">
            <View>
              <Text className="text-white/60 text-xs font-bold uppercase tracking-widest">Audit Status</Text>
              <Text className="text-white text-2xl font-black mt-1">
                {discrepancies.length > 0 ? 'Action Required' : 'Fully Synchronized'}
              </Text>
            </View>
            <View className={`w-12 h-12 rounded-2xl items-center justify-center ${discrepancies.length > 0 ? 'bg-orange-500/20' : 'bg-emerald-500/20'}`}>
              {discrepancies.length > 0 ? (
                <AlertTriangle color="#F97316" size={24} />
              ) : (
                <CheckCircle2 color="#10B981" size={24} />
              )}
            </View>
          </View>
          
          <View className="flex-row gap-4 mt-2">
            <View className="flex-1 bg-white/5 p-3 rounded-2xl border border-white/5">
              <Text className="text-white/40 text-[10px] font-bold uppercase">Total Checked</Text>
              <Text className="text-white text-lg font-bold">{(reconciliationData?.length || 0)}</Text>
            </View>
            <View className="flex-1 bg-white/5 p-3 rounded-2xl border border-white/5">
              <Text className="text-white/40 text-[10px] font-bold uppercase">Discrepancies</Text>
              <Text className={`${discrepancies.length > 0 ? 'text-orange-400' : 'text-white/60'} text-lg font-bold`}>
                {discrepancies.length}
              </Text>
            </View>
          </View>
        </View>

        {isLoading ? (
          <View className="items-center justify-center py-20">
            <ActivityIndicator size="large" color={colors.ventureroot.green} />
            <Text className="text-white/60 mt-4 font-medium">Verifying domain ledger entries...</Text>
          </View>
        ) : (
          <>
            {/* Discrepancies Section */}
            {discrepancies.length > 0 && (
              <View className="mb-8">
                <View className="flex-row items-center mb-4 gap-2">
                  <AlertTriangle color="#F97316" size={16} />
                  <Text className="text-orange-400 font-bold uppercase text-xs tracking-tighter">Detected Discrepancies</Text>
                </View>
                
                {discrepancies.map((item: any, index: number) => (
                  <TouchableOpacity 
                    key={index}
                    onPress={() => navigation.navigate('ProductDetail', { productId: item.product_id })}
                    className="bg-white rounded-3xl p-5 mb-4 border border-orange-100 shadow-sm"
                  >
                    <View className="flex-row justify-between items-start mb-4">
                      <View className="flex-1 mr-4">
                        <Text className="text-gray-900 font-black text-lg" numberOfLines={1}>{item.name}</Text>
                        <Text className="text-gray-400 text-xs mt-1">ID: {item.product_id.substring(0, 8)}...</Text>
                      </View>
                      <View className="bg-orange-50 px-3 py-1 rounded-full border border-orange-100">
                        <Text className="text-orange-600 font-bold text-[10px] uppercase">
                          Mismatch: {item.drift > 0 ? `+${item.drift}` : item.drift}
                        </Text>
                      </View>
                    </View>

                    <View className="flex-row gap-3">
                      <View className="flex-1 bg-gray-50 p-3 rounded-2xl">
                        <Text className="text-gray-400 text-[10px] font-bold uppercase mb-1">Ledger State</Text>
                        <View className="flex-row items-center gap-2">
                          <Database size={12} color="#64748b" />
                          <Text className="text-gray-900 font-bold">{item.ledger_sum}</Text>
                        </View>
                      </View>
                      
                      <View className="items-center justify-center">
                        <ArrowRightLeft size={16} color="#cbd5e1" />
                      </View>

                      <View className="flex-1 bg-gray-50 p-3 rounded-2xl">
                        <Text className="text-gray-400 text-[10px] font-bold uppercase mb-1">Actual Stock</Text>
                        <View className="flex-row items-center gap-2">
                          <CheckCircle2 size={12} color="#10b981" />
                          <Text className="text-gray-900 font-bold">{item.current_on_hand}</Text>
                        </View>
                      </View>
                    </View>

                    {item.last_movement && (
                      <View className="mt-4 pt-4 border-t border-gray-100">
                        <Text className="text-gray-400 text-[10px] font-bold uppercase">Last Domain Activity</Text>
                        <Text className="text-gray-600 text-xs font-medium mt-1">
                          {format(new Date(item.last_movement), 'MMM dd, yyyy HH:mm')}
                        </Text>
                      </View>
                    )}
                    
                    <TouchableOpacity 
                      onPress={() => navigation.navigate('StockAdjustment', { 
                        storeId, 
                        productId: item.product_id,
                        prefillDrift: item.drift
                      })}
                      className="mt-4 bg-orange-100 py-3 rounded-xl items-center flex-row justify-center gap-2"
                    >
                      <AlertTriangle color="#F97316" size={16} />
                      <Text className="text-orange-700 font-bold">Fix Discrepancy</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Perfect Matches Section */}
            {matches.length > 0 && (
              <View className="mb-10">
                <View className="flex-row items-center mb-4 gap-2">
                  <CheckCircle2 color="#10B981" size={16} />
                  <Text className="text-emerald-400 font-bold uppercase text-xs tracking-tighter">Verified Integrity</Text>
                </View>
                
                <View className="bg-white/5 rounded-3xl overflow-hidden border border-white/5">
                  {matches.map((item: any, index: number) => (
                    <View 
                      key={index}
                      className={`flex-row items-center justify-between p-4 ${index !== matches.length - 1 ? 'border-b border-white/5' : ''}`}
                    >
                      <View className="flex-1 mr-4">
                        <Text className="text-white/90 font-bold text-sm" numberOfLines={1}>{item.name}</Text>
                        <Text className="text-white/40 text-[10px]">Sync verified</Text>
                      </View>
                      <View className="flex-row items-center gap-3">
                        <Text className="text-white font-black text-sm">{item.current_on_hand}</Text>
                        <ShieldCheck color="#10B981" size={16} />
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {reconciliationData?.length === 0 && (
              <View className="items-center justify-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
                <Database color="white" size={48} opacity={0.2} />
                <Text className="text-white/40 mt-4 font-bold text-center px-10">No stock levels found for this store to reconcile.</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Footer Action */}
      {discrepancies.length > 0 && (
        <View className="p-4 bg-background-page">
          <TouchableOpacity 
            onPress={() => navigation.navigate('StockAdjustment', { storeId, productId: discrepancies[0].product_id, prefillDrift: discrepancies[0].drift })}
            className="bg-ventureroot-green py-4 rounded-2xl items-center shadow-lg shadow-emerald-900/20"
          >
            <Text className="text-white font-black text-base uppercase tracking-widest">Fix Next Discrepancy</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

export default InventoryReconciliationScreen;
// @ts-nocheck
