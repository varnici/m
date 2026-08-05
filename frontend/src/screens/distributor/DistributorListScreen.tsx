import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Truck, ShieldCheck, ChevronRight } from 'lucide-react-native';
import type { RootStackScreenProps } from '@/navigation/types';
import AppHeader from '@/components/ui/AppHeader';
import { useDistributors } from '@/hooks/useDistributorProfile';
import { colors } from '@/theme/colors';

const DistributorListScreen = ({ navigation }: RootStackScreenProps<'DistributorList'>) => {
  const { data, isLoading } = useDistributors(true);

  return (
    <SafeAreaView className="flex-1 bg-background-page" edges={['bottom', 'left', 'right']}>
      <AppHeader title="Distributors" subtitle="Order stock on your trade credit" />

      <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <ActivityIndicator size="large" color={colors.ventureroot.green} style={{ marginTop: 40 }} />
        ) : (data?.items.length ?? 0) === 0 ? (
          <View className="items-center py-16 px-8">
            <Truck size={40} color="#D1D5DB" />
            <Text className="text-gray-900 font-bold mt-3">No verified distributors yet</Text>
            <Text className="text-gray-400 text-xs text-center mt-1">
              Check back once distributors in your area are verified.
            </Text>
          </View>
        ) : (
          <View className="gap-3 pb-8">
            {data!.items.map((d) => (
              <TouchableOpacity
                key={d.id}
                className="bg-white rounded-2xl border border-gray-100 p-4 flex-row items-center"
                onPress={() =>
                  navigation.navigate('DistributorCatalog', {
                    distributorId: d.user_id,
                    distributorName: d.company_name || d.business_name || 'Distributor',
                  })
                }
              >
                <View className="w-11 h-11 rounded-xl bg-emerald-50 items-center justify-center mr-3">
                  <Truck size={20} color="#16654A" />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-900 font-bold text-sm">
                    {d.company_name || d.business_name || 'Distributor'}
                  </Text>
                  <View className="flex-row items-center mt-1">
                    <ShieldCheck size={12} color="#16654A" />
                    <Text className="text-emerald-700 text-[11px] font-bold ml-1">Verified</Text>
                    {!!d.warehouse_address && (
                      <Text className="text-gray-400 text-[11px] ml-2" numberOfLines={1}>
                        · {d.warehouse_address}
                      </Text>
                    )}
                  </View>
                </View>
                <ChevronRight size={18} color="#D1D5DB" />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default DistributorListScreen;
