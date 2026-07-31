import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlashList } from "@shopify/flash-list";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Search,
  Plus,
  Mic,
  ScanLine,
  ArrowDownToLine,
  ArrowUpFromLine,
  MoreHorizontal,
  X,
  Copy,
  Check,
  Users,
  Truck,
  ShoppingCart,
  ClipboardCheck,
  Shield,
  Download,
  Package,
  Trash2,
  ChevronRight,
  Tags,
  Store as StoreIcon,
  ClipboardList,
  FileSpreadsheet,
} from "lucide-react-native";
import { useAuth } from "@/context/AuthContext";
import {
  useProducts,
  useDeleteProduct,
  useInventoryDashboard,
  useInventoryRealtime,
} from "@/hooks/useInventory";
import { useCategories } from "@/hooks/useCategories";
import { useBusinessProfile } from "@/hooks/useBusinessProfile";
import { inventoryService } from "@/services/inventoryService";
import { shareCsv } from "@/services/csvExport";
import { getCategoryIconComponent, DEFAULT_CATEGORY_TINT } from "@/constants/categoryIcons";
import AppHeader from "@/components/ui/AppHeader";
import { colors } from "@/theme/colors";
import type { Product, Category } from "@/types/inventory";

const LIMIT = 300;

type ListRow =
  | { type: "header"; id: string; category: Category | null; count: number; value: number }
  | { type: "product"; id: string; product: Product };

/**
 * Inventory home. Redesigned around three questions a business owner
 * actually asks: what's my stock worth, what needs attention, and how do I
 * quickly add/move stock — with everything else (trade desk, POS, staff
 * activity, exports) tucked behind "More tools" rather than competing for
 * space with those three.
 */
export default function InventoryManagerScreen({ navigation }: any) {
  const { user } = useAuth();

  // --- Workspace & staff sharing (unchanged behavior, moved into More tools) ---
  const [workspaceOwnerId, setWorkspaceOwnerId] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [inviteInput, setInviteInput] = useState("");
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const loadWorkspace = async () => {
    try {
      const sharedId = await AsyncStorage.getItem("shared_business_owner_id");
      setWorkspaceOwnerId(sharedId || user?.id || "");
      if (sharedId) setInviteInput(sharedId);
    } catch (err) {
      console.warn("Failed to read workspace owner id:", err);
    }
  };
  useEffect(() => {
    loadWorkspace();
  }, [user]);

  const { isLive } = useInventoryRealtime(workspaceOwnerId);

  // --- Business-type gate: first time here with no business type set, send
  // the user to pick one (and seed starter categories) before anything else. ---
  const { businessType, isLoading: profileLoading } = useBusinessProfile();
  useEffect(() => {
    if (!profileLoading && !businessType) {
      navigation.replace("BusinessTypeSetup");
    }
  }, [profileLoading, businessType]);

  // --- Search & filter ---
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "low" | "out">("all");

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchText), 500);
    return () => clearTimeout(handler);
  }, [searchText]);

  const { data: dashboardData, refetch: refetchDashboard } = useInventoryDashboard();
  const {
    data: products = [],
    isLoading: listLoading,
    isFetching: listFetching,
    refetch: refetchProducts,
  } = useProducts(0, LIMIT, undefined, debouncedSearch);
  const { data: categories = [] } = useCategories();
  const { mutate: deleteProduct } = useDeleteProduct();

  const filteredProducts = useMemo(() => {
    if (stockFilter === "all") return products;
    return products.filter((p) => {
      const qty = p.total_quantity_on_hand ?? p.quantity_on_hand ?? 0;
      const min = p.minimum_stock_level ?? 10;
      if (stockFilter === "out") return qty <= 0;
      return qty > 0 && qty <= min;
    });
  }, [products, stockFilter]);

  const metrics = useMemo(() => {
    let stockValueKobo = 0;
    let outOfStock = 0;
    let lowStock = 0;
    products.forEach((p) => {
      const qty = p.total_quantity_on_hand ?? p.quantity_on_hand ?? 0;
      stockValueKobo += qty * (p.cost_price_kobo ?? 0);
      if (qty <= 0) outOfStock++;
      else if (qty <= (p.minimum_stock_level ?? 10)) lowStock++;
    });
    return {
      stockValueKobo: stockValueKobo || dashboardData?.total_inventory_value_kobo || 0,
      alerts: outOfStock + lowStock,
      totalItems: products.length,
    };
  }, [products, dashboardData]);

  // Grouped by category — the "insightful" view: each section shows what the
  // category holds and what it's worth, not just a flat row-per-product list.
  const rows: ListRow[] = useMemo(() => {
    const byCategory = new Map<string, Product[]>();
    filteredProducts.forEach((p) => {
      const key = p.category_id || "uncategorized";
      if (!byCategory.has(key)) byCategory.set(key, []);
      byCategory.get(key)!.push(p);
    });

    const groups = Array.from(byCategory.entries()).map(([key, items]) => {
      const category = key === "uncategorized" ? null : categories.find((c) => c.id === key) || null;
      const value = items.reduce(
        (sum, p) => sum + (p.total_quantity_on_hand ?? p.quantity_on_hand ?? 0) * (p.cost_price_kobo ?? 0),
        0
      );
      return { key, category, items, value };
    });
    groups.sort((a, b) => (a.category?.name || "zzz Uncategorized").localeCompare(b.category?.name || "zzz Uncategorized"));

    const out: ListRow[] = [];
    groups.forEach((g) => {
      out.push({ type: "header", id: `h-${g.key}`, category: g.category, count: g.items.length, value: g.value });
      g.items.forEach((p) => out.push({ type: "product", id: p.id, product: p }));
    });
    return out;
  }, [filteredProducts, categories]);

  const resolveDefaultStoreId = async (): Promise<string> => {
    const stores = await inventoryService.getStores().catch(() => []);
    return stores[0]?.id ?? "default_store";
  };

  const handleOpenStockAudit = async () => {
    setToolsOpen(false);
    const storeId = await resolveDefaultStoreId();
    navigation.navigate("InventoryReconciliation", { storeId });
  };

  const handleOpenTradeDesk = async () => {
    setToolsOpen(false);
    const storeId = await resolveDefaultStoreId();
    navigation.navigate("TradeOrder", { storeId });
  };

  const handleOpenRetailPOS = async () => {
    setToolsOpen(false);
    const storeId = await resolveDefaultStoreId();
    navigation.navigate("RetailPOS", { storeId });
  };

  const handleConnectWorkspace = async () => {
    if (!inviteInput.trim()) return;
    try {
      await AsyncStorage.setItem("shared_business_owner_id", inviteInput.trim());
      await loadWorkspace();
      refetchProducts();
      refetchDashboard();
      setShareModalOpen(false);
    } catch {
      // no-op: transient AsyncStorage failure, user can retry
    }
  };

  const handleDisconnectWorkspace = async () => {
    try {
      await AsyncStorage.removeItem("shared_business_owner_id");
      await loadWorkspace();
      refetchProducts();
      refetchDashboard();
      setShareModalOpen(false);
      setInviteInput("");
    } catch {
      // no-op
    }
  };

  const handleCopyBusinessId = () => {
    if (!user?.id) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportCSV = async () => {
    setToolsOpen(false);
    setExporting(true);
    try {
      const csv = await inventoryService.exportProductsCsv();
      await shareCsv(csv, `inventory-${new Date().toISOString().slice(0, 10)}.csv`);
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteProduct = (id: string, name: string) => {
    Alert.alert("Delete product?", `Remove "${name}" from your catalog?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteProduct(id) },
    ]);
  };

  if (profileLoading || !businessType) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator size="large" color={colors.ventureroot.green} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom", "left", "right"]}>
      <AppHeader
        title="Inventory"
        subtitle={isLive ? "Live sync" : "Offline"}
        variant="green"
        showBack={false}
        rightAction={
          <TouchableOpacity
            onPress={() => setToolsOpen(true)}
            style={styles.headerMoreBtn}
            accessibilityLabel="More tools"
          >
            <MoreHorizontal size={20} color="white" />
          </TouchableOpacity>
        }
      />

      <View style={styles.searchRow}>
        <Search size={16} color="#9CA3AF" />
        <TextInput
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Search product or code"
          style={styles.searchInput}
        />
      </View>

      <View style={styles.scrollContainer}>
        <FlashList
          data={rows}
          keyExtractor={(r) => r.id}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshing={listFetching && !listLoading}
          onRefresh={() => {
            refetchProducts();
            refetchDashboard();
          }}
          ListHeaderComponent={
            <>
              {/* Stock health — the two numbers a business owner checks first */}
              <View style={styles.healthRow}>
                <View style={styles.healthCard}>
                  <Text style={styles.healthLabel}>Stock value</Text>
                  <Text style={styles.healthValue}>
                    ₦{Math.round(metrics.stockValueKobo / 100).toLocaleString()}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.healthCard, metrics.alerts > 0 && styles.healthCardAlert]}
                  onPress={() => navigation.navigate("LowStockAlerts", {})}
                >
                  <Text style={[styles.healthLabel, metrics.alerts > 0 && styles.healthLabelAlert]}>
                    Needs attention
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text style={[styles.healthValue, metrics.alerts > 0 && styles.healthValueAlert]}>
                      {metrics.alerts} item{metrics.alerts === 1 ? "" : "s"}
                    </Text>
                    <ChevronRight size={16} color={metrics.alerts > 0 ? "#92400E" : "#9CA3AF"} />
                  </View>
                </TouchableOpacity>
              </View>

              {/* Quick actions — the four things done every day */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.quickRow}
              >
                {[
                  { label: "Add product", icon: Plus, onPress: () => navigation.navigate("AddProduct") },
                  { label: "Receive", icon: ArrowDownToLine, onPress: () => navigation.navigate("ReceiveStock") },
                  { label: "Issue", icon: ArrowUpFromLine, onPress: () => navigation.navigate("IssueStock") },
                  { label: "Voice", icon: Mic, onPress: () => navigation.navigate("VoiceStock") },
                  { label: "Scan", icon: ScanLine, onPress: () => navigation.navigate("ScanShelve") },
                ].map((a) => (
                  <TouchableOpacity key={a.label} onPress={a.onPress} style={styles.quickBtn}>
                    <View style={styles.quickIcon}>
                      <a.icon size={17} color="#004D2C" strokeWidth={2} />
                    </View>
                    <Text style={styles.quickLabel}>{a.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Filter chips */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterRow}
              >
                {[
                  { id: "all" as const, label: `All (${metrics.totalItems})` },
                  { id: "low" as const, label: "Low stock" },
                  { id: "out" as const, label: "Out of stock" },
                ].map((f) => (
                  <TouchableOpacity
                    key={f.id}
                    onPress={() => setStockFilter(f.id)}
                    style={[styles.filterChip, stockFilter === f.id && styles.filterChipActive]}
                  >
                    <Text
                      style={[styles.filterChipText, stockFilter === f.id && styles.filterChipTextActive]}
                    >
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          }
          renderItem={({ item }) => {
            if (item.type === "header") {
              const Icon = getCategoryIconComponent(item.category?.icon);
              const tint = item.category?.tint || DEFAULT_CATEGORY_TINT;
              return (
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionIcon, { backgroundColor: tint + "1A" }]}>
                    <Icon size={14} color={tint} strokeWidth={2} />
                  </View>
                  <Text style={styles.sectionTitle}>{item.category?.name || "Uncategorized"}</Text>
                  <Text style={styles.sectionMeta}>
                    {item.count} · ₦{Math.round(item.value / 100).toLocaleString()}
                  </Text>
                </View>
              );
            }

            const p = item.product;
            const qty = p.total_quantity_on_hand ?? p.quantity_on_hand ?? 0;
            const min = p.minimum_stock_level ?? 10;
            const isOut = qty <= 0;
            const isLow = !isOut && qty <= min;
            const statusColor = isOut ? colors.status.danger : isLow ? colors.status.warning : colors.status.success;
            const statusLabel = isOut ? "Out of stock" : isLow ? "Low stock" : "In stock";
            const value = qty * (p.cost_price_kobo ?? 0);

            return (
              <TouchableOpacity
                style={styles.productRow}
                onPress={() => navigation.navigate("ProductDetail", { productId: p.id })}
                activeOpacity={0.7}
              >
                <View style={styles.productMain}>
                  <Text style={styles.productName} numberOfLines={1}>
                    {p.name}
                  </Text>
                  <View style={styles.productStockLine}>
                    <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                    <Text style={[styles.statusText, { color: statusColor }]} numberOfLines={1}>
                      {qty.toLocaleString()} · {statusLabel}
                    </Text>
                  </View>
                </View>
                <View style={styles.productValueCol}>
                  <Text style={styles.productPrice}>₦{(p.selling_price_kobo / 100).toLocaleString()}</Text>
                  <Text style={styles.productValue}>₦{Math.round(value / 100).toLocaleString()} value</Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleDeleteProduct(p.id, p.name)}
                  style={styles.deleteBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel={`Delete ${p.name}`}
                >
                  <Trash2 size={15} color={colors.status.danger} />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            listLoading ? (
              <ActivityIndicator size="large" color={colors.ventureroot.green} style={{ marginTop: 40 }} />
            ) : (
              <View style={styles.emptyState}>
                <Package size={40} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>No products yet</Text>
                <Text style={styles.emptySubtitle}>
                  Add your first product, or use Voice or Scan above to get started fast.
                </Text>
              </View>
            )
          }
        />
      </View>

      {/* More tools — everything that isn't the daily add/view flow */}
      <Modal animationType="slide" transparent visible={toolsOpen} onRequestClose={() => setToolsOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>More tools</Text>
              <TouchableOpacity onPress={() => setToolsOpen(false)}>
                <X size={20} color="#1A1A1A" />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 8 }}>
              {[
                { label: "Categories", icon: Tags, onPress: () => { setToolsOpen(false); navigation.navigate("Categories"); } },
                { label: "Business type", icon: StoreIcon, onPress: () => { setToolsOpen(false); navigation.navigate("BusinessTypeSetup"); } },
                { label: "Daily report", icon: ClipboardList, onPress: () => { setToolsOpen(false); navigation.navigate("DailyReport"); } },
                { label: "Register (full view)", icon: FileSpreadsheet, onPress: () => { setToolsOpen(false); navigation.navigate("InventoryRegister"); } },
                { label: "Trade order desk", icon: Truck, onPress: handleOpenTradeDesk },
                { label: "Retail POS", icon: ShoppingCart, onPress: handleOpenRetailPOS },
                { label: "Stock audit / count", icon: ClipboardCheck, onPress: handleOpenStockAudit },
                { label: "Staff activity", icon: Shield, onPress: () => { setToolsOpen(false); navigation.navigate("StaffActivity"); } },
                { label: exporting ? "Exporting…" : "Export CSV", icon: Download, onPress: handleExportCSV, disabled: exporting },
                { label: "Share workspace with staff", icon: Users, onPress: () => { setToolsOpen(false); setShareModalOpen(true); } },
              ].map((tool) => (
                <TouchableOpacity
                  key={tool.label}
                  style={styles.toolRow}
                  onPress={tool.onPress}
                  disabled={tool.disabled}
                >
                  <View style={styles.toolIcon}>
                    <tool.icon size={18} color="#004D2C" />
                  </View>
                  <Text style={styles.toolLabel}>{tool.label}</Text>
                  <ChevronRight size={16} color="#D1D5DB" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Workspace & staff sharing */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={shareModalOpen}
        onRequestClose={() => setShareModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalContent}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Workspace & Staff Sharing</Text>
              <TouchableOpacity onPress={() => setShareModalOpen(false)}>
                <X size={20} color="#1A1A1A" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              <View style={styles.modalCard}>
                <Text style={styles.cardSectionTitle}>Share Your Workspace</Text>
                <Text style={styles.cardDesc}>
                  Provide this unique Business Code to your staff. They can enter it on their devices to
                  access and update your inventory in real-time.
                </Text>
                <View style={styles.codeShareBox}>
                  <Text style={styles.businessIdCode} numberOfLines={1}>
                    {user?.id}
                  </Text>
                  <TouchableOpacity style={styles.copyBtn} onPress={handleCopyBusinessId}>
                    {copied ? <Check size={18} color="#10B981" /> : <Copy size={18} color="#004D2C" />}
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.modalCard}>
                <Text style={styles.cardSectionTitle}>Connect to Business Owner</Text>
                <Text style={styles.cardDesc}>
                  Enter the Business Code shared by your manager/business owner below to join their catalog
                  workspace.
                </Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Paste Business Owner UUID here..."
                  value={inviteInput}
                  onChangeText={setInviteInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <View style={styles.modalBtnRow}>
                  <TouchableOpacity
                    style={[styles.modalActionBtn, styles.modalConnectBtn]}
                    onPress={handleConnectWorkspace}
                  >
                    <Text style={styles.modalConnectBtnText}>Connect Workspace</Text>
                  </TouchableOpacity>
                  {workspaceOwnerId !== user?.id && (
                    <TouchableOpacity
                      style={[styles.modalActionBtn, styles.modalDisconnectBtn]}
                      onPress={handleDisconnectWorkspace}
                    >
                      <Text style={styles.modalDisconnectBtnText}>Disconnect</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  headerMoreBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: "#111827",
  },
  scrollContainer: {
    flex: 1,
  },
  healthRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  healthCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
  },
  healthCardAlert: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
  },
  healthLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  healthLabelAlert: {
    color: "#92400E",
  },
  healthValue: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
  },
  healthValueAlert: {
    color: "#92400E",
  },
  quickRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  quickBtn: {
    alignItems: "center",
    width: 72,
  },
  quickIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#E1F5EE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  quickLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#374151",
    textAlign: "center",
  },
  filterRow: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  filterChipActive: {
    backgroundColor: "#004D2C",
    borderColor: "#004D2C",
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#F8F9FA",
  },
  sectionIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },
  sectionMeta: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9CA3AF",
  },
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderColor: "#F3F4F6",
  },
  productMain: {
    flex: 1.6,
    paddingRight: 8,
  },
  productName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  productStockLine: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  productValueCol: {
    alignItems: "flex-end",
    marginRight: 10,
  },
  productPrice: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },
  productValue: {
    fontSize: 10,
    color: "#9CA3AF",
    marginTop: 2,
  },
  deleteBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background.coral,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 6,
  },
  toolRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 14,
  },
  toolIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#E1F5EE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  toolLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1A1A1A",
  },
  modalBody: {
    padding: 20,
    gap: 16,
  },
  modalCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cardSectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#004D2C",
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 12,
    color: "#6B7280",
    lineHeight: 18,
    marginBottom: 12,
  },
  codeShareBox: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingLeft: 12,
    alignItems: "center",
  },
  businessIdCode: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
    flex: 1,
  },
  copyBtn: {
    padding: 12,
    borderLeftWidth: 1,
    borderLeftColor: "#E5E7EB",
  },
  modalInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    marginBottom: 12,
  },
  modalBtnRow: {
    flexDirection: "row",
    gap: 10,
  },
  modalActionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalConnectBtn: {
    backgroundColor: "#004D2C",
  },
  modalConnectBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  modalDisconnectBtn: {
    backgroundColor: "#FCEBEB",
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  modalDisconnectBtnText: {
    color: "#A32D2D",
    fontWeight: "700",
    fontSize: 14,
  },
});
