import { BaseService } from './baseService';

export interface ShopfrontConfig {
  slug: string;
  share_url: string;
  is_active: boolean;
  product_count: number;
}

export interface ShopfrontProduct {
  product_id: string;
  name: string;
  description?: string;
  unit_of_measure: string;
  selling_price_kobo: number;
  image_url?: string;
  available_quantity: number;
}

export interface ShopfrontView {
  slug: string;
  store_name: string;
  store_city?: string;
  store_state?: string;
  products: ShopfrontProduct[];
}

export interface OrderItem {
  product_id: string;
  quantity: number;
}

export interface OrderResult {
  order_id: string;
  total_amount_kobo: number;
  item_count: number;
  message: string;
}

class ShopfrontService extends BaseService {
  async getMyShopfront(): Promise<ShopfrontConfig> {
    const res = await this.fetchWithAuth('/v1/shopfront/me');
    return res.json();
  }

  async getShopfrontView(slug: string): Promise<ShopfrontView> {
    const res = await this.fetchWithAuth(`/v1/shopfront/${slug}`);
    return res.json();
  }

  async placeOrder(slug: string, customerName: string, customerPhone: string, items: OrderItem[]): Promise<OrderResult> {
    const res = await this.fetchWithAuth(`/v1/shopfront/${slug}/order`, {
      method: 'POST',
      body: JSON.stringify({ customer_name: customerName, customer_phone: customerPhone, items }),
    });
    return res.json();
  }
}

export const shopfrontService = new ShopfrontService();
