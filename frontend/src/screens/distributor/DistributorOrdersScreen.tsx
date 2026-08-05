import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ClipboardList } from 'lucide-react-native';
import AppHeader from '@/components/ui/AppHeader';

/**
 * Incoming order requests from business owners — populated once the
 * cross-tenant distributor-ordering endpoints exist (see plan Phase D).
 */
const DistributorOrdersScreen = () => {
  return (
    <SafeAreaView className="flex-1 bg-background-page" edges={['bottom', 'left', 'right']}>
      <AppHeader title="Orders" showBack={false} />
      <View className="flex-1 items-center justify-center px-8">
        <ClipboardList size={40} color="#D1D5DB" />
        <Text className="text-gray-900 font-bold mt-3">No order requests yet</Text>
        <Text className="text-gray-400 text-xs text-center mt-1">
          When a business owner orders from your catalog, it will show up here.
        </Text>
      </View>
    </SafeAreaView>
  );
};

export default DistributorOrdersScreen;
