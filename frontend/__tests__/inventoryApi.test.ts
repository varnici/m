import {
  createInventory,
  listInventory,
  getSummary,
  updateInventory,
  deleteInventory,
  uploadVoice,
} from '../src/services/inventoryApi';
import { InventoryCreate } from '../src/types/voice-inventory';

// Mock fetch
global.fetch = jest.fn();

const mockFetch = global.fetch as jest.Mock;

describe('inventoryApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockResponse = (data: any, ok = true) => ({
    ok,
    json: jest.fn().mockResolvedValue(data),
    blob: jest.fn().mockResolvedValue(new Blob()),
  });

  it('creates inventory item', async () => {
    const item: InventoryCreate = {
      product_name: 'Test',
      customer_id: 'C1',
      quantity: 10,
      product_cost: 5,
      price: 10,
      sold: 2,
    };
    mockFetch.mockResolvedValueOnce(mockResponse({ ...item, id: '123' }));
    const result = await createInventory(item);
    expect(result.product_name).toBe('Test');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/inventory/'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('lists inventory items', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse([]));
    const result = await listInventory();
    expect(Array.isArray(result)).toBe(true);
  });

  it('gets summary', async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({
        total_items: 10,
        total_sold: 5,
        total_revenue: 100,
        total_profit: 20,
        margin_pct: 20,
      })
    );
    const result = await getSummary();
    expect(result.total_items).toBe(10);
  });

  it('handles API errors', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({}, false));
    await expect(listInventory()).rejects.toThrow();
  });

  it('updates inventory item', async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({ id: '123', sold: 5 })
    );
    const result = await updateInventory('123', { sold: 5 });
    expect(result.sold).toBe(5);
  });

  it('deletes inventory item', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({}));
    await deleteInventory('123');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/inventory/123'),
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('uploads voice file', async () => {
    const blob = new Blob(['audio data']);
    mockFetch.mockResolvedValueOnce(
      mockResponse({
        text: 'one hundred',
        extracted_number: '100',
        field_type: 'number',
      })
    );
    const result = await uploadVoice(blob);
    expect(result.extracted_number).toBe('100');
  });
});

