import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
  FileText,
  Minus,
  Package,
  Plus,
  Search,
  Truck,
  Users,
} from 'lucide-react-native';
import Toast from 'react-native-toast-message';

import type { RootStackScreenProps } from '@/navigation/types';
import type { Product } from '@/types/inventory';
import { inventoryService } from '@/services/inventoryService';
import { colors } from '@/theme/colors';

type LineMap = Record<string, number>;
type PaymentTerms = 'immediate' | 'net30';

function formatNaira(kobo: number): string {
  return `₦${(kobo / 100).toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function availableQty(product: Product): number {
  return Math.max(
    0,
    (product.total_quantity_on_hand ?? product.quantity_on_hand ?? 0) -
      (product.total_reserved_quantity ?? 0),
  );
}

function tradePrice(product: Product): number {
  return product.trade_price_kobo && product.trade_price_kobo > 0
    ? product.trade_price_kobo
    : product.selling_price_kobo;
}

function tradeMoq(product: Product): number {
  return Math.max(1, product.trade_moq ?? 1);
}

export default function TradeOrderScreen({
  navigation,
}: RootStackScreenProps<'TradeOrder'>) {
  const queryClient = useQueryClient();
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [clientId, setClientId] = useState<string>('');
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientVat, setNewClientVat] = useState('');
  const [newClientAddress, setNewClientAddress] = useState('');
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerms>('immediate');
  const [searchText, setSearchText] = useState('');
  const [lines, setLines] = useState<LineMap>({});
  // Set once "Save Draft / Hold Stock" succeeds — the SAME persisted order and
  // its held reservations are what "Generate Invoice" commits, instead of
  // dispatch silently re-reserving fresh stock (the bug this screen used to have).
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);

  const { data: stores = [] } = useQuery({
    queryKey: ['trade-stores'],
    queryFn: () => inventoryService.getStores(),
  });

  const {
    data: tradeClients = [],
    refetch: refetchClients,
  } = useQuery({
    queryKey: ['trade-clients'],
    queryFn: () => inventoryService.getTradeClients(),
  });

  useEffect(() => {
    if (!clientId && tradeClients.length > 0) {
      setClientId(tradeClients[0].id);
    }
  }, [clientId, tradeClients]);

  const createClientMutation = useMutation({
    mutationFn: () =>
      inventoryService.createTradeClient({
        company_name: newClientName.trim(),
        vat_number: newClientVat.trim() || undefined,
        delivery_address: newClientAddress.trim() || undefined,
      }),
    onSuccess: async (client) => {
      Toast.show({ type: 'success', text1: 'Trade client added' });
      setNewClientName('');
      setNewClientVat('');
      setNewClientAddress('');
      setShowNewClientForm(false);
      await refetchClients();
      setClientId(client.id);
    },
    onError: (error: Error) => {
      Toast.show({ type: 'error', text1: 'Could not add client', text2: error.message });
    },
  });

  const {
    data: products = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['trade-products', selectedStoreId],
    queryFn: () =>
      inventoryService.getProducts(
        0,
        250,
        undefined,
        undefined,
        selectedStoreId || undefined,
      ),
  });

  useEffect(() => {
    if (!selectedStoreId && stores.length > 0) {
      setSelectedStoreId(stores[0].id);
    }
  }, [selectedStoreId, stores]);

  const selectedClient = tradeClients.find((client) => client.id === clientId);

  const filteredProducts = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) return products.slice(0, 20);
    return products
      .filter((product) => {
        return (
          product.name.toLowerCase().includes(query) ||
          product.sku.toLowerCase().includes(query)
        );
      })
      .slice(0, 30);
  }, [products, searchText]);

  const orderItems = useMemo(() => {
    return products
      .map((product) => ({
        product,
        quantity: lines[product.id] || 0,
        priceKobo: tradePrice(product),
        moq: tradeMoq(product),
        available: availableQty(product),
      }))
      .filter((item) => item.quantity > 0);
  }, [lines, products]);

  const totalKobo = orderItems.reduce(
    (sum, item) => sum + item.quantity * item.priceKobo,
    0,
  );
  const hasMoqError = orderItems.some((item) => item.quantity < item.moq);
  const hasStockError = orderItems.some((item) => item.quantity > item.available);
  const canSubmit =
    !!selectedStoreId && !!clientId && orderItems.length > 0 && !hasMoqError && !hasStockError;
  // Once stock is held against a persisted order, lock the cart — editing
  // quantities here wouldn't change what's already reserved server-side.
  const isLocked = !!pendingOrderId;

  const updateLine = (productId: string, nextQty: number) => {
    if (isLocked) return;
    setLines((prev) => {
      const cleanQty = Math.max(0, Math.floor(nextQty || 0));
      const next = { ...prev };
      if (cleanQty <= 0) {
        delete next[productId];
      } else {
        next[productId] = cleanQty;
      }
      return next;
    });
  };

  const buildOrderLines = () =>
    orderItems.map((item) => ({
      product_id: item.product.id,
      quantity: item.quantity,
      unit_price_kobo: item.priceKobo,
    }));

  const holdStockMutation = useMutation({
    mutationFn: async () => {
      const order = await inventoryService.createTradeOrder({
        client_id: clientId,
        store_id: selectedStoreId,
        payment_terms: paymentTerms,
        lines: buildOrderLines(),
      });
      return inventoryService.holdTradeOrder(order.id);
    },
    onSuccess: (order) => {
      setPendingOrderId(order.id);
      Toast.show({ type: 'success', text1: 'Draft saved and stock held' });
      refetch();
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error: Error) => {
      Toast.show({
        type: 'error',
        text1: 'Could not hold stock',
        text2: error.message,
      });
    },
  });

  const dispatchMutation = useMutation({
    mutationFn: async () => {
      // If stock was already held above, dispatch commits THAT exact
      // reservation. Otherwise create-and-dispatch in one step (the backend
      // auto-holds a draft order before dispatching it).
      if (pendingOrderId) {
        return inventoryService.dispatchTradeOrder(pendingOrderId);
      }
      const order = await inventoryService.createTradeOrder({
        client_id: clientId,
        store_id: selectedStoreId,
        payment_terms: paymentTerms,
        lines: buildOrderLines(),
      });
      return inventoryService.dispatchTradeOrder(order.id);
    },
    onSuccess: (order) => {
      Toast.show({ type: 'success', text1: 'Invoice approved for dispatch' });
      setPendingOrderId(null);
      setLines({});
      refetch();
      queryClient.invalidateQueries({ queryKey: ['products'] });
      if (order?.sale_id) {
        navigation.navigate('Receipt', { saleId: order.sale_id });
      }
    },
    onError: (error: Error) => {
      Toast.show({
        type: 'error',
        text1: 'Dispatch failed',
        text2: error.message,
      });
    },
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigation.goBack()}
        >
          <ChevronLeft size={22} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>Trade Order Desk</Text>
          <Text style={styles.subtitle}>Bulk orders, terms, stock holds</Text>
        </View>
        <View style={styles.headerIcon}>
          <FileText size={20} color={colors.ventureroot.green} />
        </View>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Users size={16} color="#2563EB" />
            <Text style={styles.sectionTitle}>Customer Account</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.clientRow}>
              {tradeClients.map((client) => (
                <TouchableOpacity
                  key={client.id}
                  style={[
                    styles.clientChip,
                    clientId === client.id && styles.clientChipActive,
                  ]}
                  onPress={() => setClientId(client.id)}
                >
                  <Text
                    style={[
                      styles.clientChipText,
                      clientId === client.id && styles.clientChipTextActive,
                    ]}
                  >
                    {client.company_name}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[styles.clientChip, showNewClientForm && styles.clientChipActive]}
                onPress={() => setShowNewClientForm((prev) => !prev)}
              >
                <Text
                  style={[
                    styles.clientChipText,
                    showNewClientForm && styles.clientChipTextActive,
                  ]}
                >
                  + New Client
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {showNewClientForm ? (
            <View style={styles.newClientForm}>
              <TextInput
                style={styles.input}
                placeholder="Company name *"
                value={newClientName}
                onChangeText={setNewClientName}
              />
              <TextInput
                style={styles.input}
                placeholder="VAT number (optional)"
                value={newClientVat}
                onChangeText={setNewClientVat}
              />
              <TextInput
                style={styles.input}
                placeholder="Delivery address (optional)"
                value={newClientAddress}
                onChangeText={setNewClientAddress}
              />
              <TouchableOpacity
                style={[
                  styles.primaryAction,
                  (!newClientName.trim() || createClientMutation.isPending) && styles.actionDisabled,
                ]}
                disabled={!newClientName.trim() || createClientMutation.isPending}
                onPress={() => createClientMutation.mutate()}
              >
                {createClientMutation.isPending ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryActionText}>Save Client</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : selectedClient ? (
            <View style={styles.clientDetail}>
              {selectedClient.vat_number ? (
                <Text style={styles.clientDetailText}>{selectedClient.vat_number}</Text>
              ) : null}
              {selectedClient.delivery_address ? (
                <Text style={styles.clientDetailText} numberOfLines={1}>
                  {selectedClient.delivery_address}
                </Text>
              ) : null}
            </View>
          ) : (
            <Text style={styles.emptyClientsText}>
              No trade clients yet — tap "+ New Client" to add one.
            </Text>
          )}

          <View style={styles.termsToggle}>
            {(['immediate', 'net30'] as const).map((term) => (
              <TouchableOpacity
                key={term}
                style={[
                  styles.termButton,
                  paymentTerms === term && styles.termButtonActive,
                ]}
                onPress={() => setPaymentTerms(term)}
              >
                <Text
                  style={[
                    styles.termButtonText,
                    paymentTerms === term && styles.termButtonTextActive,
                  ]}
                >
                  {term === 'immediate' ? 'Immediate Payment' : 'Net 30 Invoice'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Package size={16} color="#0F766E" />
            <Text style={styles.sectionTitle}>Bulk Order Grid</Text>
          </View>
          <View style={styles.searchBox}>
            <Search size={16} color="#64748B" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search SKU or product name"
              value={searchText}
              onChangeText={setSearchText}
              autoCorrect={false}
            />
          </View>

          {isLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={colors.ventureroot.green} />
              <Text style={styles.loadingText}>Loading trade catalogue</Text>
            </View>
          ) : (
            <View style={styles.grid}>
              <View style={styles.gridHeader}>
                <Text style={[styles.gridHeaderText, styles.productColumn]}>
                  Product
                </Text>
                <Text style={[styles.gridHeaderText, styles.qtyColumn]}>Qty</Text>
                <Text style={[styles.gridHeaderText, styles.totalColumn]}>
                  Total
                </Text>
              </View>

              {filteredProducts.map((product) => {
                const quantity = lines[product.id] || 0;
                const price = tradePrice(product);
                const moq = tradeMoq(product);
                const available = availableQty(product);
                const moqError = quantity > 0 && quantity < moq;
                const stockError = quantity > available;

                return (
                  <View
                    key={product.id}
                    style={[
                      styles.gridRow,
                      (moqError || stockError) && styles.gridRowWarning,
                    ]}
                  >
                    <View style={styles.productColumn}>
                      <Text style={styles.productName} numberOfLines={1}>
                        {product.name}
                      </Text>
                      <Text style={styles.productMeta} numberOfLines={1}>
                        {product.sku} • MOQ {moq} • {available} available
                      </Text>
                      {(moqError || stockError) && (
                        <View style={styles.warningLine}>
                          <AlertTriangle size={12} color="#B45309" />
                          <Text style={styles.warningText}>
                            {moqError
                              ? 'Minimum Order Quantity not met.'
                              : 'Order exceeds available stock.'}
                          </Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.qtyColumn}>
                      <View style={[styles.stepper, isLocked && styles.actionDisabled]}>
                        <TouchableOpacity
                          style={styles.stepButton}
                          disabled={isLocked}
                          onPress={() => updateLine(product.id, quantity - 1)}
                        >
                          <Minus size={14} color="#475569" />
                        </TouchableOpacity>
                        <TextInput
                          style={[
                            styles.qtyInput,
                            moqError && styles.qtyInputWarning,
                          ]}
                          value={quantity ? String(quantity) : ''}
                          placeholder="0"
                          keyboardType="number-pad"
                          editable={!isLocked}
                          onChangeText={(value) =>
                            updateLine(product.id, Number(value.replace(/\D/g, '')))
                          }
                        />
                        <TouchableOpacity
                          style={styles.stepButton}
                          disabled={isLocked}
                          onPress={() => updateLine(product.id, quantity + 1)}
                        >
                          <Plus size={14} color="#475569" />
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.unitPrice}>{formatNaira(price)}</Text>
                    </View>

                    <Text style={[styles.lineTotal, styles.totalColumn]}>
                      {formatNaira(quantity * price)}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <View style={styles.summaryBand}>
          <View>
            <Text style={styles.summaryLabel}>Total Amount</Text>
            <Text style={styles.summaryValue}>{formatNaira(totalKobo)}</Text>
          </View>
          <View style={styles.summaryBadge}>
            {isLocked ? (
              <CheckCircle2 size={16} color="#2563EB" />
            ) : hasMoqError || hasStockError ? (
              <AlertTriangle size={16} color="#B45309" />
            ) : (
              <CheckCircle2 size={16} color="#047857" />
            )}
            <Text
              style={[
                styles.summaryBadgeText,
                (hasMoqError || hasStockError) && styles.summaryBadgeTextWarn,
              ]}
            >
              {isLocked
                ? 'Stock held — ready to dispatch'
                : `${orderItems.length} line${orderItems.length === 1 ? '' : 's'}`}
            </Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.secondaryAction, (!canSubmit || isLocked) && styles.actionDisabled]}
            disabled={!canSubmit || isLocked || holdStockMutation.isPending}
            onPress={() => holdStockMutation.mutate()}
          >
            {holdStockMutation.isPending ? (
              <ActivityIndicator color={colors.ventureroot.green} />
            ) : (
              <>
                <Package size={17} color={colors.ventureroot.green} />
                <Text style={styles.secondaryActionText}>
                  {isLocked ? 'Stock Held' : 'Save Draft / Hold Stock'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryAction, !canSubmit && styles.actionDisabled]}
            disabled={!canSubmit || dispatchMutation.isPending}
            onPress={() => dispatchMutation.mutate()}
          >
            {dispatchMutation.isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Truck size={17} color="#FFFFFF" />
                <Text style={styles.primaryActionText}>Generate Invoice</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
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
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
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
    fontSize: 19,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DCFCE7',
  },
  body: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 14,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  clientRow: {
    flexDirection: 'row',
    gap: 8,
  },
  clientChip: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  clientChipActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  clientChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  clientChipTextActive: {
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
  clientDetail: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    gap: 4,
  },
  clientDetailText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  newClientForm: {
    gap: 8,
  },
  emptyClientsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    paddingVertical: 4,
  },
  termsToggle: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 4,
  },
  termButton: {
    flex: 1,
    borderRadius: 6,
    paddingVertical: 9,
    alignItems: 'center',
  },
  termButtonActive: {
    backgroundColor: colors.ventureroot.green,
  },
  termButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
  },
  termButtonTextActive: {
    color: '#FFFFFF',
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
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    gap: 8,
  },
  loadingText: {
    color: '#64748B',
    fontWeight: '600',
    fontSize: 12,
  },
  grid: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  gridHeader: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  gridHeaderText: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 78,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  gridRowWarning: {
    backgroundColor: '#FFFBEB',
  },
  productColumn: {
    flex: 1.4,
    paddingRight: 8,
  },
  qtyColumn: {
    width: 118,
  },
  totalColumn: {
    width: 88,
    textAlign: 'right',
  },
  productName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  productMeta: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  warningLine: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  warningText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    overflow: 'hidden',
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
  },
  stepButton: {
    width: 30,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  qtyInput: {
    width: 42,
    height: 32,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#CBD5E1',
    padding: 0,
  },
  qtyInputWarning: {
    color: '#B45309',
  },
  unitPrice: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  lineTotal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  summaryBand: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 16,
  },
  summaryLabel: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  summaryValue: {
    marginTop: 4,
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },
  summaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  summaryBadgeText: {
    color: '#047857',
    fontSize: 12,
    fontWeight: '900',
  },
  summaryBadgeTextWarn: {
    color: '#B45309',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryAction: {
    flex: 1,
    minHeight: 50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.ventureroot.green,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 8,
  },
  secondaryActionText: {
    color: colors.ventureroot.green,
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },
  primaryAction: {
    flex: 1,
    minHeight: 50,
    borderRadius: 8,
    backgroundColor: colors.ventureroot.green,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 8,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  actionDisabled: {
    opacity: 0.45,
  },
});
