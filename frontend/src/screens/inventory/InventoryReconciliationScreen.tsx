import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ClipboardCheck,
  Database,
  Filter,
  RotateCcw,
  Search,
} from 'lucide-react-native';
import Toast from 'react-native-toast-message';

import type { RootStackScreenProps } from '@/navigation/types';
import type { Product, StocktakeCount } from '@/types/inventory';
import { inventoryService } from '@/services/inventoryService';
import { colors } from '@/theme/colors';

type AuditStatus = 'not_started' | 'active' | 'ready';

function expectedAmount(product: Product): number {
  return product.expected_amount ?? product.total_quantity_on_hand ?? product.quantity_on_hand ?? 0;
}

function actualNumber(value?: string): number | null {
  if (!value || value.trim() === '') return null;
  const parsed = Number(value.replace(/\D/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function varianceMeta(expected: number, actual: number | null) {
  if (actual === null) {
    return {
      label: 'Pending',
      color: '#64748B',
      backgroundColor: '#F8FAFC',
      signedVariance: 0,
    };
  }

  const signedVariance = actual - expected;
  if (signedVariance < 0) {
    return {
      label: 'Shrinkage/Missing Stock',
      color: '#B45309',
      backgroundColor: '#FFFBEB',
      signedVariance,
    };
  }
  if (signedVariance > 0) {
    return {
      label: 'Overage Found',
      color: '#0369A1',
      backgroundColor: '#EFF6FF',
      signedVariance,
    };
  }
  return {
    label: 'Matched',
    color: '#047857',
    backgroundColor: '#ECFDF5',
    signedVariance,
  };
}

export default function InventoryReconciliationScreen({
  navigation,
  route,
}: RootStackScreenProps<'InventoryReconciliation'>) {
  const queryClient = useQueryClient();
  const initialStoreId = route.params?.storeId;
  const [selectedStoreId, setSelectedStoreId] = useState(initialStoreId || '');
  const [auditStatus, setAuditStatus] = useState<AuditStatus>('not_started');
  const [actualCounts, setActualCounts] = useState<Record<string, string>>({});
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [searchText, setSearchText] = useState('');

  const { data: stores = [] } = useQuery({
    queryKey: ['audit-stores'],
    queryFn: () => inventoryService.getStores(),
  });

  const {
    data: products = [],
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['audit-products', selectedStoreId],
    queryFn: () =>
      inventoryService.getProducts(
        0,
        500,
        undefined,
        undefined,
        selectedStoreId || undefined,
      ),
    enabled: !!selectedStoreId,
  });

  useEffect(() => {
    if (!selectedStoreId && stores.length > 0) {
      setSelectedStoreId(stores[0].id);
    }
  }, [selectedStoreId, stores]);

  const categoryOptions = useMemo(() => {
    const ids = new Set<string>();
    products.forEach((product) => {
      if (product.category_id) ids.add(product.category_id);
    });
    return ['all', ...Array.from(ids)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    const supplierQuery = supplierFilter.trim().toLowerCase();
    return products.filter((product) => {
      const categoryMatch =
        categoryFilter === 'all' || product.category_id === categoryFilter;
      const searchMatch =
        !query ||
        product.name.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query);
      const supplierMatch =
        !supplierQuery ||
        product.brand?.toLowerCase().includes(supplierQuery) ||
        product.description?.toLowerCase().includes(supplierQuery);
      return categoryMatch && searchMatch && supplierMatch;
    });
  }, [categoryFilter, products, searchText, supplierFilter]);

  const countedRows = filteredProducts
    .map((product) => ({
      product,
      expected: expectedAmount(product),
      actual: actualNumber(actualCounts[product.id]),
    }))
    .filter((row) => row.actual !== null);

  const discrepancyCount = countedRows.filter(
    (row) => row.actual !== row.expected,
  ).length;
  const totalSignedVariance = countedRows.reduce(
    (sum, row) => sum + ((row.actual ?? row.expected) - row.expected),
    0,
  );

  const reconcileMutation = useMutation({
    mutationFn: () => {
      const counts: StocktakeCount[] = countedRows.map((row) => ({
        product_id: row.product.id,
        actual_amount: row.actual ?? row.expected,
      }));
      return inventoryService.reconcilePhysicalCounts(selectedStoreId, counts);
    },
    onSuccess: (result) => {
      Toast.show({
        type: 'success',
        text1: 'Inventory balance updated',
        text2: `${result.reconciled_count} product count${result.reconciled_count === 1 ? '' : 's'} reconciled`,
      });
      setAuditStatus('not_started');
      setActualCounts({});
      refetch();
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error: Error) => {
      Toast.show({
        type: 'error',
        text1: 'Reconciliation failed',
        text2: error.message,
      });
    },
  });

  const startAudit = () => {
    const seededCounts: Record<string, string> = {};
    filteredProducts.forEach((product) => {
      seededCounts[product.id] = '';
    });
    setActualCounts(seededCounts);
    setAuditStatus('active');
  };

  const resetAudit = () => {
    setActualCounts({});
    setAuditStatus('not_started');
  };

  const updateActualCount = (productId: string, value: string) => {
    const clean = value.replace(/\D/g, '');
    setActualCounts((prev) => ({ ...prev, [productId]: clean }));
    setAuditStatus('ready');
  };

  const hasCounts = countedRows.length > 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigation.goBack()}
        >
          <ChevronLeft color="#0F172A" size={22} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>Stocktake & Audit</Text>
          <Text style={styles.subtitle}>Expected vs. actual inventory counts</Text>
        </View>
        <TouchableOpacity style={styles.iconButton} onPress={() => refetch()}>
          <RotateCcw color={colors.ventureroot.green} size={18} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={refetch}
            tintColor={colors.ventureroot.green}
          />
        }
      >
        <View style={styles.controls}>
          <View style={styles.controlHeader}>
            <Filter size={16} color="#2563EB" />
            <Text style={styles.sectionTitle}>Audit Controls</Text>
          </View>

          <View style={styles.searchBox}>
            <Search size={16} color="#64748B" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search name or SKU"
              value={searchText}
              onChangeText={setSearchText}
              autoCorrect={false}
            />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.filterRow}>
              {categoryOptions.map((categoryId) => (
                <TouchableOpacity
                  key={categoryId}
                  style={[
                    styles.filterChip,
                    categoryFilter === categoryId && styles.filterChipActive,
                  ]}
                  onPress={() => setCategoryFilter(categoryId)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      categoryFilter === categoryId && styles.filterChipTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {categoryId === 'all' ? 'All Categories' : categoryId}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <TextInput
            style={styles.input}
            placeholder="Filter by supplier or brand"
            value={supplierFilter}
            onChangeText={setSupplierFilter}
          />

          <View style={styles.auditActionRow}>
            <TouchableOpacity style={styles.startButton} onPress={startAudit}>
              <ClipboardCheck size={17} color="#FFFFFF" />
              <Text style={styles.startButtonText}>Start Stock Audit</Text>
            </TouchableOpacity>
            {auditStatus !== 'not_started' && (
              <TouchableOpacity style={styles.resetButton} onPress={resetAudit}>
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.summaryBand}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Rows</Text>
            <Text style={styles.summaryValue}>{filteredProducts.length}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Counted</Text>
            <Text style={styles.summaryValue}>{countedRows.length}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Variance</Text>
            <Text
              style={[
                styles.summaryValue,
                totalSignedVariance < 0 && styles.summaryValueWarn,
              ]}
            >
              {totalSignedVariance > 0 ? '+' : ''}
              {totalSignedVariance}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Flags</Text>
            <Text
              style={[
                styles.summaryValue,
                discrepancyCount > 0 && styles.summaryValueWarn,
              ]}
            >
              {discrepancyCount}
            </Text>
          </View>
        </View>

        <View style={styles.matrix}>
          <View style={styles.matrixHeader}>
            <Text style={[styles.matrixHeaderText, styles.productColumn]}>
              Product
            </Text>
            <Text style={[styles.matrixHeaderText, styles.countColumn]}>
              Expected
            </Text>
            <Text style={[styles.matrixHeaderText, styles.countColumn]}>
              Actual
            </Text>
            <Text style={[styles.matrixHeaderText, styles.statusColumn]}>
              Status
            </Text>
          </View>

          {isLoading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator color={colors.ventureroot.green} />
              <Text style={styles.loadingText}>Loading inventory counts</Text>
            </View>
          ) : filteredProducts.length === 0 ? (
            <View style={styles.emptyState}>
              <Database color="#CBD5E1" size={36} />
              <Text style={styles.emptyText}>No products match these filters.</Text>
            </View>
          ) : (
            filteredProducts.map((product) => {
              const expected = expectedAmount(product);
              const actual = actualNumber(actualCounts[product.id]);
              const meta = varianceMeta(expected, actual);
              return (
                <View
                  key={product.id}
                  style={[
                    styles.matrixRow,
                    actual !== null && actual !== expected && styles.matrixRowVariance,
                  ]}
                >
                  <View style={styles.productColumn}>
                    <Text style={styles.productName} numberOfLines={1}>
                      {product.name}
                    </Text>
                    <Text style={styles.productMeta} numberOfLines={1}>
                      {product.sku}
                    </Text>
                  </View>

                  <Text style={[styles.expectedText, styles.countColumn]}>
                    {expected}
                  </Text>

                  <View style={styles.countColumn}>
                    <TextInput
                      style={styles.actualInput}
                      value={actualCounts[product.id] ?? ''}
                      onChangeText={(value) => updateActualCount(product.id, value)}
                      editable={auditStatus !== 'not_started'}
                      placeholder="-"
                      keyboardType="number-pad"
                    />
                  </View>

                  <View style={styles.statusColumn}>
                    <View
                      style={[
                        styles.statusPill,
                        { backgroundColor: meta.backgroundColor },
                      ]}
                    >
                      {actual !== null && actual !== expected ? (
                        <AlertTriangle size={12} color={meta.color} />
                      ) : (
                        <CheckCircle2 size={12} color={meta.color} />
                      )}
                      <Text
                        style={[styles.statusText, { color: meta.color }]}
                        numberOfLines={1}
                      >
                        {actual !== null && meta.signedVariance !== 0
                          ? `${meta.signedVariance > 0 ? '+' : ''}${meta.signedVariance}`
                          : meta.label}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.reconcileButton,
            (!hasCounts || reconcileMutation.isPending) && styles.disabledButton,
          ]}
          disabled={!hasCounts || reconcileMutation.isPending}
          onPress={() => reconcileMutation.mutate()}
        >
          {reconcileMutation.isPending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <ClipboardCheck size={18} color="#FFFFFF" />
              <Text style={styles.reconcileButtonText}>
                Reconcile & Update Inventory Balance
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  headerText: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    color: '#0F172A',
    fontSize: 19,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 2,
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  body: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 14,
  },
  controls: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 12,
  },
  controlHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '900',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
  },
  searchInput: {
    flex: 1,
    height: 42,
    color: '#0F172A',
    fontSize: 14,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    maxWidth: 180,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  filterChipActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  filterChipText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '800',
  },
  filterChipTextActive: {
    color: '#1D4ED8',
  },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#0F172A',
    fontSize: 14,
    backgroundColor: '#FFFFFF',
  },
  auditActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  startButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 8,
    backgroundColor: colors.ventureroot.green,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  resetButton: {
    minHeight: 46,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  resetButtonText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '900',
  },
  summaryBand: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 12,
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    color: '#CBD5E1',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  summaryValue: {
    marginTop: 4,
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  summaryValueWarn: {
    color: '#FBBF24',
  },
  matrix: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  matrixHeader: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  matrixHeaderText: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  matrixRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 66,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  matrixRowVariance: {
    backgroundColor: '#FFFBEB',
  },
  productColumn: {
    flex: 1.35,
    paddingRight: 8,
  },
  countColumn: {
    width: 76,
    textAlign: 'center',
  },
  statusColumn: {
    width: 112,
    alignItems: 'flex-end',
  },
  productName: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '900',
  },
  productMeta: {
    marginTop: 3,
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
  },
  expectedText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '900',
  },
  actualInput: {
    width: 58,
    height: 38,
    alignSelf: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    textAlign: 'center',
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '900',
    backgroundColor: '#FFFFFF',
    padding: 0,
  },
  statusPill: {
    maxWidth: 110,
    minHeight: 28,
    borderRadius: 8,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    flexShrink: 1,
    fontSize: 10,
    fontWeight: '900',
  },
  loadingState: {
    alignItems: 'center',
    paddingVertical: 36,
    gap: 8,
  },
  loadingText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 42,
    gap: 10,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
  },
  reconcileButton: {
    minHeight: 52,
    borderRadius: 8,
    backgroundColor: colors.ventureroot.green,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  reconcileButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
  },
  disabledButton: {
    opacity: 0.45,
  },
});
