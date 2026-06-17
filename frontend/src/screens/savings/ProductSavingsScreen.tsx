import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Plus, Package, Target, TrendingUp } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { productSavingsService, type ProductGoal } from '@/services/productSavingsService';

const formatKobo = (kobo: number) => `₦${(kobo / 100).toLocaleString()}`;

const GoalCard = ({ goal, onDeposit }: { goal: ProductGoal; onDeposit: (g: ProductGoal) => void }) => {
  const progressWidth = `${Math.min(goal.progress_pct, 100)}%`;
  const isComplete = goal.status === 'completed';

  return (
    <View style={styles.goalCard}>
      <View style={styles.goalHeader}>
        <View style={styles.goalIcon}>
          <Package size={18} color="#7C3AED" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.goalName}>{goal.product_name}</Text>
          <Text style={styles.goalMeta}>
            {goal.target_quantity} {goal.product_unit}{goal.target_quantity > 1 ? 's' : ''}
          </Text>
        </View>
        {isComplete && (
          <View style={styles.completeBadge}>
            <Text style={styles.completeText}>Done</Text>
          </View>
        )}
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: progressWidth as any, backgroundColor: isComplete ? '#10B981' : '#7C3AED' }]} />
        </View>
        <Text style={styles.progressText}>{goal.progress_pct}%</Text>
      </View>

      <View style={styles.amountRow}>
        <View>
          <Text style={styles.amountLabel}>Saved</Text>
          <Text style={styles.amountValue}>{formatKobo(goal.saved_kobo)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.amountLabel}>Target (current price)</Text>
          <Text style={styles.amountValue}>{formatKobo(goal.target_amount_kobo)}</Text>
        </View>
      </View>

      {!isComplete && (
        <TouchableOpacity style={styles.depositBtn} onPress={() => onDeposit(goal)}>
          <Plus size={16} color="#FFF" />
          <Text style={styles.depositBtnText}>Add Savings</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const ProductSavingsScreen = () => {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const [depositGoal, setDepositGoal] = useState<ProductGoal | null>(null);
  const [depositAmount, setDepositAmount] = useState('');

  const { data: goals, isLoading } = useQuery({
    queryKey: ['product-savings-goals'],
    queryFn: () => productSavingsService.listGoals(),
  });

  const depositMutation = useMutation({
    mutationFn: ({ goalId, amountKobo }: { goalId: string; amountKobo: number }) =>
      productSavingsService.deposit(goalId, amountKobo),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['product-savings-goals'] });
      setDepositGoal(null);
      setDepositAmount('');
      Alert.alert(result.is_completed ? 'Goal Completed!' : 'Deposit Successful', result.message);
    },
    onError: (err: any) => Alert.alert('Error', err.message),
  });

  const handleDeposit = () => {
    if (!depositGoal || !depositAmount) return;
    const amountNaira = parseFloat(depositAmount);
    if (isNaN(amountNaira) || amountNaira <= 0) {
      Alert.alert('Invalid amount');
      return;
    }
    depositMutation.mutate({ goalId: depositGoal.id, amountKobo: Math.round(amountNaira * 100) });
  };

  const activeGoals = goals?.filter((g) => g.status === 'active') ?? [];
  const completedGoals = goals?.filter((g) => g.status === 'completed') ?? [];
  const totalSaved = goals?.reduce((sum, g) => sum + g.saved_kobo, 0) ?? 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Product Savings</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#7C3AED" /></View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          <View style={styles.summaryCard}>
            <Target size={20} color="#10B981" />
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.summaryLabel}>Total Saved</Text>
              <Text style={styles.summaryValue}>{formatKobo(totalSaved)}</Text>
            </View>
            <View style={{ marginLeft: 'auto', alignItems: 'flex-end' }}>
              <Text style={styles.summaryLabel}>Goals</Text>
              <Text style={styles.summaryValue}>{activeGoals.length} active</Text>
            </View>
          </View>

          {activeGoals.length === 0 && completedGoals.length === 0 && (
            <View style={styles.emptyState}>
              <Package size={40} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No product savings yet</Text>
              <Text style={styles.emptyBody}>
                Set a goal to save toward specific products — prices adjust automatically with inflation.
              </Text>
            </View>
          )}

          {activeGoals.map((g) => (
            <GoalCard key={g.id} goal={g} onDeposit={setDepositGoal} />
          ))}

          {completedGoals.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Completed</Text>
              {completedGoals.map((g) => (
                <GoalCard key={g.id} goal={g} onDeposit={() => {}} />
              ))}
            </>
          )}
        </ScrollView>
      )}

      {depositGoal && (
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Add to "{depositGoal.product_name}"</Text>
            <Text style={styles.modalSub}>
              {formatKobo(depositGoal.saved_kobo)} / {formatKobo(depositGoal.target_amount_kobo)} saved
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Amount in Naira"
              keyboardType="numeric"
              value={depositAmount}
              onChangeText={setDepositAmount}
              autoFocus
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setDepositGoal(null); setDepositAmount(''); }}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, depositMutation.isPending && { opacity: 0.6 }]}
                onPress={handleDeposit}
                disabled={depositMutation.isPending}
              >
                <Text style={styles.confirmText}>
                  {depositMutation.isPending ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

export default ProductSavingsScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
  summaryCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 20, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: '#E2E8F0' },
  summaryLabel: { fontSize: 11, fontWeight: '600', color: '#94A3B8', textTransform: 'uppercase' },
  summaryValue: { fontSize: 18, fontWeight: '900', color: '#1E293B', marginTop: 2 },
  goalCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  goalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  goalIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  goalName: { fontSize: 15, fontWeight: '800', color: '#1E293B' },
  goalMeta: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  completeBadge: { backgroundColor: '#D1FAE5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  completeText: { fontSize: 11, fontWeight: '700', color: '#059669' },
  progressContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  progressBg: { flex: 1, height: 8, borderRadius: 4, backgroundColor: '#F1F5F9' },
  progressFill: { height: 8, borderRadius: 4 },
  progressText: { fontSize: 12, fontWeight: '800', color: '#475569', width: 40, textAlign: 'right' },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  amountLabel: { fontSize: 10, fontWeight: '600', color: '#94A3B8', textTransform: 'uppercase' },
  amountValue: { fontSize: 14, fontWeight: '800', color: '#1E293B', marginTop: 2 },
  depositBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#7C3AED', paddingVertical: 10, borderRadius: 10 },
  depositBtnText: { fontSize: 13, fontWeight: '700', color: '#FFF' },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', marginTop: 20, marginBottom: 12 },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#475569', marginTop: 12 },
  emptyBody: { fontSize: 13, color: '#94A3B8', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 24 },
  modal: { backgroundColor: '#FFF', borderRadius: 20, padding: 24 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B', marginBottom: 4 },
  modalSub: { fontSize: 13, color: '#94A3B8', marginBottom: 20 },
  input: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, fontWeight: '600', marginBottom: 20 },
  modalActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  cancelText: { fontSize: 14, fontWeight: '700', color: '#64748B' },
  confirmBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: '#7C3AED' },
  confirmText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
});
