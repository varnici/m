// @ts-nocheck
import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import {
  ChevronRight,
  ArrowDownLeft,
  ArrowUpRight,
  PiggyBank,
  FileText,
} from 'lucide-react-native';
import { useWorkerStore } from '@/store/workerStore';
import { LedgerEntry } from '@/services/workerService';
import type { RootStackScreenProps } from '@/navigation/types';

const WINDOW_SIZE = 20; // FlashList renders this many items above/below viewport

const fmt = (n: number) =>
  `₦${n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function formatDateTime(iso: string): { date: string; time: string } {
  try {
    const d = new Date(iso);
    return {
      date: d.toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: d.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' }),
    };
  } catch {
    return { date: '—', time: '—' };
  }
}

const CLASSIFICATION_CONFIG = {
  Credit: {
    icon: ArrowDownLeft,
    color: '#059669',
    bg: '#D1FAE5',
    sign: '+',
  },
  Deposit: {
    icon: PiggyBank,
    color: '#3B82F6',
    bg: '#DBEAFE',
    sign: '+',
  },
  Debit: {
    icon: ArrowUpRight,
    color: '#EF4444',
    bg: '#FEE2E2',
    sign: '-',
  },
} as const;

// ---------------------------------------------------------------------------
// Row component — memoised to prevent re-renders during deep scroll
// ---------------------------------------------------------------------------
const LedgerRow = React.memo(({ item }: { item: LedgerEntry }) => {
  const { date, time } = formatDateTime(item.timestamp);
  const cfg = CLASSIFICATION_CONFIG[item.classification];
  const Icon = cfg.icon;

  return (
    <View style={styles.row}>
      <View style={[styles.iconWrap, { backgroundColor: cfg.bg }]}>
        <Icon size={18} color={cfg.color} />
      </View>

      <View style={styles.rowMid}>
        <Text style={styles.rowDescriptor} numberOfLines={1}>
          {item.descriptor}
        </Text>
        <Text style={styles.rowDate}>
          {date} · {time}
        </Text>
      </View>

      <View style={styles.rowRight}>
        <Text style={[styles.rowAmount, { color: cfg.color }]}>
          {cfg.sign}
          {fmt(item.amount)}
        </Text>
        <View style={[styles.classBadge, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.classBadgeText, { color: cfg.color }]}>
            {item.classification}
          </Text>
        </View>
      </View>
    </View>
  );
});

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------
function EmptyLedger() {
  return (
    <View style={styles.emptyContainer}>
      <FileText size={48} color="#D1D5DB" />
      <Text style={styles.emptyTitle}>No Transactions Yet</Text>
      <Text style={styles.emptySubtitle}>
        Your financial history will appear here once you invest or save.
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Header row (columns)
// ---------------------------------------------------------------------------
function ColumnHeader() {
  return (
    <View style={styles.columnHeader}>
      <Text style={[styles.colText, { flex: 2 }]}>Descriptor</Text>
      <Text style={[styles.colText, { flex: 1.2, textAlign: 'right' }]}>Volume</Text>
      <Text style={[styles.colText, { width: 64, textAlign: 'right' }]}>Type</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------
export default function FinancialLedgerScreen({
  navigation,
}: RootStackScreenProps<'Worker95Ledger'>) {
  const { ledgerEntries, isLoading } = useWorkerStore();

  const keyExtractor = useCallback((item: LedgerEntry) => item.id, []);
  const renderItem = useCallback(({ item }: { item: LedgerEntry }) => (
    <LedgerRow item={item} />
  ), []);

  const summary = useMemo(() => {
    const credits = ledgerEntries
      .filter((e) => e.classification === 'Credit' || e.classification === 'Deposit')
      .reduce((s, e) => s + e.amount, 0);
    const debits = ledgerEntries
      .filter((e) => e.classification === 'Debit')
      .reduce((s, e) => s + e.amount, 0);
    return { credits, debits, net: credits - debits };
  }, [ledgerEntries]);

  return (
    <SafeAreaView style={styles.root}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronRight size={22} color="#111827" style={{ transform: [{ rotate: '180deg' }] }} />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Financial Audit Ledger</Text>
          <Text style={styles.subtitle}>{ledgerEntries.length} entries</Text>
        </View>
      </View>

      {/* ── Summary Strip ── */}
      <View style={styles.summaryStrip}>
        <View style={styles.summaryStat}>
          <Text style={styles.summaryLabel}>Total In</Text>
          <Text style={[styles.summaryValue, { color: '#059669' }]}>{fmt(summary.credits)}</Text>
        </View>
        <View style={styles.summarySep} />
        <View style={styles.summaryStat}>
          <Text style={styles.summaryLabel}>Total Out</Text>
          <Text style={[styles.summaryValue, { color: '#EF4444' }]}>{fmt(summary.debits)}</Text>
        </View>
        <View style={styles.summarySep} />
        <View style={styles.summaryStat}>
          <Text style={styles.summaryLabel}>Net</Text>
          <Text
            style={[
              styles.summaryValue,
              { color: summary.net >= 0 ? '#059669' : '#EF4444' },
            ]}
          >
            {fmt(Math.abs(summary.net))}
          </Text>
        </View>
      </View>

      <ColumnHeader />

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#059669" />
        </View>
      ) : (
        <FlashList
          data={ledgerEntries}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          estimatedItemSize={76}
          drawDistance={WINDOW_SIZE * 76}
          ListEmptyComponent={EmptyLedger}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9FAFB' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 17, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 12, color: '#9CA3AF', marginTop: 1 },

  summaryStrip: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  summaryStat: { flex: 1, alignItems: 'center' },
  summarySep: { width: 1, backgroundColor: '#E5E7EB', marginVertical: 4 },
  summaryLabel: { fontSize: 11, color: '#9CA3AF', marginBottom: 2 },
  summaryValue: { fontSize: 14, fontWeight: '700' },

  columnHeader: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F3F4F6',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  colText: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

  listContent: { paddingBottom: 100 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowMid: { flex: 1, minWidth: 0 },
  rowDescriptor: { fontSize: 13, fontWeight: '600', color: '#111827', marginBottom: 3 },
  rowDate: { fontSize: 11, color: '#9CA3AF' },
  rowRight: { alignItems: 'flex-end', gap: 4 },
  rowAmount: { fontSize: 14, fontWeight: '700' },
  classBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  classBadgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },

  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 10,
    paddingHorizontal: 40,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#374151', marginTop: 4 },
  emptySubtitle: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 20 },
});
