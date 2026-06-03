import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useProducts } from '@/hooks/useInventory';
import { Ionicons } from '@expo/vector-icons';
import { retailCategoriesData } from '@/data/retailCategories';
import { colors } from '@/theme/colors';
import type { Product as InventoryProduct } from '@/types/inventory';

// ============================================================================
// TYPES
// ============================================================================

type Product = InventoryProduct;

interface ProductItemProps {
  product: Product;
  viewMode: 'list' | 'grid';
  onPress: (id: string) => void;
}

// ============================================================================
// COMPONENTS
// ============================================================================

// Find category icon (handles both parent and subcategories)
const getCategoryIcon = (categoryId?: string) => {
  if (!categoryId) return null;
  // Check top level
  let cat = retailCategoriesData.find(c => c.id === categoryId);
  if (cat) return cat;
  
  // Check subcategories
  for (const c of retailCategoriesData) {
    if (c.subcategories) {
      const sub = c.subcategories.find(s => s.id === categoryId);
      if (sub) return c; // Return the parent category for the icon/bg color
    }
  }
  
  return null;
};

const ProductItem = React.memo(({ product, viewMode, onPress }: ProductItemProps) => {
  const quantityOnHand = product.total_quantity_on_hand ?? product.quantity_on_hand ?? 0;
  const reservedQuantity = product.total_reserved_quantity ?? 0;
  const availableQuantity = Math.max(0, quantityOnHand - reservedQuantity);
  const isOutOfStock = availableQuantity <= 0;
  const isLowStock = !isOutOfStock && availableQuantity <= product.minimum_stock_level;
  const profitPerUnit = product.selling_price_kobo - product.cost_price_kobo;
  const margin =
    product.selling_price_kobo > 0
      ? Math.round((profitPerUnit / product.selling_price_kobo) * 100)
      : 0;
  const stockLabel = isOutOfStock ? 'Out of stock' : isLowStock ? 'Low stock' : 'Healthy';
  const stockColor = isOutOfStock ? '#DC2626' : isLowStock ? '#D97706' : '#047857';

  // Find category icon
  const category = getCategoryIcon(product.category_id);

  if (viewMode === 'grid') {
    return (
      <TouchableOpacity
        style={[styles.productCard, { marginBottom: 0 }]}
        onPress={() => onPress(product.id)}
        activeOpacity={0.7}
      >
        <View className="items-center mb-3">
          <View 
            style={{ 
              backgroundColor: category?.backgroundColor || '#F3F4F6',
              width: 50,
              height: 50,
              borderRadius: 16,
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 8
            }}
          >
            {category?.icon ? (
              <Image source={category.icon} style={{ width: 30, height: 30 }} resizeMode="contain" />
            ) : (
              <Ionicons name="cube" size={24} color="#6B7280" />
            )}
          </View>
          <Text style={[styles.productName, { textAlign: 'center' }]} numberOfLines={2}>{product.name}</Text>
        </View>

        <View style={styles.gridMetrics}>
          <Text style={[styles.statValue, { fontSize: 14 }]}>{availableQuantity} available</Text>
          <Text style={[styles.statValueSuccess, { fontSize: 12, marginTop: 2 }]}>{margin}% margin</Text>
        </View>

        {(isLowStock || isOutOfStock) && (
          <View style={[styles.lowStockBadge, { position: 'absolute', top: 8, right: 8, marginLeft: 0, backgroundColor: isOutOfStock ? '#FEF2F2' : '#FFFBEB' }]}>
            <Text style={[styles.lowStockText, { fontSize: 10, color: stockColor }]}>{isOutOfStock ? 'Out' : 'Low'}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => onPress(product.id)}
      activeOpacity={0.7}
    >
      <View className="flex-row items-center mb-3">
        <View 
          style={{ 
            backgroundColor: category?.backgroundColor || '#F3F4F6',
            width: 40,
            height: 40,
            borderRadius: 12,
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 12
          }}
        >
          {category?.icon ? (
            <Image source={category.icon} style={{ width: 24, height: 24 }} resizeMode="contain" />
          ) : (
            <Ionicons name="cube" size={20} color="#6B7280" />
          )}
        </View>
        <View className="flex-1">
          <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
          <Text style={styles.skuText}>SKU: {product.sku}</Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: isOutOfStock ? '#FEF2F2' : isLowStock ? '#FFFBEB' : '#ECFDF5' }]}>
          <Text style={[styles.statusText, { color: stockColor }]}>{stockLabel}</Text>
        </View>
      </View>
      
      <View style={styles.cardFooter}>
        <View style={styles.statGroup}>
          <Text style={styles.statLabel}>Available</Text>
          <Text style={[styles.statValue, isLowStock && styles.textError]}>
            {availableQuantity}
          </Text>
        </View>
        
        <View style={styles.statGroup}>
          <Text style={styles.statLabel}>Reserved</Text>
          <Text style={styles.statValue}>{reservedQuantity}</Text>
        </View>
        
        <View style={styles.statGroup}>
          <Text style={styles.statLabel}>Margin</Text>
          <Text style={styles.statValueSuccess}>{margin}%</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

export const ProductListScreen = ({ navigation }: any) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(undefined);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Use React Query for data fetching
  const { data: products = [], isLoading, isFetching, isError, error, refetch } = useProducts(
    0,
    100,
    selectedCategoryId,
    debouncedSearch
  );

  // Debounce search input
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleProductPress = useCallback(
    (id: string) => {
      navigation.navigate('ProductDetail', { productId: id });
    },
    [navigation]
  );

  const keyExtractor = useCallback((item: Product) => item.id, []);

  const inventorySummary = useMemo(() => {
    return products.reduce(
      (summary, product) => {
        const quantity = product.total_quantity_on_hand ?? product.quantity_on_hand ?? 0;
        const reserved = product.total_reserved_quantity ?? 0;
        const available = Math.max(0, quantity - reserved);
        const value = quantity * product.cost_price_kobo;

        summary.totalSkus += 1;
        summary.totalUnits += quantity;
        summary.totalValue += value;
        if (available <= 0) summary.outOfStock += 1;
        else if (available <= product.minimum_stock_level) summary.lowStock += 1;
        return summary;
      },
      { totalSkus: 0, totalUnits: 0, totalValue: 0, lowStock: 0, outOfStock: 0 }
    );
  }, [products]);

  // Performance audit: Memoize FlatList configuration
  const listEmptyComponent = useMemo(() => {
    if (isLoading) return <ActivityIndicator size="large" color={colors.ventureroot.green} style={styles.loader} />;
    if (isError) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="cloud-offline-outline" size={44} color="#DC2626" />
          <Text style={styles.errorText}>Could not load inventory</Text>
          <Text style={styles.emptySubtext}>{(error as Error).message}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="cube-outline" size={48} color="#D1D5DB" />
        <Text style={styles.emptyText}>No products found</Text>
        <Text style={styles.emptySubtext}>Add products or adjust your search filters.</Text>
      </View>
    );
  }, [isLoading, isError, error, refetch]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View className="flex-1">
          <Text style={styles.headerEyebrow}>Inventory Control</Text>
          <Text style={styles.headerTitle}>Product Catalogue</Text>
        </View>
        <View className="flex-row items-center gap-3">
          <TouchableOpacity 
            onPress={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
            style={{ 
              backgroundColor: '#F3F4F6', 
              padding: 10, 
              borderRadius: 14,
              borderWidth: 1,
              borderColor: '#E5E7EB'
            }}
            className="shadow-sm"
          >
            <Ionicons name={viewMode === 'list' ? 'grid' : 'list'} size={20} color="#111827" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.addButton, { width: 44, height: 44, borderRadius: 14 }]} 
            onPress={() => navigation.navigate('AddProduct')}
            className="shadow-md"
          >
            <Ionicons name="add" size={26} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.summaryBand}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>SKUs</Text>
          <Text style={styles.summaryValue}>{inventorySummary.totalSkus}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Units</Text>
          <Text style={styles.summaryValue}>{inventorySummary.totalUnits.toLocaleString()}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Cost Value</Text>
          <Text style={styles.summaryValue}>₦{(inventorySummary.totalValue / 100).toLocaleString()}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Alerts</Text>
          <Text style={[styles.summaryValue, inventorySummary.lowStock + inventorySummary.outOfStock > 0 && { color: '#DC2626' }]}>
            {inventorySummary.lowStock + inventorySummary.outOfStock}
          </Text>
        </View>
      </View>

      <View style={styles.categoryContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          <TouchableOpacity
            onPress={() => setSelectedCategoryId(undefined)}
            style={[
              styles.categoryChip,
              !selectedCategoryId && styles.categoryChipSelected
            ]}
          >
            <Text style={[styles.categoryText, !selectedCategoryId && styles.categoryTextSelected]}>All</Text>
          </TouchableOpacity>
          {retailCategoriesData.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              onPress={() => setSelectedCategoryId(cat.id)}
              style={[
                styles.categoryChip,
                selectedCategoryId === cat.id && { borderColor: colors.ventureroot.green, backgroundColor: '#ECFDF5' }
              ]}
            >
              <Image source={cat.icon} style={styles.categoryIcon} resizeMode="contain" />
              <Text style={[styles.categoryText, selectedCategoryId === cat.id && { color: colors.ventureroot.green }]}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search products by name, SKU, or barcode"
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
      </View>

      <FlatList
        key={viewMode}
        numColumns={viewMode === 'grid' ? 2 : 1}
        data={products}
        renderItem={({ item }) => (
          <View style={viewMode === 'grid' ? { flex: 0.5, padding: 6 } : null}>
            <ProductItem product={item} viewMode={viewMode} onPress={handleProductPress} />
          </View>
        )}
        keyExtractor={keyExtractor}
        contentContainerStyle={[
          styles.listContainer,
          viewMode === 'grid' && { paddingHorizontal: 10 }
        ]}
        ListEmptyComponent={listEmptyComponent}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={refetch}
            tintColor={colors.ventureroot.green}
          />
        }
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
      />
    </SafeAreaView>
  );
};

export default ProductListScreen;

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.ventureroot.green,
    letterSpacing: 0,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
  },
  addButton: {
    backgroundColor: '#4F46E5',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryContainer: {
    backgroundColor: '#FFF',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  summaryBand: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  summaryItem: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    marginRight: 8,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  categoryScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  categoryChipSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4F46E5',
  },
  categoryIcon: {
    width: 18,
    height: 18,
    marginRight: 6,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  categoryTextSelected: {
    color: '#4F46E5',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#111827',
  },
  listContainer: {
    padding: 16,
    paddingTop: 0,
  },
  productCard: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  lowStockBadge: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 8,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  lowStockText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '500',
  },
  skuText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  gridMetrics: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
    alignItems: 'center',
  },
  statGroup: {
    marginRight: 24,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  statValueSuccess: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
  },
  textError: {
    color: '#DC2626',
  },
  loader: {
    marginTop: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyText: {
    textAlign: 'center',
    color: '#6B7280',
    marginTop: 12,
    fontSize: 16,
    fontWeight: '500',
  },
  emptySubtext: {
    textAlign: 'center',
    color: '#94A3B8',
    marginTop: 6,
    fontSize: 13,
    paddingHorizontal: 24,
  },
  errorText: {
    textAlign: 'center',
    color: '#DC2626',
    marginTop: 12,
    fontSize: 16,
    fontWeight: '800',
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: '#111827',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
