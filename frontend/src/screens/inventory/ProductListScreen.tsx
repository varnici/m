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
} from 'react-native';
import { useProducts } from '@/hooks/useInventory';
import { Ionicons } from '@expo/vector-icons';
import { retailCategoriesData } from '@/data/retailCategories';
import { colors } from '@/theme/colors';

import { Product } from '@/types/inventory';

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
  const quantityOnHand = product.quantity_on_hand ?? 0;
  const isLowStock = quantityOnHand <= product.minimum_stock_level;
  const profitPerUnit = product.selling_price_kobo - product.cost_price_kobo;
  const profitPerUnitFormatted = `₦${(profitPerUnit / 100).toFixed(2)}`;

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

        <View className="border-t border-gray-50 pt-2 items-center">
          <Text style={[styles.statValue, { fontSize: 14 }]}>{quantityOnHand} in stock</Text>
          <Text style={[styles.statValueSuccess, { fontSize: 12, marginTop: 2 }]}>{profitPerUnitFormatted} profit</Text>
        </View>

        {isLowStock && (
          <View style={[styles.lowStockBadge, { position: 'absolute', top: 8, right: 8, marginLeft: 0 }]}>
            <Text style={[styles.lowStockText, { fontSize: 10 }]}>Low</Text>
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
        {isLowStock && (
          <View style={styles.lowStockBadge}>
            <Text style={styles.lowStockText}>Low Stock</Text>
          </View>
        )}
      </View>
      
      <View style={styles.cardFooter}>
        <View style={styles.statGroup}>
          <Text style={styles.statLabel}>Stock</Text>
          <Text style={[styles.statValue, isLowStock && styles.textError]}>
            {quantityOnHand}
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
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(undefined);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Use React Query for data fetching
  const { data: products, isLoading, isError, error, refetch } = useProducts(
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

  const renderItem = useCallback(
    ({ item }: { item: Product }) => (
      <ProductItem product={item} viewMode={viewMode} onPress={handleProductPress} />
    ),
    [handleProductPress, viewMode]
  );

  const keyExtractor = useCallback((item: Product) => item.id, []);

  // Performance audit: Memoize FlatList configuration
  const listEmptyComponent = useMemo(() => {
    if (isLoading) return <ActivityIndicator size="large" color="#4F46E5" style={styles.loader} />;
    if (isError) return <Text style={styles.errorText}>Error loading products: {(error as Error).message}</Text>;
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="cube-outline" size={48} color="#D1D5DB" />
        <Text style={styles.emptyText}>No products found.</Text>
      </View>
    );
  }, [isLoading, isError, error]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View className="flex-1">
          <Text style={styles.headerTitle}>Shop Inventory</Text>
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
          placeholder="Search name or SKU..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
      </View>

      <FlatList
        key={viewMode}
        numColumns={viewMode === 'grid' ? 2 : 1}
        data={products || []}
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
  categoryContainer: {
    backgroundColor: '#FFF',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
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
  errorText: {
    textAlign: 'center',
    color: '#DC2626',
    marginTop: 40,
    fontSize: 16,
  },
});
