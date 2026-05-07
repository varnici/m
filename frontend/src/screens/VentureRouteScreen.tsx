/**
 * VentureRouteScreen.tsx
 * Community logistics coordination — VentureRoot
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

// ============================================================================
// TYPES
// ============================================================================

interface RouteData {
  id: string;
  route_number: string;
  status: string;
  fill_percentage: number;
  total_retailers: number;
  total_cost_kobo: number;
  estimated_departure: string;
  lead_retailer_id: string;
}

interface RouteUIMember {
  id: string;
  retailer_id: string;
  individual_share_kobo: number;
  delivery_address: string;
  status: string;
  volumetric_units: number;
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  // --- Header ---
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 4,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    letterSpacing: 0.5,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  // --- Card section ---
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  // --- Progress ---
  progressTrack: {
    height: 14,
    backgroundColor: '#E5E7EB',
    borderRadius: 7,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 7,
  },
  progressLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  savingsHint: {
    marginTop: 10,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  savingsHintText: {
    fontSize: 12,
    color: '#1D4ED8',
    flex: 1,
    lineHeight: 18,
  },
  // --- Cost rows ---
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  costLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  costValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  // --- Member rows ---
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  memberStop: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  memberAddress: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  memberVU: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  memberShare: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 6,
    alignSelf: 'flex-end',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  // --- Tabs ---
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
  },
  // --- QR section ---
  qrButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 20,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  qrButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    marginTop: 8,
    fontSize: 15,
  },
  qrHelpText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  // --- Actions ---
  actionContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 10,
  },
  actionBtn: {
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // --- Empty / loading states ---
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 24,
  },
  centerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
  },
  centerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  centerLoadingText: {
    marginTop: 10,
    color: '#6B7280',
    fontSize: 14,
  },
  createBtn: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#3B82F6',
  },
  createBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  spacer: { height: 20 },
});

// ============================================================================
// COMPONENT
// ============================================================================

const VentureRouteScreen: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeRoute, setActiveRoute] = useState<RouteData | null>(null);
  const [routeMembers, setRouteMembers] = useState<RouteUIMember[]>([]);
  const [paymentLocked, setPaymentLocked] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'active' | 'history' | 'qr'>('active');

  // --------------------------------------------------------------------------
  // Lifecycle
  // --------------------------------------------------------------------------

  useEffect(() => {
    loadActiveRoute();
  }, []);

  // --------------------------------------------------------------------------
  // Data
  // --------------------------------------------------------------------------

  const loadActiveRoute = async () => {
    try {
      setLoading(true);
      // TODO: replace with real API call
      // const res = await fetch('/api/v1/logistics/routes/active');
      // const data = await res.json();
      mockLoadRoute();
    } catch {
      Alert.alert('Error', 'Failed to load routes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const mockLoadRoute = () => {
    setActiveRoute({
      id: 'route-001',
      route_number: 'RT-20240507-ABC12345',
      status: 'grouped',
      fill_percentage: 65,
      total_retailers: 4,
      total_cost_kobo: 120000,
      estimated_departure: '2024-05-08T09:00:00Z',
      lead_retailer_id: 'lead-001',
    });

    setRouteMembers([
      {
        id: 'member-1',
        retailer_id: 'r1',
        individual_share_kobo: 35000,
        delivery_address: 'Lekki Phase 1, Lagos',
        status: 'confirmed',
        volumetric_units: 12,
      },
      {
        id: 'member-2',
        retailer_id: 'r2',
        individual_share_kobo: 25000,
        delivery_address: 'Victoria Island, Lagos',
        status: 'pending',
        volumetric_units: 8,
      },
      {
        id: 'member-3',
        retailer_id: 'r3',
        individual_share_kobo: 30000,
        delivery_address: 'Ikoyi, Lagos',
        status: 'pending',
        volumetric_units: 10,
      },
      {
        id: 'member-4',
        retailer_id: 'r4',
        individual_share_kobo: 30000,
        delivery_address: 'Ajah, Lagos',
        status: 'pending',
        volumetric_units: 10,
      },
    ]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadActiveRoute();
    setRefreshing(false);
  };

  // --------------------------------------------------------------------------
  // Actions
  // --------------------------------------------------------------------------

  const handleLockPayment = () => {
    if (!activeRoute) return;
    const share = formatKobo(activeRoute.total_cost_kobo / activeRoute.total_retailers);
    Alert.alert(
      'Lock Payment',
      `Confirm escrow lock of ${share}?\n\nFunds are held until QR delivery confirmation.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm & Lock',
          onPress: () => {
            // TODO: POST /api/v1/logistics/payments/freeze
            setPaymentLocked(true);
            Alert.alert('✅ Payment Locked', 'Funds held in escrow until delivery QR scan.');
          },
        },
      ]
    );
  };

  const handleDispatchRoute = () => {
    if (!activeRoute) return;
    const pendingCount = routeMembers.filter((m) => m.status === 'pending').length;
    if (pendingCount > 0) {
      Alert.alert(
        'Payments Pending',
        `${pendingCount} member(s) have not locked payment yet. All members must confirm before dispatch.`
      );
      return;
    }
    Alert.alert(
      'Dispatch Route',
      'All payments confirmed. Send route to driver?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Dispatch',
          onPress: () => {
            // TODO: POST /api/v1/logistics/routes/dispatch
            Alert.alert('🚚 Route Dispatched', 'Driver has been notified. Track via HyperTrack.');
          },
        },
      ]
    );
  };

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  const formatKobo = (kobo: number): string =>
    new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(kobo / 100);

  const getStatusColor = (status: string): string => {
    const map: Record<string, string> = {
      grouped: '#3B82F6',
      payment_locked: '#8B5CF6',
      ready_dispatch: '#10B981',
      in_transit: '#F59E0B',
      delivered: '#6366F1',
    };
    return map[status] ?? '#6B7280';
  };

  const getStatusLabel = (status: string): string => {
    const map: Record<string, string> = {
      grouped: 'Route Grouped',
      payment_locked: 'Payment Locked',
      ready_dispatch: 'Ready to Dispatch',
      in_transit: 'In Transit',
      delivered: 'Delivered',
    };
    return map[status] ?? status;
  };

  const getProgressColor = (pct: number): string => {
    if (pct >= 90) return '#10B981';
    if (pct >= 60) return '#3B82F6';
    return '#F59E0B';
  };

  // How much each person would save if one more member joined
  const savingsIfOneMore = (route: RouteData): string => {
    const currentShare = route.total_cost_kobo / route.total_retailers;
    const newShare = route.total_cost_kobo / (route.total_retailers + 1);
    return formatKobo(currentShare - newShare);
  };

  // --------------------------------------------------------------------------
  // Loading / Empty states
  // --------------------------------------------------------------------------

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.centerLoadingText}>Loading your route…</Text>
      </View>
    );
  }

  if (!activeRoute) {
    return (
      <View style={styles.center}>
        <MaterialCommunityIcons name="truck-outline" size={72} color="#D1D5DB" />
        <Text style={styles.centerTitle}>No Active Routes</Text>
        <Text style={styles.centerSubtitle}>
          Submit a logistics request to join a VentureRoute cluster and split delivery costs with
          nearby retailers.
        </Text>
        <TouchableOpacity style={styles.createBtn}>
          <Text style={styles.createBtnText}>Create Request</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusColor = getStatusColor(activeRoute.status);
  const allLocked = routeMembers.every((m) => m.status === 'confirmed');

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      showsVerticalScrollIndicator={false}
    >
      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerSubtitle}>{activeRoute.route_number}</Text>
            <Text style={styles.headerTitle}>{getStatusLabel(activeRoute.status)}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: `${statusColor}18` }]}>
            <Text style={[styles.badgeText, { color: statusColor }]}>
              {activeRoute.total_retailers} Retailers
            </Text>
          </View>
        </View>
      </View>

      {/* ── FILL-TO-SAVE METER ─────────────────────────────────────────── */}
      <View style={styles.card}>
        <View style={[styles.headerRow, { marginBottom: 10 }]}>
          <Text style={styles.cardTitle}>Truck Utilization</Text>
          <Text
            style={{
              fontSize: 20,
              fontWeight: '800',
              color: getProgressColor(activeRoute.fill_percentage),
            }}
          >
            {activeRoute.fill_percentage}%
          </Text>
        </View>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${activeRoute.fill_percentage}%` as any,
                backgroundColor: getProgressColor(activeRoute.fill_percentage),
              },
            ]}
          />
        </View>

        <Text style={styles.progressLabel}>
          {activeRoute.fill_percentage >= 90
            ? '✅ Fully optimized — best rate locked in.'
            : `${100 - activeRoute.fill_percentage}% capacity still available`}
        </Text>

        {activeRoute.fill_percentage < 90 && (
          <View style={styles.savingsHint}>
            <Ionicons name="people-outline" size={16} color="#3B82F6" />
            <Text style={styles.savingsHintText}>
              If one more retailer joins this cluster, everyone saves{' '}
              <Text style={{ fontWeight: '700' }}>{savingsIfOneMore(activeRoute)}</Text> each.
              Share your route code!
            </Text>
          </View>
        )}
      </View>

      {/* ── COST BREAKDOWN ─────────────────────────────────────────────── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Cost Breakdown</Text>

        <View style={styles.costRow}>
          <Text style={styles.costLabel}>Total Trip Cost</Text>
          <Text style={styles.costValue}>{formatKobo(activeRoute.total_cost_kobo)}</Text>
        </View>

        <View style={styles.costRow}>
          <Text style={styles.costLabel}>
            Your Share ({activeRoute.total_retailers} members)
          </Text>
          <Text style={[styles.costValue, { color: '#3B82F6' }]}>
            {formatKobo(activeRoute.total_cost_kobo / activeRoute.total_retailers)}
          </Text>
        </View>

        <View style={[styles.costRow, { borderBottomWidth: 0 }]}>
          <Text style={styles.costLabel}>Savings vs Solo Delivery</Text>
          <Text style={[styles.costValue, { color: '#10B981' }]}>~60%</Text>
        </View>
      </View>

      {/* ── ROUTE MEMBERS ──────────────────────────────────────────────── */}
      <View style={styles.card}>
        <View style={[styles.headerRow, { marginBottom: 12 }]}>
          <Text style={styles.cardTitle}>Route Members</Text>
          <Text style={{ fontSize: 12, color: '#6B7280' }}>
            {routeMembers.filter((m) => m.status === 'confirmed').length}/
            {routeMembers.length} confirmed
          </Text>
        </View>

        {routeMembers.map((member, index) => (
          <View
            key={member.id}
            style={[
              styles.memberRow,
              index === routeMembers.length - 1 ? { borderBottomWidth: 0 } : {},
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.memberStop}>Stop {index + 1}</Text>
              <Text style={styles.memberAddress}>{member.delivery_address}</Text>
              <Text style={styles.memberVU}>{member.volumetric_units} Volumetric Units</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.memberShare}>
                {formatKobo(member.individual_share_kobo)}
              </Text>
              <View
                style={[
                  styles.statusPill,
                  {
                    backgroundColor:
                      member.status === 'confirmed' ? '#DCFCE7' : '#FEF3C7',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusPillText,
                    { color: member.status === 'confirmed' ? '#15803D' : '#B45309' },
                  ]}
                >
                  {member.status === 'confirmed' ? '✅ Locked' : '⏳ Pending'}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* ── TABS ───────────────────────────────────────────────────────── */}
      <View style={styles.tabRow}>
        {(['active', 'history', 'qr'] as const).map((tab) => {
          const active = selectedTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => setSelectedTab(tab)}
              style={[
                styles.tabButton,
                { borderBottomColor: active ? '#3B82F6' : 'transparent' },
              ]}
            >
              <Text style={[styles.tabText, { color: active ? '#3B82F6' : '#6B7280' }]}>
                {tab === 'active' ? '📍 Active' : tab === 'history' ? '📜 History' : '📱 QR'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── QR HANDSHAKE ───────────────────────────────────────────────── */}
      {selectedTab === 'qr' && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>QR Handshake — Proof of Delivery</Text>

          <TouchableOpacity style={styles.qrButton}>
            <MaterialCommunityIcons name="qrcode-scan" size={52} color="#FFFFFF" />
            <Text style={styles.qrButtonText}>Scan Package QR Code</Text>
          </TouchableOpacity>

          <Text style={styles.qrHelpText}>
            Scan the driver's QR code when collecting your goods from the terminal. This triggers
            escrow release — driver is only paid upon confirmed scan.
          </Text>
        </View>
      )}

      {/* ── ACTION BUTTONS ─────────────────────────────────────────────── */}
      <View style={styles.actionContainer}>
        {/* Lock Payment */}
        {!paymentLocked && activeRoute.status === 'grouped' && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#3B82F6' }]}
            onPress={handleLockPayment}
          >
            <Text style={styles.actionBtnText}>
              🔒 Lock Payment —{' '}
              {formatKobo(activeRoute.total_cost_kobo / activeRoute.total_retailers)}
            </Text>
          </TouchableOpacity>
        )}

        {/* Payment already locked */}
        {paymentLocked && !allLocked && (
          <View style={[styles.actionBtn, { backgroundColor: '#10B981' }]}>
            <Text style={styles.actionBtnText}>✅ Your Payment Locked</Text>
          </View>
        )}

        {/* Dispatch (shown once user has locked and all confirmed) */}
        {paymentLocked && allLocked && activeRoute.status === 'grouped' && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#8B5CF6' }]}
            onPress={handleDispatchRoute}
          >
            <Text style={styles.actionBtnText}>🚚 Dispatch Route to Driver</Text>
          </TouchableOpacity>
        )}

        {/* Refresh */}
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#F3F4F6' }]}
          onPress={onRefresh}
        >
          <Text style={[styles.actionBtnText, { color: '#374151' }]}>↻ Refresh Route</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.spacer} />
    </ScrollView>
  );
};

export default VentureRouteScreen;