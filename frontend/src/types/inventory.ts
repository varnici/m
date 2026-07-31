/**
 * Inventory Domain Types
 */

export type StoreType = 'retail' | 'warehouse' | 'distribution_center';

export type BusinessType = 'provision' | 'pharmacy' | 'boutique' | 'phones' | 'building' | 'custom';

export interface Store {
  id: string;
  name: string;
  type: StoreType;
  business_type?: BusinessType | string;
  address?: string;
  city?: string;
  state?: string;
  is_primary?: boolean;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  parent_id?: string;
  icon?: string;
  tint?: string;
  created_at: string;
}

export interface StockLevel {
  product_id: string;
  store_id: string;
  quantity_on_hand: number;
  quantity_reserved: number;
  last_updated: string;
}

export interface DemandForecastPoint {
  date: string;
  quantity: number;
}

export interface ProductIntelligence {
  headline: string;
  subtitle: string;
  impact: 'positive' | 'negative' | 'neutral';
}

export interface Product {
  id: string;
  sku: string;
  barcode?: string;
  qr_code?: string;
  name: string;
  description?: string;
  brand?: string;
  owner_id?: string;
  category_id?: string;
  unit_of_measure: string;
  cost_price_kobo: number;
  selling_price_kobo: number;
  minimum_stock_level: number;
  maximum_stock_level?: number;
  reorder_quantity?: number;
  supplier_lead_time_days?: number;
  quantity_on_hand?: number;
  store_id?: string;
  nafdac_number?: string;
  size?: string;
  imei?: string;
  expiry_date?: string;
  expenses_kobo: number;
  quantity_sold: number;
  quantity_on_credit: number;
  retail_price_kobo?: number;
  trade_price_kobo?: number;
  retail_margin_pct?: number;
  trade_margin_pct?: number;
  expected_amount?: number;
  actual_amount?: number;
  discrepancy_qty?: number;
  monthly_velocity?: number;
  days_of_supply?: number;
  trade_moq?: number;
  is_active: boolean;
  total_quantity_on_hand: number;
  total_reserved_quantity: number;
  margin_percentage: number;
  is_dead_stock?: boolean;
  rating?: number;
  review_count?: number;
  stock_by_location: StockLevel[];
  children?: Product[];
  demand_forecast?: DemandForecastPoint[];
  ai_intelligence?: ProductIntelligence[];
  turnover_30d?: number;
  created_at: string;
}

export type MovementType = 'purchase' | 'sale' | 'transfer' | 'adjustment' | 'return' | 'damage' | 'loss';

export interface StockMovement {
  id: string;
  product_id: string;
  from_store_id?: string;
  to_store_id?: string;
  movement_type: MovementType;
  input_method?: 'manual' | 'voice' | 'scan';
  quantity: number;
  reference_id?: string;
  notes?: string;
  created_at: string;
}

export interface StockReservation {
  id: string;
  owner_id?: string;
  product_id: string;
  store_id: string;
  quantity?: number;
  quantity_reserved?: number;
  quantity_committed?: number;
  quantity_released?: number;
  purpose?: string;
  reference_type?: string;
  reference_id?: string;
  notes?: string;
  status: 'active' | 'pending' | 'committed' | 'released' | 'expired';
  expires_at?: string;
  created_at: string;
  updated_at?: string;
}

export interface StocktakeCount {
  product_id: string;
  actual_amount: number;
}

export interface StocktakeReconcileItem {
  product_id: string;
  sku: string;
  product_name: string;
  expected_amount: number;
  actual_amount: number;
  discrepancy_qty: number;
  variance_status: 'matched' | 'shrinkage' | 'overage' | string;
}

export interface StocktakeReconcileResult {
  reconciled_count: number;
  discrepancies_count: number;
  total_missing: number;
  total_overage: number;
  items: StocktakeReconcileItem[];
}

export interface TradeClient {
  id: string;
  owner_id: string;
  company_name: string;
  vat_number?: string;
  delivery_address?: string;
  contact_phone?: string;
  contact_email?: string;
  default_payment_terms: 'immediate' | 'net30' | string;
  is_active: boolean;
  created_at: string;
}

export interface TradeClientCreate {
  company_name: string;
  vat_number?: string;
  delivery_address?: string;
  contact_phone?: string;
  contact_email?: string;
  default_payment_terms?: 'immediate' | 'net30' | string;
}

export interface TradeOrderLine {
  id: string;
  product_id: string;
  quantity: number;
  unit_price_kobo: number;
  reservation_id?: string | null;
}

export interface TradeOrderLineCreate {
  product_id: string;
  quantity: number;
  unit_price_kobo: number;
}

export interface TradeOrder {
  id: string;
  owner_id: string;
  client_id: string;
  store_id: string;
  status: 'draft' | 'held' | 'dispatched' | 'cancelled' | string;
  payment_terms: 'immediate' | 'net30' | string;
  total_kobo: number;
  sale_id?: string | null;
  lines: TradeOrderLine[];
  created_at: string;
}

export interface TradeOrderCreate {
  client_id: string;
  store_id: string;
  payment_terms?: 'immediate' | 'net30' | string;
  lines: TradeOrderLineCreate[];
}

export interface Supplier {
  id: string;
  name: string;
  contact_name?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  status: 'active' | 'inactive';
}

export interface PurchaseOrderItem {
  id: string;
  product_id: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost_kobo: number;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string;
  supplier: Supplier;
  store_id: string;
  store: Store;
  status: 'draft' | 'pending' | 'confirmed' | 'shipped' | 'received' | 'cancelled';
  total_amount_kobo: number;
  items: PurchaseOrderItem[];
  expected_delivery_date?: string;
  created_at: string;
}

export interface InventoryCreate {
  product_name: string;
  customer_id: string;
  quantity: number;
  pack_quantity: number;
  product_cost: number;
  price: number;
  sold: number;
}

export interface InventoryRecord extends InventoryCreate {
  id: string;
  profit: number;
  revenue: number;
  created_at: string;
  updated_at: string;
}

export interface InventorySummary {
  total_items: number;
  total_sold: number;
  total_revenue: number;
  total_profit: number;
  margin_pct: number;
}

/**
 * Analytics Types
 */

export interface InventoryDashboardMetrics {
  total_value_kobo?: number;
  total_inventory_value_kobo?: number;
  total_revenue_kobo?: number;
  total_profit_kobo?: number;
  turnover_ratio?: number;
  turnover_description?: string;
  dead_stock_count?: number;
  sales_velocity_30d?: number;
  best_sellers: Array<{
    id?: string;
    product_id?: string;
    sku: string;
    name: string;
    quantity_sold?: number;
    total_sold?: number;
    revenue_kobo?: number;
    profit_kobo?: number;
  }>;
  categories: Array<{
    category_id: string;
    name: string;
    total_items: number;
    count?: number;
    health_score: number;
  }>;
  recent_transactions: Array<{
    id: string;
    date?: string;
    amount_kobo?: number;
    customer?: string;
    customer_phone?: string;
    product_name?: string;
    quantity: number;
    unit_price_kobo?: number;
    profit_kobo?: number;
    [key: string]: any;
  }>;
  revenue_trend?: Array<{
    day: string;
    revenue: number;
    [key: string]: any;
  }>;
  global_recommendations: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    impact: 'high' | 'medium' | 'low' | string;
    priority: number;
    action_text: string;
    action_route: string;
    metadata?: Record<string, unknown>;
  }>;
}

export interface InventoryOptimizationAction {
  product_id: string;
  sku: string;
  name: string;
  available_quantity: number;
  reserved_quantity: number;
  units_sold: number;
  daily_demand: number;
  days_of_cover?: number | null;
  reorder_point: number;
  recommended_order_quantity: number;
  economic_order_quantity: number;
  revenue_at_risk_kobo: number;
  carrying_cost_kobo: number;
  urgency: 'healthy' | 'stockout' | 'reorder_now' | 'lead_time_risk' | string;
}

export interface InventoryOptimizationReport {
  generated_at: string;
  window_days: number;
  store_id?: string | null;
  algorithm: string;
  summary: {
    sku_count: number;
    stockout_count: number;
    reorder_action_count: number;
    total_stock_value_kobo: number;
    reserved_units: number;
    revenue_at_risk_kobo: number;
    estimated_carrying_cost_kobo: number;
    dead_stock_value_kobo: number;
  };
  top_actions: InventoryOptimizationAction[];
}

export interface AIInsight {
  type: 'optimization' | 'warning' | 'opportunity';
  message: string;
  confidence: number;
  action_item?: string;
}

export interface AIInsightsReport {
  anomalies: any[];
  restock_recommendations: any[];
  trends: any[];
}

export interface TurnoverRatio {
  product_id: string;
  ratio: number;
  days: number;
}
