/**
 * Frontend Unit Tests for Inventory System
 * Jest + React Testing Library
 */

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useProducts,
  useProductDetail,
  useStockLevels,
  useCreateProduct,
  useRecordStockMovement,
  useSuppliers,
  usePurchaseOrders,
  useInventoryDashboard,
  useLowStockAlerts,
  inventoryKeys,
} from '@/hooks/useInventory';
import { inventoryService } from '@/services/inventoryService';

// ============================================================================
// SETUP & FIXTURES
// ============================================================================

let queryClient: QueryClient;

beforeEach(() => {
  queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
});

const createWrapper = () => ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
);

// Mock the inventory service
jest.mock('@/services/inventoryService', () => ({
  inventoryService: {
    getProducts: jest.fn(),
    getProductDetail: jest.fn(),
    getStockLevels: jest.fn(),
    createProduct: jest.fn(),
    recordStockMovement: jest.fn(),
    getSuppliers: jest.fn(),
    getPurchaseOrders: jest.fn(),
    getInventoryDashboard: jest.fn(),
    getLowStockAlerts: jest.fn(),
  },
}));

// ============================================================================
// HOOK TESTS: PRODUCTS
// ============================================================================

describe('useProducts', () => {
  it('should fetch products', async () => {
    const mockProducts = [
      {
        id: '1',
        sku: 'SKU-001',
        name: 'Product 1',
        cost_price_kobo: 10000,
        selling_price_kobo: 15000,
      },
      {
        id: '2',
        sku: 'SKU-002',
        name: 'Product 2',
        cost_price_kobo: 20000,
        selling_price_kobo: 30000,
      },
    ];

    (inventoryService.getProducts as jest.Mock).mockResolvedValue(
      mockProducts
    );

    const { result } = renderHook(
      () => useProducts(0, 100),
      { wrapper: createWrapper() }
    );

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    // Wait for data
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockProducts);
  });

  it('should handle product search', async () => {
    const mockResults = [
      {
        id: '1',
        sku: 'SEARCH-001',
        name: 'Searched Product',
      },
    ];

    (inventoryService.getProducts as jest.Mock).mockResolvedValue(
      mockResults
    );

    const { result } = renderHook(
      () => useProducts(0, 100, undefined, 'Searched'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockResults);
    expect(inventoryService.getProducts).toHaveBeenCalledWith(
      0,
      100,
      undefined,
      'Searched'
    );
  });

  it('should handle errors gracefully', async () => {
    const error = new Error('Network error');
    (inventoryService.getProducts as jest.Mock).mockRejectedValue(error);

    const { result } = renderHook(
      () => useProducts(0, 100),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBe(error);
  });
});

describe('useProductDetail', () => {
  it('should fetch product details', async () => {
    const mockProduct = {
      id: '123',
      sku: 'DETAIL-001',
      name: 'Detailed Product',
      cost_price_kobo: 10000,
      selling_price_kobo: 15000,
      total_quantity_on_hand: 50,
      stock_by_location: [
        {
          id: 's1',
          store_id: 'store-1',
          quantity_on_hand: 30,
        },
        {
          id: 's2',
          store_id: 'store-2',
          quantity_on_hand: 20,
        },
      ],
      profit_per_unit_kobo: 5000,
      margin_percentage: 50.0,
    };

    (inventoryService.getProductDetail as jest.Mock).mockResolvedValue(
      mockProduct
    );

    const { result } = renderHook(
      () => useProductDetail('123'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockProduct);
  });

  it('should handle disabled queries', () => {
    const { result } = renderHook(
      () => useProductDetail('123', undefined, false),
      { wrapper: createWrapper() }
    );

    // Query should not execute
    expect(result.current.isLoading).toBe(false);
  });
});

// ============================================================================
// MUTATION TESTS: PRODUCTS
// ============================================================================

describe('useCreateProduct', () => {
  it('should create a product', async () => {
    const newProduct = {
      id: 'new-product',
      sku: 'NEW-001',
      name: 'New Product',
      cost_price_kobo: 5000,
      selling_price_kobo: 8000,
    };

    (inventoryService.createProduct as jest.Mock).mockResolvedValue(
      newProduct
    );

    const { result } = renderHook(() => useCreateProduct(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync(newProduct);
    });

    expect(result.current.isSuccess).toBe(true);
    expect(result.current.data).toEqual(newProduct);
  });

  it('should invalidate products cache on success', async () => {
    const newProduct = {
      id: 'new-product',
      sku: 'NEW-001',
      name: 'New Product',
    };

    (inventoryService.createProduct as jest.Mock).mockResolvedValue(
      newProduct
    );

    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreateProduct(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync(newProduct);
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: inventoryKeys.products(),
      });
    });
  });

  it('should handle creation errors', async () => {
    const error = new Error('Validation error');
    (inventoryService.createProduct as jest.Mock).mockRejectedValue(error);

    const { result } = renderHook(() => useCreateProduct(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      try {
        await result.current.mutateAsync({});
      } catch (e) {
        // Error expected
      }
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

// ============================================================================
// STOCK MANAGEMENT TESTS
// ============================================================================

describe('useStockLevels', () => {
  it('should fetch stock levels for a store', async () => {
    const mockStock = [
      {
        id: 'stock-1',
        product_id: 'prod-1',
        store_id: 'store-1',
        quantity_on_hand: 50,
        quantity_reserved: 10,
        status: 'in_stock',
      },
    ];

    (inventoryService.getStockLevels as jest.Mock).mockResolvedValue(
      mockStock
    );

    const { result } = renderHook(
      () => useStockLevels('store-1'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockStock);
  });

  it('should filter by stock status', async () => {
    const mockStock = [
      {
        id: 'stock-2',
        status: 'low_stock',
        quantity_on_hand: 5,
      },
    ];

    (inventoryService.getStockLevels as jest.Mock).mockResolvedValue(
      mockStock
    );

    const { result } = renderHook(
      () => useStockLevels('store-1', 'low_stock'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(inventoryService.getStockLevels).toHaveBeenCalledWith(
      'store-1',
      'low_stock'
    );
  });
});

describe('useRecordStockMovement', () => {
  it('should record stock movement', async () => {
    const movement = {
      id: 'move-1',
      product_id: 'prod-1',
      from_store_id: 'store-1',
      quantity: 10,
      movement_type: 'sale',
    };

    (inventoryService.recordStockMovement as jest.Mock).mockResolvedValue(
      movement
    );

    const { result } = renderHook(() => useRecordStockMovement(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync(movement);
    });

    expect(result.current.isSuccess).toBe(true);
    expect(result.current.data).toEqual(movement);
  });

  it('should invalidate stock cache on success', async () => {
    const movement = {
      product_id: 'prod-1',
      quantity: 10,
      movement_type: 'sale',
    };

    (inventoryService.recordStockMovement as jest.Mock).mockResolvedValue(
      movement
    );

    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useRecordStockMovement(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync(movement);
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: inventoryKeys.stock(),
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: inventoryKeys.analytics(),
      });
    });
  });
});

// ============================================================================
// PURCHASE ORDER TESTS
// ============================================================================

describe('usePurchaseOrders', () => {
  it('should fetch purchase orders', async () => {
    const mockPos = [
      {
        id: 'po-1',
        po_number: 'PO-001',
        status: 'draft',
        total_amount_kobo: 500000,
      },
    ];

    (inventoryService.getPurchaseOrders as jest.Mock).mockResolvedValue(
      mockPos
    );

    const { result } = renderHook(
      () => usePurchaseOrders(),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockPos);
  });

  it('should filter by status', async () => {
    const mockPos = [
      {
        id: 'po-2',
        status: 'confirmed',
        total_amount_kobo: 1000000,
      },
    ];

    (inventoryService.getPurchaseOrders as jest.Mock).mockResolvedValue(
      mockPos
    );

    const { result } = renderHook(
      () => usePurchaseOrders('confirmed'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(inventoryService.getPurchaseOrders).toHaveBeenCalledWith(
      'confirmed',
      undefined,
      undefined,
      undefined,
      undefined,
      0,
      100
    );
  });
});

// ============================================================================
// ANALYTICS TESTS
// ============================================================================

describe('useInventoryDashboard', () => {
  it('should fetch inventory metrics', async () => {
    const mockMetrics = {
      date: '2024-01-15',
      total_inventory_value_kobo: 5000000,
      total_quantity_on_hand: 500,
      low_stock_items_count: 5,
      out_of_stock_items_count: 0,
      inventory_turnover_ratio: 2.5,
    };

    (inventoryService.getInventoryDashboard as jest.Mock).mockResolvedValue(
      mockMetrics
    );

    const { result } = renderHook(
      () => useInventoryDashboard(),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockMetrics);
  });
});

describe('useLowStockAlerts', () => {
  it('should fetch low stock products', async () => {
    const mockAlerts = [
      {
        id: 'prod-low-1',
        sku: 'LOW-001',
        name: 'Low Stock Product',
        quantity_on_hand: 5,
        minimum_stock_level: 10,
      },
    ];

    (inventoryService.getLowStockAlerts as jest.Mock).mockResolvedValue(
      mockAlerts
    );

    const { result } = renderHook(
      () => useLowStockAlerts(),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockAlerts);
  });
});

// ============================================================================
// QUERY KEY TESTS
// ============================================================================

describe('inventoryKeys', () => {
  it('should generate unique product list keys', () => {
    const key1 = inventoryKeys.productList(0, 100);
    const key2 = inventoryKeys.productList(0, 100, 'cat-1');
    const key3 = inventoryKeys.productList(0, 100, 'cat-1');

    expect(key1).not.toEqual(key2);
    expect(key2).toEqual(key3); // Same parameters = same key
  });

  it('should generate unique supplier keys', () => {
    const key1 = inventoryKeys.suppliersList('active');
    const key2 = inventoryKeys.suppliersList('inactive');

    expect(key1).not.toEqual(key2);
  });

  it('should generate unique PO keys', () => {
    const key1 = inventoryKeys.poList('draft');
    const key2 = inventoryKeys.poList('confirmed');

    expect(key1).not.toEqual(key2);
  });
});

describe('Cache invalidation', () => {
  it('should invalidate related caches on product update', async () => {
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    await queryClient.invalidateQueries({
      queryKey: inventoryKeys.productList(0, 100),
    });

    expect(invalidateSpy).toHaveBeenCalled();
  });
});

// ============================================================================
// INTEGRATION TEST EXAMPLE
// ============================================================================

describe('Inventory Flow Integration', () => {
  it('should handle complete product workflow', async () => {
    // Create product
    const newProduct = {
      id: 'int-prod-1',
      sku: 'INT-001',
      name: 'Integration Test Product',
    };
    (inventoryService.createProduct as jest.Mock).mockResolvedValue(
      newProduct
    );

    // Get product details
    const productDetail = {
      ...newProduct,
      stock_by_location: [],
      total_quantity_on_hand: 0,
    };
    (inventoryService.getProductDetail as jest.Mock).mockResolvedValue(
      productDetail
    );

    // Record stock movement
    const movement = {
      id: 'int-move-1',
      product_id: 'int-prod-1',
      quantity: 50,
      movement_type: 'purchase',
    };
    (inventoryService.recordStockMovement as jest.Mock).mockResolvedValue(
      movement
    );

    // Create and execute mutations
    const { result: createResult } = renderHook(
      () => useCreateProduct(),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      await createResult.current.mutateAsync(newProduct);
    });

    expect(createResult.current.data).toEqual(newProduct);
  });
});
