import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Bell,
  Check,
  ShoppingBag,
  Truck,
  ShieldAlert,
  TrendingUp,
  Award,
} from 'lucide-react-native';
import type { RootStackScreenProps } from '@/navigation/types';

type Notification = {
  id: string;
  title: string;
  body: string;
  type: 'transaction' | 'logistics' | 'security' | 'savings' | 'general';
  time: string;
  unread: boolean;
  dateGroup: 'Today' | 'Yesterday' | 'Earlier';
};

const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    title: '₦45,000 Loan Approved',
    body: 'Your working capital loan request for store expansion has been approved. Funds are now available in your VentureRoot wallet.',
    type: 'transaction',
    time: '2 hours ago',
    unread: true,
    dateGroup: 'Today',
  },
  {
    id: '2',
    title: 'Cluster Pool Delivery Complete',
    body: 'The wholesale group-buy of sugar and flour has successfully arrived at pickup point Cluster-Ikeja-A.',
    type: 'logistics',
    time: '4 hours ago',
    unread: true,
    dateGroup: 'Today',
  },
  {
    id: '3',
    title: 'New Security Login detected',
    body: 'A new login attempt was verified from an Android device in Lagos at 10:14 AM.',
    type: 'security',
    time: 'Today, 10:14 AM',
    unread: false,
    dateGroup: 'Today',
  },
  {
    id: '4',
    title: 'Daily Sales Streak! 🔥',
    body: 'Congratulations! You hit your sales recording target 5 days in a row. +150 Trust Points earned.',
    type: 'savings',
    time: 'Yesterday, 6:30 PM',
    unread: false,
    dateGroup: 'Yesterday',
  },
  {
    id: '5',
    title: 'Wallet Overdraw Protection Active',
    body: 'VentureRoot smart-escrow safe locks have been successfully updated to guard your active balances.',
    type: 'security',
    time: 'Yesterday, 9:15 AM',
    unread: false,
    dateGroup: 'Yesterday',
  },
  {
    id: '6',
    title: 'Linked Access Bank Account Match',
    body: 'Your linked bank account ending in **4821 has been successfully verified via BVN name matching.',
    type: 'transaction',
    time: 'May 18, 2026',
    unread: false,
    dateGroup: 'Earlier',
  },
];

const NotificationsScreen = ({ navigation }: RootStackScreenProps<'Notifications'>) => {
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
  };

  const toggleReadStatus = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, unread: !n.unread } : n));
  };

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'transaction':
        return <ShoppingBag size={18} color="#2563EB" />;
      case 'logistics':
        return <Truck size={18} color="#D97706" />;
      case 'security':
        return <ShieldAlert size={18} color="#EF4444" />;
      case 'savings':
        return <Award size={18} color="#059669" />;
      default:
        return <Bell size={18} color="#6B7280" />;
    }
  };

  const getIconBg = (type: Notification['type']) => {
    switch (type) {
      case 'transaction':
        return 'bg-blue-50';
      case 'logistics':
        return 'bg-amber-50';
      case 'security':
        return 'bg-red-50';
      case 'savings':
        return 'bg-emerald-50';
      default:
        return 'bg-slate-50';
    }
  };

  const renderGroup = (groupName: Notification['dateGroup']) => {
    const groupItems = notifications.filter(n => n.dateGroup === groupName);
    if (groupItems.length === 0) return null;

    return (
      <View key={groupName} className="mb-6">
        <Text className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">
          {groupName}
        </Text>
        <View className="gap-3">
          {groupItems.map(item => (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.7}
              onPress={() => toggleReadStatus(item.id)}
              className={`flex-row p-4 rounded-2xl border ${
                item.unread
                  ? 'bg-emerald-50/20 border-emerald-100/60 shadow-sm'
                  : 'bg-white border-slate-100'
              }`}
            >
              <View className={`w-10 h-10 rounded-xl items-center justify-center mr-3 ${getIconBg(item.type)}`}>
                {getIcon(item.type)}
              </View>

              <View className="flex-1">
                <View className="flex-row items-center justify-between">
                  <Text className={`text-sm font-bold text-slate-900 ${item.unread ? 'text-emerald-950 font-black' : ''}`}>
                    {item.title}
                  </Text>
                  {item.unread && (
                    <View className="w-2 h-2 rounded-full bg-emerald-600" />
                  )}
                </View>
                <Text className="text-slate-500 text-xs mt-1 leading-relaxed">
                  {item.body}
                </Text>
                <Text className="text-[10px] text-slate-400 mt-2 font-medium">
                  {item.time}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const hasUnread = notifications.some(n => n.unread);

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <StatusBar barStyle="dark-content" />
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        
        {/* Header */}
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
              onPress={markAllRead}
              className="flex-row items-center bg-slate-100 px-3 py-1.5 rounded-full"
            >
              <Check size={12} color="#475569" />
              <Text className="text-slate-700 text-[10px] font-bold ml-1">Mark all read</Text>
            </TouchableOpacity>
          ) : (
            <View className="w-10" />
          )}
        </View>

        {/* Scrollable feed */}
        <ScrollView
          className="flex-1 px-4 pt-4"
          showsVerticalScrollIndicator={false}
        >
          {renderGroup('Today')}
          {renderGroup('Yesterday')}
          {renderGroup('Earlier')}
          <View className="h-10" />
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
};

export default NotificationsScreen;
