import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useAIInsights } from '@/hooks/useInventory';
import { Ionicons } from '@expo/vector-icons';

// ============================================================================
// COMPONENTS
// ============================================================================

export const AIInsightsScreen = ({ navigation }: any) => {
  const { data: insights, isLoading, isError, error, refetch } = useAIInsights();

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Analyzing Retail Data...</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="warning" size={48} color="#DC2626" />
        <Text style={styles.errorText}>Failed to load AI Insights</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>Retry Analysis</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { anomalies = [], restock_recommendations = [], trends = [] } = insights || {};

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Ionicons name="sparkles" size={24} color="#4F46E5" style={styles.headerIcon} />
          <Text style={styles.headerTitle}>AI Intelligence</Text>
        </View>
        <Text style={styles.headerSubtitle}>Powered by Isolation Forest & XGBoost</Text>
      </View>

      {/* Restock Optimization Section */}
      <Text style={styles.sectionTitle}>Smart Restock Recommendations</Text>
      {restock_recommendations.length > 0 ? (
        restock_recommendations.map((item: any, index: number) => (
          <View key={`restock-${index}`} style={styles.insightCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="cube" size={20} color="#059669" />
              <Text style={styles.cardTitle}>{item.product_name || `Product ${item.product_id}`}</Text>
            </View>
            <View style={styles.recommendationGrid}>
              <View style={styles.recItem}>
                <Text style={styles.recLabel}>Current Stock</Text>
                <Text style={styles.recValue}>{item.current_stock}</Text>
              </View>
              <View style={styles.recItem}>
                <Text style={styles.recLabel}>Reorder Point</Text>
                <Text style={styles.recValueWarning}>{item.reorder_point}</Text>
              </View>
              <View style={styles.recItem}>
                <Text style={styles.recLabel}>Suggested Qty</Text>
                <Text style={styles.recValueSuccess}>{item.reorder_quantity}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonText}>Generate Purchase Order</Text>
            </TouchableOpacity>
          </View>
        ))
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>Stock levels are optimal. No restocks needed.</Text>
        </View>
      )}

      {/* Anomaly Detection Section */}
      <Text style={styles.sectionTitle}>Stock Anomalies Detected</Text>
      {anomalies.length > 0 ? (
        anomalies.map((item: any, index: number) => (
          <View key={`anomaly-${index}`} style={[styles.insightCard, styles.anomalyCard]}>
            <View style={styles.cardHeader}>
              <Ionicons name="warning" size={20} color="#DC2626" />
              <Text style={[styles.cardTitle, { color: '#991B1B' }]}>Suspicious Activity</Text>
            </View>
            <Text style={styles.anomalyDescription}>
              Unusual {item.movement_type} pattern detected for {item.product_name || `Product ${item.product_id}`}.
            </Text>
            <View style={styles.anomalyStats}>
              <Text style={styles.anomalyStatText}>Anomaly Score: {(item.anomaly_score * 100).toFixed(1)}%</Text>
              <Text style={styles.anomalyStatText}>Quantity: {item.quantity}</Text>
            </View>
          </View>
        ))
      ) : (
        <View style={styles.emptyCard}>
          <Ionicons name="checkmark-circle" size={24} color="#059669" style={{ marginBottom: 8 }} />
          <Text style={styles.emptyText}>No suspicious stock movements detected.</Text>
        </View>
      )}

      {/* Demand Trends */}
      <Text style={styles.sectionTitle}>7-Day Demand Forecast Trends</Text>
      {trends.length > 0 ? (
        trends.map((item: any, index: number) => (
          <View key={`trend-${index}`} style={styles.insightCard}>
            <View style={styles.cardHeader}>
              <Ionicons 
                name={item.trend_direction === 'up' ? 'trending-up' : 'trending-down'} 
                size={20} 
                color={item.trend_direction === 'up' ? '#059669' : '#DC2626'} 
              />
              <Text style={styles.cardTitle}>{item.product_name || `Product ${item.product_id}`}</Text>
            </View>
            <Text style={styles.trendDescription}>
              Expected {item.trend_direction === 'up' ? 'increase' : 'decrease'} in demand by {item.percentage_change}%.
            </Text>
          </View>
        ))
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>Not enough historical data to generate reliable trends.</Text>
        </View>
      )}
    </ScrollView>
  );
};

export default AIInsightsScreen;

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#4B5563',
    fontWeight: '500',
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#DC2626',
    fontWeight: '500',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#FFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  retryButtonText: {
    color: '#374151',
    fontWeight: '600',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 24,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerIcon: {
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  insightCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  anomalyCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
  },
  recommendationGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  recItem: {
    alignItems: 'center',
  },
  recLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  recValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
  },
  recValueWarning: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#D97706',
  },
  recValueSuccess: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#059669',
  },
  actionButton: {
    backgroundColor: '#EEF2FF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#4F46E5',
    fontWeight: '600',
    fontSize: 14,
  },
  anomalyDescription: {
    fontSize: 14,
    color: '#7F1D1D',
    lineHeight: 20,
    marginBottom: 12,
  },
  anomalyStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#FECACA',
    paddingTop: 12,
  },
  anomalyStatText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#991B1B',
  },
  trendDescription: {
    fontSize: 14,
    color: '#4B5563',
  },
  emptyCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});
