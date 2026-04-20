import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { usePurchaseOrders } from '@/hooks/useInventory';
import { Ionicons } from '@expo/vector-icons';

// ============================================================================
// TYPES
// ============================================================================

interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier: { name: string };
  status: 'draft' | 'pending' | 'confirmed' | 'shipped' | 'received' | 'cancelled';
  expected_delivery_date: string | null;
  total_amount_kobo: number;
}

// ============================================================================
// COMPONENTS
// ============================================================================

const getStatusColor = (status: string) => {
  switch (status) {
    case 'received': return { bg: '#D1FAE5', text: '#065F46' };
    case 'shipped': return { bg: '#DBEAFE', text: '#1E40AF' };
    case 'confirmed': return { bg: '#FEF3C7', text: '#92400E' };
    case 'pending': return { bg: '#FEE2E2', text: '#991B1B' };
    default: return { bg: '#F3F4F6', text: '#374151' };
  }
};

const PurchaseOrderItem = React.memo(({ po, onPress }: { po: PurchaseOrder; onPress: (id: string) => void }) => {
  const statusColors = getStatusColor(po.status);
  const totalAmount = `₦${(po.total_amount_kobo / 100).toFixed(2)}`;
  
  return (
    <TouchableOpacity
      style={styles.poCard}
      onPress={() => onPress(po.id)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.poNumber}>{po.po_number}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
          <Text style={[styles.statusText, { color: statusColors.text }]}>
            {po.status.toUpperCase()}
          </Text>
        </View>
      </View>
      
      <Text style={styles.supplierName}>{po.supplier?.name || 'Unknown Supplier'}</Text>
      
      <View style={styles.cardFooter}>
        <View style={styles.statGroup}>
          <Text style={styles.statLabel}>Expected Delivery</Text>
          <Text style={styles.statValue}>
            {po.expected_delivery_date ? new Date(po.expected_delivery_date).toLocaleDateString() : 'TBD'}
          </Text>
        </View>
        
        <View style={styles.statGroup}>
          <Text style={styles.statLabel}>Total Amount</Text>
          <Text style={styles.statValueBold}>{totalAmount}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

export const PurchaseOrderScreen = ({ navigation }: any) => {
  const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined);

  const { data: purchaseOrders, isLoading, isError, error, refetch } = usePurchaseOrders(
    filterStatus, undefined, undefined, undefined, undefined, 0, 100
  );

  const handlePOPress = useCallback((id: string) => {
    // navigation.navigate('PurchaseOrderDetail', { poId: id });
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: PurchaseOrder }) => (
      <PurchaseOrderItem po={item} onPress={handlePOPress} />
    ),
    [handlePOPress]
  );

  const keyExtractor = useCallback((item: PurchaseOrder) => item.id, []);

  const FilterPill = ({ label, status }: { label: string; status: string | undefined }) => {
    const isSelected = filterStatus === status;
    return (
      <TouchableOpacity
        style={[styles.filterPill, isSelected && styles.filterPillSelected]}
        onPress={() => setFilterStatus(status)}
      >
        <Text style={[styles.filterPillText, isSelected && styles.filterPillTextSelected]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const listEmptyComponent = useMemo(() => {
    if (isLoading) return <ActivityIndicator size="large" color="#4F46E5" style={styles.loader} />;
    if (isError) return <Text style={styles.errorText}>Error loading POs: {(error as Error).message}</Text>;
    return <Text style={styles.emptyText}>No purchase orders found.</Text>;
  }, [isLoading, isError, error]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Purchase Orders</Text>
        <TouchableOpacity 
          style={styles.addButton} 
          onPress={() => navigation.navigate('AddPurchaseOrder')}
        >
          <Ionicons name="add" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.filterScrollContainer}>
        <View style={styles.filterRow}>
          <FilterPill label="All" status={undefined} />
          <FilterPill label="Pending" status="pending" />
          <FilterPill label="Confirmed" status="confirmed" />
          <FilterPill label="Shipped" status="shipped" />
          <FilterPill label="Received" status="received" />
        </View>
      </View>

      <FlatList
        data={purchaseOrders || []}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={listEmptyComponent}
        onRefresh={refetch}
        refreshing={isLoading}
      />
    </View>
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
  filterScrollContainer: {
    backgroundColor: '#FFF',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    flexWrap: 'wrap',
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterPillSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4F46E5',
  },
  filterPillText: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '500',
  },
  filterPillTextSelected: {
    color: '#4F46E5',
  },
  listContainer: {
    padding: 16,
  },
  poCard: {
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
    marginBottom: 8,
  },
  poNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  supplierName: {
    fontSize: 15,
    color: '#4B5563',
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  statGroup: {},
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  statValueBold: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#111827',
  },
  loader: {
    marginTop: 40,
  },
  emptyText: {
    textAlign: 'center',
    color: '#6B7280',
    marginTop: 40,
  },
  errorText: {
    textAlign: 'center',
    color: '#DC2626',
    marginTop: 40,
  },
});
