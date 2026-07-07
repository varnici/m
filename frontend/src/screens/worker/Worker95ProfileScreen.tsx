// @ts-nocheck
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Clipboard,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  Copy,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  Building2,
  Calendar,
  Shield,
  Bell,
  LogOut,
  ChevronRight,
  User,
  CreditCard,
  Settings,
  Wallet,
  TrendingUp,
} from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { useWorkerStore } from '@/store/workerStore';
import type { RootStackScreenProps } from '@/navigation/types';

const fmt = (n: number) =>
  `₦${n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function Worker95ProfileScreen({
  navigation,
}: RootStackScreenProps<'Worker95Profile'>) {
  const { user, signOut } = useAuth();
  const { summary, clearCache } = useWorkerStore();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const bvnVerified = summary?.bvn_verified ?? false;
  const accountNumber = summary?.virtual_account_number ?? '——— ——— ———';
  const accountBank = summary?.virtual_account_bank ?? 'VentureRoot MFB';
  const fullName = summary?.full_name ?? user?.email ?? 'Worker';

  const copyAccount = () => {
    if (summary?.virtual_account_number) {
      Clipboard.setString(summary.virtual_account_number);
      Alert.alert('Copied', 'Account number copied.');
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            clearCache();
            await signOut();
          },
        },
      ]
    );
  };

  const STATS = [
    {
      label: 'Net Portfolio',
      value: fmt(summary?.net_portfolio_value ?? 0),
      color: '#059669',
    },
    {
      label: 'Total Invested',
      value: fmt(summary?.total_invested_principal ?? 0),
      color: '#3B82F6',
    },
    {
      label: 'Dividends Earned',
      value: fmt(summary?.total_dividends_earned ?? 0),
      color: '#FBBF24',
    },
  ];

  const MENU_SECTIONS = [
    {
      title: 'Automation',
      items: [
        {
          icon: Calendar,
          label: 'Salary Automation',
          desc: 'Configure sweep & round-up rules',
          onPress: () => navigation.navigate('Main', { screen: 'WorkerSavings' } as any),
          color: '#059669',
          bg: '#D1FAE5',
        },
        {
          icon: TrendingUp,
          label: 'Investment Preferences',
          desc: 'Risk appetite & category filters',
          onPress: () => navigation.navigate('Main', { screen: 'WorkerMarketplace' } as any),
          color: '#3B82F6',
          bg: '#DBEAFE',
        },
      ],
    },
    {
      title: 'Account',
      items: [
        {
          icon: Shield,
          label: 'BVN & Identity',
          desc: bvnVerified ? 'Verified ✓' : 'Verification pending',
          onPress: () =>
            Alert.alert(
              'BVN & Identity',
              bvnVerified
                ? 'Your identity has been verified.'
                : 'Your identity verification is still pending. We’ll notify you once it’s confirmed.',
            ),
          color: bvnVerified ? '#059669' : '#EF4444',
          bg: bvnVerified ? '#D1FAE5' : '#FEE2E2',
        },
        {
          icon: Wallet,
          label: 'Virtual Account',
          desc: accountNumber,
          onPress: copyAccount,
          color: '#7C3AED',
          bg: '#EDE9FE',
        },
        {
          icon: CreditCard,
          label: 'Dividend History',
          desc: 'View all dividend payments',
          onPress: () => navigation.navigate('Worker95Dividends'),
          color: '#FBBF24',
          bg: '#FEF3C7',
        },
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          icon: Bell,
          label: 'Push Notifications',
          desc: 'Dividends, sweeps & alerts',
          onPress: null,
          color: '#6B7280',
          bg: '#F3F4F6',
          toggle: true,
          toggleValue: notificationsEnabled,
          onToggle: setNotificationsEnabled,
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Worker Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Profile hero ── */}
        <LinearGradient colors={['#064E3B', '#059669']} style={styles.profileHero}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {fullName.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()}
            </Text>
          </View>
          <Text style={styles.profileName}>{fullName}</Text>
          <Text style={styles.profileEmail}>{user?.email ?? ''}</Text>

          <View style={styles.bvnRow}>
            {bvnVerified ? (
              <>
                <CheckCircle2 size={14} color="#A7F3D0" />
                <Text style={styles.bvnText}>BVN Verified</Text>
              </>
            ) : (
              <>
                <AlertCircle size={14} color="#FCA5A5" />
                <Text style={[styles.bvnText, { color: '#FCA5A5' }]}>BVN Pending</Text>
              </>
            )}
          </View>
        </LinearGradient>

        {/* ── Portfolio stats strip ── */}
        <View style={styles.statsStrip}>
          {STATS.map((s) => (
            <View key={s.label} style={styles.statItem}>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Virtual account card ── */}
        <View style={styles.vaCard}>
          <View style={styles.vaTop}>
            <Building2 size={16} color="#059669" />
            <Text style={styles.vaBank}>{accountBank}</Text>
          </View>
          <Text style={styles.vaLabel}>Virtual Account Number</Text>
          <View style={styles.vaRow}>
            <Text style={styles.vaNumber}>{accountNumber}</Text>
            <TouchableOpacity onPress={copyAccount} style={styles.copyBtn}>
              <Copy size={15} color="#059669" />
            </TouchableOpacity>
          </View>
          <Text style={styles.vaHint}>Transfer here to fund your portfolio instantly.</Text>
        </View>

        {/* ── Menu sections ── */}
        {MENU_SECTIONS.map((section) => (
          <View key={section.title} style={styles.menuSection}>
            <Text style={styles.menuSectionTitle}>{section.title}</Text>
            <View style={styles.menuCard}>
              {section.items.map((item, idx) => (
                <React.Fragment key={item.label}>
                  <TouchableOpacity
                    style={styles.menuRow}
                    onPress={item.onPress ?? undefined}
                    disabled={!item.onPress && !item.toggle}
                    activeOpacity={item.toggle ? 1 : 0.7}
                  >
                    <View style={[styles.menuIcon, { backgroundColor: item.bg }]}>
                      <item.icon size={16} color={item.color} />
                    </View>
                    <View style={styles.menuText}>
                      <Text style={styles.menuLabel}>{item.label}</Text>
                      <Text style={styles.menuDesc} numberOfLines={1}>{item.desc}</Text>
                    </View>
                    {item.toggle ? (
                      <Switch
                        value={item.toggleValue}
                        onValueChange={item.onToggle}
                        trackColor={{ false: '#E5E7EB', true: '#A7F3D0' }}
                        thumbColor={item.toggleValue ? '#059669' : '#9CA3AF'}
                        style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
                      />
                    ) : (
                      <ChevronRight size={16} color="#D1D5DB" />
                    )}
                  </TouchableOpacity>
                  {idx < section.items.length - 1 && <View style={styles.menuDivider} />}
                </React.Fragment>
              ))}
            </View>
          </View>
        ))}

        {/* ── Sign out ── */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <LogOut size={18} color="#EF4444" />
          <Text style={styles.signOutText}>Sign Out of Worker Module</Text>
        </TouchableOpacity>

        <Text style={styles.version}>VentureRoot Worker Module · v1.0.0</Text>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9FAFB' },
  scroll: { paddingBottom: 40 },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },

  profileHero: { padding: 28, alignItems: 'center', gap: 6 },
  avatarCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  avatarText: { fontSize: 26, fontWeight: '800', color: '#fff' },
  profileName: { fontSize: 20, fontWeight: '800', color: '#fff' },
  profileEmail: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  bvnRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  bvnText: { fontSize: 12, color: '#A7F3D0', fontWeight: '600' },

  statsStrip: {
    flexDirection: 'row', backgroundColor: '#fff',
    paddingVertical: 16, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 14, fontWeight: '800', marginBottom: 2 },
  statLabel: { fontSize: 10, color: '#9CA3AF', textAlign: 'center' },

  vaCard: {
    marginHorizontal: 16, marginTop: 16, marginBottom: 4,
    backgroundColor: '#fff', borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  vaTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  vaBank: { fontSize: 13, fontWeight: '600', color: '#374151' },
  vaLabel: { fontSize: 11, color: '#9CA3AF', marginBottom: 4 },
  vaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  vaNumber: { fontSize: 20, fontWeight: '800', color: '#111827', letterSpacing: 1 },
  copyBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center' },
  vaHint: { fontSize: 11, color: '#9CA3AF', marginTop: 8 },

  menuSection: { marginHorizontal: 16, marginTop: 20 },
  menuSectionTitle: { fontSize: 12, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  menuCard: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB' },
  menuRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  menuIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  menuText: { flex: 1 },
  menuLabel: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 1 },
  menuDesc: { fontSize: 12, color: '#9CA3AF' },
  menuDivider: { height: 1, backgroundColor: '#F3F4F6', marginHorizontal: 16 },

  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 24, backgroundColor: '#FEF2F2',
    borderRadius: 14, paddingVertical: 14, borderWidth: 1, borderColor: '#FECACA',
  },
  signOutText: { fontSize: 14, fontWeight: '600', color: '#EF4444' },
  version: { textAlign: 'center', fontSize: 11, color: '#D1D5DB', marginTop: 16 },
});
