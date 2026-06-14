import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { Product } from '@/types/inventory';
import { colors } from '@/theme/colors';

interface InventoryTableRowProps {
  readonly item: Product;
  readonly onDelete: (id: string) => void;
  readonly onPress: (id: string) => void;
}

export const InventoryTableRow = React.memo<InventoryTableRowProps>(({ item, onDelete, onPress }) => {
  const quantity = item.total_quantity_on_hand ?? item.quantity_on_hand ?? 0;
  const reserved = item.total_reserved_quantity ?? 0;
  const available = Math.max(0, quantity - reserved);
  const sold = item.turnover_30d ?? 0; // fallback to 30d turnover as units sold

  const cost = (item.cost_price_kobo ?? 0) / 100;
  const sell = (item.selling_price_kobo ?? 0) / 100;
  const profitPerUnit = sell - cost;
  
  const expectedProfit = profitPerUnit * available;
  const actualProfit = profitPerUnit * sold;

  // Status computation
  const isOutOfStock = available <= 0;
  const isLowStock = !isOutOfStock && available <= (item.minimum_stock_level ?? 10);
  
  let statusText = 'Healthy';
  let statusBg = '#E1F5EE';
  let statusColor = '#085041';
  
  if (isOutOfStock) {
    statusText = 'Out of Stock';
    statusBg = '#FCEBEB';
    statusColor = '#A32D2D';
  } else if (isLowStock) {
    statusText = 'Low Stock';
    statusBg = '#FAEEDA';
    statusColor = '#BA7517';
  }

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={() => onPress(item.id)}
      activeOpacity={0.7}
    >
      <View style={styles.topRow}>
        <View style={styles.nameSection}>
          <Text style={styles.skuText} numberOfLines={1}>{item.sku}</Text>
          <Text style={styles.nameText} numberOfLines={1}>{item.name}</Text>
        </View>
        <View style={styles.badgeContainer}>
          <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
            <Text style={[styles.statusBadgeText, { color: statusColor }]}>{statusText}</Text>
          </View>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.detailsGrid}>
        <View style={styles.gridColumn}>
          <Text style={styles.gridLabel}>QTY / UOM</Text>
          <Text style={styles.gridValue}>
            {available} <Text style={styles.uomText}>({item.unit_of_measure || 'pcs'})</Text>
          </Text>
        </View>
        <View style={styles.gridColumn}>
          <Text style={styles.gridLabel}>COST / SELL</Text>
          <Text style={styles.gridValue}>
            ₦{cost.toLocaleString()} / ₦{sell.toLocaleString()}
          </Text>
        </View>
        <View style={styles.gridColumn}>
          <Text style={styles.gridLabel}>ACTUAL PROFIT</Text>
          <Text style={[styles.gridValue, styles.profitText]}>
            ₦{actualProfit.toLocaleString()}
          </Text>
        </View>
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.expectedText}>
          Expected Profit: <Text style={styles.expectedValue}>₦{expectedProfit.toLocaleString()}</Text>
        </Text>
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={() => onDelete(item.id)}
          accessibilityRole="button"
          accessibilityLabel={`Delete ${item.name}`}
        >
          <Trash2 size={16} color="#A32D2D" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginVertical: 6,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nameSection: {
    flex: 1,
    paddingRight: 12,
  },
  skuText: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#6B7280',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  nameText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 12,
  },
  detailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  gridColumn: {
    flex: 1,
  },
  gridLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  gridValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  uomText: {
    fontSize: 11,
    fontWeight: '400',
    color: '#6B7280',
  },
  profitText: {
    color: '#059669',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
  },
  expectedText: {
    fontSize: 11,
    color: '#6B7280',
  },
  expectedValue: {
    fontWeight: '700',
    color: '#1F2937',
  },
  deleteButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#FCEBEB',
  },
});
