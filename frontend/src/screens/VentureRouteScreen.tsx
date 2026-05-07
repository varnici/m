/**
 * VentureRouteScreen.tsx
 * Community logistics coordination — VentureRoot (v2 redesign)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';

const { width: SCREEN_W } = Dimensions.get('window');

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

interface RouteMember {
  id: string;
  retailer_id: string;
  individual_share_kobo: number;
  delivery_address: string;
  status: 'confirmed' | 'pending';
  volumetric_units: number;
  cargo_category: string;
}

interface LogisticsProvider {
  id: string;
  name: string;
  code: string;
  bgColor: string;
  fgColor: string;
  rating: string;
  ratePerVU: string;
  meta: string;
}

interface CargoCategory {
  id: string;
  name: string;
  icon: string;
  iconColor: string;
  bgColor: string;
  examples: string;
  vuRule: string;
}

interface SecurityEvent {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  iconColor: string;
  bgColor: string;
}

interface DriverInfo {
  name: string;
  initials: string;
  company: string;
  driverId: string;
  rating: string;
  trips: number;
  verified: boolean;
  bonded: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PROVIDERS: LogisticsProvider[] = [
  {
    id: 'gigl',
    name: 'GIGL Express',
    code: 'GK',
    bgColor: '#EFF6FF',
    fgColor: '#1D4ED8',
    rating: '4.8',
    ratePerVU: '₦850',
    meta: 'Pan-Lagos coverage · Next-day',
  },
  {
    id: 'kwik',
    name: 'Kwik Delivery',
    code: 'KW',
    bgColor: '#F0FDF4',
    fgColor: '#166534',
    rating: '4.6',
    ratePerVU: '₦720',
    meta: 'Island routes · Same-day',
  },
  {
    id: 'sendbox',
    name: 'Sendbox Logistics',
    code: 'SB',
    bgColor: '#FEF3C7',
    fgColor: '#B45309',
    rating: '4.5',
    ratePerVU: '₦680',
    meta: 'Mainland + Island · Tracked',
  },
  {
    id: 'gokada',
    name: 'Gokada Fleet',
    code: 'GF',
    bgColor: '#F5F3FF',
    fgColor: '#5B21B6',
    rating: '4.7',
    ratePerVU: '₦790',
    meta: 'Cluster-optimised · GPS',
  },
];

const CATEGORIES: CargoCategory[] = [
  {
    id: 'dry',
    name: 'Dry goods',
    icon: 'grain',
    iconColor: '#B45309',
    bgColor: '#FEF3C7',
    examples: 'Rice, flour, sugar',
    vuRule: '1 bag = 1 VU',
  },
  {
    id: 'fresh',
    name: 'Perishables',
    icon: 'leaf',
    iconColor: '#166534',
    bgColor: '#F0FDF4',
    examples: 'Tomatoes, fish, veg',
    vuRule: '1 crate = 2 VU',
  },
  {
    id: 'elec',
    name: 'Electronics',
    icon: 'mobile-alt',
    iconColor: '#1D4ED8',
    bgColor: '#EFF6FF',
    examples: 'Phones, gadgets',
    vuRule: '1 carton = 1.5 VU',
  },
  {
    id: 'bulk',
    name: 'Bulk / mixed',
    icon: 'box',
    iconColor: '#5B21B6',
    bgColor: '#F5F3FF',
    examples: 'Multiple categories',
    vuRule: 'Custom VU calc',
  },
];

const CAT_NOTES: Record<string, string> = {
  dry: 'Dry goods selected — all 4 members qualify for this cluster. Route is compatible.',
  fresh: 'Perishables selected — refrigerated truck required. 2 partners support this category.',
  elec: 'Electronics selected — padded transit box required. Insurance bumped to ₦2M cover.',
  bulk: 'Bulk / mixed selected — custom VU calculation will be applied at checkout.',
};

const SECURITY_EVENTS: SecurityEvent[] = [
  {
    id: '1',
    title: 'Pickup confirmed',
    subtitle: 'Driver scanned 4 of 4 packages at origin · 09:14',
    icon: 'checkmark',
    iconColor: '#166534',
    bgColor: '#F0FDF4',
  },
  {
    id: '2',
    title: 'On approved route',
    subtitle: 'Truck within cluster zone boundary · Real-time',
    icon: 'trail-sign',
    iconColor: '#1D4ED8',
    bgColor: '#EFF6FF',
  },
  {
    id: '3',
    title: 'Stop dwell alert armed',
    subtitle: 'Alert fires if stationary >10 min outside zone',
    icon: 'time',
    iconColor: '#B45309',
    bgColor: '#FEF3C7',
  },
];

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },

  // --- Dark Header ---
  darkHeader: {
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  statusTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  statusIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  routeNumber: {
    fontSize: 10,
    color: '#6B7280',
    letterSpacing: 0.4,
  },
  routeStatus: {
    fontSize: 17,
    fontWeight: '500',
    color: '#FFFFFF',
    marginTop: 2,
  },
  retailerBadge: {
    backgroundColor: 'rgba(59,130,246,0.2)',
    borderWidth: 0.5,
    borderColor: 'rgba(59,130,246,0.4)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  retailerBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#93C5FD',
  },

  // --- Map Section ---
  mapWrap: {
    position: 'relative',
    height: 200,
    backgroundColor: '#E8F0E9',
    overflow: 'hidden',
  },
  mapOverlay: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    pointerEvents: 'none',
  },
  mapBadge: {
    backgroundColor: '#FFFFFF',
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
  },
  mapBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#111827',
  },
  etaBadge: {
    backgroundColor: '#1D4ED8',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  etaBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  mapBottom: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  userPin: {
    backgroundColor: '#FFFFFF',
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pinText: {
    fontSize: 10,
    color: '#6B7280',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  insuredPin: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  insuredPinText: {
    fontSize: 10,
    color: '#166534',
  },

  // --- Section Labels ---
  sectionLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#9CA3AF',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // --- Card ---
  sec: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginTop: 0,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  secPad: {
    padding: 14,
  },
  secTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  // --- Provider Selector ---
  providerWrap: {
    position: 'relative',
  },
  providerSelect: {
    width: '100%',
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  providerDropdown: {
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 4,
    backgroundColor: '#FFFFFF',
  },
  providerItem: {
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F3F4F6',
  },
  providerItemSelected: {
    backgroundColor: '#EFF6FF',
  },
  pLogo: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pLogoText: {
    fontSize: 11,
    fontWeight: '500',
  },
  pName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#111827',
  },
  pMeta: {
    fontSize: 10,
    color: '#6B7280',
  },
  pRate: {
    marginLeft: 'auto',
    fontSize: 11,
    fontWeight: '500',
    color: '#0F6E56',
  },
  lockNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },
  lockNoteText: {
    fontSize: 10,
    color: '#9CA3AF',
  },

  // --- Cargo Categories ---
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  catCard: {
    width: (SCREEN_W - 56) / 2,
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#FFFFFF',
  },
  catCardSel: {
    borderWidth: 1.5,
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  catIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 7,
  },
  catName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#111827',
  },
  catCap: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  catVU: {
    fontSize: 10,
    fontWeight: '500',
    color: '#1D4ED8',
    marginTop: 3,
  },
  catNote: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  catNoteText: {
    fontSize: 11,
    flex: 1,
    lineHeight: 16,
  },

  // --- Fill Meter ---
  fillRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fillLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#111827',
  },
  fillPct: {
    fontSize: 16,
    fontWeight: '500',
  },
  track: {
    height: 12,
    backgroundColor: '#E5E7EB',
    borderRadius: 6,
    overflow: 'hidden',
  },
  fillBar: {
    height: '100%',
    borderRadius: 6,
  },
  fillSub: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
  },
  hintBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    gap: 7,
    alignItems: 'flex-start',
    marginTop: 8,
  },
  hintText: {
    fontSize: 11,
    color: '#1D4ED8',
    flex: 1,
    lineHeight: 16,
  },

  // --- Trust & Security ---
  trustRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
  trustBadge: {
    flex: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 0.5,
  },
  trustLabel: {
    fontSize: 10,
    fontWeight: '500',
    lineHeight: 14,
  },
  trustSub: {
    fontSize: 9,
    opacity: 0.8,
  },

  // --- Driver Card ---
  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: 0.5,
    borderTopColor: '#F3F4F6',
    marginTop: 12,
    paddingTop: 12,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#10B981',
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1D4ED8',
  },
  dName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#111827',
  },
  dMeta: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  stars: {
    fontSize: 12,
    color: '#F59E0B',
    letterSpacing: 1,
  },
  verifiedBadge: {
    backgroundColor: '#F0FDF4',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginBottom: 3,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#166534',
  },

  // --- Security Events ---
  eventsTitle: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 8,
    marginTop: 4,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 9,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F3F4F6',
  },
  alertIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#111827',
  },
  alertSub: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 1,
    lineHeight: 14,
  },

  // --- Route Members ---
  membersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  membersTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#111827',
  },
  membersCount: {
    fontSize: 11,
    color: '#6B7280',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F3F4F6',
  },
  stopNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopNumText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#1D4ED8',
  },
  mAddr: {
    fontSize: 12,
    fontWeight: '500',
    color: '#111827',
  },
  mVU: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 1,
  },
  mpill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 'auto',
    marginRight: 8,
  },
  mpillText: {
    fontSize: 10,
    fontWeight: '500',
  },
  mShare: {
    fontSize: 12,
    fontWeight: '500',
    color: '#111827',
    textAlign: 'right',
    minWidth: 40,
  },

  // --- Escrow & Payment ---
  escrowBanner: {
    backgroundColor: '#F0FDF4',
    borderWidth: 0.5,
    borderColor: '#86EFAC',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginHorizontal: 12,
    marginBottom: 10,
  },
  escrowText: {
    fontSize: 11,
    color: '#166534',
    lineHeight: 16,
    flex: 1,
  },
  btnLock: {
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
    marginHorizontal: 12,
  },
  btnLockText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  btnLocked: {
    backgroundColor: '#15803D',
  },

  // --- Loading / Empty ---
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
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
  centerLoadingText: {
    marginTop: 10,
    color: '#6B7280',
    fontSize: 14,
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
  const [routeMembers, setRouteMembers] = useState<RouteMember[]>([]);
  const [paymentLocked, setPaymentLocked] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<LogisticsProvider>(PROVIDERS[0]);
  const [providerDropdownOpen, setProviderDropdownOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('dry');
  const [etaMinutes, setEtaMinutes] = useState(14);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Live dot pulse animation
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // ETA countdown simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setEtaMinutes((prev) => (prev > 1 ? prev - 1 : 14));
    }, 30000); // decrease every 30s for demo
    return () => clearInterval(interval);
  }, []);

  // Load data
  useEffect(() => {
    loadActiveRoute();
  }, []);

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
        cargo_category: 'dry',
      },
      {
        id: 'member-2',
        retailer_id: 'r2',
        individual_share_kobo: 25000,
        delivery_address: 'Victoria Island, Lagos',
        status: 'pending',
        volumetric_units: 8,
        cargo_category: 'dry',
      },
      {
        id: 'member-3',
        retailer_id: 'r3',
        individual_share_kobo: 30000,
        delivery_address: 'Ikoyi, Lagos',
        status: 'pending',
        volumetric_units: 10,
        cargo_category: 'dry',
      },
      {
        id: 'member-4',
        retailer_id: 'r4',
        individual_share_kobo: 30000,
        delivery_address: 'Ajah, Lagos',
        status: 'pending',
        volumetric_units: 10,
        cargo_category: 'dry',
      },
    ]);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadActiveRoute();
    setRefreshing(false);
  }, []);

  // --------------------------------------------------------------------------
  // Actions
  // --------------------------------------------------------------------------

  const handleLockPayment = () => {
    if (!activeRoute) return;
    const share = formatKobo(activeRoute.total_cost_kobo / activeRoute.total_retailers);
    Alert.alert(
      'Lock Payment',
      `Confirm escrow lock of ${share}?\\n\\nFunds are held until QR delivery confirmation.`,
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

  const getProgressColor = (pct: number): string => {
    if (pct >= 90) return '#10B981';
    if (pct >= 60) return '#3B82F6';
    return '#F59E0B';
  };

  const savingsIfOneMore = (route: RouteData): string => {
    const currentShare = route.total_cost_kobo / route.total_retailers;
    const newShare = route.total_cost_kobo / (route.total_retailers + 1);
    return formatKobo(currentShare - newShare);
  };

  const totalVU = routeMembers.reduce((sum, m) => sum + m.volumetric_units, 0);
  const confirmedCount = routeMembers.filter((m) => m.status === 'confirmed').length;
  const allLocked = routeMembers.every((m) => m.status === 'confirmed');

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

  const progressColor = getProgressColor(activeRoute.fill_percentage);
  const catNoteColors = {
    dry: { bg: '#FEF3C7', text: '#B45309' },
    fresh: { bg: '#F0FDF4', text: '#166534' },
    elec: { bg: '#EFF6FF', text: '#1D4ED8' },
    bulk: { bg: '#F5F3FF', text: '#5B21B6' },
  };
  const noteColor = catNoteColors[selectedCategory as keyof typeof catNoteColors] || catNoteColors.dry;

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      showsVerticalScrollIndicator={false}
    >
      {/* ── DARK HEADER ────────────────────────────────────────────────── */}
      <View style={styles.darkHeader}>
        <View style={styles.statusBar}>
          <Text style={styles.statusTime}>9:41</Text>
          <Text style={styles.statusTitle}>VentureRoute</Text>
          <View style={styles.statusIcons}>
            <Ionicons name="wifi" size={14} color="#9CA3AF" />
            <Ionicons name="cellular" size={14} color="#9CA3AF" />
          </View>
        </View>
        <View style={styles.headerBottom}>
          <View>
            <Text style={styles.routeNumber}>{activeRoute.route_number}</Text>
            <Text style={styles.routeStatus}>Route Grouped</Text>
          </View>
          <View style={styles.retailerBadge}>
            <Text style={styles.retailerBadgeText}>{activeRoute.total_retailers} Retailers</Text>
          </View>
        </View>
      </View>

      {/* ── MAP SECTION ──────────────────────────────────────────────────── */}
      <View style={styles.mapWrap}>
        {/* Fallback map UI (since Mapbox is unavailable) */}
        <View style={{ flex: 1, backgroundColor: '#E8F0E9', justifyContent: 'center', alignItems: 'center' }}>
          <MaterialCommunityIcons name="map-marker-path" size={48} color="#B8C8BA" />
          <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 8 }}>Map preview unavailable</Text>
          <Text style={{ fontSize: 10, color: '#9CA3AF' }}>Lekki → V/Island → Ikoyi → Ajah</Text>
        </View>

        <View style={styles.mapOverlay}>
          <View style={styles.mapBadge}>
            <Animated.View style={[styles.liveDot, { opacity: pulseAnim }]} />
            <Text style={styles.mapBadgeText}>Live tracking</Text>
          </View>
          <View style={styles.etaBadge}>
            <Ionicons name="time-outline" size={12} color="#FFFFFF" />
            <Text style={styles.etaBadgeText}>ETA {etaMinutes} min</Text>
          </View>
        </View>

        <View style={styles.mapBottom}>
          <View style={styles.userPin}>
            <View style={[styles.dot, { backgroundColor: '#3B82F6' }]} />
            <Text style={styles.pinText}>You</Text>
          </View>
          <View style={styles.userPin}>
            <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
            <Text style={styles.pinText}>Truck</Text>
          </View>
          <View style={styles.userPin}>
            <View style={[styles.dot, { backgroundColor: '#F59E0B' }]} />
            <Text style={styles.pinText}>Stops (3)</Text>
          </View>
          <View style={[styles.userPin, styles.insuredPin, { marginLeft: 'auto' }]}>
            <Ionicons name="shield-checkmark" size={11} color="#166534" />
            <Text style={styles.insuredPinText}>Insured</Text>
          </View>
        </View>
      </View>

      {/* ── LOGISTICS PARTNER ──────────────────────────────────────────── */}
      <Text style={styles.sectionLabel}>Logistics Partner</Text>
      <View style={styles.sec}>
        <View style={styles.secPad}>
          <View style={styles.secTitle}>
            <MaterialCommunityIcons name="warehouse" size={14} color="#6B7280" />
            <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '500' }}>Select delivery partner</Text>
          </View>

          <View style={styles.providerWrap}>
            <TouchableOpacity
              style={styles.providerSelect}
              onPress={() => setProviderDropdownOpen(!providerDropdownOpen)}
              activeOpacity={0.8}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
                <View style={[styles.pLogo, { backgroundColor: selectedProvider.bgColor }]}>
                  <Text style={[styles.pLogoText, { color: selectedProvider.fgColor }]}>
                    {selectedProvider.code}
                  </Text>
                </View>
                <View>
                  <Text style={styles.pName}>{selectedProvider.name}</Text>
                  <Text style={styles.pMeta}>
                    Avg {selectedProvider.ratePerVU}/VU · {selectedProvider.rating}{' '}
                    <Text style={{ color: '#F59E0B' }}>★</Text>
                  </Text>
                </View>
              </View>
              <Ionicons
                name={providerDropdownOpen ? 'chevron-up' : 'chevron-down'}
                size={16}
                color="#6B7280"
              />
            </TouchableOpacity>

            {providerDropdownOpen && (
              <View style={styles.providerDropdown}>
                {PROVIDERS.map((provider) => (
                  <TouchableOpacity
                    key={provider.id}
                    style={[
                      styles.providerItem,
                      provider.id === selectedProvider.id && styles.providerItemSelected,
                    ]}
                    onPress={() => {
                      setSelectedProvider(provider);
                      setProviderDropdownOpen(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.pLogo, { backgroundColor: provider.bgColor }]}>
                      <Text style={[styles.pLogoText, { color: provider.fgColor }]}>
                        {provider.code}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pName}>{provider.name}</Text>
                      <Text style={styles.pMeta}>{provider.meta}</Text>
                    </View>
                    <Text style={styles.pRate}>{provider.ratePerVU}/VU</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.lockNote}>
              <Ionicons name="lock-closed" size={12} color="#9CA3AF" />
              <Text style={styles.lockNoteText}>
                Private partner list — vetted & bonded by VentureRoot
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* ── CARGO CATEGORY ─────────────────────────────────────────────── */}
      <Text style={styles.sectionLabel}>Cargo Category</Text>
      <View style={styles.sec}>
        <View style={styles.secPad}>
          <View style={styles.secTitle}>
            <MaterialCommunityIcons name="package-variant" size={14} color="#6B7280" />
            <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '500' }}>
              What is your cluster transporting?
            </Text>
          </View>

          <View style={styles.catGrid}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.catCard,
                  selectedCategory === cat.id && styles.catCardSel,
                ]}
                onPress={() => setSelectedCategory(cat.id)}
                activeOpacity={0.8}
              >
                <View style={[styles.catIcon, { backgroundColor: cat.bgColor }]}>
                  <FontAwesome5 name={cat.icon as any} size={17} color={cat.iconColor} />
                </View>
                <Text style={styles.catName}>{cat.name}</Text>
                <Text style={styles.catCap}>{cat.examples}</Text>
                <Text style={styles.catVU}>{cat.vuRule}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={[styles.catNote, { backgroundColor: noteColor.bg }]}>
            <Ionicons name="information-circle" size={14} color={noteColor.text} />
            <Text style={[styles.catNoteText, { color: noteColor.text }]}>
              {CAT_NOTES[selectedCategory]}
            </Text>
          </View>
        </View>
      </View>

      {/* ── TRUCK UTILIZATION ──────────────────────────────────────────── */}
      <Text style={styles.sectionLabel}>Truck Utilization</Text>
      <View style={[styles.sec, styles.secPad]}>
        <View style={styles.fillRow}>
          <Text style={styles.fillLabel}>Fill-to-save meter</Text>
          <Text style={[styles.fillPct, { color: progressColor }]}>
            {activeRoute.fill_percentage}%
          </Text>
        </View>
        <View style={styles.track}>
          <View
            style={[
              styles.fillBar,
              {
                width: `${activeRoute.fill_percentage}%`,
                backgroundColor: progressColor,
              },
            ]}
          />
        </View>
        <Text style={styles.fillSub}>
          {100 - activeRoute.fill_percentage}% space still available —{' '}
          <Text style={{ color: '#10B981', fontWeight: '500' }}>
            add 2 more members to drop cost by ₦150 each
          </Text>
        </Text>
        <View style={styles.hintBox}>
          <Ionicons name="people-outline" size={15} color="#1D4ED8" style={{ marginTop: 1 }} />
          <Text style={styles.hintText}>
            Share route code <Text style={{ fontWeight: '700' }}>RT-ABC12345</Text> — each new
            retailer that joins saves everyone money.
          </Text>
        </View>
      </View>

      {/* ── TRUST & SECURITY ───────────────────────────────────────────── */}
      <Text style={styles.sectionLabel}>Trust & Security</Text>
      <View style={[styles.sec, styles.secPad]}>
        <View style={styles.trustRow}>
          <View style={[styles.trustBadge, { backgroundColor: '#F0FDF4', borderColor: '#86EFAC' }]}>
            <Ionicons name="shield-checkmark" size={15} color="#166534" />
            <View>
              <Text style={[styles.trustLabel, { color: '#166534' }]}>VR Insured</Text>
              <Text style={[styles.trustSub, { color: '#166534' }]}>₦500k cover</Text>
            </View>
          </View>
          <View style={[styles.trustBadge, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
            <Ionicons name="lock-closed" size={15} color="#1D4ED8" />
            <View>
              <Text style={[styles.trustLabel, { color: '#1D4ED8' }]}>Escrow</Text>
              <Text style={[styles.trustSub, { color: '#1D4ED8' }]}>QR-release only</Text>
            </View>
          </View>
        </View>
        <View style={styles.trustRow}>
          <View style={[styles.trustBadge, { backgroundColor: '#F5F3FF', borderColor: '#DDD6FE' }]}>
            <Ionicons name="location" size={15} color="#5B21B6" />
            <View>
              <Text style={[styles.trustLabel, { color: '#5B21B6' }]}>GPS Live</Text>
              <Text style={[styles.trustSub, { color: '#5B21B6' }]}>HyperTrack</Text>
            </View>
          </View>
          <View style={[styles.trustBadge, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
            <Ionicons name="warning" size={15} color="#B45309" />
            <View>
              <Text style={[styles.trustLabel, { color: '#B45309' }]}>Area alerts</Text>
              <Text style={[styles.trustSub, { color: '#B45309' }]}>10-min rule</Text>
            </View>
          </View>
        </View>

        {/* Driver Card */}
        <View style={styles.driverCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>AO</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.dName}>Adewale Okonkwo</Text>
            <Text style={styles.dMeta}>GIGL Express · ID VR-DRV-0049</Text>
            <Text style={styles.stars}>
              ★★★★★{' '}
              <Text style={{ fontSize: 10, color: '#6B7280', fontWeight: '400' }}>
                4.9 · 347 trips
              </Text>
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>
                <Ionicons name="checkmark-circle" size={11} color="#166534" /> Verified
              </Text>
            </View>
            <Text style={{ fontSize: 10, color: '#6B7280' }}>Bonded</Text>
          </View>
        </View>

        {/* Security Events */}
        <Text style={styles.eventsTitle}>Security events</Text>
        {SECURITY_EVENTS.map((event, idx) => (
          <View
            key={event.id}
            style={[
              styles.alertRow,
              idx === SECURITY_EVENTS.length - 1 && { borderBottomWidth: 0 },
            ]}
          >
            <View style={[styles.alertIcon, { backgroundColor: event.bgColor }]}>
              <Ionicons name={event.icon as any} size={14} color={event.iconColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.alertTitle}>{event.title}</Text>
              <Text style={styles.alertSub}>{event.subtitle}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* ── ROUTE MEMBERS ──────────────────────────────────────────────── */}
      <Text style={styles.sectionLabel}>Route Members</Text>
      <View style={[styles.sec, styles.secPad]}>
        <View style={styles.membersHeader}>
          <Text style={styles.membersTitle}>
            {activeRoute.total_retailers} members · {totalVU} VU total
          </Text>
          <Text style={styles.membersCount}>
            {confirmedCount}/{routeMembers.length} confirmed
          </Text>
        </View>

        {routeMembers.map((member, index) => (
          <View
            key={member.id}
            style={[
              styles.memberRow,
              index === routeMembers.length - 1 && { borderBottomWidth: 0 },
            ]}
          >
            <View style={styles.stopNum}>
              <Text style={styles.stopNumText}>{index + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.mAddr}>{member.delivery_address.split(',')[0]}</Text>
              <Text style={styles.mVU}>
                {member.volumetric_units} VU · {CATEGORIES.find((c) => c.id === member.cargo_category)?.name || 'Dry goods'}
              </Text>
            </View>
            <View
              style={[
                styles.mpill,
                {
                  backgroundColor: member.status === 'confirmed' ? '#DCFCE7' : '#FEF3C7',
                },
              ]}
            >
              <Text
                style={[
                  styles.mpillText,
                  { color: member.status === 'confirmed' ? '#166534' : '#B45309' },
                ]}
              >
                {member.status === 'confirmed' ? 'Locked' : 'Pending'}
              </Text>
            </View>
            <Text style={styles.mShare}>{formatKobo(member.individual_share_kobo)}</Text>
          </View>
        ))}
      </View>

      {/* ── ESCROW BANNER & PAYMENT LOCK ───────────────────────────────── */}
      <View style={{ paddingVertical: 12 }}>
        <View style={styles.escrowBanner}>
          <Ionicons name="lock-closed" size={18} color="#166534" />
          <Text style={styles.escrowText}>
            Your payment is held in VentureRoot escrow. The driver receives funds{' '}
            <Text style={{ fontWeight: '700' }}>only after your QR scan confirms delivery</Text>.
            You are protected.
          </Text>
        </View>

        {!paymentLocked ? (
          <TouchableOpacity
            style={styles.btnLock}
            onPress={handleLockPayment}
            activeOpacity={0.8}
          >
            <Ionicons name="lock-closed" size={16} color="#FFFFFF" />
            <Text style={styles.btnLockText}>
              Lock payment — {formatKobo(activeRoute.total_cost_kobo / activeRoute.total_retailers)}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.btnLock, styles.btnLocked]}>
            <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
            <Text style={styles.btnLockText}>Payment Locked in Escrow</Text>
          </View>
        )}

        {/* Dispatch button (when all confirmed) */}
        {paymentLocked && allLocked && (
          <TouchableOpacity
            style={[styles.btnLock, { backgroundColor: '#8B5CF6', marginTop: 10 }]}
            onPress={handleDispatchRoute}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="truck-delivery" size={16} color="#FFFFFF" />
            <Text style={styles.btnLockText}>🚚 Dispatch Route to Driver</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.spacer} />
    </ScrollView>
  );
};

export default VentureRouteScreen;
