import {
  InventoryCreate,
  InventoryRecord,
  InventorySummary,
  VoiceTranscribeResponse,
} from '../types/voice-inventory';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { inventoryService } from './inventoryService';

const VOICE_INVENTORY_API_URL =
  process.env.EXPO_PUBLIC_VOICE_INVENTORY_API_URL || 'http://localhost:8005';
const PENDING_INVENTORY_KEY = 'pending_inventory_queue_v1';

type PendingInventoryItem = {
  id: string;
  payload: InventoryCreate;
  createdAt: string;
};

// ---------------------------------------------------------------------------
// Offline queue helpers
// ---------------------------------------------------------------------------

async function readQueue(): Promise<PendingInventoryItem[]> {
  const raw = await AsyncStorage.getItem(PENDING_INVENTORY_KEY);
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

async function writeQueue(items: PendingInventoryItem[]): Promise<void> {
  await AsyncStorage.setItem(PENDING_INVENTORY_KEY, JSON.stringify(items));
}

async function enqueueInventory(payload: InventoryCreate): Promise<void> {
  const queue = await readQueue();
  queue.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    payload,
    createdAt: new Date().toISOString(),
  });
  await writeQueue(queue);
}

// ---------------------------------------------------------------------------
// Inventory CRUD
// ---------------------------------------------------------------------------

function toKobo(value: number): number {
  return Math.round(Number(value || 0) * 100);
}

function makeSku(name: string): string {
  const prefix = name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24) || 'VOICE-ITEM';
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
}

async function getOrCreateStoreId(): Promise<string> {
  const stores = await inventoryService.getStores();
  if (stores.length > 0) return stores[0].id;

  const store = await inventoryService.createStore({
    name: 'Main Store',
    type: 'retail' as any,
    address: 'Main Street',
    city: 'Lagos',
    state: 'Lagos',
  });
  return store.id;
}

function productToInventoryRecord(product: any): InventoryRecord {
  const quantity = Number(product.total_quantity_on_hand || product.quantity_on_hand || 0);
  const price = Number(product.selling_price_kobo || 0) / 100;
  const productCost = Number(product.cost_price_kobo || 0) / 100;
  const sold = 0;
  return {
    id: product.id,
    product_name: product.name,
    customer_id: product.owner_id || 'business',
    quantity,
    pack_quantity: 0,
    product_cost: productCost,
    price,
    sold,
    profit: (price - productCost) * sold,
    revenue: price * sold,
    created_at: product.created_at,
    updated_at: product.updated_at || product.created_at,
  };
}

export async function createInventory(item: InventoryCreate): Promise<InventoryRecord> {
  try {
    const storeId = await getOrCreateStoreId();
    const product = await inventoryService.createProduct({
      sku: makeSku(item.product_name),
      name: item.product_name,
      unit_of_measure: 'piece',
      cost_price_kobo: toKobo(item.product_cost),
      selling_price_kobo: toKobo(item.price),
      minimum_stock_level: 1,
      maximum_stock_level: Math.max(item.quantity * 4, item.quantity + 10, 10),
      reorder_quantity: Math.max(item.quantity, 1),
      supplier_lead_time_days: 7,
      quantity_on_hand: item.quantity,
      store_id: storeId,
    });
    return productToInventoryRecord(product);
  } catch {
    // Save locally and return optimistic record
    await enqueueInventory(item);
    return {
      ...item,
      id: `local-${Date.now()}`,
      profit: (item.price - item.product_cost) * item.sold,
      revenue: item.price * item.sold,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }
}

export async function syncPendingInventory(): Promise<number> {
  const queue = await readQueue();
  if (queue.length === 0) return 0;
  const remaining: PendingInventoryItem[] = [];
  let synced = 0;
  for (const entry of queue) {
    try {
      await createInventory(entry.payload);
      synced += 1;
    } catch {
      remaining.push(entry);
    }
  }
  await writeQueue(remaining);
  return synced;
}

export async function listInventory(): Promise<InventoryRecord[]> {
  const products = await inventoryService.getProducts(0, 100);
  return products.map(productToInventoryRecord);
}

export async function getInventory(id: string): Promise<InventoryRecord> {
  const product = await inventoryService.getProductDetail(id);
  return productToInventoryRecord(product);
}

export async function updateInventory(
  id: string,
  item: Partial<InventoryCreate>
): Promise<InventoryRecord> {
  const product = await inventoryService.updateProduct(id, {
    ...(item.product_name && { name: item.product_name }),
    ...(item.product_cost !== undefined && { cost_price_kobo: toKobo(item.product_cost) }),
    ...(item.price !== undefined && { selling_price_kobo: toKobo(item.price) }),
  });
  return productToInventoryRecord(product);
}

export async function deleteInventory(id: string): Promise<void> {
  await inventoryService.deleteProduct(id);
}

export async function getSummary(): Promise<InventorySummary> {
  const inventory = await listInventory();
  const totalRevenue = inventory.reduce((sum, item) => sum + item.revenue, 0);
  const totalProfit = inventory.reduce((sum, item) => sum + item.profit, 0);
  return {
    total_items: inventory.length,
    total_sold: inventory.reduce((sum, item) => sum + item.sold, 0),
    total_revenue: totalRevenue,
    total_profit: totalProfit,
    margin_pct: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
  };
}

// ---------------------------------------------------------------------------
// Voice — natural language, AI-parsed
// ---------------------------------------------------------------------------

/**
 * Upload audio and get back BOTH the transcription AND structured inventory
 * fields extracted by AI (Claude online, spaCy offline).
 *
 * Users can speak naturally:
 *   "50 bags of rice, cost 500, selling at 700, customer is Emeka"
 *   "20 bottles of groundnut oil at 300 naira, sell for 450"
 */
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1];
      resolve(base64);
    };
    reader.readAsDataURL(blob);
  });
};

export async function uploadVoiceAndParse(
  file: Blob,
  fileName = 'voice-input.m4a'
): Promise<VoiceTranscribeResponse> {
  const storeId = await getOrCreateStoreId();
  const base64 = await blobToBase64(file);
  const data = await inventoryService.processVoiceInput(base64, storeId);

  if (!data.success || !data.data) {
    throw new Error(data.error || 'Voice parsing returned no inventory data');
  }
  return {
    text: data.transcript || '',
    inventory: data.data,
    _source: data.source,
    language: data.language,
  };
}

/**
 * Raw transcription only — no field extraction.
 * Use this if you want to display the transcript before saving.
 */
export async function uploadVoice(
  file: Blob,
  fileName = 'voice-input.m4a'
<<<<<<< HEAD
): Promise<{ text: string; extracted_number?: string; field_type?: string }> {
  const storeId = await getOrCreateStoreId();
  const base64 = await blobToBase64(file);
  const data = await inventoryService.processVoiceInput(base64, storeId);
  return {
    text: data.transcript || '',
    extracted_number: data.data?.quantity?.toString(),
    field_type: 'quantity',
  };
=======
): Promise<{ text: string; extracted_number?: number }> {
  const form = new FormData();
  form.append('file', file, fileName);

  const res = await fetch(`${VOICE_INVENTORY_API_URL}/voice/transcribe`, {
    method: 'POST',
    body: form,
  });

  if (!res.ok) throw new Error('Voice upload failed');
  const data = await res.json();
  return { text: data.transcript || '', extracted_number: data.extracted_number };
>>>>>>> 28426ae5 (ai asistance ui and update)
}
