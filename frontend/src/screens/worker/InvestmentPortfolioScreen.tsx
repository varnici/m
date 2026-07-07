// @ts-nocheck
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  Wallet,
  PieChart,
  Plus,
} from 'lucide-react-native';
import { workerService, PortfolioSummary, PortfolioInvestment } from '@/services/workerService';

const { width: SW } = Dimensions.get('window');

const fmt = (n: number) =>
  `₦${n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-NG', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return '—'; }
}

// ---------------------------------------------------------------------------
// Progress bar
// ---------------------------------------------------------------------------
function TermProgress({ progress, isMatured }: { progress: number; isMatured: boolean }) {
  return (
    <View style={styles.progressTrack}>
      <LinearGradient
        colors={isMatured ? ['#059669', '#34D399'] : ['#064E3B', '#059669']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.progressFill, { width: `${Math.min(100, progress)}%` }]}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Investment card
// ---------------------------------------------------------------------------
const InvestmentCard = React.memo(({
  item,
  onPress,
}: {
  item: PortfolioInvestment;
  onPress: () => void;
}) => {
  const monthlyDiv = item.principal_amount * item.monthly_rate_pct / 100;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardBusiness} numberOfLines={1}>{item.business_name}</Text>
          <Text style={styles.cardMeta}>{item.term_months}-month term · {item.monthly_rate_pct}%/mo</Text>
        </View>
        <View style={[
          styles.statusPill,
          { backgroundColor: item.is_matured ? '#D1FAE5' : '#EDE9FE' },
        ]}>
          {item.is_matured
            ? <CheckCircle2 size={12} color="#059669" />
            : <Clock size={12} color="#7C3AED" />
          }
          <Text style={[
            styles.statusPillText,
            { color: item.is_matured ? '#065F46' : '#5B21B6' },
          ]}>
            {item.is_matured ? 'Matured' : `${item.days_remaining}d left`}
          </Text>
        </View>
      </View>

      <TermProgress progress={item.progress_pct} isMatured={item.is_matured} />

      <View style={styles.cardStats}>
        <View style={styles.cardStat}>
          <Text style={styles.cardStatLabel}>Principal</Text>
          <Text style={styles.cardStatValue}>{fmt(item.principal_amount)}</Text>
        </View>
        <View style={styles.cardStatDivider} />
        <View style={styles.cardStat}>
          <Text style={styles.cardStatLabel}>Monthly Dividend</Text>
          <Text style={[styles.cardStatValue, { color: '#059669' }]}>+{fmt(monthlyDiv)}</Text>
        </View>
        <View style={styles.cardStatDivider} />
        <View style={styles.cardStat}>
          <Text style={styles.cardStatLabel}>Earned</Text>
          <Text style={[styles.cardStatValue, { color: '#059669' }]}>{fmt(item.dividends_earned)}</Text>
        </View>
      </View>

      {item.available_dividends > 0 && (
        <View style={styles.collectBanner}>
          <Wallet size={14} color="#92400E" />
          <Text style={styles.collectBannerText}>
            {fmt(item.available_dividends)} ready to collect
          </Text>
          <ChevronRight size={14} color="#92400E" />
        </View>
      )}

      <View style={styles.cardFooter}>
        <Text style={styles.cardFooterText}>
          Matures {fmtDate(item.maturity_date)}
        </Text>
        <ChevronRight size={16} color="#9CA3AF" />
      </View>
    </TouchableOpacity>
  );
});

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------
export default function InvestmentPortfolioScreen({ navigation }: any) {
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await workerService.getPortfolio();
      setPortfolio(data);
    } catch (e) {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load(true);
  }, [load]);

  const renderItem = useCallback(({ item }: { item: PortfolioInvestment }) => (
    <InvestmentCard
      item={item}
      onPress={() => navigation.navigate('Worker95InvestmentDetail', { investmentId: item.id })}
    />
  ), [navigation]);

  const ListHeader = portfolio ? (
    <>
      {/* Hero Summary */}
      <LinearGradient colors={['#064E3B', '#059669']} style={styles.hero}>
        <View style={styles.heroRow}>
          <PieChart size={24} color="#FCD34D" />
          <Text style={styles.heroLabel}>Investment Portfolio</Text>
        </View>
        <Text style={styles.heroAmount}>{fmt(portfolio.total_principal)}</Text>
        <Text style={styles.heroSub}>Total Principal Invested</Text>

        <View style={styles.heroGrid}>
          <View style={styles.heroGridItem}>
            <Text style={styles.heroGridValue}>{fmt(portfolio.total_dividends_earned)}</Text>
            <Text style={styles.heroGridLabel}>Total Earned</Text>
          </View>
          <View style={styles.heroGridDivider} />
          <View style={styles.heroGridItem}>
            <Text style={styles.heroGridValue}>{fmt(portfolio.total_collected)}</Text>
            <Text style={styles.heroGridLabel}>Collected</Text>
          </View>
          <View style={styles.heroGridDivider} />
          <View style={styles.heroGridItem}>
            <Text style={[styles.heroGridValue, { color: '#FCD34D' }]}>
              {fmt(portfolio.total_available)}
            </Text>
            <Text style={styles.heroGridLabel}>Available</Text>
          </View>
        </View>

        <View style={styles.heroCounts}>
          <View style={styles.heroCountChip}>
            <Clock size={12} color="#fff" />
            <Text style={styles.heroCountText}>{portfolio.active_count} Active</Text>
          </View>
          <View style={styles.heroCountChip}>
            <CheckCircle2 size={12} color="#FCD34D" />
            <Text style={styles.heroCountText}>{portfolio.matured_count} Matured</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Info banner */}
      <View style={styles.infoBanner}>
        <TrendingUp size={14} color="#065F46" />
        <Text style={styles.infoBannerText}>
          All investments earn <Text style={{ fontWeight: '800' }}>1% monthly</Text> on your principal.
          Dividends become available after each month.
        </Text>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Your Investments</Text>
        <TouchableOpacity
          style={styles.newInvestBtn}
          onPress={() => navigation.navigate('Main', { screen: 'WorkerMarketplace' } as any)}
        >
          <Plus size={14} color="#059669" />
          <Text style={styles.newInvestBtnText}>New</Text>
        </TouchableOpacity>
      </View>
    </>
  ) : null;

  const ListEmpty = !loading ? (
    <View style={styles.emptyContainer}>
      <PieChart size={48} color="#D1D5DB" />
      <Text style={styles.emptyTitle}>No Investments Yet</Text>
      <Text style={styles.emptyDesc}>
        Start investing to earn 1% monthly dividends on your capital.
      </Text>
      <TouchableOpacity
        style={styles.emptyBtn}
        onPress={() => navigation.navigate('Main', { screen: 'WorkerMarketplace' } as any)}
      >
        <Text style={styles.emptyBtnText}>Browse Businesses</Text>
      </TouchableOpacity>
    </View>
  ) : null;

  if (loading && !portfolio) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#059669" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={22} color="#111827" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>My Investments</Text>
          <Text style={styles.headerSub}>
            {portfolio ? `${portfolio.investments.length} investment${portfolio.investments.length !== 1 ? 's' : ''}` : ''}
          </Text>
        </View>
      </View>

      <FlashList
        data={portfolio?.investments ?? []}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        estimatedItemSize={220}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#059669" />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9FAFB' },
  listContent: { paddingBottom: 40 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  headerSub: { fontSize: 12, color: '#9CA3AF', marginTop: 1 },

  // Hero
  hero: { padding: 24, paddingBottom: 20 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  heroLabel: { fontSize: 13, color: 'rgba(255,255,255,0.75)' },
  heroAmount: { fontSize: 34, fontWeight: '900', color: '#fff', letterSpacing: -1 },
  heroSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 20 },
  heroGrid: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  heroGridItem: { flex: 1, alignItems: 'center' },
  heroGridValue: { fontSize: 14, fontWeight: '800', color: '#fff', marginBottom: 2 },
  heroGridLabel: { fontSize: 10, color: 'rgba(255,255,255,0.6)' },
  heroGridDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.2)' },
  heroCounts: { flexDirection: 'row', gap: 10 },
  heroCountChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20,
  },
  heroCountText: { fontSize: 12, color: '#fff', fontWeight: '600' },

  // Info banner
  infoBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    marginHorizontal: 16, marginTop: 16, marginBottom: 8,
    backgroundColor: '#D1FAE5', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#A7F3D0',
  },
  infoBannerText: { flex: 1, fontSize: 13, color: '#065F46', lineHeight: 19 },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  newInvestBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#D1FAE5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
  },
  newInvestBtnText: { fontSize: 13, color: '#059669', fontWeight: '700' },

  // Card
  card: {
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: '#fff', borderRadius: 16,
    borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, paddingBottom: 12,
  },
  cardBusiness: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 2 },
  cardMeta: { fontSize: 12, color: '#9CA3AF' },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  statusPillText: { fontSize: 11, fontWeight: '700' },

  progressTrack: {
    height: 4, backgroundColor: '#E5E7EB', marginHorizontal: 16, borderRadius: 2,
  },
  progressFill: { height: 4, borderRadius: 2 },

  cardStats: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  cardStat: { flex: 1, alignItems: 'center' },
  cardStatLabel: { fontSize: 10, color: '#9CA3AF', marginBottom: 3 },
  cardStatValue: { fontSize: 13, fontWeight: '700', color: '#111827' },
  cardStatDivider: { width: 1, height: 24, backgroundColor: '#F3F4F6' },

  collectBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: '#FEF3C7', borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  collectBannerText: { flex: 1, fontSize: 12, color: '#92400E', fontWeight: '600' },

  cardFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  cardFooterText: { fontSize: 12, color: '#9CA3AF' },

  // Empty
  emptyContainer: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#374151' },
  emptyDesc: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 21 },
  emptyBtn: {
    backgroundColor: '#D1FAE5', paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 12, marginTop: 4,
  },
  emptyBtnText: { color: '#059669', fontWeight: '700', fontSize: 14 },
});
