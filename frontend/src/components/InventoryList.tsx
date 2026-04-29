import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { listInventory } from '../services/inventoryApi';
import { InventoryRecord } from '../types/inventory';

export default function InventoryList() {
  const [items, setItems] = useState<InventoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listInventory()
      .then(setItems)
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <ActivityIndicator />;
  if (error) return <Text style={styles.error}>{error}</Text>;

  return (
    <FlatList
      data={items}
      keyExtractor={item => item.id}
      renderItem={({ item }) => (
        <View style={styles.item}>
          <Text style={styles.name}>{item.product_name}</Text>
          <Text>Qty: {item.quantity} | Sold: {item.sold}</Text>
          <Text>Profit: {item.profit} | Revenue: {item.revenue}</Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  item: { padding: 12, borderBottomWidth: 1, borderColor: '#eee' },
  name: { fontWeight: 'bold' },
  error: { color: 'red', padding: 16 },
});
