import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Share2, Copy, ExternalLink, Package } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { shopfrontService } from '@/services/shopfrontService';

const ShopfrontScreen = () => {
  const navigation = useNavigation();

  const { data: config, isLoading } = useQuery({
    queryKey: ['shopfront-config'],
    queryFn: () => shopfrontService.getMyShopfront(),
  });

  const shareUrl = config ? `https://ventureroot.ng${config.share_url}` : '';

  const handleShare = async () => {
    if (!shareUrl) return;
    try {
      await Share.share({
        message: `Check out my shop on VentureRoot! ${shareUrl}`,
        url: shareUrl,
      });
    } catch {}
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await Share.share({ message: shareUrl });
    } catch {}
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Shopfront</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.statusCard}>
          <View style={[styles.statusDot, { backgroundColor: config?.is_active ? '#10B981' : '#94A3B8' }]} />
          <Text style={styles.statusText}>
            {config?.is_active ? 'Active' : 'No store set up yet'}
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Package size={20} color="#7C3AED" />
            <Text style={styles.statValue}>{config?.product_count ?? 0}</Text>
            <Text style={styles.statLabel}>Products Listed</Text>
          </View>
        </View>

        <View style={styles.linkCard}>
          <Text style={styles.linkLabel}>Your Shopfront Link</Text>
          <Text style={styles.linkUrl} numberOfLines={1}>{shareUrl}</Text>

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={handleCopy}>
              <Copy size={18} color="#475569" />
              <Text style={styles.actionText}>Copy</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionBtn, styles.shareBtn]} onPress={handleShare}>
              <Share2 size={18} color="#FFF" />
              <Text style={[styles.actionText, { color: '#FFF' }]}>Share via WhatsApp</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.infoText}>
          Customers who visit this link can browse your products and place orders.
          Orders update your inventory and sales automatically.
        </Text>
      </View>
    </SafeAreaView>
  );
};

export default ShopfrontScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
  statusCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 20, gap: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { fontSize: 14, fontWeight: '600', color: '#475569' },
  statsRow: { flexDirection: 'row', marginBottom: 24 },
  statItem: { flex: 1, backgroundColor: '#FFF', padding: 20, borderRadius: 12, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#E2E8F0' },
  statValue: { fontSize: 28, fontWeight: '900', color: '#1E293B' },
  statLabel: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },
  linkCard: { backgroundColor: '#FFF', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 20 },
  linkLabel: { fontSize: 12, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  linkUrl: { fontSize: 14, color: '#1E293B', fontWeight: '500', marginBottom: 16, padding: 12, backgroundColor: '#F8FAFC', borderRadius: 8 },
  actionRow: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  shareBtn: { backgroundColor: '#10B981', borderColor: '#10B981' },
  actionText: { fontSize: 13, fontWeight: '700', color: '#475569' },
  infoText: { fontSize: 13, color: '#94A3B8', lineHeight: 20, textAlign: 'center', paddingHorizontal: 12 },
});
