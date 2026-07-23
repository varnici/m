import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  Alert,
  Image,
} from 'react-native';
import { useProductDetail, useStockMovements, useTransformStock } from '@/hooks/useInventory';
import { Ionicons } from '@expo/vector-icons';
import { Edit2 } from 'lucide-react-native';
import { LineChart } from 'react-native-chart-kit'; // Assume this is installed

import { retailCategoriesData } from '@/data/retailCategories';

const screenWidth = Dimensions.get('window').width;

// Helper to find parent category icon for items/subcategories
const getCategoryInfo = (categoryId?: string) => {
  if (!categoryId) return null;
  const cat = retailCategoriesData.find(c => c.id === categoryId);
  if (cat) return cat;
  
  for (const c of retailCategoriesData) {
    if (c.subcategories) {
      const sub = c.subcategories.find(s => s.id === categoryId);
      if (sub) return c;
    }
  }
  return null;
};

export const ProductDetailScreen = ({ route, navigation }: any) => {
  const { productId } = route.params;

  // Use React Query hooks
  const {
    data: product,
    isLoading: isProductLoading,
    isError: isProductError,
  } = useProductDetail(productId);

  const {
    data: movements,
    isLoading: isMovementsLoading,
  } = useStockMovements(undefined, productId, undefined, undefined, undefined, 0, 5);

  const profitPerUnitFormatted = useMemo(() => {
    if (!product) return '₦0.00';
    return `₦${((product.selling_price_kobo - product.cost_price_kobo) / 100).toFixed(2)}`;
  }, [product]);

  const costPriceFormatted = useMemo(() => {
    if (!product) return '₦0.00';
    return `₦${(product.cost_price_kobo / 100).toFixed(2)}`;
  }, [product]);

  const sellingPriceFormatted = useMemo(() => {
    if (!product) return '₦0.00';
    return `₦${(product.selling_price_kobo / 100).toFixed(2)}`;
  }, [product]);

  // AI demand forecast data from backend
  const forecastChartData = useMemo(() => {
    if (!product?.demand_forecast || product.demand_forecast.length === 0) {
       return {
        labels: ['No Data'],
        datasets: [{ data: [0], color: (opacity = 1) => `rgba(79, 70, 229, ${opacity})`, strokeWidth: 2 }],
      };
    }

    return {
      labels: product.demand_forecast.map(p => p.date),
      datasets: [
        {
          data: product.demand_forecast.map(p => p.quantity),
          color: (opacity = 1) => `rgba(79, 70, 229, ${opacity})`,
          strokeWidth: 2,
        },
      ],
    };
  }, [product?.demand_forecast]);

  const transformMutation = useTransformStock();

  const handleTransform = (qty: number) => {
    if (!product) return;
    
    Alert.alert(
      'Break to Pieces',
      `Are you sure you want to break ${qty} carton(s) into individual units?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            transformMutation.mutate({
              parent_product_id: product.id,
              quantity_to_break: qty,
              store_id: product.stock_by_location[0]?.store_id || '',
            });
          },
        },
      ]
    );
  };

  if (isProductLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  if (isProductError || !product) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Failed to load product details.</Text>
      </View>
    );
  }

  const discrepancyQty = product.discrepancy_qty ?? 0;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {product.name}
        </Text>
        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => navigation.navigate('EditProduct', { productId })}
        >
          <Edit2 size={20} color="#4F46E5" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => navigation.navigate('StockAdjustment', { productId })}
        >
          <Ionicons name="settings-outline" size={20} color="#4F46E5" />
        </TouchableOpacity>
      </View>

      {/* Main Info Card */}
      <View style={styles.card}>
        <View className="flex-row justify-between items-start mb-4">
          <View className="flex-1">
            <View className="flex-row items-center mb-2">
               <View 
                style={{ 
                  backgroundColor: getCategoryInfo(product.category_id)?.backgroundColor || '#F3F4F6',
                  padding: 8,
                  borderRadius: 12,
                  marginRight: 10
                }}
               >
                 {getCategoryInfo(product.category_id)?.icon ? (
                   <View style={{ width: 24, height: 24 }}>
                     <Image source={getCategoryInfo(product.category_id)?.icon} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
                   </View>
                 ) : (
                   <Ionicons name="cube" size={20} color="#6B7280" />
                 )}
               </View>
               <Text style={{ fontSize: 14, color: '#6B7280', fontWeight: '600' }}>
                 {getCategoryInfo(product.category_id)?.name || 'General'}
               </Text>
            </View>
            <View style={styles.skuRow}>
              <Text style={styles.skuLabel}>SKU:</Text>
              <Text style={styles.skuValue}>{product.sku}</Text>
            </View>
            <Text style={styles.description}>{product.description || 'No description provided.'}</Text>
          </View>
          <TouchableOpacity 
            onPress={() => navigation.navigate('StockAdjustment', { productId })}
            className="bg-slate-900 px-4 py-2 rounded-xl"
          >
            <Text className="text-white font-bold text-xs">Adjust Stock</Text>
          </TouchableOpacity>
        </View>
        
        {product.is_dead_stock && (
          <View style={styles.alertBanner}>
            <Ionicons name="warning" size={20} color="#991B1B" />
            <Text style={styles.alertText}>Dead Stock Warning: No sales in 30 days</Text>
          </View>
        )}
      </View>

      {/* Packaging & Units Section */}
      {product.children && product.children.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Packaging & Units</Text>
          <View style={styles.card}>
            {product.children.map((child: any) => (
              <View key={child.id} style={styles.childRow}>
                <View style={styles.childInfo}>
                  <Text style={styles.childName}>{child.name}</Text>
                  <Text style={styles.childSub}>1 {product.unit_of_measure} = {child.conversion_factor} {child.unit_of_measure}s</Text>
                </View>
                <TouchableOpacity 
                  style={[styles.transformButton, transformMutation.isPending && { opacity: 0.5 }]}
                  onPress={() => handleTransform(1)}
                  disabled={transformMutation.isPending || product.total_quantity_on_hand < 1}
                >
                  <Text style={styles.transformButtonText}>
                    {transformMutation.isPending ? 'Processing...' : `Break 1 ${product.unit_of_measure}`}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Pricing & Margin Metrics */}
      <Text style={styles.sectionTitle}>Pricing & Profitability</Text>
      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Total QOH</Text>
          <Text style={styles.metricValue}>{product.total_quantity_on_hand || 0}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Reserved</Text>
          <Text style={[styles.metricValue, { color: '#D97706' }]}>{product.total_reserved_quantity || 0}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Cost Price</Text>
          <Text style={styles.metricValue}>{costPriceFormatted}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Selling Price</Text>
          <Text style={styles.metricValue}>{sellingPriceFormatted}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Profit/Unit</Text>
          <Text style={styles.metricValueSuccess}>{profitPerUnitFormatted}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Margin %</Text>
          <Text style={styles.metricValueSuccess}>{product.margin_percentage}%</Text>
        </View>
      </View>

      {/* Stock Verification: Expected (system) vs Actual (last physical count) */}
      <Text style={styles.sectionTitle}>Stock Verification</Text>
      {discrepancyQty !== 0 && (
        <View
          style={[
            styles.alertBanner,
            { backgroundColor: discrepancyQty > 0 ? '#FEF2F2' : '#EFF6FF' },
            { borderColor: discrepancyQty > 0 ? '#FECACA' : '#BFDBFE', marginHorizontal: 16 },
          ]}
        >
          <Ionicons
            name="warning"
            size={20}
            color={discrepancyQty > 0 ? '#991B1B' : '#1D4ED8'}
          />
          <Text style={[styles.alertText, { color: discrepancyQty > 0 ? '#991B1B' : '#1D4ED8' }]}>
            {discrepancyQty > 0
              ? `${discrepancyQty} units missing since the last stock count (possible theft or damage)`
              : `${Math.abs(discrepancyQty)} extra units found since the last stock count`}
          </Text>
        </View>
      )}
      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Expected Stock (System)</Text>
          <Text style={styles.metricValue}>{product.expected_amount ?? 0}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Actual Stock (Last Count)</Text>
          <Text style={styles.metricValue}>{product.actual_amount ?? 0}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Difference</Text>
          <Text
            style={
              discrepancyQty === 0
                ? styles.metricValueSuccess
                : [styles.metricValue, { color: discrepancyQty > 0 ? '#DC2626' : '#2563EB' }]
            }
          >
            {discrepancyQty > 0 ? '-' : discrepancyQty < 0 ? '+' : ''}
            {Math.abs(discrepancyQty)}
          </Text>
        </View>
      </View>

      {/* Wholesale (Trade) pricing and terms, alongside sales-speed forecasting */}
      <Text style={styles.sectionTitle}>Wholesale Pricing & Sales Speed</Text>
      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Wholesale Price</Text>
          <Text style={styles.metricValue}>
            ₦{((product.trade_price_kobo ?? product.selling_price_kobo) / 100).toFixed(2)}
          </Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Wholesale Margin %</Text>
          <Text style={styles.metricValueSuccess}>{(product.trade_margin_pct ?? 0).toFixed(1)}%</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Min. Wholesale Order Qty</Text>
          <Text style={styles.metricValue}>{product.trade_moq ?? 1}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Units Sold / Month</Text>
          <Text style={styles.metricValue}>{product.monthly_velocity ?? 0}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Days Until Out of Stock</Text>
          <Text
            style={
              (product.days_of_supply ?? 0) > 0 && (product.days_of_supply ?? 0) <= 7
                ? [styles.metricValue, { color: '#DC2626' }]
                : styles.metricValue
            }
          >
            {product.days_of_supply ? `${product.days_of_supply} days` : '—'}
          </Text>
        </View>
      </View>

      {/* AI Demand Forecast Graph */}
      <Text style={styles.sectionTitle}>AI Demand Forecast (7 Days)</Text>
      <View style={styles.chartContainer}>
        <LineChart
          data={forecastChartData}
          width={screenWidth - 32}
          height={220}
          chartConfig={{
            backgroundColor: '#FFF',
            backgroundGradientFrom: '#FFF',
            backgroundGradientTo: '#FFF',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(79, 70, 229, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
            style: {
              borderRadius: 12,
            },
            propsForDots: {
              r: '4',
              strokeWidth: '2',
              stroke: '#4F46E5',
            },
          }}
          bezier
          style={styles.chart}
        />
      </View>

      {/* Stock Movement History */}
      <Text style={styles.sectionTitle}>Recent Stock Movements</Text>
      <View style={styles.card}>
        {isMovementsLoading ? (
          <ActivityIndicator size="small" color="#4F46E5" />
        ) : movements && movements.length > 0 ? (
          movements.map((movement: any, index: number) => (
            <View
              key={movement.id}
              style={[
                styles.movementRow,
                index === movements.length - 1 && styles.lastMovementRow,
              ]}
            >
              <View style={styles.movementIconContainer}>
                <Ionicons
                  name={movement.movement_type === 'sale' ? 'trending-down' : 'trending-up'}
                  size={16}
                  color={movement.movement_type === 'sale' ? '#DC2626' : '#059669'}
                />
              </View>
              <View style={styles.movementDetails}>
                <Text style={styles.movementType}>
                  {movement.movement_type.toUpperCase()}
                </Text>
                <Text style={styles.movementDate}>
                  {new Date(movement.created_at).toLocaleDateString()}
                </Text>
              </View>
              <Text
                style={[
                  styles.movementQty,
                  movement.movement_type === 'sale' ? styles.textError : styles.textSuccess,
                ]}
              >
                {movement.movement_type === 'sale' ? '-' : '+'}
                {movement.quantity}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No recent movements found.</Text>
        )}
      </View>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  editButton: {
    padding: 8,
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
  },
  card: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  skuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  skuLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 8,
  },
  skuValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  description: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 22,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  alertText: {
    color: '#991B1B',
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 8,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
  },
  metricCard: {
    backgroundColor: '#FFF',
    width: '46%',
    margin: '2%',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  metricLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  metricValueSuccess: {
    fontSize: 18,
    fontWeight: '700',
    color: '#059669',
  },
  chartContainer: {
    marginHorizontal: 16,
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  chart: {
    borderRadius: 12,
  },
  movementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  lastMovementRow: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  movementIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  movementDetails: {
    flex: 1,
  },
  movementType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  movementDate: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  movementQty: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  textSuccess: {
    color: '#059669',
  },
  textError: {
    color: '#DC2626',
  },
  emptyText: {
    textAlign: 'center',
    color: '#6B7280',
    paddingVertical: 16,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 16,
  },
  childRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  childInfo: {
    flex: 1,
  },
  childName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
  },
  childSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  transformButton: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  transformButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
