import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useProducts } from '@/hooks/useInventory';
import { Ionicons } from '@expo/vector-icons';

// ============================================================================
// TYPES
// ============================================================================

interface Product {
  id: string;
  name: string;
  sku: string;
  category_id?: string;
  cost_price_kobo: number;
  selling_price_kobo: number;
  minimum_stock_level: number;
  quantity_on_hand: number;
}

interface ProductItemProps {
  product: Product;
  onPress: (id: string) => void;
}

// ============================================================================
// COMPONENTS
// ============================================================================

const ProductItem = React.memo(({ product, onPress }: ProductItemProps) => {
  const isLowStock = product.quantity_on_hand <= product.minimum_stock_level;
  const profitPerUnit = product.selling_price_kobo - product.cost_price_kobo;
  const profitPerUnitFormatted = `₦${(profitPerUnit / 100).toFixed(2)}`;

  return (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => onPress(product.id)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.productName}>{product.name}</Text>
        {isLowStock && (
          <View style={styles.lowStockBadge}>
            <Text style={styles.lowStockText}>Low Stock</Text>
          </View>
        )}
      </View>
      
      <Text style={styles.skuText}>SKU: {product.sku}</Text>
      
      <View style={styles.cardFooter}>
        <View style={styles.statGroup}>
          <Text style={styles.statLabel}>Stock</Text>
          <Text style={[styles.statValue, isLowStock && styles.textError]}>
            {product.quantity_on_hand}
          </Text>
        </View>
        
        <View style={styles.statGroup}>
          <Text style={styles.statLabel}>Profit/Unit</Text>
          <Text style={styles.statValueSuccess}>{profitPerUnitFormatted}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

export const ProductListScreen = ({ navigation }: any) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Use React Query for data fetching
  const { data: products, isLoading, isError, error, refetch } = useProducts(
    0,
    100,
    undefined,
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

  const renderItem = useCallback(
    ({ item }: { item: Product }) => (
      <ProductItem product={item} onPress={handleProductPress} />
    ),
    [handleProductPress]
  );

  const keyExtractor = useCallback((item: Product) => item.id, []);

  // Performance audit: Memoize FlatList configuration
  const listEmptyComponent = useMemo(() => {
    if (isLoading) return <ActivityIndicator size="large" color="#4F46E5" style={styles.loader} />;
    if (isError) return <Text style={styles.errorText}>Error loading products: {(error as Error).message}</Text>;
    return <Text style={styles.emptyText}>No products found.</Text>;
  }, [isLoading, isError, error]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Products</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('AddProduct')}>
          <Ionicons name="add" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search products by name or SKU..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
      </View>

      <FlatList
        data={products || []}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={listEmptyComponent}
        onRefresh={refetch}
        refreshing={isLoading}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
      />
    </View>
  );
};

export default ProductListScreen;

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
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
    borderRadius: 12,
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
  emptyText: {
    textAlign: 'center',
    color: '#6B7280',
    marginTop: 40,
    fontSize: 16,
  },
  errorText: {
    textAlign: 'center',
    color: '#DC2626',
    marginTop: 40,
    fontSize: 16,
  },
});
