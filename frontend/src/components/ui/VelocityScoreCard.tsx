import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, ChevronRight, Zap } from 'lucide-react-native';
import { velocityService } from '@/services/velocityService';

interface Props {
  onPress?: () => void;
}

const VelocityScoreCard = ({ onPress }: Props) => {
  const { data, isLoading } = useQuery({
    queryKey: ['velocity-score'],
    queryFn: () => velocityService.getScore(),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading || !data) return null;

  const scoreColor = data.score >= 70 ? '#10B981' : data.score >= 40 ? '#F59E0B' : '#EF4444';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Zap size={16} color="#7C3AED" />
        </View>
        <Text style={styles.title}>Sales Velocity</Text>
        <ChevronRight size={16} color="#94A3B8" />
      </View>

      <View style={styles.body}>
        <View style={styles.scoreSection}>
          <Text style={[styles.score, { color: scoreColor }]}>{data.score}</Text>
          <Text style={styles.scoreLabel}>/100</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.creditSection}>
          <Text style={styles.creditLabel}>Credit Limit</Text>
          <Text style={styles.creditValue}>
            ₦{data.credit_limit_naira.toLocaleString()}
          </Text>
        </View>
      </View>

      <View style={styles.metricsRow}>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>{data.units_per_day}</Text>
          <Text style={styles.metricLabel}>units/day</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>{data.restock_consistency_pct}%</Text>
          <Text style={styles.metricLabel}>restock</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>{data.repayment_ratio_pct}%</Text>
          <Text style={styles.metricLabel}>repayment</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default VelocityScoreCard;

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  iconWrap: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  title: { flex: 1, fontSize: 13, fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 },
  body: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  scoreSection: { flexDirection: 'row', alignItems: 'baseline' },
  score: { fontSize: 36, fontWeight: '900' },
  scoreLabel: { fontSize: 16, fontWeight: '600', color: '#94A3B8', marginLeft: 2 },
  divider: { width: 1, height: 40, backgroundColor: '#E2E8F0', marginHorizontal: 20 },
  creditSection: { flex: 1 },
  creditLabel: { fontSize: 11, fontWeight: '600', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 4 },
  creditValue: { fontSize: 20, fontWeight: '900', color: '#1E293B' },
  metricsRow: { flexDirection: 'row', gap: 8 },
  metric: { flex: 1, backgroundColor: '#F8FAFC', paddingVertical: 10, paddingHorizontal: 8, borderRadius: 10, alignItems: 'center' },
  metricValue: { fontSize: 14, fontWeight: '800', color: '#1E293B' },
  metricLabel: { fontSize: 10, fontWeight: '600', color: '#94A3B8', marginTop: 2 },
});
