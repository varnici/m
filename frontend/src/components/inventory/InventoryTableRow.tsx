import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Trash2, AlertTriangle, ShieldCheck, ShieldAlert } from 'lucide-react-native';
import { Product } from '@/types/inventory';

interface InventoryTableRowProps {
  readonly item: Product;
  readonly onDelete: (id: string) => void;
  readonly onPress: (id: string) => void;
}

function fmtNaira(kobo: number): string {
  const naira = kobo / 100;
  return naira.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export const InventoryTableRow = React.memo<InventoryTableRowProps>(({ item, onDelete, onPress }) => {
  const quantity = item.total_quantity_on_hand ?? item.quantity_on_hand ?? 0;
  const cost = item.cost_price_kobo ?? 0;
  const sell = item.selling_price_kobo ?? 0;
  const expenses = item.expenses_kobo ?? 0;
  const sold = item.quantity_sold ?? 0;
  const onCredit = item.quantity_on_credit ?? 0;
  const reorderLevel = item.minimum_stock_level ?? 10;

  const marginPerUnit = sell - cost;
  const expectedProfit = marginPerUnit * quantity - expenses;
  const actualProfit = marginPerUnit * sold - expenses;
  const creditOutstanding = sell * onCredit;

  const isOutOfStock = quantity <= 0;
  const isLowStock = !isOutOfStock && quantity <= reorderLevel;

  let statusText = 'In Stock';
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

  // Client-side integrity check (quick red flags from available data)
  let integrityWarning = '';
  if (sell < cost && cost > 0) {
    integrityWarning = 'Selling below cost';
  } else if (onCredit > 0 && sold > 0 && onCredit / sold > 0.5) {
    integrityWarning = 'High credit ratio';
  } else if (onCredit > quantity + sold) {
    integrityWarning = 'Credit exceeds stock';
  }
  const hasIntegrityIssue = integrityWarning.length > 0;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(item.id)}
      activeOpacity={0.7}
    >
      {/* Header: SKU + Name + Status */}
      <View style={styles.topRow}>
        <View style={styles.nameSection}>
          <Text style={styles.skuText} numberOfLines={1}>{item.sku}</Text>
          <Text style={styles.nameText} numberOfLines={1}>{item.name}</Text>
          {item.category_id ? (
            <View style={styles.categoryPill}>
              <Text style={styles.categoryPillText}>{item.category_id}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.statusBadge}>
          {hasIntegrityIssue ? (
            <View style={styles.integrityBadge}>
              <ShieldAlert size={12} color="#A32D2D" />
            </View>
          ) : sold > 0 ? (
            <View style={styles.integrityBadgeClean}>
              <ShieldCheck size={12} color="#059669" />
            </View>
          ) : null}
          <View style={[styles.statusPill, { backgroundColor: statusBg }]}>
            <Text style={[styles.statusPillText, { color: statusColor }]}>{statusText}</Text>
          </View>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Row 1: Quantity, Pack, Cost, Sell */}
      <View style={styles.detailsGrid}>
        <View style={styles.gridCell}>
          <Text style={styles.gridLabel}>QTY</Text>
          <Text style={styles.gridValue}>{quantity.toLocaleString()}</Text>
        </View>
        <View style={styles.gridCell}>
          <Text style={styles.gridLabel}>PACK</Text>
          <Text style={styles.gridValue}>{item.unit_of_measure || 'Piece'}</Text>
        </View>
        <View style={styles.gridCell}>
          <Text style={styles.gridLabel}>COST (₦)</Text>
          <Text style={styles.gridValue}>{fmtNaira(cost)}</Text>
        </View>
        <View style={styles.gridCell}>
          <Text style={styles.gridLabel}>SELL (₦)</Text>
          <Text style={styles.gridValue}>{fmtNaira(sell)}</Text>
        </View>
      </View>

      {/* Row 2: Expenses, Sold, On Credit */}
      <View style={styles.detailsGrid}>
        <View style={styles.gridCell}>
          <Text style={styles.gridLabel}>EXPENSES (₦)</Text>
          <Text style={styles.gridValue}>{fmtNaira(expenses)}</Text>
        </View>
        <View style={styles.gridCell}>
          <Text style={styles.gridLabel}>SOLD</Text>
          <Text style={styles.gridValue}>{sold.toLocaleString()}</Text>
        </View>
        <View style={styles.gridCell}>
          <Text style={styles.gridLabel}>ON CREDIT</Text>
          <Text style={[styles.gridValue, onCredit > 0 && styles.creditValue]}>
            {onCredit.toLocaleString()}
          </Text>
        </View>
        <View style={styles.gridCell}>
          <Text style={styles.gridLabel}>REORDER</Text>
          <Text style={styles.gridValue}>{reorderLevel}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Row 3: Profit calculations */}
      <View style={styles.profitRow}>
        <View style={styles.profitCell}>
          <Text style={styles.profitLabel}>Expected Profit</Text>
          <Text style={[styles.profitValue, expectedProfit >= 0 ? styles.profitPositive : styles.profitNegative]}>
            ₦{fmtNaira(expectedProfit)}
          </Text>
        </View>
        <View style={styles.profitDivider} />
        <View style={styles.profitCell}>
          <Text style={styles.profitLabel}>Actual Profit</Text>
          <Text style={[styles.profitValue, actualProfit >= 0 ? styles.profitPositive : styles.profitNegative]}>
            ₦{fmtNaira(actualProfit)}
          </Text>
        </View>
      </View>

      {/* Credit outstanding warning */}
      {onCredit > 0 && (
        <View style={styles.creditWarning}>
          <AlertTriangle size={14} color="#BA7517" />
          <Text style={styles.creditWarningText}>
            ₦{fmtNaira(creditOutstanding)} outstanding on credit ({onCredit} items unpaid)
          </Text>
        </View>
      )}

      {/* Integrity warning */}
      {hasIntegrityIssue && (
        <View style={styles.integrityWarning}>
          <ShieldAlert size={14} color="#A32D2D" />
          <Text style={styles.integrityWarningText}>{integrityWarning} — verify this product&apos;s data</Text>
        </View>
      )}

      {/* Footer: Delete action */}
      <View style={styles.footerRow}>
        <Text style={styles.dateText}>
          {item.created_at ? new Date(item.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
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
    alignItems: 'flex-start',
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
    marginBottom: 4,
  },
  categoryPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  categoryPillText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  integrityBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FCEBEB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  integrityBadgeClean: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E1F5EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 10,
  },
  detailsGrid: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  gridCell: {
    flex: 1,
    paddingVertical: 4,
  },
  gridLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  gridValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  creditValue: {
    color: '#BA7517',
  },
  profitRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profitCell: {
    flex: 1,
    paddingVertical: 4,
  },
  profitDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 12,
  },
  profitLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 3,
  },
  profitValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  profitPositive: {
    color: '#059669',
  },
  profitNegative: {
    color: '#A32D2D',
  },
  creditWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAEEDA',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 8,
    gap: 6,
  },
  creditWarningText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#633806',
    flex: 1,
  },
  integrityWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FCEBEB',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 6,
    gap: 6,
  },
  integrityWarningText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#791F1F',
    flex: 1,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
    marginTop: 8,
  },
  dateText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  deleteButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#FCEBEB',
  },
});
