// @ts-nocheck
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  Award,
  BarChart3,
  RefreshCw,
} from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { workerService, MarketplaceItem } from '@/services/workerService';
import { useWorkerStore } from '@/store/workerStore';
import type { RootStackScreenProps } from '@/navigation/types';

const CATEGORIES = ['All', 'FMCG', 'Retail', 'Agriculture'];

const RISK_COLORS: Record<string, { bg: string; text: string }> = {
  Low:    { bg: '#D1FAE5', text: '#065F46' },
  Medium: { bg: '#FEF3C7', text: '#92400E' },
  High:   { bg: '#FEE2E2', text: '#991B1B' },
};

const fmt = (n: number) =>
  `₦${n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function InvestmentMarketplaceScreen({
  navigation,
}: RootStackScreenProps<'Worker95Marketplace'>) {
  const { marketplaceItems, activeCategory, setMarketplaceItems, setActiveCategory } =
    useWorkerStore();

  const { isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['worker-marketplace', activeCategory],
    queryFn: async () => {
      const items = await workerService.getMarketplaceTop10(activeCategory);
      setMarketplaceItems(items, activeCategory);
      return items;
    },
    staleTime: 1000 * 60 * 5,
  });

  const handleCategoryChange = useCallback(
    (cat: string) => {
      setActiveCategory(cat);
    },
    [setActiveCategory]
  );

  const handleInspect = (item: MarketplaceItem) => {
    navigation.navigate('Worker95BusinessDetail', { item });
  };

  const items: MarketplaceItem[] = marketplaceItems;

  return (
    <SafeAreaView style={styles.root}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronRight size={22} color="#111827" style={{ transform: [{ rotate: '180deg' }] }} />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Investment Marketplace</Text>
          <Text style={styles.subtitle}>Top 10 by 30-day turnover</Text>
        </View>
        <View style={styles.rankBadge}>
          <Award size={18} color="#FBBF24" />
          <Text style={styles.rankBadgeText}>Top 10</Text>
        </View>
      </View>

      {/* ── Category Filter ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.filterChip, activeCategory === cat && styles.filterChipActive]}
            onPress={() => handleCategoryChange(cat)}
          >
            <Text
              style={[styles.filterChipText, activeCategory === cat && styles.filterChipTextActive]}
            >
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── List ── */}
      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#059669" />
        }
      >
        {isLoading && items.length === 0 ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#059669" />
            <Text style={styles.loadingText}>Fetching live data…</Text>
          </View>
        ) : isError && items.length === 0 ? (
          <View style={styles.centered}>
            <RefreshCw size={32} color="#9CA3AF" />
            <Text style={styles.errorText}>Failed to load marketplace.</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.centered}>
            <BarChart3 size={40} color="#D1D5DB" />
            <Text style={styles.emptyText}>No businesses in this category yet.</Text>
          </View>
        ) : (
          items.map((item, idx) => {
            const risk = RISK_COLORS[item.risk_rating] ?? RISK_COLORS.Medium;
            return (
              <View key={item.cluster_id} style={styles.row}>
                {/* Rank */}
                <View style={[styles.rankCircle, idx < 3 && styles.rankCircleTop]}>
                  <Text style={[styles.rankNum, idx < 3 && styles.rankNumTop]}>
                    {item.rank}
                  </Text>
                </View>

                {/* Info */}
                <View style={styles.rowInfo}>
                  <Text style={styles.businessName} numberOfLines={1}>
                    {item.business_name}
                  </Text>
                  <Text style={styles.category}>{item.category}</Text>

                  <View style={styles.statsRow}>
                    <View style={styles.stat}>
                      <Text style={styles.statLabel}>30-Day Turnover</Text>
                      <Text style={styles.statValue}>{fmt(item.rolling_30_day_turnover)}</Text>
                    </View>
                    <View style={styles.stat}>
                      <Text style={styles.statLabel}>ROI / Month</Text>
                      <Text style={[styles.statValue, { color: '#059669' }]}>
                        {item.projected_monthly_roi.toFixed(2)}%
                      </Text>
                    </View>
                  </View>

                  <View style={styles.rowFooter}>
                    <View style={[styles.riskBadge, { backgroundColor: risk.bg }]}>
                      {item.risk_rating === 'High' && (
                        <AlertTriangle size={11} color={risk.text} />
                      )}
                      <Text style={[styles.riskText, { color: risk.text }]}>
                        {item.risk_rating} Risk
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.inspectBtn}
                      onPress={() => handleInspect(item)}
                    >
                      <TrendingUp size={13} color="#fff" />
                      <Text style={styles.inspectBtnText}>Inspect &amp; Invest</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 12, color: '#9CA3AF', marginTop: 1 },
  rankBadge: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  rankBadgeText: { fontSize: 12, color: '#92400E', fontWeight: '700' },

  filterRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  filterChipActive: { backgroundColor: '#064E3B', borderColor: '#064E3B' },
  filterChipText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  filterChipTextActive: { color: '#fff' },

  list: { paddingHorizontal: 16, paddingTop: 8 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 10 },
  loadingText: { color: '#6B7280', fontSize: 14 },
  errorText: { color: '#EF4444', fontSize: 14 },
  emptyText: { color: '#9CA3AF', fontSize: 14 },
  retryBtn: { backgroundColor: '#059669', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, marginTop: 4 },
  retryBtnText: { color: '#fff', fontWeight: '600' },

  row: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'flex-start',
    gap: 12,
  },
  rankCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  rankCircleTop: { backgroundColor: '#FEF3C7' },
  rankNum: { fontSize: 14, fontWeight: '800', color: '#6B7280' },
  rankNumTop: { color: '#92400E' },

  rowInfo: { flex: 1 },
  businessName: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 2 },
  category: { fontSize: 12, color: '#9CA3AF', marginBottom: 10 },

  statsRow: { flexDirection: 'row', gap: 20, marginBottom: 12 },
  stat: {},
  statLabel: { fontSize: 11, color: '#9CA3AF', marginBottom: 2 },
  statValue: { fontSize: 14, fontWeight: '700', color: '#111827' },

  rowFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  riskBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  riskText: { fontSize: 12, fontWeight: '600' },

  inspectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  inspectBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
