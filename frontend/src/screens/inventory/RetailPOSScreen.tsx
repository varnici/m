import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
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
  Banknote,
  ChevronLeft,
  CreditCard,
  Minus,
  Plus,
  ScanLine,
  Search,
  ShoppingCart,
  Trash2,
  X,
} from 'lucide-react-native';
import Toast from 'react-native-toast-message';

import type { RootStackScreenProps } from '@/navigation/types';
import type { Product } from '@/types/inventory';
import { inventoryService } from '@/services/inventoryService';
import { salesService } from '@/services/salesService';
import { colors } from '@/theme/colors';
import BarcodeScanner from '@/components/BarcodeScanner';

type LineMap = Record<string, number>;
type PaymentMethod = 'cash' | 'card' | 'transfer';

const QUICK_TILE_COUNT = 8;

function formatNaira(kobo: number): string {
  return `₦${(kobo / 100).toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function retailPrice(product: Product): number {
  return product.retail_price_kobo && product.retail_price_kobo > 0
    ? product.retail_price_kobo
    : product.selling_price_kobo;
}

function availableQty(product: Product): number {
  return Math.max(
    0,
    (product.total_quantity_on_hand ?? product.quantity_on_hand ?? 0) -
      (product.total_reserved_quantity ?? 0),
  );
}

export default function RetailPOSScreen({
  navigation,
}: RootStackScreenProps<'RetailPOS'>) {
  const queryClient = useQueryClient();
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [searchText, setSearchText] = useState('');
  const [lines, setLines] = useState<LineMap>({});
  const [scannerOpen, setScannerOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');

  const { data: stores = [] } = useQuery({
    queryKey: ['pos-stores'],
    queryFn: () => inventoryService.getStores(),
  });

  const {
    data: products = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['pos-products', selectedStoreId],
    queryFn: () =>
      inventoryService.getProducts(0, 250, undefined, undefined, selectedStoreId || undefined),
  });

  useEffect(() => {
    if (!selectedStoreId && stores.length > 0) {
      setSelectedStoreId(stores[0].id);
    }
  }, [selectedStoreId, stores]);

  const updateLine = (productId: string, nextQty: number) => {
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

  const addToCart = (product: Product) => {
    const current = lines[product.id] || 0;
    if (current >= availableQty(product)) {
      Toast.show({ type: 'error', text1: 'Not enough stock available' });
      return;
    }
    updateLine(product.id, current + 1);
  };

  const searchResults = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) return [];
    return products
      .filter(
        (product) =>
          product.name.toLowerCase().includes(query) ||
          product.sku.toLowerCase().includes(query),
      )
      .slice(0, 20);
  }, [products, searchText]);

  const quickTiles = useMemo(() => {
    return [...products]
      .filter((product) => availableQty(product) > 0)
      .sort((a, b) => (b.monthly_velocity ?? 0) - (a.monthly_velocity ?? 0))
      .slice(0, QUICK_TILE_COUNT);
  }, [products]);

  const cartItems = useMemo(() => {
    return products
      .map((product) => ({
        product,
        quantity: lines[product.id] || 0,
        priceKobo: retailPrice(product),
      }))
      .filter((item) => item.quantity > 0);
  }, [lines, products]);

  const totalKobo = cartItems.reduce((sum, item) => sum + item.quantity * item.priceKobo, 0);
  const canCheckout = !!selectedStoreId && cartItems.length > 0;

  const handleBarcodeScanned = async (barcode: string) => {
    setScannerOpen(false);
    const local = products.find(
      (p) => p.barcode === barcode || p.qr_code === barcode || p.sku === barcode,
    );
    if (local) {
      addToCart(local);
      return;
    }
    try {
      const found = await inventoryService.searchByBarcode(barcode);
      if (found) {
        addToCart(found);
      } else {
        Toast.show({ type: 'error', text1: 'No product matches that barcode' });
      }
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Barcode lookup failed', text2: error.message });
    }
  };

  const completeSaleMutation = useMutation({
    mutationFn: () =>
      salesService.processSale({
        store_id: selectedStoreId,
        payment_method: paymentMethod,
        order_type: 'pos',
        status: 'completed',
        items: cartItems.map((item) => ({
          product_id: item.product.id,
          quantity_sold: item.quantity,
          unit_price_kobo: item.priceKobo,
        })),
      }),
    onSuccess: (sale) => {
      Toast.show({ type: 'success', text1: 'Sale complete' });
      setLines({});
      refetch();
      queryClient.invalidateQueries({ queryKey: ['products'] });
      if (sale?.id) {
        navigation.navigate('Receipt', { saleId: sale.id });
      }
    },
    onError: (error: Error) => {
      Toast.show({ type: 'error', text1: 'Sale failed', text2: error.message });
    },
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <ChevronLeft size={22} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>Retail POS</Text>
          <Text style={styles.subtitle}>Scan, tap, and check out</Text>
        </View>
      </View>

      <View style={styles.searchBar}>
        <View style={styles.searchInputWrap}>
          <Search size={16} color="#64748B" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or SKU..."
            value={searchText}
            onChangeText={setSearchText}
            autoCorrect={false}
          />
        </View>
        <TouchableOpacity
          style={styles.scanButton}
          onPress={() => setScannerOpen(true)}
          accessibilityLabel="Scan barcode"
        >
          <ScanLine size={18} color="#FFFFFF" />
          <Text style={styles.scanButtonText}>Scan</Text>
        </TouchableOpacity>
      </View>

      {searchText.trim().length > 0 ? (
        <ScrollView style={styles.searchResults} keyboardShouldPersistTaps="handled">
          {searchResults.map((product) => (
            <TouchableOpacity
              key={product.id}
              style={styles.searchResultRow}
              onPress={() => {
                addToCart(product);
                setSearchText('');
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.searchResultName} numberOfLines={1}>
                  {product.name}
                </Text>
                <Text style={styles.searchResultMeta}>
                  {product.sku} • {availableQty(product)} available
                </Text>
              </View>
              <Text style={styles.searchResultPrice}>{formatNaira(retailPrice(product))}</Text>
            </TouchableOpacity>
          ))}
          {searchResults.length === 0 ? (
            <Text style={styles.emptyText}>No products match "{searchText}"</Text>
          ) : null}
        </ScrollView>
      ) : (
        <View style={styles.splitPanels}>
          <View style={styles.cartPanel}>
            <View style={styles.panelHeader}>
              <ShoppingCart size={15} color="#0F172A" />
              <Text style={styles.panelTitle}>Cart</Text>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {cartItems.length === 0 ? (
                <Text style={styles.emptyText}>Cart is empty — tap a tile or scan an item.</Text>
              ) : (
                cartItems.map((item) => (
                  <View key={item.product.id} style={styles.cartRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cartItemName} numberOfLines={1}>
                        {item.product.name}
                      </Text>
                      <Text style={styles.cartItemPrice}>{formatNaira(item.priceKobo)}</Text>
                    </View>
                    <View style={styles.stepper}>
                      <TouchableOpacity
                        style={styles.stepButton}
                        onPress={() => updateLine(item.product.id, item.quantity - 1)}
                      >
                        <Minus size={13} color="#475569" />
                      </TouchableOpacity>
                      <Text style={styles.stepperQty}>{item.quantity}</Text>
                      <TouchableOpacity
                        style={styles.stepButton}
                        onPress={() => addToCart(item.product)}
                      >
                        <Plus size={13} color="#475569" />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.cartSubtotal}>
                      {formatNaira(item.quantity * item.priceKobo)}
                    </Text>
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => updateLine(item.product.id, 0)}
                      accessibilityLabel={`Remove ${item.product.name}`}
                    >
                      <Trash2 size={14} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>
          </View>

          <View style={styles.tilesPanel}>
            <Text style={styles.panelTitle}>Quick Add</Text>
            {isLoading ? (
              <ActivityIndicator color={colors.ventureroot.green} style={{ marginTop: 20 }} />
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.tilesGrid}>
                  {quickTiles.map((product) => (
                    <TouchableOpacity
                      key={product.id}
                      style={styles.tile}
                      onPress={() => addToCart(product)}
                    >
                      <Text style={styles.tileName} numberOfLines={2}>
                        {product.name}
                      </Text>
                      <Text style={styles.tilePrice}>{formatNaira(retailPrice(product))}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      )}

      <View style={styles.footer}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Due</Text>
          <Text style={styles.totalValue}>{formatNaira(totalKobo)}</Text>
        </View>

        <View style={styles.paymentRow}>
          {(
            [
              { key: 'cash' as const, label: 'Cash', icon: Banknote },
              { key: 'card' as const, label: 'Card', icon: CreditCard },
              { key: 'transfer' as const, label: 'Transfer', icon: ScanLine },
            ]
          ).map(({ key, label, icon: Icon }) => (
            <TouchableOpacity
              key={key}
              style={[styles.paymentChip, paymentMethod === key && styles.paymentChipActive]}
              onPress={() => setPaymentMethod(key)}
            >
              <Icon size={14} color={paymentMethod === key ? '#FFFFFF' : '#475569'} />
              <Text
                style={[
                  styles.paymentChipText,
                  paymentMethod === key && styles.paymentChipTextActive,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.completeButton, !canCheckout && styles.completeButtonDisabled]}
          disabled={!canCheckout || completeSaleMutation.isPending}
          onPress={() => completeSaleMutation.mutate()}
        >
          {completeSaleMutation.isPending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.completeButtonText}>Complete Sale & Print Receipt</Text>
          )}
        </TouchableOpacity>
      </View>

      <Modal visible={scannerOpen} animationType="slide" onRequestClose={() => setScannerOpen(false)}>
        <SafeAreaView style={styles.scannerModal}>
          <View style={styles.scannerHeader}>
            <Text style={styles.scannerTitle}>Scan Barcode</Text>
            <TouchableOpacity onPress={() => setScannerOpen(false)} accessibilityLabel="Close scanner">
              <X size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <BarcodeScanner onBarcodeScanned={handleBarcodeScanned} />
        </SafeAreaView>
      </Modal>
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    height: 42,
    color: '#0F172A',
    fontSize: 14,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.ventureroot.green,
    borderRadius: 8,
    paddingHorizontal: 14,
    height: 42,
  },
  scanButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  searchResults: {
    flex: 1,
    padding: 12,
  },
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 8,
  },
  searchResultName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  searchResultMeta: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  searchResultPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  splitPanels: {
    flex: 1,
    flexDirection: 'row',
  },
  cartPanel: {
    flex: 1.3,
    padding: 12,
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  tilesPanel: {
    flex: 1,
    padding: 12,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  panelTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    paddingVertical: 20,
    textAlign: 'center',
  },
  cartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    marginBottom: 8,
    gap: 8,
  },
  cartItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  cartItemPrice: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    overflow: 'hidden',
  },
  stepButton: {
    width: 26,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  stepperQty: {
    width: 26,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  cartSubtotal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    minWidth: 64,
    textAlign: 'right',
  },
  removeButton: {
    padding: 4,
  },
  tilesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tile: {
    width: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    minHeight: 70,
    justifyContent: 'space-between',
  },
  tileName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  tilePrice: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '800',
    color: colors.ventureroot.green,
  },
  footer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    padding: 14,
    gap: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
  },
  paymentRow: {
    flexDirection: 'row',
    gap: 8,
  },
  paymentChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingVertical: 9,
  },
  paymentChipActive: {
    backgroundColor: colors.ventureroot.green,
    borderColor: colors.ventureroot.green,
  },
  paymentChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  paymentChipTextActive: {
    color: '#FFFFFF',
  },
  completeButton: {
    backgroundColor: colors.ventureroot.green,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  completeButtonDisabled: {
    opacity: 0.45,
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  scannerModal: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  scannerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
