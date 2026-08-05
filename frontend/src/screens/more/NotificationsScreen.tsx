import React, { useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Animated,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Bell,
  Check,
  ShoppingBag,
  Truck,
  ShieldAlert,
  Award,
  PackageSearch,
  Wallet,
  Receipt,
} from 'lucide-react-native';
import { isToday, isYesterday, format, formatDistanceToNowStrict } from 'date-fns';
import type { RootStackScreenProps } from '@/navigation/types';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '@/hooks/useNotifications';
import type { AppNotification, NotificationType } from '@/services/notificationService';

type DateGroup = 'Today' | 'Yesterday' | 'Earlier';

function dateGroupOf(createdAt: string): DateGroup {
  const d = new Date(createdAt);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return 'Earlier';
}

function timeLabelOf(createdAt: string): string {
  const d = new Date(createdAt);
  if (isToday(d)) return `${formatDistanceToNowStrict(d)} ago`;
  if (isYesterday(d)) return `Yesterday, ${format(d, 'h:mm a')}`;
  return format(d, 'MMM d, yyyy');
}

const ICON_BY_TYPE: Record<NotificationType, { Icon: typeof Bell; bg: string; color: string }> = {
  loan_status: { Icon: ShoppingBag, bg: 'bg-blue-50', color: '#2563EB' },
  payment_due: { Icon: Wallet, bg: 'bg-amber-50', color: '#D97706' },
  credit_limit: { Icon: Award, bg: 'bg-emerald-50', color: '#059669' },
  system: { Icon: Bell, bg: 'bg-slate-50', color: '#6B7280' },
  order_request: { Icon: PackageSearch, bg: 'bg-indigo-50', color: '#4F46E5' },
  fund_transfer: { Icon: Truck, bg: 'bg-amber-50', color: '#D97706' },
  payment_receipt: { Icon: Receipt, bg: 'bg-emerald-50', color: '#059669' },
};

const NotificationsScreen = ({ navigation }: RootStackScreenProps<'Notifications'>) => {
  const { data, isLoading, refetch, isFetching } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const groups = useMemo(() => {
    const items = data?.items || [];
    const byGroup: Record<DateGroup, AppNotification[]> = { Today: [], Yesterday: [], Earlier: [] };
    items.forEach((n) => byGroup[dateGroupOf(n.created_at)].push(n));
    return byGroup;
  }, [data]);

  const hasUnread = (data?.unread_count ?? 0) > 0;

  const renderGroup = (groupName: DateGroup) => {
    const groupItems = groups[groupName];
    if (groupItems.length === 0) return null;

    return (
      <View key={groupName} className="mb-6">
        <Text className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">
          {groupName}
        </Text>
        <View className="gap-3">
          {groupItems.map((item) => {
            const { Icon, bg, color } = ICON_BY_TYPE[item.type] || ICON_BY_TYPE.system;
            return (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.7}
                onPress={() => {
                  if (!item.read) markRead.mutate(item.id);
                  if (
                    (item.type === 'fund_transfer' || item.type === 'payment_receipt') &&
                    item.related_entity_type === 'trade_order' &&
                    item.related_entity_id
                  ) {
                    navigation.navigate('FundTransferReceipt', { orderId: item.related_entity_id });
                  }
                }}
                className={`flex-row p-4 rounded-2xl border ${
                  !item.read
                    ? 'bg-emerald-50/20 border-emerald-100/60 shadow-sm'
                    : 'bg-white border-slate-100'
                }`}
              >
                <View className={`w-10 h-10 rounded-xl items-center justify-center mr-3 ${bg}`}>
                  <Icon size={18} color={color} />
                </View>

                <View className="flex-1">
                  <View className="flex-row items-center justify-between">
                    <Text
                      className={`text-sm font-bold text-slate-900 flex-1 mr-2 ${!item.read ? 'text-emerald-950 font-black' : ''}`}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    {!item.read && <View className="w-2 h-2 rounded-full bg-emerald-600" />}
                  </View>
                  <Text className="text-slate-500 text-xs mt-1 leading-relaxed">{item.message}</Text>
                  <Text className="text-[10px] text-slate-400 mt-2 font-medium">
                    {timeLabelOf(item.created_at)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <StatusBar barStyle="dark-content" />
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-slate-100">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center"
          >
            <ChevronLeft size={24} color="#1E293B" />
          </TouchableOpacity>
          <Text className="text-slate-900 font-extrabold text-base">Notifications</Text>
          {hasUnread ? (
            <TouchableOpacity
              onPress={() => markAllRead.mutate()}
              className="flex-row items-center bg-slate-100 px-3 py-1.5 rounded-full"
            >
              <Check size={12} color="#475569" />
              <Text className="text-slate-700 text-[10px] font-bold ml-1">Mark all read</Text>
            </TouchableOpacity>
          ) : (
            <View className="w-10" />
          )}
        </View>

        <ScrollView
          className="flex-1 px-4 pt-4"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor="#059669" />
          }
        >
          {isLoading ? (
            <View className="items-center py-16">
              <ActivityIndicator size="large" color="#059669" />
            </View>
          ) : (data?.items.length ?? 0) === 0 ? (
            <View className="items-center py-16 px-8">
              <Bell size={40} color="#CBD5E1" />
              <Text className="text-slate-900 font-bold mt-3">No notifications yet</Text>
              <Text className="text-slate-400 text-xs text-center mt-1">
                Order requests, fund transfers, and account alerts will show up here.
              </Text>
            </View>
          ) : (
            <>
              {renderGroup('Today')}
              {renderGroup('Yesterday')}
              {renderGroup('Earlier')}
            </>
          )}
          <View className="h-10" />
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
};

export default NotificationsScreen;
