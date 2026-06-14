'use strict';

import { 
  InventoryWorker, 
  WorkerMessageType, 
  ParentMessageType, 
  WorkerRequest, 
  WorkerResponse 
} from '../inventoryWorker';
import { InventoryWorkerService } from '../inventoryWorkerService';

// Mock react-native-worklets since JSI is not available in Node/Jest
jest.mock('react-native-worklets', () => ({
  createWorkletRuntime: jest.fn(() => ({
    name: 'mock-runtime',
  })),
  runOnRuntime: jest.fn((runtime, fn) => {
    return (wrappedFn: any, args: any[]) => wrappedFn(...args);
  }),
  runOnJS: jest.fn((fn) => fn),
}));

// Mock the real inventoryService and syncService modules
const mockInventoryService = {
  setup: jest.fn(),
  teardown: jest.fn(),
  getProducts: jest.fn(),
  createProduct: jest.fn(),
};

const mockSyncService = {
  sync: jest.fn(),
};

jest.mock('../inventoryService', () => ({
  inventoryService: mockInventoryService,
}));

jest.mock('../syncService', () => ({
  syncService: mockSyncService,
}));

describe('InventoryWorker', () => {
  let worker: InventoryWorker;
  let receivedMessages: WorkerResponse[];

  beforeEach(() => {
    jest.clearAllMocks();
    worker = new InventoryWorker();
    receivedMessages = [];
    worker.onMessage((msg) => {
      receivedMessages.push(msg);
    });
  });

  it('should initialize and register module on CHILD_MESSAGE_INITIALIZE', () => {
    worker.postMessage([
      WorkerMessageType.CHILD_MESSAGE_INITIALIZE,
      false,
      'inventoryService',
      ['arg1', 'arg2'],
    ]);

    // Internal state verification via calling setup
    worker.postMessage([WorkerMessageType.CHILD_MESSAGE_CALL_SETUP]);
    expect(mockInventoryService.setup).toHaveBeenCalledWith('arg1', 'arg2');
  });

  it('should execute registered methods on CHILD_MESSAGE_CALL', async () => {
    // 1. Initialize
    worker.postMessage([
      WorkerMessageType.CHILD_MESSAGE_INITIALIZE,
      false,
      'inventoryService',
      [],
    ]);

    // 2. Mock method output
    mockInventoryService.getProducts.mockResolvedValue([{ id: 'p1', name: 'Product 1' }]);

    // 3. Call method
    worker.postMessage([
      WorkerMessageType.CHILD_MESSAGE_CALL,
      false,
      'getProducts',
      [0, 10],
    ]);

    // Wait for microtasks
    await new Promise((resolve) => setImmediate(resolve));

    expect(mockInventoryService.getProducts).toHaveBeenCalledWith(0, 10);
    expect(receivedMessages).toHaveLength(1);
    expect(receivedMessages[0][0]).toBe(ParentMessageType.PARENT_MESSAGE_OK);
    expect(receivedMessages[0][1]).toEqual([{ id: 'p1', name: 'Product 1' }]);
  });

  it('should handle errors in methods and return CLIENT_ERROR', async () => {
    worker.postMessage([
      WorkerMessageType.CHILD_MESSAGE_INITIALIZE,
      false,
      'inventoryService',
      [],
    ]);

    const error = new Error('Database connection failed');
    mockInventoryService.getProducts.mockRejectedValue(error);

    worker.postMessage([
      WorkerMessageType.CHILD_MESSAGE_CALL,
      false,
      'getProducts',
      [0, 10],
    ]);

    await new Promise((resolve) => setImmediate(resolve));

    expect(receivedMessages).toHaveLength(1);
    expect(receivedMessages[0][0]).toBe(ParentMessageType.PARENT_MESSAGE_CLIENT_ERROR);
    expect(receivedMessages[0][2]).toBe('Database connection failed');
  });

  it('should report simulated memory usage on CHILD_MESSAGE_MEM_USAGE', () => {
    worker.postMessage([WorkerMessageType.CHILD_MESSAGE_MEM_USAGE]);

    expect(receivedMessages).toHaveLength(1);
    expect(receivedMessages[0][0]).toBe(ParentMessageType.PARENT_MESSAGE_MEM_USAGE);
    expect(typeof receivedMessages[0][1]).toBe('number');
    expect(receivedMessages[0][1]).toBeGreaterThan(0);
  });

  it('should teardown correctly on CHILD_MESSAGE_END', () => {
    worker.postMessage([
      WorkerMessageType.CHILD_MESSAGE_INITIALIZE,
      false,
      'inventoryService',
      [],
    ]);

    worker.postMessage([WorkerMessageType.CHILD_MESSAGE_END]);

    expect(mockInventoryService.teardown).toHaveBeenCalled();
  });
});

describe('InventoryWorkerService', () => {
  let service: InventoryWorkerService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new InventoryWorkerService();
  });

  it('should proxy getProducts call to worker and resolve promise', async () => {
    const productsList = [{ id: '1', name: 'Product A' }];
    mockInventoryService.getProducts.mockResolvedValue(productsList);

    const promise = service.getProducts(0, 10, 'cat-1', 'search-term');
    
    // Allow the queue to process
    await new Promise((resolve) => setImmediate(resolve));

    const result = await promise;
    expect(result).toEqual(productsList);
    expect(mockInventoryService.getProducts).toHaveBeenCalledWith(0, 10, 'cat-1', 'search-term', undefined);
  });

  it('should reject call promise on worker failure', async () => {
    mockInventoryService.getProducts.mockRejectedValue(new Error('Network Fail'));

    const promise = service.getProducts(0, 10);

    await new Promise((resolve) => setImmediate(resolve));

    await expect(promise).rejects.toThrow('Network Fail');
  });

  it('should query worker memory usage', async () => {
    const mem = await service.getWorkerMemoryUsage();
    expect(typeof mem).toBe('number');
    expect(mem).toBeGreaterThan(0);
  });

  it('should terminate the worker thread', async () => {
    await service.terminate();
    expect(mockInventoryService.teardown).toHaveBeenCalled();
  });
});
