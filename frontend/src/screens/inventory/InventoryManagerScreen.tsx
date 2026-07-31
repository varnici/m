import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Share,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlashList } from "@shopify/flash-list";
import Toast from "react-native-toast-message";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Mic,
  MicOff,
  ScanLine,
  Share2,
  Trash2,
  Plus,
  Download,
  AlertTriangle,
  RefreshCw,
  X,
  Copy,
  Users,
  Check,
  Package,
  Activity,
  Layers,
  ArrowUpDown,
  Shield,
  ClipboardCheck,
  Truck,
  ShoppingCart,
  Tags,
  Store as StoreIcon,
  ArrowDownToLine,
  ArrowUpFromLine,
  ClipboardList,
  FileSpreadsheet,
} from "lucide-react-native";

import { colors } from "@/theme/colors";
import { useAuth } from "@/context/AuthContext";
import {
  useProducts,
  useCreateProduct,
  useDeleteProduct,
  useInventoryDashboard,
  useInventoryRealtime,
} from "@/hooks/useInventory";
import {
  useInventoryManagerStore,
  InputMode,
  VoiceState,
} from "@/store/inventoryManagerStore";
import {
  InventoryTableHeader,
  InventoryTableRow,
} from "@/components/inventory/InventoryTable";
import { CategoryPicker } from "@/components/inventory/CategoryPicker";
import { voiceInventoryParser } from "@/services/voiceInventoryParser";
import BarcodeScanner from "@/components/BarcodeScanner";
import { inventoryService } from "@/services/inventoryService";
import AppHeader from "@/components/ui/AppHeader";

const LIMIT = 50;

export default function InventoryManagerScreen({ navigation }: any) {
  const { user } = useAuth();

  // --- Workspace & Share States ---
  const [workspaceOwnerId, setWorkspaceOwnerId] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [inviteInput, setInviteInput] = useState<string>("");

  // Load the active workspace scope
  const loadWorkspace = async () => {
    try {
      const sharedId = await AsyncStorage.getItem("shared_business_owner_id");
      setWorkspaceOwnerId(sharedId || user?.id || "");
      if (sharedId) {
        setInviteInput(sharedId);
      }
    } catch (err) {
      console.warn("Failed to read workspace owner id:", err);
    }
  };

  useEffect(() => {
    loadWorkspace();
  }, [user]);

  // Real-time synchronization subscription
  const { isLive } = useInventoryRealtime(workspaceOwnerId);

  // --- Local UI States ---
  const [skip, setSkip] = useState<number>(0);
  const [productsList, setProductsList] = useState<any[]>([]);

  // --- Zustand Store State ---
  const {
    inputMode,
    setInputMode,
    form,
    setField,
    resetForm,
    voiceState,
    setVoiceState,
    voiceTranscript,
    setVoiceTranscript,
    parsedVoice,
    setParsedVoice,
    resetVoice,
    searchText,
    setSearchText,
    stockFilter,
    setStockFilter,
    sortKey,
    setSortKey,
    shareModalOpen,
    setShareModalOpen,
  } = useInventoryManagerStore();

  // Debounced Search Text
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchText);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchText]);

  // Reset pagination on filter or search change
  useEffect(() => {
    setSkip(0);
  }, [debouncedSearch, stockFilter, sortKey]);

  // --- API / React Query ---
  const { data: dashboardData, refetch: refetchDashboard } =
    useInventoryDashboard(undefined, undefined, undefined);

  const {
    data: productsPage,
    isLoading: listLoading,
    isFetching: listFetching,
    refetch: refetchProducts,
  } = useProducts(skip, LIMIT, undefined, debouncedSearch);

  // Append items on infinite scroll
  useEffect(() => {
    if (productsPage) {
      if (skip === 0) {
        setProductsList(productsPage);
      } else {
        setProductsList((prev) => {
          const newItems = productsPage.filter(
            (item) => !prev.some((p) => p.id === item.id),
          );
          return [...prev, ...newItems];
        });
      }
    }
  }, [productsPage, skip]);

  const computedMetrics = useMemo(() => {
    const totalItems = productsList.length;
    let stockValue = 0;
    let outOfStockCount = 0;
    let lowStockCount = 0;
    let totalSold = 0;
    let totalActualProfit = 0;
    let totalCreditOutstanding = 0;

    productsList.forEach((p) => {
      const qty = p.total_quantity_on_hand ?? p.quantity_on_hand ?? 0;
      const cost = (p.cost_price_kobo ?? 0) / 100;
      const sell = (p.selling_price_kobo ?? 0) / 100;
      const expenses = (p.expenses_kobo ?? 0) / 100;
      const sold = p.quantity_sold ?? 0;
      const onCredit = p.quantity_on_credit ?? 0;

      stockValue += qty * cost;
      totalSold += sold;
      totalActualProfit += (sell - cost) * sold - expenses;
      totalCreditOutstanding += sell * onCredit;

      if (qty <= 0) {
        outOfStockCount++;
      } else if (qty <= (p.minimum_stock_level ?? 10)) {
        lowStockCount++;
      }
    });

    return {
      totalItems,
      stockValue,
      alertsCount: outOfStockCount + lowStockCount,
      unitsSold: totalSold || (dashboardData?.sales_velocity_30d ?? 0),
      actualProfit:
        totalActualProfit || (dashboardData?.total_profit_kobo ?? 0) / 100,
      creditOutstanding: totalCreditOutstanding,
    };
  }, [productsList, dashboardData]);

  // --- Filtering & Sorting Local Logic ---
  const processedProducts = useMemo(() => {
    let list = [...productsList];

    // Status filter
    if (stockFilter === "out") {
      list = list.filter(
        (p) => (p.total_quantity_on_hand ?? p.quantity_on_hand ?? 0) <= 0,
      );
    } else if (stockFilter === "low") {
      list = list.filter(
        (p) =>
          (p.total_quantity_on_hand ?? p.quantity_on_hand ?? 0) > 0 &&
          (p.total_quantity_on_hand ?? p.quantity_on_hand ?? 0) <=
            (p.minimum_stock_level ?? 10),
      );
    } else if (stockFilter === "ok") {
      list = list.filter(
        (p) =>
          (p.total_quantity_on_hand ?? p.quantity_on_hand ?? 0) >
          (p.minimum_stock_level ?? 10),
      );
    }

    // Sort
    if (sortKey === "name") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortKey === "qty") {
      list.sort(
        (a, b) =>
          (b.total_quantity_on_hand ?? b.quantity_on_hand ?? 0) -
          (a.total_quantity_on_hand ?? a.quantity_on_hand ?? 0),
      );
    } else if (sortKey === "profit") {
      list.sort((a, b) => {
        const profitA = (a.selling_price_kobo - a.cost_price_kobo) / 100;
        const profitB = (b.selling_price_kobo - b.cost_price_kobo) / 100;
        return profitB - profitA;
      });
    } else if (sortKey === "date") {
      list.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    }

    return list;
  }, [productsList, stockFilter, sortKey]);

  // --- CRUD Mutations ---
  const { mutate: createProduct, isPending: createPending } =
    useCreateProduct();
  const { mutate: deleteProduct } = useDeleteProduct();

  const handleManualSave = () => {
    if (
      !form.name.trim() ||
      !form.costPrice ||
      !form.sellPrice ||
      !form.quantity
    ) {
      Toast.show({
        type: "error",
        text1: "Missing Fields",
        text2: "Please fill in product name, prices, and quantity.",
      });
      return;
    }

    const costKobo = Math.round(parseFloat(form.costPrice) * 100);
    const sellKobo = Math.round(parseFloat(form.sellPrice) * 100);
    const expensesKobo = Math.round(parseFloat(form.expenses || "0") * 100);
    const qty = parseInt(form.quantity, 10);
    const sold = parseInt(form.sold || "0", 10);
    const onCredit = parseInt(form.onCredit || "0", 10);
    const reorder = parseInt(form.reorderLevel, 10) || 10;

    if (isNaN(costKobo) || isNaN(sellKobo) || isNaN(qty)) {
      Toast.show({
        type: "error",
        text1: "Invalid inputs",
        text2: "Ensure quantity and prices are numbers.",
      });
      return;
    }

    if (costKobo < 0 || sellKobo < 0) {
      Toast.show({
        type: "error",
        text1: "Invalid prices",
        text2: "Prices cannot be negative.",
      });
      return;
    }

    if (onCredit > qty) {
      Toast.show({
        type: "error",
        text1: "Credit exceeds stock",
        text2: "Items on credit cannot exceed total quantity.",
      });
      return;
    }

    if (sold < 0 || onCredit < 0) {
      Toast.show({
        type: "error",
        text1: "Invalid quantity",
        text2: "Sold and credit quantities cannot be negative.",
      });
      return;
    }

    const payload = {
      name: form.name.trim(),
      sku: `PRD-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      category_id: form.category || undefined,
      cost_price_kobo: costKobo,
      selling_price_kobo: sellKobo,
      quantity_on_hand: qty,
      minimum_stock_level: reorder,
      unit_of_measure: form.pack.trim() || "Piece",
      expenses_kobo: expensesKobo,
      quantity_sold: sold,
      quantity_on_credit: onCredit,
      is_active: true,
    };

    createProduct(payload, {
      onSuccess: () => {
        resetForm();
        setSkip(0);
        refetchProducts();
        refetchDashboard();
        Toast.show({ type: "success", text1: "Product Added Successfully" });
      },
    });
  };

  const handleDelete = (productId: string) => {
    deleteProduct(productId, {
      onSuccess: () => {
        setSkip(0);
        refetchProducts();
        refetchDashboard();
      },
    });
  };

  const handleRowPress = (productId: string) => {
    navigation.navigate("ProductDetail", { productId });
  };

  // --- Voice Integration ---
  const handleStartVoice = async () => {
    try {
      resetVoice();
      setVoiceState("listening");
      await voiceInventoryParser.startRecording();
    } catch (err: any) {
      setVoiceState("error");
      Toast.show({
        type: "error",
        text1: "Voice Capture Failed",
        text2: err.message,
      });
    }
  };

  const handleStopVoice = async () => {
    setVoiceState("processing");
    try {
      let storeId = "default_store";
      const stores = await inventoryService.getStores().catch(() => []);
      if (stores.length > 0) storeId = stores[0].id;

      const { transcript, product } =
        await voiceInventoryParser.stopAndParse(storeId);
      setVoiceTranscript(transcript);
      setParsedVoice(product);
      setVoiceState("parsed");
    } catch (err: any) {
      setVoiceState("error");
      Toast.show({
        type: "error",
        text1: "Voice Processing Failed",
        text2: err.message,
      });
    }
  };

  const handleApplyVoiceProduct = () => {
    if (!parsedVoice) return;

    const payload = {
      name: parsedVoice.name,
      sku: `PRD-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      cost_price_kobo: Math.round(parsedVoice.costPrice * 100),
      selling_price_kobo: Math.round(parsedVoice.sellPrice * 100),
      quantity_on_hand: parsedVoice.quantity,
      minimum_stock_level: parsedVoice.reorderLevel,
      unit_of_measure: parsedVoice.pack.toLowerCase(),
      is_active: true,
    };

    createProduct(payload, {
      onSuccess: () => {
        resetVoice();
        setSkip(0);
        refetchProducts();
        refetchDashboard();
        Toast.show({ type: "success", text1: "Voice product added!" });
      },
    });
  };

  // --- Barcode Scan Integration ---
  const handleBarcodeScanned = async (barcode: string) => {
    let storeId = "default_store";
    try {
      const stores = await inventoryService.getStores();
      if (stores.length > 0) storeId = stores[0].id;
    } catch {
      // fallback
    }

    try {
      const existingProduct = await inventoryService.scanBarcode(
        barcode,
        storeId,
      );
      if (existingProduct?.id) {
        // Record stock increment movement
        await inventoryService.recordStockMovement({
          product_id: existingProduct.id,
          to_store_id: storeId,
          movement_type: "purchase",
          quantity: 1,
        });
        Toast.show({
          type: "success",
          text1: "Stock updated",
          text2: `+1 added to ${existingProduct.name}`,
        });
        setSkip(0);
        refetchProducts();
        refetchDashboard();
      } else {
        // Redirect to register screen
        Toast.show({
          type: "info",
          text1: "Barcode unknown",
          text2: "Let's register this new product.",
        });
        navigation.navigate("AddProduct", { barcode });
      }
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Scan lookup failed",
        text2: err.message,
      });
    }
  };

  // --- CSV Export ---
  const handleExportCSV = () => {
    const headers =
      "SKU,Product Name,Category,Quantity,Pack,Cost Price (₦),Selling Price (₦),Expenses (₦),Sold,On Credit,Expected Profit (₦),Actual Profit (₦),Credit Outstanding (₦),Status\n";
    const rows = productsList
      .map((p) => {
        const qty = p.total_quantity_on_hand ?? p.quantity_on_hand ?? 0;
        const cost = (p.cost_price_kobo ?? 0) / 100;
        const sell = (p.selling_price_kobo ?? 0) / 100;
        const expenses = (p.expenses_kobo ?? 0) / 100;
        const sold = p.quantity_sold ?? 0;
        const onCredit = p.quantity_on_credit ?? 0;
        const expectedProfit = (sell - cost) * qty - expenses;
        const actualProfit = (sell - cost) * sold - expenses;
        const creditOwed = sell * onCredit;
        const status =
          qty <= 0
            ? "Out of Stock"
            : qty <= (p.minimum_stock_level ?? 10)
              ? "Low Stock"
              : "In Stock";
        return `"${p.sku}","${p.name.replace(/"/g, '""')}","${p.category_id || "General"}",${qty},"${p.unit_of_measure || "Piece"}",${cost.toFixed(2)},${sell.toFixed(2)},${expenses.toFixed(2)},${sold},${onCredit},${expectedProfit.toFixed(2)},${actualProfit.toFixed(2)},${creditOwed.toFixed(2)},"${status}"`;
      })
      .join("\n");

    Share.share({
      message: headers + rows,
      title: "Inventory_Manager_Export.csv",
    }).catch((err) => {
      console.error("CSV Export Error:", err);
    });
  };

  // --- Stock Audit / Trade Desk entry points ---
  const resolveDefaultStoreId = async (): Promise<string> => {
    const stores = await inventoryService.getStores().catch(() => []);
    return stores[0]?.id ?? "default_store";
  };

  const handleOpenStockAudit = async () => {
    const storeId = await resolveDefaultStoreId();
    navigation.navigate("InventoryReconciliation", { storeId });
  };

  const handleOpenTradeDesk = async () => {
    const storeId = await resolveDefaultStoreId();
    navigation.navigate("TradeOrder", { storeId });
  };

  const handleOpenRetailPOS = async () => {
    const storeId = await resolveDefaultStoreId();
    navigation.navigate("RetailPOS", { storeId });
  };

  // --- Staff Workspace Joining ---
  const handleConnectWorkspace = async () => {
    if (!inviteInput.trim()) return;
    try {
      await AsyncStorage.setItem(
        "shared_business_owner_id",
        inviteInput.trim(),
      );
      await loadWorkspace();
      setSkip(0);
      refetchProducts();
      refetchDashboard();
      setShareModalOpen(false);
      Toast.show({ type: "success", text1: "Connected to shared workspace" });
    } catch (err) {
      Toast.show({ type: "error", text1: "Connection failed" });
    }
  };

  const handleDisconnectWorkspace = async () => {
    try {
      await AsyncStorage.removeItem("shared_business_owner_id");
      await loadWorkspace();
      setSkip(0);
      refetchProducts();
      refetchDashboard();
      setShareModalOpen(false);
      setInviteInput("");
      Toast.show({ type: "success", text1: "Disconnected workspace" });
    } catch (err) {
      Toast.show({ type: "error", text1: "Disconnection failed" });
    }
  };

  const handleCopyBusinessId = () => {
    if (!user?.id) return;
    Share.share({ message: user.id });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const loadMoreProducts = () => {
    if (!listFetching && productsPage && productsPage.length === LIMIT) {
      setSkip((prev) => prev + LIMIT);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom", "left", "right"]}>
      <AppHeader title="Inventory Manager" />
      {/* 1. Header Bar */}
      <View style={styles.header}>
        <View style={styles.headerTitleSection}>
          <Text style={styles.headerTitle}>Inventory Manager</Text>
          <View
            style={[
              styles.statusIndicatorBadge,
              { backgroundColor: isLive ? "#E1F5EE" : "#F1F5F9" },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isLive ? "#10B981" : "#6B7280" },
              ]}
            />
            <Text
              style={[
                styles.statusBadgeText,
                { color: isLive ? "#085041" : "#475569" },
              ]}
            >
              {isLive ? "LIVE SYNC" : "OFFLINE"}
            </Text>
          </View>
        </View>

        <View style={styles.headerActionRow}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => navigation.navigate("StaffActivity")}
            accessibilityLabel="Staff Activity & Sales Integrity"
          >
            <Shield size={20} color="#004D2C" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerBtn, { marginLeft: 8 }]}
            onPress={handleExportCSV}
            accessibilityLabel="Export CSV"
          >
            <Download size={20} color="#004D2C" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerBtn, { marginLeft: 8 }]}
            onPress={() => setShareModalOpen(true)}
            accessibilityLabel="Staff Sharing Settings"
          >
            <Users size={20} color="#004D2C" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerBtn, { marginLeft: 8 }]}
            onPress={handleOpenStockAudit}
            accessibilityLabel="Stock Audit"
          >
            <ClipboardCheck size={20} color="#004D2C" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerBtn, { marginLeft: 8 }]}
            onPress={handleOpenTradeDesk}
            accessibilityLabel="Trade Order Desk"
          >
            <Truck size={20} color="#004D2C" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerBtn, { marginLeft: 8 }]}
            onPress={handleOpenRetailPOS}
            accessibilityLabel="Retail POS"
          >
            <ShoppingCart size={20} color="#004D2C" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.scrollContainer}>
        <InventoryTableHeader />
        <FlashList
          data={processedProducts}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <>
              {/* 2. Metrics Ribbon */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.metricsContainer}
              >
                <View style={styles.metricCard}>
                  <Package size={18} color="#004D2C" />
                  <Text style={styles.metricValue}>
                    {computedMetrics.totalItems}
                  </Text>
                  <Text style={styles.metricLabel}>Total Products</Text>
                </View>
                <View style={styles.metricCard}>
                  <Activity size={18} color="#FFCC00" />
                  <Text style={styles.metricValue}>
                    ₦{Math.round(computedMetrics.stockValue).toLocaleString()}
                  </Text>
                  <Text style={styles.metricLabel}>Stock Value</Text>
                </View>
                <View style={styles.metricCard}>
                  <Layers size={18} color="#10B981" />
                  <Text style={styles.metricValue}>
                    {computedMetrics.unitsSold.toLocaleString()}
                  </Text>
                  <Text style={styles.metricLabel}>Total Sold</Text>
                </View>
                <View style={styles.metricCard}>
                  <Activity
                    size={18}
                    color={
                      computedMetrics.actualProfit >= 0 ? "#10B981" : "#A32D2D"
                    }
                  />
                  <Text
                    style={[
                      styles.metricValue,
                      {
                        color:
                          computedMetrics.actualProfit >= 0
                            ? "#10B981"
                            : "#A32D2D",
                      },
                    ]}
                  >
                    ₦{Math.round(computedMetrics.actualProfit).toLocaleString()}
                  </Text>
                  <Text style={styles.metricLabel}>Actual Profit</Text>
                </View>
                {computedMetrics.creditOutstanding > 0 && (
                  <View style={[styles.metricCard, styles.creditMetricCard]}>
                    <AlertTriangle size={18} color="#BA7517" />
                    <Text style={[styles.metricValue, { color: "#BA7517" }]}>
                      ₦
                      {Math.round(
                        computedMetrics.creditOutstanding,
                      ).toLocaleString()}
                    </Text>
                    <Text style={styles.metricLabel}>Credit Owed</Text>
                  </View>
                )}
                {computedMetrics.alertsCount > 0 && (
                  <View style={[styles.metricCard, styles.alertMetricCard]}>
                    <AlertTriangle size={18} color="#A32D2D" />
                    <Text style={[styles.metricValue, { color: "#A32D2D" }]}>
                      {computedMetrics.alertsCount}
                    </Text>
                    <Text style={styles.metricLabel}>Low / Out Stock</Text>
                  </View>
                )}
              </ScrollView>

              {/* 2b. Quick access — categories, business type, stock movement, reports */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 4, gap: 8 }}
              >
                {[
                  { label: "Categories", icon: Tags, route: "Categories" },
                  { label: "Business type", icon: StoreIcon, route: "BusinessTypeSetup" },
                  { label: "Receive stock", icon: ArrowDownToLine, route: "ReceiveStock" },
                  { label: "Issue stock", icon: ArrowUpFromLine, route: "IssueStock" },
                  { label: "Daily report", icon: ClipboardList, route: "DailyReport" },
                  { label: "Register", icon: FileSpreadsheet, route: "InventoryRegister" },
                  { label: "Low stock & expiry", icon: AlertTriangle, route: "LowStockAlerts" },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.route}
                    onPress={() => navigation.navigate(item.route)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: "#FFFFFF",
                      borderWidth: 1,
                      borderColor: "#E5E7EB",
                      borderRadius: 14,
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                    }}
                  >
                    <item.icon size={15} color="#004D2C" />
                    <Text style={{ marginLeft: 6, fontSize: 12, fontWeight: "700", color: "#0F172A" }}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* 3. Action / Input Panel */}
              <View style={styles.inputSectionCard}>
                <View style={styles.inputSwitcherTabs}>
                  {(["manual", "voice", "scan"] as const).map((mode) => (
                    <TouchableOpacity
                      key={mode}
                      style={[
                        styles.switcherTab,
                        inputMode === mode && styles.switcherTabActive,
                      ]}
                      onPress={() => setInputMode(mode)}
                    >
                      <Text
                        style={[
                          styles.switcherTabText,
                          inputMode === mode && styles.switcherTabTextActive,
                        ]}
                      >
                        {mode.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Tab 1: Manual Form */}
                {inputMode === "manual" && (
                  <View style={styles.manualForm}>
                    <TextInput
                      style={styles.inputField}
                      placeholder="Product Name *"
                      value={form.name}
                      onChangeText={(val) => setField("name", val)}
                    />
                    <View style={styles.formRow}>
                      <View
                        style={[styles.rowInput, styles.categoryPickerWrap]}
                      >
                        <Text style={styles.fieldLabel}>Category</Text>
                        <CategoryPicker
                          selectedCategoryId={form.category || null}
                          onSelect={(categoryId) => setField("category", categoryId)}
                        />
                      </View>
                    </View>
                    <View style={styles.formRow}>
                      <TextInput
                        style={[styles.inputField, styles.rowInput]}
                        placeholder="Quantity *"
                        keyboardType="number-pad"
                        value={form.quantity}
                        onChangeText={(val) => setField("quantity", val)}
                      />
                      <TextInput
                        style={[styles.inputField, styles.rowInput]}
                        placeholder="Pack / Unit (e.g. Box, Dozen)"
                        value={form.pack}
                        onChangeText={(val) => setField("pack", val)}
                      />
                    </View>
                    <View style={styles.formRow}>
                      <TextInput
                        style={[styles.inputField, styles.rowInput]}
                        placeholder="Cost Price (₦) *"
                        keyboardType="decimal-pad"
                        value={form.costPrice}
                        onChangeText={(val) => setField("costPrice", val)}
                      />
                      <TextInput
                        style={[styles.inputField, styles.rowInput]}
                        placeholder="Selling Price (₦) *"
                        keyboardType="decimal-pad"
                        value={form.sellPrice}
                        onChangeText={(val) => setField("sellPrice", val)}
                      />
                    </View>
                    <View style={styles.formRow}>
                      <View style={styles.rowInput}>
                        <TextInput
                          style={styles.inputField}
                          placeholder="Expenses (₦)"
                          keyboardType="decimal-pad"
                          value={form.expenses}
                          onChangeText={(val) => setField("expenses", val)}
                        />
                        <Text style={styles.fieldHint}>
                          Transport, storage, etc.
                        </Text>
                      </View>
                      <TextInput
                        style={[styles.inputField, styles.rowInput]}
                        placeholder="Quantity Sold"
                        keyboardType="number-pad"
                        value={form.sold}
                        onChangeText={(val) => setField("sold", val)}
                      />
                    </View>
                    <View style={styles.formRow}>
                      <View style={styles.rowInput}>
                        <TextInput
                          style={styles.inputField}
                          placeholder="Reorder Level"
                          keyboardType="number-pad"
                          value={form.reorderLevel}
                          onChangeText={(val) => setField("reorderLevel", val)}
                        />
                        <Text style={styles.fieldHint}>
                          Alert when stock is low
                        </Text>
                      </View>
                      <View style={styles.rowInput}>
                        <TextInput
                          style={[styles.inputField, styles.creditInput]}
                          placeholder="Qty on Credit"
                          keyboardType="number-pad"
                          value={form.onCredit}
                          onChangeText={(val) => setField("onCredit", val)}
                        />
                        <Text style={styles.fieldHintCredit}>
                          Items given on credit (unpaid)
                        </Text>
                      </View>
                    </View>

                    {/* Live calculation preview */}
                    {form.costPrice && form.sellPrice && form.quantity ? (
                      <View style={styles.calcPreview}>
                        <View style={styles.calcRow}>
                          <Text style={styles.calcLabel}>Margin per unit</Text>
                          <Text style={styles.calcValue}>
                            ₦
                            {(
                              parseFloat(form.sellPrice || "0") -
                              parseFloat(form.costPrice || "0")
                            ).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </Text>
                        </View>
                        <View style={styles.calcRow}>
                          <Text style={styles.calcLabel}>Expected Profit</Text>
                          <Text
                            style={[styles.calcValue, styles.calcValueGreen]}
                          >
                            ₦
                            {(
                              (parseFloat(form.sellPrice || "0") -
                                parseFloat(form.costPrice || "0")) *
                                parseInt(form.quantity || "0", 10) -
                              parseFloat(form.expenses || "0")
                            ).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </Text>
                        </View>
                        {parseInt(form.onCredit || "0", 10) > 0 && (
                          <View style={styles.calcRow}>
                            <Text style={styles.calcLabel}>
                              Credit Outstanding
                            </Text>
                            <Text
                              style={[styles.calcValue, styles.calcValueAmber]}
                            >
                              ₦
                              {(
                                parseFloat(form.sellPrice || "0") *
                                parseInt(form.onCredit || "0", 10)
                              ).toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </Text>
                          </View>
                        )}
                      </View>
                    ) : null}

                    <View style={styles.formActions}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={handleManualSave}
                        disabled={createPending}
                      >
                        {createPending ? (
                          <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                          <>
                            <Plus size={18} color="#FFFFFF" />
                            <Text style={styles.actionButtonText}>
                              Add to Inventory
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.clearButton}
                        onPress={resetForm}
                      >
                        <RefreshCw size={16} color="#6B7280" />
                        <Text style={styles.clearButtonText}>Clear</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Tab 2: Voice Counting */}
                {inputMode === "voice" && (
                  <View style={styles.voiceConsole}>
                    <Text style={styles.voiceDescription}>
                      Speak naturally to count stock: E.g., "Add 50 bags of
                      sugar, cost 12000, selling 15000"
                    </Text>

                    {voiceState === "listening" && (
                      <Text style={styles.listeningText}>
                        Listening... speak now
                      </Text>
                    )}
                    {voiceState === "processing" && (
                      <ActivityIndicator color="#004D2C" size="small" />
                    )}
                    {voiceTranscript.length > 0 && (
                      <View style={styles.transcriptBox}>
                        <Text style={styles.transcriptLabel}>Transcript:</Text>
                        <Text style={styles.transcriptText}>
                          "{voiceTranscript}"
                        </Text>
                      </View>
                    )}

                    {voiceState === "parsed" && parsedVoice && (
                      <View style={styles.parsedPreview}>
                        <Text style={styles.previewTitle}>
                          Detected Product Details:
                        </Text>
                        <Text style={styles.previewText}>
                          Name: {parsedVoice.name}
                        </Text>
                        <Text style={styles.previewText}>
                          Quantity: {parsedVoice.quantity}
                        </Text>
                        <Text style={styles.previewText}>
                          Price: ₦{parsedVoice.costPrice} (cost) / ₦
                          {parsedVoice.sellPrice} (sell)
                        </Text>
                        <TouchableOpacity
                          style={styles.confirmVoiceBtn}
                          onPress={handleApplyVoiceProduct}
                        >
                          <Text style={styles.confirmVoiceBtnText}>
                            Confirm & Add Product
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    <View style={styles.voiceActionBtnRow}>
                      {voiceState === "listening" ? (
                        <TouchableOpacity
                          style={[styles.micBtn, styles.micBtnActive]}
                          onPress={handleStopVoice}
                        >
                          <MicOff size={32} color="#FFFFFF" />
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={styles.micBtn}
                          onPress={handleStartVoice}
                          disabled={voiceState === "processing"}
                        >
                          <Mic size={32} color="#FFFFFF" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                )}

                {/* Tab 3: Scanner */}
                {inputMode === "scan" && (
                  <View style={styles.scannerConsole}>
                    <Text style={styles.scanDescription}>
                      Point camera at the barcode. Stock increments by 1 unit
                      automatically.
                    </Text>
                    <View style={styles.scannerWrapper}>
                      <BarcodeScanner onBarcodeScanned={handleBarcodeScanned} />
                    </View>
                  </View>
                )}
              </View>

              {/* 4. Filters & Controls */}
              <View style={styles.controlsBar}>
                <TextInput
                  style={styles.searchField}
                  placeholder="Search items by name or SKU..."
                  value={searchText}
                  onChangeText={setSearchText}
                />

                <View style={styles.filterChipsRow}>
                  {(["", "ok", "low", "out"] as const).map((filter) => {
                    const label = filter === "" ? "ALL" : filter.toUpperCase();
                    return (
                      <TouchableOpacity
                        key={filter}
                        style={[
                          styles.filterChip,
                          stockFilter === filter && styles.filterChipActive,
                        ]}
                        onPress={() => setStockFilter(filter)}
                      >
                        <Text
                          style={[
                            styles.filterChipText,
                            stockFilter === filter &&
                              styles.filterChipTextActive,
                          ]}
                        >
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={styles.sortSelectionRow}>
                  <ArrowUpDown size={14} color="#6B7280" />
                  <Text style={styles.sortLabel}>Sort By:</Text>
                  {(["name", "qty", "profit", "date"] as const).map((key) => (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.sortChip,
                        sortKey === key && styles.sortChipActive,
                      ]}
                      onPress={() => setSortKey(key)}
                    >
                      <Text
                        style={[
                          styles.sortChipText,
                          sortKey === key && styles.sortChipTextActive,
                        ]}
                      >
                        {key.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </>
          }
          renderItem={({ item }) => (
            <InventoryTableRow
              item={item}
              onDelete={handleDelete}
              onPress={handleRowPress}
            />
          )}
          keyExtractor={(item) => item.id}
          estimatedItemSize={72}
          onEndReached={loadMoreProducts}
          onEndReachedThreshold={0.1}
          ListEmptyComponent={
            listLoading && skip === 0 ? (
              <ActivityIndicator
                style={styles.listLoader}
                color="#004D2C"
                size="large"
              />
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  No items found matching the selected filters.
                </Text>
              </View>
            )
          }
        />
      </View>

      {/* 6. Staff Share Workspace Modal */}
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
              {/* Owner Info */}
              <View style={styles.modalCard}>
                <Text style={styles.cardSectionTitle}>
                  Share Your Workspace
                </Text>
                <Text style={styles.cardDesc}>
                  Provide this unique Business Code to your staff. They can
                  enter it on their devices to access and update your inventory
                  in real-time.
                </Text>
                <View style={styles.codeShareBox}>
                  <Text style={styles.businessIdCode} numberOfLines={1}>
                    {user?.id}
                  </Text>
                  <TouchableOpacity
                    style={styles.copyBtn}
                    onPress={handleCopyBusinessId}
                  >
                    {copied ? (
                      <Check size={18} color="#10B981" />
                    ) : (
                      <Copy size={18} color="#004D2C" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Staff Input */}
              <View style={styles.modalCard}>
                <Text style={styles.cardSectionTitle}>
                  Connect to Business Owner
                </Text>
                <Text style={styles.cardDesc}>
                  Enter the Business Code shared by your manager/business owner
                  below to join their catalog workspace.
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
                    <Text style={styles.modalConnectBtnText}>
                      Connect Workspace
                    </Text>
                  </TouchableOpacity>
                  {workspaceOwnerId !== user?.id && (
                    <TouchableOpacity
                      style={[styles.modalActionBtn, styles.modalDisconnectBtn]}
                      onPress={handleDisconnectWorkspace}
                    >
                      <Text style={styles.modalDisconnectBtnText}>
                        Disconnect
                      </Text>
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
  header: {
    height: 64,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  headerTitleSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#004D2C",
    marginRight: 10,
  },
  statusIndicatorBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: "700",
  },
  headerActionRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#E1F5EE",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContainer: {
    flex: 1,
  },
  metricsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  metricCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    minWidth: 110,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  alertMetricCard: {
    borderColor: "#FCEBEB",
  },
  creditMetricCard: {
    borderColor: "#FAEEDA",
  },
  metricValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1A1A1A",
    marginVertical: 4,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#9CA3AF",
    textTransform: "uppercase",
  },
  inputSectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  inputSwitcherTabs: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  switcherTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
  },
  switcherTabActive: {
    backgroundColor: "#004D2C",
  },
  switcherTabText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
  },
  switcherTabTextActive: {
    color: "#FFFFFF",
  },
  manualForm: {
    gap: 12,
  },
  formRow: {
    flexDirection: "row",
    gap: 12,
  },
  rowInput: {
    flex: 1,
  },
  inputField: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: "#1A1A1A",
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 6,
  },
  fieldHint: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 4,
  },
  fieldHintCredit: {
    fontSize: 11,
    color: "#BA7517",
    marginTop: 4,
  },
  categoryPickerWrap: {
    gap: 0,
  },
  creditInput: {
    borderColor: "#FAEEDA",
  },
  calcPreview: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 6,
  },
  calcRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  calcLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6B7280",
  },
  calcValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
  },
  calcValueGreen: {
    color: "#059669",
  },
  calcValueAmber: {
    color: "#BA7517",
  },
  formActions: {
    flexDirection: "row",
    gap: 10,
  },
  actionButton: {
    flex: 1,
    backgroundColor: "#004D2C",
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  clearButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  voiceConsole: {
    alignItems: "center",
    paddingVertical: 10,
  },
  voiceDescription: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 16,
  },
  listeningText: {
    color: "#A32D2D",
    fontWeight: "700",
    fontSize: 14,
    marginBottom: 12,
  },
  transcriptBox: {
    width: "100%",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 12,
    marginVertical: 12,
  },
  transcriptLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#9CA3AF",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  transcriptText: {
    fontSize: 14,
    color: "#1F2937",
    fontStyle: "italic",
  },
  parsedPreview: {
    width: "100%",
    backgroundColor: "#E1F5EE",
    borderRadius: 12,
    padding: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  previewTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#065F46",
    marginBottom: 8,
  },
  previewText: {
    fontSize: 13,
    color: "#047857",
    fontWeight: "600",
    marginBottom: 4,
  },
  confirmVoiceBtn: {
    backgroundColor: "#004D2C",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 10,
  },
  confirmVoiceBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
  voiceActionBtnRow: {
    marginTop: 16,
  },
  micBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#004D2C",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#004D2C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  micBtnActive: {
    backgroundColor: "#A32D2D",
    shadowColor: "#A32D2D",
  },
  scannerConsole: {
    alignItems: "center",
  },
  scanDescription: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 12,
  },
  scannerWrapper: {
    width: "100%",
    height: 250,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  controlsBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  searchField: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: "#1A1A1A",
  },
  filterChipsRow: {
    flexDirection: "row",
    gap: 8,
  },
  filterChip: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  filterChipActive: {
    backgroundColor: "#E1F5EE",
    borderColor: "#004D2C",
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
  },
  filterChipTextActive: {
    color: "#004D2C",
  },
  sortSelectionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  sortLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    marginRight: 4,
  },
  sortChip: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  sortChipActive: {
    backgroundColor: "#E1F5EE",
    borderColor: "#004D2C",
  },
  sortChipText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#6B7280",
  },
  sortChipTextActive: {
    color: "#004D2C",
  },
  listLoader: {
    marginTop: 40,
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    color: "#9CA3AF",
    fontSize: 14,
    textAlign: "center",
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
    justifyContent: "space-between",
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
    color: "#1A1A1A",
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
