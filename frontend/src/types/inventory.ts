/**
 * Inventory Domain Types
 */

export type StoreType = 'retail' | 'warehouse' | 'distribution_center';

export interface Store {
  id: string;
  name: string;
  type: StoreType;
  address?: string;
  city?: string;
  state?: string;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  parent_id?: string;
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
  name: string;
  description?: string;
  category_id?: string;
  unit_of_measure: string;
  cost_price_kobo: number;
  selling_price_kobo: number;
  minimum_stock_level: number;
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
  created_at: string;
}

export type MovementType = 'purchase' | 'sale' | 'transfer' | 'adjustment' | 'return';

export interface StockMovement {
  id: string;
  product_id: string;
  from_store_id?: string;
  to_store_id?: string;
  movement_type: MovementType;
  quantity: number;
  reference_id?: string;
  created_at: string;
}

export interface StockReservation {
  id: string;
  product_id: string;
  store_id: string;
  quantity: number;
  status: 'pending' | 'committed' | 'released' | 'expired';
  expires_at: string;
  created_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
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
  supplier_id: string;
  store_id: string;
  status: 'draft' | 'pending' | 'confirmed' | 'received' | 'cancelled';
  total_amount_kobo: number;
  items: PurchaseOrderItem[];
  created_at: string;
}

/**
 * Analytics Types
 */

export interface InventoryDashboardMetrics {
  total_inventory_value_kobo: number;
  low_stock_count: number;
  out_of_stock_count: number;
  dead_stock_count: number;
  sales_velocity_30d: number;
}

export interface AIInsight {
  type: 'optimization' | 'warning' | 'opportunity';
  message: string;
  confidence: number;
  action_item?: string;
}

export interface TurnoverRatio {
  product_id: string;
  ratio: number;
  days: number;
}
