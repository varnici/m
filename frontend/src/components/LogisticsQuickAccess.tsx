/*
 * Dashboard quick access widget for VentureRoute logistics.
 * Shows active routes and allows quick actions.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface QuickRoute {
  id: string;
  route_number: string;
  fill_percentage: number;
  status: string;
  member_count: number;
  your_cost_kobo: number;
  estimated_departure?: string;
}

interface LogisticsQuickAccessProps {
  onNavigateToRoute?: (routeId: string) => void;
  onNavigateToCreateRequest?: () => void;
}

export const LogisticsQuickAccess: React.FC<LogisticsQuickAccessProps> = ({
  onNavigateToRoute = () => {},
  onNavigateToCreateRequest = () => {},
}) => {
  const [loading, setLoading] = useState(true);
  const [activeRoute, setActiveRoute] = useState<QuickRoute | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    loadActiveRoute();
  }, []);

  const loadActiveRoute = async () => {
    try {
      setLoading(true);
      // Mock data for MVP
      const mockRoute: QuickRoute = {
        id: 'route-001',
        route_number: 'RT-20240507-ABC12345',
        fill_percentage: 65,
        status: 'grouped',
        member_count: 4,
        your_cost_kobo: 30000,
        estimated_departure: '2024-05-08T09:00:00Z',
      };

      setActiveRoute(mockRoute);
    } catch (error) {
      console.error('Failed to load route:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatKobo = (kobo: number): string => {
    const naira = kobo / 100;
    return `₦${naira.toLocaleString('en-NG')}`;
  };

  const getStatusEmoji = (status: string): string => {
    switch (status) {
      case 'grouped':
        return '📦';
      case 'payment_locked':
        return '🔒';
      case 'ready_dispatch':
        return '✅';
      case 'in_transit':
        return '🚚';
      case 'delivered':
        return '🎉';
      default:
        return '⏳';
    }
  };

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      grouped: 'Route Grouped',
      payment_locked: 'Payment Locked',
      ready_dispatch: 'Ready to Dispatch',
      in_transit: 'In Transit',
      delivered: 'Delivered',
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <View className="bg-white rounded-lg p-4 mb-4">
        <View className="flex-row justify-between items-center">
          <Text className="font-bold text-gray-900">VentureRoute Logistics</Text>
          <ActivityIndicator size="small" color="#3B82F6" />
        </View>
      </View>
    );
  }

  if (!activeRoute) {
    return (
      <TouchableOpacity
        className="bg-blue-600 rounded-lg p-4 mb-4"
        onPress={onNavigateToCreateRequest}
      >
        <View className="flex-row justify-between items-center">
          <View className="flex-1">
            <Text className="text-white font-bold text-lg">Pool Your Delivery</Text>
            <Text className="text-blue-100 text-sm mt-1">Save up to 60% on logistics</Text>
          </View>
          <MaterialCommunityIcons name="arrow-right" size={24} color="white" />
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View className="mb-4">
      {/* Main Card */}
      <LinearGradient
        colors={['#DBEAFE', '#E0E7FF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: 8, padding: 16, borderWidth: 1, borderColor: '#BFDBFE' }}
      >
        {/* Header */}
        <View className="flex-row justify-between items-start mb-3">
          <View className="flex-1">
            <View className="flex-row items-center">
              <Text className="text-2xl mr-2">{getStatusEmoji(activeRoute.status)}</Text>
              <View>
                <Text className="font-bold text-gray-900">{activeRoute.route_number}</Text>
                <Text className="text-blue-600 text-xs font-bold mt-1">
                  {getStatusLabel(activeRoute.status)}
                </Text>
              </View>
            </View>
          </View>
          <TouchableOpacity onPress={() => setCollapsed(!collapsed)}>
            <Ionicons
              name={collapsed ? 'chevron-down' : 'chevron-up'}
              size={20}
              color="#1F2937"
            />
          </TouchableOpacity>
        </View>

        {/* Summary Row */}
        <View className="bg-white/60 rounded p-3 mb-3">
          <View className="flex-row justify-between items-center">
            <View className="flex-1 items-center">
              <Text className="text-gray-600 text-xs mb-1">Members</Text>
              <Text className="font-bold text-gray-900 text-lg">{activeRoute.member_count}</Text>
            </View>
            <View className="w-px h-8 bg-gray-300" />
            <View className="flex-1 items-center">
              <Text className="text-gray-600 text-xs mb-1">Your Cost</Text>
              <Text className="font-bold text-blue-600 text-lg">
                {formatKobo(activeRoute.your_cost_kobo)}
              </Text>
            </View>
            <View className="w-px h-8 bg-gray-300" />
            <View className="flex-1 items-center">
              <Text className="text-gray-600 text-xs mb-1">Fill</Text>
              <Text className="font-bold text-green-600 text-lg">{activeRoute.fill_percentage}%</Text>
            </View>
          </View>
        </View>

        {/* Fill Progress Bar */}
        <View className="mb-3">
          <View className="h-2 bg-gray-300 rounded-full overflow-hidden">
            <LinearGradient
              colors={['#10B981', '#3B82F6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ height: '100%', borderRadius: 9999, width: `${activeRoute.fill_percentage}%` }}
            />
          </View>
          <Text className="text-gray-600 text-xs mt-1">
            {activeRoute.fill_percentage > 85
              ? '🎯 Route optimized for dispatch'
              : '📦 More items = Lower cost per unit'}
          </Text>
        </View>

        {/* Expanded Content */}
        {!collapsed && (
          <View className="border-t border-blue-200 pt-3 mt-3">
            {/* Savings Card */}
            <View className="bg-emerald-100/60 rounded p-3 mb-3 border border-emerald-200 flex-row items-center">
              <MaterialCommunityIcons name="piggy-bank" size={20} color="#059669" />
              <View className="flex-1 ml-3">
                <Text className="text-emerald-900 font-bold text-sm">
                  💰 Save ~60% vs solo delivery
                </Text>
                <Text className="text-emerald-800 text-xs mt-1">
                  When route is dispatched, you pay {formatKobo(activeRoute.your_cost_kobo)}
                </Text>
              </View>
            </View>

            {/* Actions */}
            <View className="flex-row gap-2">
              <TouchableOpacity
                className="flex-1 bg-blue-600 rounded py-3"
                onPress={() => onNavigateToRoute(activeRoute.id)}
              >
                <View className="flex-row justify-center items-center">
                  <MaterialCommunityIcons name="map-marker-path" size={16} color="white" />
                  <Text className="text-white font-bold ml-2 text-sm">View Route</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-1 bg-blue-100 rounded py-3 border border-blue-300"
                onPress={() => {}}
              >
                <View className="flex-row justify-center items-center">
                  <MaterialCommunityIcons name="qrcode" size={16} color="#3B82F6" />
                  <Text className="text-blue-600 font-bold ml-2 text-sm">QR Code</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </LinearGradient>

      {/* Tip Section */}
      <View className="bg-amber-50 rounded-lg p-3 mt-2 border border-amber-200 flex-row">
        <Ionicons name="information-circle" size={16} color="#D97706" />
        <Text className="text-amber-900 text-xs ml-2 flex-1">
          Payment is locked until you confirm pickup with QR scan. No payment = No dispatch.
        </Text>
      </View>
    </View>
  );
};

export default LogisticsQuickAccess;
