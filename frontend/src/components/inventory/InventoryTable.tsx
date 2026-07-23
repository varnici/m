import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Trash2, AlertTriangle } from "lucide-react-native";
import { Product } from "@/types/inventory";
import { colors } from "@/theme/colors";

/**
 * Essential-columns inventory table (Product / Stock / Price / Sold).
 *
 * Replaces the old card-per-product layout (InventoryTableRow.tsx), which had
 * no shared column headers and made comparing quantities/prices across many
 * products require scrolling through tall cards one at a time. The remaining
 * details (cost, expenses, on-credit, reorder level, profit) live on
 * ProductDetailScreen, reached by tapping a row — unchanged.
 */

function fmtNaira(kobo: number): string {
  const naira = kobo / 100;
  return naira.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function InventoryTableHeader() {
  return (
    <View style={styles.headerRow}>
      <Text style={[styles.headerCell, styles.productCol]}>Product</Text>
      <Text style={[styles.headerCell, styles.stockCol]}>Stock</Text>
      <Text style={[styles.headerCell, styles.priceCol]}>Price</Text>
      <Text style={[styles.headerCell, styles.soldCol]}>Sold</Text>
      <View style={styles.deleteColSpacer} />
    </View>
  );
}

interface InventoryTableRowProps {
  readonly item: Product;
  readonly onDelete: (id: string) => void;
  readonly onPress: (id: string) => void;
}

export const InventoryTableRow = React.memo<InventoryTableRowProps>(
  ({ item, onDelete, onPress }) => {
    const quantity = item.total_quantity_on_hand ?? item.quantity_on_hand ?? 0;
    const sell = item.selling_price_kobo ?? 0;
    const sold = item.quantity_sold ?? 0;
    const reorderLevel = item.minimum_stock_level ?? 10;
    const discrepancyQty = item.discrepancy_qty ?? 0;

    const isOutOfStock = quantity <= 0;
    const isLowStock = !isOutOfStock && quantity <= reorderLevel;

    let statusText = `${quantity.toLocaleString()} in stock`;
    let statusColor = colors.status.success;
    if (isOutOfStock) {
      statusText = "Out of stock";
      statusColor = colors.status.danger;
    } else if (isLowStock) {
      statusText = `Low (${quantity.toLocaleString()})`;
      statusColor = colors.status.warning;
    }

    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => onPress(item.id)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${item.name}, ${statusText}, price ${fmtNaira(sell)} naira, ${sold} sold${discrepancyQty !== 0 ? `, ${Math.abs(discrepancyQty)} units ${discrepancyQty > 0 ? 'missing' : 'unaccounted for'} since last stock count` : ''}`}
      >
        <View style={styles.productCol}>
          <Text style={styles.nameText} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.skuText} numberOfLines={1}>
            {item.sku}
          </Text>
        </View>

        <View style={styles.stockCol}>
          <View style={styles.stockPill}>
            <View style={[styles.stockDot, { backgroundColor: statusColor }]} />
            <Text
              style={[styles.stockText, { color: statusColor }]}
              numberOfLines={1}
            >
              {statusText}
            </Text>
            {discrepancyQty !== 0 ? (
              <AlertTriangle size={12} color={colors.status.warning} style={styles.discrepancyIcon} />
            ) : null}
          </View>
        </View>

        <Text style={[styles.cellValue, styles.priceCol]} numberOfLines={1}>
          {"₦"}
          {fmtNaira(sell)}
        </Text>

        <Text style={[styles.cellValue, styles.soldCol]} numberOfLines={1}>
          {sold.toLocaleString()}
        </Text>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => onDelete(item.id)}
          accessibilityRole="button"
          accessibilityLabel={`Delete ${item.name}`}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Trash2 size={16} color={colors.status.danger} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  },
);

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background.card,
    borderBottomWidth: 1,
    borderColor: colors.border.light,
  },
  headerCell: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text.secondary,
    letterSpacing: 0.2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 72,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.background.card,
    borderBottomWidth: 1,
    borderColor: colors.border.light,
  },
  productCol: {
    flex: 2.2,
    paddingRight: 8,
  },
  stockCol: {
    flex: 1.5,
    paddingRight: 8,
  },
  priceCol: {
    flex: 1.1,
    textAlign: "right",
    paddingRight: 8,
  },
  soldCol: {
    flex: 0.8,
    textAlign: "right",
  },
  deleteColSpacer: {
    width: 32,
  },
  nameText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text.primary,
  },
  skuText: {
    fontFamily: "monospace",
    fontSize: 11,
    color: colors.text.muted,
    marginTop: 4,
  },
  stockPill: {
    flexDirection: "row",
    alignItems: "center",
  },
  stockDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  stockText: {
    fontSize: 13,
    fontWeight: "600",
    flexShrink: 1,
  },
  discrepancyIcon: {
    marginLeft: 5,
  },
  cellValue: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text.primary,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background.coral,
  },
});
