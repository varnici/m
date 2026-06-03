import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { getSummary } from '../services/inventoryApi';
import { InventorySummary } from '../types/voice-inventory';

export default function InventorySummaryComponent() {
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSummary()
      .then(setSummary)
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <ActivityIndicator />;
  if (error) return <Text style={styles.error}>{error}</Text>;
  if (!summary) return <Text>No summary data</Text>;

  return (
    <View style={styles.container}>
      <Text>Total Items: {summary.total_items}</Text>
      <Text>Total Sold: {summary.total_sold}</Text>
      <Text>Total Revenue: {summary.total_revenue}</Text>
      <Text>Total Profit: {summary.total_profit}</Text>
      <Text>Margin %: {summary.margin_pct}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  error: { color: 'red', padding: 16 },
});
