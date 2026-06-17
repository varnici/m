import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Users,
  Clock,
  Package,
  Edit3,
  Trash2,
  Plus,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { inventoryService } from '@/services/inventoryService';

interface ActivityEntry {
  id: string;
  actor_id: string;
  actor_name: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  details: Record<string, any> | null;
  ip_address: string | null;
  is_owner: boolean;
  created_at: string;
}

interface StaffMember {
  actor_id: string;
  actor_name: string;
  is_owner: boolean;
  total_actions: number;
  last_active: string | null;
  actions_breakdown: Record<string, number>;
}

interface IntegrityReport {
  overall_score: number;
  risk_level: string;
  total_products_checked: number;
  flagged_products: number;
  critical_flags: number;
  total_flags: number;
  product_scores: Array<{
    product_id: string;
    product_name: string;
    sku: string;
    integrity_score: number;
    quantity_on_hand: number;
    quantity_sold: number;
    quantity_on_credit: number;
    flags: Array<{ type: string; severity: string; message: string }>;
  }>;
}

const ACTION_ICONS: Record<string, { icon: any; color: string; bg: string }> = {
  create: { icon: Plus, color: '#059669', bg: '#E1F5EE' },
  update: { icon: Edit3, color: '#185FA5', bg: '#E6F1FB' },
  delete: { icon: Trash2, color: '#A32D2D', bg: '#FCEBEB' },
  stock_adjust: { icon: Package, color: '#BA7517', bg: '#FAEEDA' },
  sale: { icon: Package, color: '#059669', bg: '#E1F5EE' },
  credit_given: { icon: AlertTriangle, color: '#BA7517', bg: '#FAEEDA' },
};

const ACTION_LABELS: Record<string, string> = {
  create: 'Added product',
  update: 'Updated product',
  delete: 'Deleted product',
  stock_adjust: 'Adjusted stock',
  sale: 'Recorded sale',
  credit_given: 'Gave on credit',
  credit_paid: 'Credit paid',
};

export default function StaffActivityScreen({ navigation }: any) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'activity' | 'staff' | 'integrity'>('activity');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [activityLog, setActivityLog] = useState<ActivityEntry[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [integrity, setIntegrity] = useState<IntegrityReport | null>(null);
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());

  const [filterAction, setFilterAction] = useState<string>('');
  const [days, setDays] = useState(30);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [logData, staffData, integrityData] = await Promise.all([
        inventoryService.getActivityLog(0, 100, undefined, filterAction || undefined, undefined, days),
        inventoryService.getStaffSummary(days),
        inventoryService.getSalesIntegrity(days),
      ]);
      setActivityLog(logData);
      setStaffList(staffData);
      setIntegrity(integrityData);
    } catch (err) {
      console.warn('Failed to load staff activity:', err);
    } finally {
      setLoading(false);
    }
  }, [filterAction, days]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const toggleProductExpand = (productId: string) => {
    setExpandedProducts((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const integrityColor = useMemo(() => {
    if (!integrity) return '#6B7280';
    if (integrity.overall_score >= 85) return '#059669';
    if (integrity.overall_score >= 70) return '#BA7517';
    return '#A32D2D';
  }, [integrity]);

  const IntegrityIcon = useMemo(() => {
    if (!integrity) return Shield;
    if (integrity.overall_score >= 85) return ShieldCheck;
    if (integrity.overall_score >= 70) return Shield;
    return ShieldAlert;
  }, [integrity]);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color="#004D2C" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Staff Activity & Integrity</Text>
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabRow}>
        {([
          { key: 'activity', label: 'Activity Log' },
          { key: 'staff', label: 'Staff' },
          { key: 'integrity', label: 'Sales Integrity' },
        ] as const).map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
            {tab.key === 'integrity' && integrity && integrity.critical_flags > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{integrity.critical_flags}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Time Range Selector */}
      <View style={styles.rangeRow}>
        {[7, 14, 30, 90].map((d) => (
          <TouchableOpacity
            key={d}
            style={[styles.rangeChip, days === d && styles.rangeChipActive]}
            onPress={() => setDays(d)}
          >
            <Text style={[styles.rangeChipText, days === d && styles.rangeChipTextActive]}>{d}d</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 60 }} color="#004D2C" size="large" />
      ) : (
        <ScrollView
          style={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#004D2C" />}
          showsVerticalScrollIndicator={false}
        >
          {/* ============= ACTIVITY LOG TAB ============= */}
          {activeTab === 'activity' && (
            <View>
              {/* Action Filters */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                <View style={styles.filterRow}>
                  {['', 'create', 'update', 'delete', 'stock_adjust', 'sale'].map((a) => (
                    <TouchableOpacity
                      key={a}
                      style={[styles.filterChip, filterAction === a && styles.filterChipActive]}
                      onPress={() => setFilterAction(a)}
                    >
                      <Text style={[styles.filterChipText, filterAction === a && styles.filterChipTextActive]}>
                        {a === '' ? 'All' : ACTION_LABELS[a] || a}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {activityLog.length === 0 ? (
                <View style={styles.emptyState}>
                  <Clock size={40} color="#D1D5DB" />
                  <Text style={styles.emptyText}>No activity recorded yet</Text>
                  <Text style={styles.emptySubtext}>Staff actions will appear here as they work</Text>
                </View>
              ) : (
                activityLog.map((entry) => {
                  const actionMeta = ACTION_ICONS[entry.action] || ACTION_ICONS.create;
                  const ActionIcon = actionMeta.icon;
                  return (
                    <View key={entry.id} style={styles.activityCard}>
                      <View style={[styles.activityIcon, { backgroundColor: actionMeta.bg }]}>
                        <ActionIcon size={16} color={actionMeta.color} />
                      </View>
                      <View style={styles.activityContent}>
                        <View style={styles.activityTopRow}>
                          <Text style={styles.actorName}>
                            {entry.actor_name}
                            {entry.is_owner && <Text style={styles.ownerBadge}> (Owner)</Text>}
                          </Text>
                          <Text style={styles.activityTime}>{formatTime(entry.created_at)}</Text>
                        </View>
                        <Text style={styles.activityAction}>
                          {ACTION_LABELS[entry.action] || entry.action}
                          {entry.entity_name && (
                            <Text style={styles.entityName}> — {entry.entity_name}</Text>
                          )}
                        </Text>
                        {entry.details && (
                          <View style={styles.detailsBox}>
                            {Object.entries(entry.details).map(([key, val]) => (
                              <Text key={key} style={styles.detailText}>
                                {key.replace(/_/g, ' ')}: {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                              </Text>
                            ))}
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}

          {/* ============= STAFF TAB ============= */}
          {activeTab === 'staff' && (
            <View>
              {staffList.length === 0 ? (
                <View style={styles.emptyState}>
                  <Users size={40} color="#D1D5DB" />
                  <Text style={styles.emptyText}>No staff activity</Text>
                  <Text style={styles.emptySubtext}>Share your workspace code to let staff access inventory</Text>
                </View>
              ) : (
                staffList.map((staff) => (
                  <View key={staff.actor_id} style={styles.staffCard}>
                    <View style={styles.staffHeader}>
                      <View style={[styles.staffAvatar, staff.is_owner && styles.staffAvatarOwner]}>
                        <Text style={styles.staffAvatarText}>
                          {(staff.actor_name || 'U').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.staffInfo}>
                        <Text style={styles.staffName}>
                          {staff.actor_name}
                          {staff.is_owner && <Text style={styles.ownerTag}> (Owner)</Text>}
                        </Text>
                        <Text style={styles.staffLastActive}>
                          Last active: {staff.last_active ? formatTime(staff.last_active) : 'Never'}
                        </Text>
                      </View>
                      <View style={styles.staffCountBadge}>
                        <Text style={styles.staffCountText}>{staff.total_actions}</Text>
                        <Text style={styles.staffCountLabel}>actions</Text>
                      </View>
                    </View>
                    <View style={styles.staffBreakdown}>
                      {Object.entries(staff.actions_breakdown).map(([action, count]) => (
                        <View key={action} style={styles.breakdownChip}>
                          <Text style={styles.breakdownText}>
                            {ACTION_LABELS[action] || action}: {count}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {/* ============= SALES INTEGRITY TAB ============= */}
          {activeTab === 'integrity' && integrity && (
            <View>
              {/* Overall Score Card */}
              <View style={[styles.integrityScoreCard, { borderColor: integrityColor }]}>
                <View style={styles.integrityScoreRow}>
                  <IntegrityIcon size={36} color={integrityColor} />
                  <View style={styles.integrityScoreInfo}>
                    <Text style={[styles.integrityScoreValue, { color: integrityColor }]}>
                      {integrity.overall_score}%
                    </Text>
                    <Text style={styles.integrityScoreLabel}>Sales Integrity Score</Text>
                  </View>
                </View>
                <View style={styles.integrityMeta}>
                  <View style={styles.integrityMetaItem}>
                    <Text style={styles.integrityMetaValue}>{integrity.total_products_checked}</Text>
                    <Text style={styles.integrityMetaLabel}>Checked</Text>
                  </View>
                  <View style={styles.integrityMetaItem}>
                    <Text style={[styles.integrityMetaValue, integrity.flagged_products > 0 && { color: '#A32D2D' }]}>
                      {integrity.flagged_products}
                    </Text>
                    <Text style={styles.integrityMetaLabel}>Flagged</Text>
                  </View>
                  <View style={styles.integrityMetaItem}>
                    <Text style={[styles.integrityMetaValue, integrity.critical_flags > 0 && { color: '#A32D2D' }]}>
                      {integrity.critical_flags}
                    </Text>
                    <Text style={styles.integrityMetaLabel}>Critical</Text>
                  </View>
                </View>
                {integrity.risk_level !== 'clean' && (
                  <View style={styles.riskBanner}>
                    <AlertTriangle size={14} color="#A32D2D" />
                    <Text style={styles.riskBannerText}>
                      {integrity.risk_level === 'critical'
                        ? 'CRITICAL: Multiple products show signs of data manipulation. Review immediately.'
                        : integrity.risk_level === 'high'
                        ? 'HIGH RISK: Some products have suspicious sales patterns. Verify stock counts manually.'
                        : 'MEDIUM RISK: Minor inconsistencies detected. Monitor closely.'}
                    </Text>
                  </View>
                )}
              </View>

              {/* Per-product integrity scores */}
              {integrity.product_scores.map((product) => {
                const isExpanded = expandedProducts.has(product.product_id);
                const scoreColor = product.integrity_score >= 85 ? '#059669' : product.integrity_score >= 70 ? '#BA7517' : '#A32D2D';

                return (
                  <TouchableOpacity
                    key={product.product_id}
                    style={styles.productIntegrityCard}
                    onPress={() => toggleProductExpand(product.product_id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.productIntegrityHeader}>
                      <View style={styles.productIntegrityInfo}>
                        <Text style={styles.productIntegritySku}>{product.sku}</Text>
                        <Text style={styles.productIntegrityName} numberOfLines={1}>{product.product_name}</Text>
                      </View>
                      <View style={styles.productScoreBadge}>
                        <Text style={[styles.productScoreText, { color: scoreColor }]}>
                          {product.integrity_score}%
                        </Text>
                        {isExpanded ? (
                          <ChevronUp size={14} color="#6B7280" />
                        ) : (
                          <ChevronDown size={14} color="#6B7280" />
                        )}
                      </View>
                    </View>

                    <View style={styles.productIntegrityStats}>
                      <Text style={styles.productStat}>Stock: {product.quantity_on_hand}</Text>
                      <Text style={styles.productStat}>Sold: {product.quantity_sold}</Text>
                      {product.quantity_on_credit > 0 && (
                        <Text style={[styles.productStat, { color: '#BA7517' }]}>
                          Credit: {product.quantity_on_credit}
                        </Text>
                      )}
                    </View>

                    {isExpanded && product.flags.length > 0 && (
                      <View style={styles.flagsList}>
                        {product.flags.map((flag, i) => (
                          <View
                            key={i}
                            style={[
                              styles.flagItem,
                              flag.severity === 'critical' && styles.flagCritical,
                              flag.severity === 'high' && styles.flagHigh,
                              flag.severity === 'medium' && styles.flagMedium,
                            ]}
                          >
                            <AlertTriangle
                              size={12}
                              color={flag.severity === 'critical' || flag.severity === 'high' ? '#A32D2D' : '#BA7517'}
                            />
                            <Text style={styles.flagText}>{flag.message}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {isExpanded && product.flags.length === 0 && (
                      <View style={styles.cleanBadge}>
                        <ShieldCheck size={14} color="#059669" />
                        <Text style={styles.cleanText}>No integrity issues detected</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F9FA' },
  header: {
    height: 56,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#E1F5EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#004D2C' },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  tabActive: { backgroundColor: '#004D2C' },
  tabText: { fontSize: 12, fontWeight: '700', color: '#6B7280' },
  tabTextActive: { color: '#FFFFFF' },
  tabBadge: {
    backgroundColor: '#A32D2D',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
    minWidth: 16,
    alignItems: 'center',
  },
  tabBadgeText: { fontSize: 9, fontWeight: '800', color: '#FFFFFF' },
  rangeRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
    backgroundColor: '#FFFFFF',
  },
  rangeChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  rangeChipActive: { backgroundColor: '#E1F5EE', borderColor: '#004D2C' },
  rangeChipText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  rangeChipTextActive: { color: '#004D2C' },
  content: { flex: 1 },
  filterScroll: { marginBottom: 8 },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  filterChipActive: { backgroundColor: '#E1F5EE', borderColor: '#004D2C' },
  filterChipText: { fontSize: 11, fontWeight: '600', color: '#6B7280' },
  filterChipTextActive: { color: '#004D2C' },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#6B7280' },
  emptySubtext: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingHorizontal: 40 },
  activityCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  activityIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityContent: { flex: 1 },
  activityTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  actorName: { fontSize: 13, fontWeight: '700', color: '#1A1A1A' },
  ownerBadge: { fontSize: 11, fontWeight: '500', color: '#004D2C' },
  activityTime: { fontSize: 11, color: '#9CA3AF' },
  activityAction: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  entityName: { fontWeight: '600', color: '#374151' },
  detailsBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 8,
    marginTop: 4,
  },
  detailText: { fontSize: 11, color: '#6B7280', marginBottom: 2 },
  staffCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  staffHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  staffAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E1F5EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  staffAvatarOwner: { backgroundColor: '#004D2C' },
  staffAvatarText: { fontSize: 16, fontWeight: '800', color: '#004D2C' },
  staffInfo: { flex: 1 },
  staffName: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  ownerTag: { fontSize: 11, fontWeight: '500', color: '#004D2C' },
  staffLastActive: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  staffCountBadge: { alignItems: 'center' },
  staffCountText: { fontSize: 18, fontWeight: '800', color: '#004D2C' },
  staffCountLabel: { fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase' },
  staffBreakdown: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  breakdownChip: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  breakdownText: { fontSize: 11, fontWeight: '500', color: '#6B7280' },
  integrityScoreCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 20,
    borderRadius: 20,
    borderWidth: 2,
  },
  integrityScoreRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  integrityScoreInfo: {},
  integrityScoreValue: { fontSize: 36, fontWeight: '900' },
  integrityScoreLabel: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  integrityMeta: { flexDirection: 'row', gap: 24 },
  integrityMetaItem: { alignItems: 'center' },
  integrityMetaValue: { fontSize: 18, fontWeight: '800', color: '#1A1A1A' },
  integrityMetaLabel: { fontSize: 10, fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase' },
  riskBanner: {
    flexDirection: 'row',
    backgroundColor: '#FCEBEB',
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
    gap: 8,
    alignItems: 'flex-start',
  },
  riskBannerText: { fontSize: 12, fontWeight: '600', color: '#791F1F', flex: 1, lineHeight: 18 },
  productIntegrityCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  productIntegrityHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  productIntegrityInfo: { flex: 1 },
  productIntegritySku: { fontSize: 10, fontFamily: 'monospace', color: '#9CA3AF' },
  productIntegrityName: { fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginTop: 2 },
  productScoreBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  productScoreText: { fontSize: 16, fontWeight: '800' },
  productIntegrityStats: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  productStat: { fontSize: 11, fontWeight: '600', color: '#6B7280' },
  flagsList: { marginTop: 10, gap: 6 },
  flagItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#E5E7EB',
  },
  flagCritical: { borderLeftColor: '#A32D2D', backgroundColor: '#FCEBEB' },
  flagHigh: { borderLeftColor: '#A32D2D', backgroundColor: '#FEF2F2' },
  flagMedium: { borderLeftColor: '#BA7517', backgroundColor: '#FAEEDA' },
  flagText: { fontSize: 12, color: '#374151', flex: 1, lineHeight: 18 },
  cleanBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    backgroundColor: '#E1F5EE',
    borderRadius: 8,
    padding: 8,
  },
  cleanText: { fontSize: 12, fontWeight: '600', color: '#059669' },
});
