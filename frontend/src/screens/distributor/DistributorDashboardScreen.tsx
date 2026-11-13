import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Bell, ChevronRight, ShieldCheck, ShieldAlert, Package, Wallet, ClipboardList, Users, Tag,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { RootStackNavigationProp } from '@/navigation/types';
import AppHeader from '@/components/ui/AppHeader';
import { useInventoryDashboard } from '@/hooks/useInventory';
import { useNotifications } from '@/hooks/useNotifications';
import { useMyDistributorProfile } from '@/hooks/useDistributorProfile';
import { useTradeOrders } from '@/hooks/useTradeOrders';

const DistributorDashboardScreen = () => {
  const navigation = useNavigation<RootStackNavigationProp<'DistributorHome'>>();
  const { data: dashboardData, isLoading: dashboardLoading, refetch: refetchDashboard } = useInventoryDashboard();
  const { data: notificationData, isFetching: notificationsFetching, refetch: refetchNotifications } = useNotifications();
  const { data: profile, isLoading: profileLoading } = useMyDistributorProfile();
  const { data: orders = [] } = useTradeOrders();

  const stockValue = dashboardData?.total_inventory_value_kobo || 0;
  const recentNotifications = (notificationData?.items || []).slice(0, 4);
  const isRefreshing = dashboardLoading || notificationsFetching;
  const ordersNeedingAction = orders.filter((o) => o.status === 'draft' || o.status === 'held');
  const valueAtStake = ordersNeedingAction.reduce((t, o) => t + o.total_kobo, 0);

  return (
    <SafeAreaView className="flex-1 bg-background-page" edges={['bottom', 'left', 'right']}>
      <AppHeader
        title="Distributor"
        subtitle={profile?.company_name || 'Warehouse dashboard'}
        rightAction={
          <TouchableOpacity
            onPress={() => navigation.navigate('Notifications')}
            className="p-2 rounded-xl bg-gray-100"
            accessibilityLabel="Notifications"
          >
            <View>
              <Bell size={18} color="#374151" />
              {(notificationData?.unread_count ?? 0) > 0 && (
                <View className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500" />
              )}
            </View>
          </TouchableOpacity>
        }
      />

      <ScrollView
        className="flex-1 px-4 pt-4"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              refetchDashboard();
              refetchNotifications();
            }}
            tintColor="#004D2C"
          />
        }
      >
        {!profileLoading && profile && (
          <TouchableOpacity
            className={`flex-row items-center p-4 rounded-2xl border mb-4 ${
              profile.verified ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'
            }`}
          >
            {profile.verified ? (
              <ShieldCheck size={20} color="#16654A" />
            ) : (
              <ShieldAlert size={20} color="#B0730C" />
            )}
            <View className="flex-1 ml-3">
              <Text className={`font-bold text-sm ${profile.verified ? 'text-emerald-900' : 'text-amber-900'}`}>
                {profile.verified ? 'Verified distributor' : 'Verification pending'}
              </Text>
              <Text className={`text-xs mt-0.5 ${profile.verified ? 'text-emerald-700' : 'text-amber-700'}`}>
                {profile.verified
                  ? 'Business owners can find and order from your catalog'
                  : 'Complete verification to appear in the distributor directory'}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {dashboardLoading ? (
          <View className="py-8 items-center">
            <ActivityIndicator size="large" color="#004D2C" />
          </View>
        ) : (
          <View className="flex-row gap-3 mb-4">
            <View className="bg-white p-4 rounded-2xl border border-gray-100 flex-1">
              <Text className="text-gray-400 text-[10px] font-bold uppercase mb-1">Warehouse stock value</Text>
              <Text className="text-gray-900 text-xl font-black">₦{(stockValue / 100).toLocaleString()}</Text>
            </View>
            <TouchableOpacity
              className={`p-4 rounded-2xl border flex-1 ${ordersNeedingAction.length > 0 ? 'bg-amber-50 border-amber-100' : 'bg-white border-gray-100'}`}
              onPress={() => navigation.navigate('DistributorOrders')}
            >
              <Text className={`text-[10px] font-bold uppercase mb-1 ${ordersNeedingAction.length > 0 ? 'text-amber-700' : 'text-gray-400'}`}>
                Needs your action
              </Text>
              <Text className={`text-xl font-black ${ordersNeedingAction.length > 0 ? 'text-amber-900' : 'text-gray-900'}`}>
                {ordersNeedingAction.length} order{ordersNeedingAction.length === 1 ? '' : 's'}
              </Text>
              {valueAtStake > 0 && (
                <Text className="text-amber-700 text-[10px] mt-0.5">₦{(valueAtStake / 100).toLocaleString()} reserved, unpaid</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        <View className="flex-row flex-wrap gap-3 mb-4">
          {[
            { label: 'Inventory', icon: Package, route: 'InventoryManager' as const, tint: '#ECFDF5', color: '#059669' },
            { label: 'Orders', icon: ClipboardList, route: 'DistributorOrders' as const, tint: '#EFF6FF', color: '#2563EB' },
            { label: 'Customers', icon: Users, route: 'DistributorCustomers' as const, tint: '#FEF3C7', color: '#B0730C' },
            { label: 'Catalogue', icon: Tag, route: 'DistributorCatalogManage' as const, tint: '#F3E8FF', color: '#7E22CE' },
            { label: 'Wallet', icon: Wallet, route: 'Wallet' as const, tint: '#FDF4FF', color: '#A21CAF' },
          ].map((item) => (
            <TouchableOpacity
              key={item.route}
              className="bg-white border border-gray-100 rounded-2xl p-4 items-center"
              style={{ width: '31%' }}
              onPress={() => navigation.navigate(item.route as never)}
            >
              <View className="w-10 h-10 rounded-xl items-center justify-center mb-2" style={{ backgroundColor: item.tint }}>
                <item.icon size={20} color={item.color} />
              </View>
              <Text className="text-gray-900 font-bold text-xs text-center">{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Recent activity</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
            <Text className="text-emerald-700 font-bold text-xs">See all</Text>
          </TouchableOpacity>
        </View>

        {recentNotifications.length === 0 ? (
          <View className="bg-white rounded-2xl border border-gray-100 border-dashed p-6 items-center mb-8">
            <Bell size={28} color="#D1D5DB" />
            <Text className="text-gray-400 text-xs mt-2 text-center">
              Order requests and fund transfers will show up here.
            </Text>
          </View>
        ) : (
          <View className="gap-2 mb-8">
            {recentNotifications.map((n) => (
              <TouchableOpacity
                key={n.id}
                className={`flex-row items-center p-3 rounded-xl border ${
                  !n.read ? 'bg-emerald-50/40 border-emerald-100' : 'bg-white border-gray-100'
                }`}
                onPress={() => {
                  if (
                    (n.type === 'fund_transfer' || n.type === 'payment_receipt') &&
                    n.related_entity_type === 'trade_order' &&
                    n.related_entity_id
                  ) {
                    navigation.navigate('FundTransferReceipt', { orderId: n.related_entity_id });
                  } else {
                    navigation.navigate('Notifications');
                  }
                }}
              >
                <View className="flex-1">
                  <Text className="text-gray-900 font-bold text-xs" numberOfLines={1}>{n.title}</Text>
                  <Text className="text-gray-400 text-[11px] mt-0.5" numberOfLines={1}>{n.message}</Text>
                </View>
                <ChevronRight size={16} color="#D1D5DB" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View className="h-16" />
      </ScrollView>
    </SafeAreaView>
  );
};

export default DistributorDashboardScreen;
