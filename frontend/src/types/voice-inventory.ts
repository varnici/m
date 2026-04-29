/**
 * Voice Inventory System Types
 * For quick voice/barcode-based inventory input
 */

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

export interface VoiceTranscribeResponse {
  text: string;
  extracted_number: string | null;
  field_type: 'text' | 'number';
}
