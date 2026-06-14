import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Mic, ScanLine, ChevronRight } from 'lucide-react-native';
import { colors } from '@/theme/colors';

export type InventoryQuickAction = 'voice' | 'scan';

type Props = {
  onVoice: () => void;
  onScan: () => void;
  onBrowse?: () => void;
  compact?: boolean;
};

/**
 * Primary inventory entry points — voice & scan first (how shop owners actually work).
 */
export function InventoryQuickActions({
  onVoice,
  onScan,
  onBrowse,
  compact = false,
}: Props) {
  if (compact) {
    return (
      <View style={styles.compactRow}>
        <TouchableOpacity
          style={[styles.compactBtn, styles.scanCompact]}
          onPress={onScan}
          accessibilityRole="button"
          accessibilityLabel="Scan barcode to update stock"
        >
          <ScanLine size={22} color="#fff" strokeWidth={2.5} />
          <Text style={styles.compactLabel}>Scan</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.compactBtn, styles.voiceCompact]}
          onPress={onVoice}
          accessibilityRole="button"
          accessibilityLabel="Record stock by voice"
        >
          <Mic size={22} color="#fff" strokeWidth={2.5} />
          <Text style={styles.compactLabel}>Voice</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionTitle}>Update stock</Text>
      <Text style={styles.sectionHint}>
        Tap scan for barcodes, or voice to say what you received — e.g. “20 cartons of Coke”.
      </Text>

      <TouchableOpacity
        style={styles.primaryCard}
        onPress={onScan}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Scan product barcode"
      >
        <View style={[styles.iconCircle, styles.scanCircle]}>
          <ScanLine size={28} color="#fff" strokeWidth={2.5} />
        </View>
        <View style={styles.cardText}>
          <Text style={styles.cardTitle}>Scan barcode</Text>
          <Text style={styles.cardSubtitle}>
            Point at a product label — stock updates automatically
          </Text>
        </View>
        <ChevronRight size={22} color="rgba(255,255,255,0.7)" />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.primaryCard, styles.voiceCard]}
        onPress={onVoice}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Add stock using your voice"
      >
        <View style={[styles.iconCircle, styles.voiceCircle]}>
          <Mic size={28} color="#fff" strokeWidth={2.5} />
        </View>
        <View style={styles.cardText}>
          <Text style={styles.cardTitle}>Voice entry</Text>
          <Text style={styles.cardSubtitle}>
            Hold and speak in English, Yoruba, Igbo, or Hausa
          </Text>
        </View>
        <ChevronRight size={22} color="rgba(255,255,255,0.7)" />
      </TouchableOpacity>

      {onBrowse ? (
        <TouchableOpacity style={styles.secondaryLink} onPress={onBrowse}>
          <Text style={styles.secondaryLinkText}>Browse product list manually</Text>
          <ChevronRight size={16} color={colors.ventureroot.green} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 14,
  },
  primaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    borderRadius: 20,
    padding: 18,
    marginBottom: 12,
    minHeight: 88,
  },
  voiceCard: {
    backgroundColor: colors.ventureroot.green,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  scanCircle: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  voiceCircle: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 16,
  },
  secondaryLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 4,
  },
  secondaryLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ventureroot.green,
  },
  compactRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  compactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    minHeight: 52,
  },
  scanCompact: {
    backgroundColor: '#4F46E5',
  },
  voiceCompact: {
    backgroundColor: colors.ventureroot.green,
  },
  compactLabel: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
});

export default InventoryQuickActions;
