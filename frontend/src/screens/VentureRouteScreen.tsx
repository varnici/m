/**
 * VentureRouteScreen.tsx
 * Pixel-faithful React Native conversion of venture_route_design_v2.html
 */

import React, { useState, useEffect, useRef } from 'react';
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
  Platform,
} from 'react-native';
import Svg, {
  Rect,
  Path,
  Circle,
  Text as SvgText,
  G,
} from 'react-native-svg';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { logisticsService } from '@/services/logisticsService';

const { width: SW } = Dimensions.get('window');
const MAP_H = 200;
const MAP_W = SW; // map spans full width

// ─────────────────────────────────────────────────────────────────────────────
// COLOUR TOKENS
// ─────────────────────────────────────────────────────────────────────────────
const C = {
  // Backgrounds
  navy:       '#1a1a2e',
  mapBg:      '#DDE8DF',
  mapRoad:    '#B8C8BA',
  mapBlock:   '#C8D8CA',
  white:      '#FFFFFF',
  gray50:     '#F9FAFB',
  gray100:    '#F3F4F6',
  gray200:    '#E5E7EB',
  // Text
  gray400:    '#9CA3AF',
  gray600:    '#6B7280',
  gray900:    '#111827',
  // Greens
  green50:    '#F0FDF4',
  green100:   '#DCFCE7',
  green200:   '#86EFAC',
  green700:   '#15803D',
  green800:   '#166534',
  // Blues
  blue50:     '#EFF6FF',
  blue200:    '#BFDBFE',
  blue600:    '#3B82F6',   // route path / You pin
  blue800:    '#1D4ED8',   // ETA badge / Escrow badge
  // Amber
  amber100:   '#FEF3C7',
  amber200:   '#FDE68A',
  amber600:   '#F59E0B',   // stop pins
  amber800:   '#B45309',
  // Purple
  purple50:   '#F5F3FF',
  purple200:  '#DDD6FE',
  purple700:  '#5B21B6',
  // Truck / live dot
  emerald:    '#10B981',
};

// ─────────────────────────────────────────────────────────────────────────────
// STATIC DATA
// ─────────────────────────────────────────────────────────────────────────────
const PROVIDERS = [
  { id: 'gigl',    code: 'GK', name: 'GIGL Express',      meta: 'Pan-Lagos coverage · Next-day',    rate: 850, rating: 4.8, bg: C.blue50,   fg: C.blue800  },
  { id: 'kwik',    code: 'KW', name: 'Kwik Delivery',     meta: 'Island routes · Same-day',         rate: 720, rating: 4.6, bg: C.green50,  fg: C.green800 },
  { id: 'sendbox', code: 'SB', name: 'Sendbox Logistics', meta: 'Mainland + Island · Tracked',      rate: 680, rating: 4.5, bg: C.amber100, fg: C.amber800 },
  { id: 'gokada',  code: 'GF', name: 'Gokada Fleet',      meta: 'Cluster-optimised · GPS',          rate: 790, rating: 4.7, bg: C.purple50, fg: C.purple700},
] as const;

type Provider = typeof PROVIDERS[number];

const CATEGORIES = [
  { id: 'dry',   name: 'Dry goods',   sub: 'Rice, flour, sugar',  vu: '1 bag = 1 VU',      icon: 'corn' as const,            bg: C.amber100, fg: C.amber800,  note: 'All 4 members qualify for this cluster. Route is compatible.'                    },
  { id: 'fresh', name: 'Perishables', sub: 'Tomatoes, fish, veg', vu: '1 crate = 2 VU',    icon: 'leaf' as const,            bg: C.green50,  fg: C.green800,  note: 'Refrigerated truck required. 2 partners support this category.'                  },
  { id: 'elec',  name: 'Electronics', sub: 'Phones, gadgets',     vu: '1 carton = 1.5 VU', icon: 'cellphone' as const,       bg: C.blue50,   fg: C.blue800,   note: 'Padded transit required. Insurance automatically raised to ₦2M cover.'          },
  { id: 'bulk',  name: 'Bulk / mixed',sub: 'Multiple categories', vu: 'Custom VU calc',     icon: 'package-variant' as const, bg: C.purple50, fg: C.purple700, note: 'Custom VU calculation will apply. A VentureRoot agent will review your cluster.' },
] as const;

type Category = typeof CATEGORIES[number];

// Truck waypoints — same as the HTML pts[] array, normalised to [0-1]
const WAYPOINTS = [
  { x: 55/365,  y: 100/200 },
  { x: 90/365,  y: 84/200  },
  { x: 120/365, y: 75/200  },
  { x: 150/365, y: 75/200  },
  { x: 185/365, y: 82/200  },
  { x: 220/365, y: 95/200  },
  { x: 250/365, y: 100/200 },
  { x: 285/365, y: 105/200 },
  { x: 315/365, y: 102/200 },
  { x: 340/365, y: 100/200 },
];

// ─────────────────────────────────────────────────────────────────────────────
// SMALL HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const fmtKobo = (k: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(k / 100);

// ─────────────────────────────────────────────────────────────────────────────
// SUBCOMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const SLabel: React.FC<{ t: string }> = ({ t }) => (
  <Text style={s.sLabel}>{t}</Text>
);

const Card: React.FC<{ children: React.ReactNode; style?: object }> = ({ children, style }) => (
  <View style={[s.card, style]}>{children}</View>
);

const CardTitle: React.FC<{ icon: string; label: string }> = ({ icon, label }) => (
  <View style={s.cardTitleRow}>
    <MaterialCommunityIcons name={icon as any} size={15} color={C.green800} />
    <Text style={s.cardTitleText}>{label}</Text>
  </View>
);

const TrustBadge: React.FC<{
  icon: string; label: string; sub: string;
  bg: string; fg: string; border: string;
}> = ({ icon, label, sub, bg, fg, border }) => (
  <View style={[s.trustBadge, { backgroundColor: bg, borderColor: border }]}>
    <MaterialCommunityIcons name={icon as any} size={18} color={fg} />
    <View>
      <Text style={[s.trustLabel, { color: fg }]}>{label}</Text>
      <Text style={[s.trustSub,   { color: fg }]}>{sub}</Text>
    </View>
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────
// LIVE MAP
// ─────────────────────────────────────────────────────────────────────────────
const LiveMap: React.FC<{ eta: number; status: string }> = ({ eta, status }) => {
  const truckX = useRef(new Animated.Value(WAYPOINTS[0].x * MAP_W)).current;
  const truckY = useRef(new Animated.Value(WAYPOINTS[0].y * MAP_H)).current;
  const wpIdx  = useRef(0);

  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Pulsing live dot
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.3, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1.0, duration: 700, useNativeDriver: true }),
      ])
    ).start();

    if (status !== 'in_transit') return;

    // Truck movement only when in transit
    const move = () => {
      wpIdx.current = (wpIdx.current + 1) % WAYPOINTS.length;
      const wp = WAYPOINTS[wpIdx.current];
      Animated.parallel([
        Animated.timing(truckX, { toValue: wp.x * MAP_W, duration: 900, useNativeDriver: true }),
        Animated.timing(truckY, { toValue: wp.y * MAP_H, duration: 900, useNativeDriver: true }),
      ]).start();
    };
    const id = setInterval(move, 1200);
    return () => clearInterval(id);
  }, [status]);

  return (
    <View style={s.mapWrap}>
      <Svg width={MAP_W} height={MAP_H} style={StyleSheet.absoluteFill}>
        {/* Background */}
        <Rect width={MAP_W} height={MAP_H} fill={C.mapBg} />

        {/* Horizontal roads */}
        <Rect x={0}  y={71}  width={MAP_W} height={9} fill={C.mapRoad} />
        <Rect x={0}  y={136} width={MAP_W} height={7} fill={C.mapRoad} />

        {/* Vertical roads */}
        <Rect x={98}  y={0} width={6} height={MAP_H} fill={C.mapRoad} />
        <Rect x={198} y={0} width={6} height={MAP_H} fill={C.mapRoad} />
        <Rect x={308} y={0} width={6} height={MAP_H} fill={C.mapRoad} />

        {/* City blocks */}
        <Rect x={40}  y={20}  width={60} height={40} rx={4} fill={C.mapBlock} />
        <Rect x={120} y={15}  width={50} height={35} rx={4} fill={C.mapBlock} />
        <Rect x={200} y={25}  width={70} height={30} rx={4} fill={C.mapBlock} />
        <Rect x={290} y={18}  width={55} height={38} rx={4} fill={C.mapBlock} />
        <Rect x={30}  y={90}  width={80} height={45} rx={4} fill={C.mapBlock} />
        <Rect x={140} y={85}  width={65} height={50} rx={4} fill={C.mapBlock} />
        <Rect x={240} y={90}  width={90} height={40} rx={4} fill={C.mapBlock} />
        <Rect x={30}  y={155} width={55} height={30} rx={4} fill={C.mapBlock} />
        <Rect x={110} y={150} width={70} height={35} rx={4} fill={C.mapBlock} />
        <Rect x={210} y={148} width={80} height={38} rx={4} fill={C.mapBlock} />
        <Rect x={310} y={152} width={45} height={32} rx={4} fill={C.mapBlock} />

        {/* Dashed route path */}
        <Path
          d="M 55 100 Q 100 75 150 75 Q 200 75 250 100 Q 300 120 340 100"
          stroke={C.blue600}
          strokeWidth={3}
          fill="none"
          strokeDasharray="6,4"
        />

        {/* Stop pins */}
        {/* You */}
        <Circle cx={55}  cy={100} r={8} fill={C.blue600} />
        <SvgText x={55}  y={104} textAnchor="middle" fontSize={8}  fill="#fff" fontWeight="bold">You</SvgText>
        <SvgText x={55}  y={122} textAnchor="middle" fontSize={9}  fill="#444" fontWeight="500">Lekki Ph1</SvgText>
        {/* S2 */}
        <Circle cx={150} cy={75}  r={7} fill={C.amber600} />
        <SvgText x={150} y={79}  textAnchor="middle" fontSize={7}  fill="#fff">S2</SvgText>
        <SvgText x={150} y={62}  textAnchor="middle" fontSize={9}  fill="#444">V/Island</SvgText>
        {/* S3 */}
        <Circle cx={250} cy={100} r={7} fill={C.amber600} />
        <SvgText x={250} y={104} textAnchor="middle" fontSize={7}  fill="#fff">S3</SvgText>
        <SvgText x={250} y={120} textAnchor="middle" fontSize={9}  fill="#444">Ikoyi</SvgText>
        {/* S4 */}
        <Circle cx={340} cy={100} r={7} fill={C.amber600} />
        <SvgText x={340} y={104} textAnchor="middle" fontSize={7}  fill="#fff">S4</SvgText>
        <SvgText x={340} y={120} textAnchor="middle" fontSize={9}  fill="#444">Ajah</SvgText>
      </Svg>

      {/* Animated truck */}
      {status === 'in_transit' && (
        <Animated.View
          style={[
            s.truckPin,
            { transform: [{ translateX: truckX }, { translateY: truckY }] },
          ]}
        >
          <MaterialCommunityIcons name="truck-fast" size={13} color="#fff" />
        </Animated.View>
      )}

      {/* ── TOP overlays ── */}
      <View style={s.mapTopRow}>
        <View style={s.liveBadge}>
          <Animated.View style={[s.liveDot, { opacity: pulse }]} />
          <Text style={s.liveBadgeText}>{status === 'in_transit' ? 'Live routing active' : 'Waiting for dispatch'}</Text>
        </View>
        <View style={s.etaBadge}>
          <Ionicons name="time-outline" size={12} color="#fff" />
          <Text style={s.etaText}>{status === 'in_transit' ? `ETA ${eta} min` : 'Not dispatched'}</Text>
        </View>
      </View>

      {/* ── BOTTOM legend row ── */}
      <View style={s.mapBottomRow}>
        {[
          { dot: C.blue600,  label: 'You'      },
          { dot: C.emerald,  label: 'Truck'    },
          { dot: C.amber600, label: 'Stops (3)'},
        ].map((l) => (
          <View key={l.label} style={s.legendChip}>
            <View style={[s.legendDot, { backgroundColor: l.dot }]} />
            <Text style={s.legendText}>{l.label}</Text>
          </View>
        ))}
        <View style={[s.legendChip, { backgroundColor: C.green50, borderColor: C.green200, marginLeft: 'auto' }]}>
          <MaterialCommunityIcons name="shield-check" size={11} color={C.green800} />
          <Text style={[s.legendText, { color: C.green800 }]}>Insured</Text>
        </View>
      </View>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
const VentureRouteScreen = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [providerOpen,     setProviderOpen]      = useState(false);
  const [selectedProvider, setSelectedProvider]  = useState<Provider>(PROVIDERS[0]);
  const [selectedCat,      setSelectedCat]       = useState<Category>(CATEGORIES[0]);
  const [eta,              setEta]               = useState(14);
  const [actionLoading,    setActionLoading]     = useState(false);

  // TanStack query to fetch dynamic backend cluster state
  const {
    data: activeCluster,
    isLoading,
    isError,
    refetch
  } = useQuery({
    queryKey: ['activeCluster', user?.id],
    queryFn: () => logisticsService.getActiveCluster(),
    enabled: !!user?.id,
    staleTime: 1000 * 5, // 5 seconds
  });

  useEffect(() => {
    if (activeCluster?.status === 'in_transit') {
      const t = setInterval(() => setEta((e) => (e > 1 ? e - 1 : 14)), 4000);
      return () => clearInterval(t);
    }
  }, [activeCluster?.status]);

  if (isLoading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={C.emerald} />
        <Text style={[s.gray6, { marginTop: 10 }]}>Syncing route logs…</Text>
      </View>
    );
  }

  // Derive dynamic stats from cluster details
  const routeNumber = activeCluster ? `RT-${activeCluster.id.substring(0, 8).toUpperCase()}` : 'RT-PENDING';
  
  const ROUTE = {
    number:      routeNumber,
    status:      activeCluster?.status === 'forming' ? 'Route Grouped' : activeCluster?.status === 'in_transit' ? 'In Transit' : 'Route Completed',
    retailers:   activeCluster?.participants_count ?? 4,
    fillPct:     activeCluster ? Math.round((activeCluster.participants_count / activeCluster.target_participants) * 100) : 65,
    totalKobo:   activeCluster ? activeCluster.participants.reduce((sum, p) => sum + p.share_kobo, 0) : 12000000,
  };

  const members = activeCluster?.participants ? activeCluster.participants.map((p, idx) => ({
    id: p.id,
    stop: idx + 1,
    area: p.user_label,
    vu: p.volume_units,
    share: p.share_kobo,
    status: p.status,
    ref: p.order_reference,
  })) : [];

  const confirmedCount = members.filter((m) => m.status === 'confirmed').length;
  const totalVU        = members.reduce((a, m) => a + m.vu, 0);
  const allLocked      = members.every((m) => m.status === 'confirmed');

  // Dynamically find active user status
  const userParticipant = activeCluster?.participants.find((p) => p.user_label.includes('(You)'));
  const paymentLocked   = userParticipant?.status === 'confirmed';
  const shareKobo       = userParticipant?.share_kobo ?? 3500000;

  const handleLockPayment = () => {
    if (!activeCluster) return;
    Alert.alert(
      'Lock payment',
      `Confirm escrow lock of ${fmtKobo(shareKobo)}?\n\nFunds are debited from your wallet and held in escrow until you scan the delivery QR code.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm & Lock',
          onPress: async () => {
            setActionLoading(true);
            try {
              await logisticsService.lockPayment(activeCluster.id);
              await queryClient.invalidateQueries({ queryKey: ['activeCluster', user?.id] });
              await queryClient.invalidateQueries({ queryKey: ['dashboard', user?.id] });
              Alert.alert('Payment locked ✅', 'Escrow funds successfully locked. Waiting for other cluster participants.');
            } catch (err: any) {
              Alert.alert('Transaction Failed', err?.message || 'Failed to lock payment escrow.');
            } finally {
              setActionLoading(false);
            }
          }
        },
      ]
    );
  };

  const handleDispatch = () => {
    if (!activeCluster) return;
    Alert.alert('Dispatch route', 'All payments confirmed. Ready to notify driver and initiate transit?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Dispatch',
        onPress: async () => {
          setActionLoading(true);
          try {
            await logisticsService.dispatchCluster(activeCluster.id);
            await queryClient.invalidateQueries({ queryKey: ['activeCluster', user?.id] });
            Alert.alert('Dispatched 🚚', 'Driver has been locked and notified. Live GPS tracking has begun!');
          } catch (err: any) {
            Alert.alert('Dispatch failed', err?.message || 'Failed to dispatch route.');
          } finally {
            setActionLoading(false);
          }
        }
      },
    ]);
  };

  return (
    <ScrollView
      style={s.root}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => queryClient.invalidateQueries({ queryKey: ['activeCluster', user?.id] })} tintColor={C.emerald} />}
      showsVerticalScrollIndicator={false}
    >
      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <View style={s.header}>
        <Text style={s.headerRouteNum}>{ROUTE.number}</Text>
        <View style={s.headerRow}>
          <Text style={s.headerStatus}>{ROUTE.status}</Text>
          <View style={s.retailerPill}>
            <Text style={s.retailerPillText}>{ROUTE.retailers} Retailers</Text>
          </View>
        </View>
      </View>

      {/* ── LIVE MAP ────────────────────────────────────────────────────── */}
      <LiveMap eta={eta} status={activeCluster?.status ?? 'forming'} />

      {/* ── LOGISTICS PARTNER ───────────────────────────────────────────── */}
      <SLabel t="LOGISTICS PARTNER" />
      <Card>
        <CardTitle icon="warehouse" label="Select delivery partner" />

        <TouchableOpacity
          style={s.providerSelector}
          onPress={() => setProviderOpen((o) => !o)}
          activeOpacity={0.85}
        >
          <View style={[s.providerLogo, { backgroundColor: selectedProvider.bg }]}>
            <Text style={[s.providerLogoText, { color: selectedProvider.fg }]}>{selectedProvider.code}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.providerName}>{selectedProvider.name}</Text>
            <Text style={s.providerMeta}>
              Avg ₦{selectedProvider.rate}/VU · {selectedProvider.rating}{' '}
              <Text style={{ color: C.amber600 }}>★</Text>
            </Text>
          </View>
          <Ionicons name={providerOpen ? 'chevron-up' : 'chevron-down'} size={17} color={C.gray600} />
        </TouchableOpacity>

        {providerOpen && (
          <View style={s.dropdown}>
            {PROVIDERS.map((p, i) => (
              <TouchableOpacity
                key={p.id}
                style={[
                  s.dropdownItem,
                  i === PROVIDERS.length - 1 && { borderBottomWidth: 0 },
                  selectedProvider.id === p.id && { backgroundColor: C.blue50 },
                ]}
                onPress={() => { setSelectedProvider(p); setProviderOpen(false); }}
                activeOpacity={0.8}
              >
                <View style={[s.providerLogo, { backgroundColor: p.bg }]}>
                  <Text style={[s.providerLogoText, { color: p.fg }]}>{p.code}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.providerName}>{p.name}</Text>
                  <Text style={s.providerMeta}>{p.meta}</Text>
                </View>
                <Text style={s.providerRate}>₦{p.rate}/VU</Text>
                {selectedProvider.id === p.id && (
                  <Ionicons name="checkmark-circle" size={16} color={C.emerald} style={{ marginLeft: 6 }} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={s.lockNote}>
          <Ionicons name="lock-closed" size={11} color={C.gray400} />
          <Text style={s.lockNoteText}>Private partner list — vetted &amp; bonded by VentureRoot</Text>
        </View>
      </Card>

      {/* ── CARGO CATEGORY ──────────────────────────────────────────────── */}
      <SLabel t="CARGO CATEGORY" />
      <Card>
        <CardTitle icon="package-variant-closed" label="What is your cluster transporting?" />

        <View style={s.catGrid}>
          {CATEGORIES.map((cat) => {
            const selected = selectedCat.id === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[
                  s.catCard,
                  selected && { borderColor: C.blue600, borderWidth: 1.5, backgroundColor: C.blue50 },
                ]}
                onPress={() => setSelectedCat(cat)}
                activeOpacity={0.85}
              >
                <View style={[s.catIconWrap, { backgroundColor: cat.bg }]}>
                  <MaterialCommunityIcons name={cat.icon} size={17} color={cat.fg} />
                </View>
                <Text style={s.catName}>{cat.name}</Text>
                <Text style={s.catSub}>{cat.sub}</Text>
                <Text style={[s.catVU, { color: C.blue800 }]}>{cat.vu}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={[s.compatNote, { backgroundColor: selectedCat.bg }]}>
          <MaterialCommunityIcons name="information" size={14} color={selectedCat.fg} />
          <Text style={[s.compatNoteText, { color: selectedCat.fg }]}>
            {selectedCat.id.charAt(0).toUpperCase() + selectedCat.id.slice(1) === 'Dry' ? 'Dry goods' : selectedCat.name} selected — {selectedCat.note}
          </Text>
        </View>
      </Card>

      {/* ── FILL-TO-SAVE METER ──────────────────────────────────────────── */}
      <SLabel t="TRUCK UTILIZATION" />
      <Card>
        <View style={s.rowSB}>
          <Text style={s.cardTitleText}>Fill-to-save meter</Text>
          <Text style={[s.pctNum, { color: C.blue600 }]}>{ROUTE.fillPct}%</Text>
        </View>
        <View style={s.progressTrack}>
          <View style={[s.progressFill, { width: `${ROUTE.fillPct}%` as any, backgroundColor: C.blue600 }]} />
        </View>
        <Text style={s.progressCaption}>
          {ROUTE.fillPct >= 100 ? (
             <Text style={{ color: C.emerald, fontWeight: '500' }}>
               Cluster is completely full! Maximum freight discount of 40% active.
             </Text>
          ) : (
             <Text>
               {100 - ROUTE.fillPct}% space still available —{' '}
               <Text style={{ color: C.emerald, fontWeight: '500' }}>
                 add 1 more member to drop cost by ₦150 each
               </Text>
             </Text>
          )}
        </Text>
        <View style={s.hintBox}>
          <Ionicons name="people-outline" size={15} color={C.blue800} style={{ marginTop: 1 }} />
          <Text style={s.hintText}>
            Share route code{' '}
            <Text style={{ fontWeight: '700' }}>{routeNumber}</Text>
            {' '}— each new retailer that joins saves everyone money.
          </Text>
        </View>
      </Card>

      {/* ── TRUST & SECURITY ────────────────────────────────────────────── */}
      <SLabel t="TRUST & SECURITY" />
      <Card>
        <View style={s.trustRow}>
          <TrustBadge icon="shield-check"      label="VR Insured" sub="₦500k cover"    bg={C.green50}  fg={C.green800}  border={C.green200}  />
          <TrustBadge icon="lock"              label="Escrow"     sub="QR-release only" bg={C.blue50}   fg={C.blue800}   border={C.blue200}   />
        </View>
        <View style={[s.trustRow, { marginTop: 8 }]}>
          <TrustBadge icon="map-marker-radius" label="GPS Live"   sub="HyperTrack"     bg={C.purple50} fg={C.purple700} border={C.purple200} />
          <TrustBadge icon="bell-alert"        label="Area alerts" sub="10-min rule"   bg={C.amber100} fg={C.amber800}  border={C.amber200}  />
        </View>

        <View style={s.divider} />
        <View style={s.driverCard}>
          <View style={s.driverAvatar}>
            <Text style={s.driverAvatarText}>AO</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.driverName}>Adewale Okonkwo</Text>
            <Text style={s.driverMeta}>GIGL Express · ID VR-DRV-0049</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
              {[0,1,2,3,4].map((i) => (
                <Ionicons key={i} name="star" size={11} color={C.amber600} />
              ))}
              <Text style={[s.gray4, { fontSize: 10, marginLeft: 4 }]}>4.9 · 347 trips</Text>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <View style={s.verifiedBadge}>
              <MaterialCommunityIcons name="check-decagram" size={11} color={C.green800} />
              <Text style={s.verifiedText}>Verified</Text>
            </View>
            <Text style={s.bondedText}>Bonded</Text>
          </View>
        </View>

        <View style={s.divider} />
        <Text style={s.eventsTitle}>Security events</Text>
        {[
          { type: 'success' as const, icon: 'checkmark-circle' as const, title: 'Pickup confirmed',        detail: 'Driver scanned 4 of 4 packages at origin · 09:14', bg: C.green50,  fg: C.green800  },
          { type: 'info'    as const, icon: 'navigate-circle'  as const, title: 'On approved route',       detail: 'Truck within cluster zone boundary · Real-time',    bg: C.blue50,   fg: C.blue800   },
          { type: 'warning' as const, icon: 'alert-circle'     as const, title: 'Stop dwell alert armed',  detail: 'Alert fires if stationary >10 min outside zone',   bg: C.amber100, fg: C.amber800  },
        ].map((ev, i, arr) => (
          <View key={ev.title} style={[s.eventRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
            <View style={[s.eventIcon, { backgroundColor: ev.bg }]}>
              <Ionicons name={ev.icon} size={15} color={ev.fg} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.eventTitle}>{ev.title}</Text>
              <Text style={s.eventDetail}>{ev.detail}</Text>
            </View>
          </View>
        ))}
      </Card>

      {/* ── ROUTE MEMBERS ───────────────────────────────────────────────── */}
      <SLabel t="ROUTE MEMBERS" />
      <Card>
        <View style={s.rowSB}>
          <Text style={s.cardTitleText}>
            {ROUTE.retailers} members · {totalVU} VU total
          </Text>
          <Text style={s.gray6}>{confirmedCount}/{members.length} confirmed</Text>
        </View>

        {members.map((m, i) => (
          <View key={m.id} style={[s.memberRow, i === members.length - 1 && { borderBottomWidth: 0 }]}>
            <View style={s.stopNum}>
              <Text style={s.stopNumText}>{m.stop}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.memberArea}>{m.area}</Text>
              <Text style={s.memberVU}>
                {m.vu} VU · {selectedCat.name}
              </Text>
            </View>
            <View style={[
              s.memberPill,
              { backgroundColor: m.status === 'confirmed' ? C.green100 : C.amber100 },
            ]}>
              <Text style={[
                s.memberPillText,
                { color: m.status === 'confirmed' ? C.green800 : C.amber800 },
              ]}>
                {m.status === 'confirmed' ? 'Locked' : 'Pending'}
              </Text>
            </View>
            <Text style={s.memberShare}>{fmtKobo(m.share)}</Text>
          </View>
        ))}
      </Card>

      {/* ── ESCROW BANNER + ACTIONS ─────────────────────────────────────── */}
      <View style={s.actionsWrap}>
        <View style={s.escrowBanner}>
          <MaterialCommunityIcons name="lock-check" size={20} color={C.green800} style={{ flexShrink: 0 }} />
          <Text style={s.escrowText}>
            Your payment is held in VentureRoot escrow. The driver receives funds{' '}
            <Text style={{ fontWeight: '700' }}>only after your QR scan confirms delivery</Text>.
            {' '}You are protected.
          </Text>
        </View>

        {actionLoading ? (
          <View style={s.btnLock}>
            <ActivityIndicator size="small" color="#fff" />
          </View>
        ) : (
          <>
            {activeCluster?.status === 'forming' && !paymentLocked && (
              <TouchableOpacity style={s.btnLock} onPress={handleLockPayment} activeOpacity={0.85}>
                <Ionicons name="lock-closed" size={16} color="#fff" />
                <Text style={s.btnLockText}>Lock payment — {fmtKobo(shareKobo)}</Text>
              </TouchableOpacity>
            )}

            {activeCluster?.status === 'forming' && paymentLocked && !allLocked && (
              <View style={[s.btnLock, { backgroundColor: C.emerald }]}>
                <Ionicons name="checkmark-circle" size={16} color="#fff" />
                <Text style={s.btnLockText}>Your payment locked</Text>
              </View>
            )}

            {activeCluster?.status === 'forming' && allLocked && (
              <TouchableOpacity style={[s.btnLock, { backgroundColor: C.purple700 }]} onPress={handleDispatch} activeOpacity={0.85}>
                <MaterialCommunityIcons name="truck-fast" size={16} color="#fff" />
                <Text style={s.btnLockText}>Dispatch route to driver</Text>
              </TouchableOpacity>
            )}

            {activeCluster?.status === 'in_transit' && (
              <View style={[s.btnLock, { backgroundColor: C.emerald }]}>
                <MaterialCommunityIcons name="truck-delivery" size={16} color="#fff" />
                <Text style={s.btnLockText}>Route Dispatched &amp; In Transit</Text>
              </View>
            )}
          </>
        )}

        <TouchableOpacity 
          style={s.btnRefresh} 
          onPress={() => queryClient.invalidateQueries({ queryKey: ['activeCluster', user?.id] })} 
          activeOpacity={0.8}
        >
          <Ionicons name="refresh" size={14} color={C.green800} />
          <Text style={s.btnRefreshText}>Refresh route</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const CARD_PAD = 14;
const CAT_COLS = 2;
const CAT_GAP  = 8;
const CAT_W    = (SW - 24 * 2 - CARD_PAD * 2 - CAT_GAP) / CAT_COLS;

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.gray100 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.gray100 },
  gray6:  { fontSize: 11, color: C.gray600 },
  gray4:  { color: C.gray400 },

  // ── Header ──
  header:          { backgroundColor: C.navy, paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 52 : 24, paddingBottom: 14 },
  headerRouteNum:  { fontSize: 10, color: C.gray600, letterSpacing: 0.4 },
  headerRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 2 },
  headerStatus:    { fontSize: 17, fontWeight: '500', color: '#fff' },
  retailerPill:    { backgroundColor: 'rgba(59,130,246,0.2)', borderWidth: 0.5, borderColor: 'rgba(59,130,246,0.4)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  retailerPillText:{ fontSize: 11, fontWeight: '500', color: '#93C5FD' },

  // ── Map ──
  mapWrap:    { height: MAP_H, backgroundColor: C.mapBg, overflow: 'hidden' },
  truckPin:   { position: 'absolute', width: 24, height: 24, borderRadius: 12, backgroundColor: C.emerald, borderWidth: 2, borderColor: '#fff', justifyContent: 'center', alignItems: 'center', marginLeft: -12, marginTop: -12 },
  mapTopRow:  { position: 'absolute', top: 8, left: 8, right: 8, flexDirection: 'row', justifyContent: 'space-between' },
  liveBadge:  { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#fff', borderWidth: 0.5, borderColor: C.gray200, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5 },
  liveDot:    { width: 7, height: 7, borderRadius: 4, backgroundColor: C.emerald },
  liveBadgeText: { fontSize: 11, fontWeight: '500', color: C.gray900 },
  etaBadge:   { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.blue800, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5 },
  etaText:    { fontSize: 11, fontWeight: '500', color: '#fff' },
  mapBottomRow:{ position: 'absolute', bottom: 8, left: 8, right: 8, flexDirection: 'row', gap: 5 },
  legendChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fff', borderWidth: 0.5, borderColor: C.gray200, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 },
  legendDot:  { width: 6, height: 6, borderRadius: 3 },
  legendText: { fontSize: 10, color: C.gray600 },

  // ── Section label ──
  sLabel: { fontSize: 11, fontWeight: '500', color: C.gray400, paddingHorizontal: 12, paddingTop: 14, paddingBottom: 4, letterSpacing: 0.5 },

  // ── Card ──
  card:       { backgroundColor: C.white, marginHorizontal: 12, borderRadius: 14, borderWidth: 0.5, borderColor: C.gray200, padding: CARD_PAD },
  cardTitleRow:{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  cardTitleText:{ fontSize: 13, fontWeight: '500', color: C.gray900 },
  rowSB:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  pctNum:     { fontSize: 16, fontWeight: '500' },

  // ── Provider ──
  providerSelector: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 0.5, borderColor: C.gray200, borderRadius: 10, padding: 11 },
  providerLogo:     { width: 30, height: 30, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  providerLogoText: { fontSize: 11, fontWeight: '700' },
  providerName:     { fontSize: 12, fontWeight: '500', color: C.gray900 },
  providerMeta:     { fontSize: 10, color: C.gray600, marginTop: 1 },
  providerRate:     { fontSize: 11, fontWeight: '500', color: '#0F6E56', marginLeft: 'auto' },
  dropdown:         { marginTop: 4, borderWidth: 0.5, borderColor: C.gray200, borderRadius: 10, overflow: 'hidden' },
  dropdownItem:     { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 11, borderBottomWidth: 0.5, borderBottomColor: C.gray100 },
  lockNote:         { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  lockNoteText:     { fontSize: 10, color: C.gray400 },

  // ── Category ──
  catGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: CAT_GAP },
  catCard:    { width: CAT_W, borderWidth: 0.5, borderColor: C.gray200, borderRadius: 10, padding: 10, backgroundColor: C.white },
  catIconWrap:{ width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 7 },
  catName:    { fontSize: 12, fontWeight: '500', color: C.gray900 },
  catSub:     { fontSize: 10, color: C.gray600, marginTop: 2 },
  catVU:      { fontSize: 10, fontWeight: '500', marginTop: 3 },
  compatNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, borderRadius: 8, padding: 9, marginTop: 10 },
  compatNoteText: { fontSize: 11, flex: 1, lineHeight: 17 },

  // ── Progress ──
  progressTrack:   { height: 12, backgroundColor: C.gray200, borderRadius: 6, overflow: 'hidden' },
  progressFill:    { height: '100%', borderRadius: 6 },
  progressCaption: { fontSize: 11, color: C.gray600, marginTop: 4 },
  hintBox:         { backgroundColor: C.blue50, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', gap: 7, alignItems: 'flex-start', marginTop: 8 },
  hintText:        { fontSize: 11, color: C.blue800, flex: 1, lineHeight: 17 },

  // ── Trust ──
  trustRow:   { flexDirection: 'row', gap: 8 },
  trustBadge: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 0.5, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 7 },
  trustLabel: { fontSize: 10, fontWeight: '500' },
  trustSub:   { fontSize: 9, opacity: 0.8, marginTop: 1 },
  divider:    { height: 0.5, backgroundColor: C.gray100, marginVertical: 12 },

  // ── Driver ──
  driverCard:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  driverAvatar:    { width: 38, height: 38, borderRadius: 19, backgroundColor: C.blue50, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: C.emerald },
  driverAvatarText:{ fontSize: 13, fontWeight: '500', color: C.blue800 },
  driverName:      { fontSize: 13, fontWeight: '500', color: C.gray900 },
  driverMeta:      { fontSize: 11, color: C.gray600, marginTop: 1 },
  verifiedBadge:   { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: C.green50, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  verifiedText:    { fontSize: 10, fontWeight: '500', color: C.green800 },
  bondedText:      { fontSize: 10, color: C.gray600 },

  // ── Events ──
  eventsTitle: { fontSize: 11, fontWeight: '500', color: C.gray600, marginBottom: 6 },
  eventRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 9, paddingVertical: 9, borderBottomWidth: 0.5, borderBottomColor: C.gray100 },
  eventIcon:   { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  eventTitle:  { fontSize: 12, fontWeight: '500', color: C.gray900 },
  eventDetail: { fontSize: 10, color: C.gray600, marginTop: 2, lineHeight: 16 },

  // ── Members ──
  memberRow:      { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderBottomWidth: 0.5, borderBottomColor: C.gray100 },
  stopNum:        { width: 22, height: 22, borderRadius: 11, backgroundColor: C.blue50, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  stopNumText:    { fontSize: 10, fontWeight: '500', color: C.blue800 },
  memberArea:     { fontSize: 12, fontWeight: '500', color: C.gray900 },
  memberVU:       { fontSize: 10, color: C.gray600, marginTop: 1 },
  memberPill:     { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  memberPillText: { fontSize: 10, fontWeight: '500' },
  memberShare:    { fontSize: 12, fontWeight: '500', color: C.gray900, marginLeft: 'auto' },

  // ── Actions ──
  actionsWrap:   { paddingHorizontal: 12, paddingTop: 14, gap: 10 },
  escrowBanner:  { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: C.green50, borderWidth: 0.5, borderColor: C.green200, borderRadius: 10, padding: 12 },
  escrowText:    { fontSize: 11, color: C.green800, lineHeight: 18, flex: 1 },
  btnLock:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: C.blue600, borderRadius: 10, paddingVertical: 14 },
  btnLockText:   { fontSize: 14, fontWeight: '500', color: '#fff' },
  btnRefresh:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: C.white, borderWidth: 0.5, borderColor: C.gray200, borderRadius: 10, paddingVertical: 12 },
  btnRefreshText:{ fontSize: 13, fontWeight: '500', color: C.green800 },
});

export default VentureRouteScreen;