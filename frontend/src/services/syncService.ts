import AsyncStorage from '@react-native-async-storage/async-storage';
import { inventoryService } from './inventoryService';
import { salesService } from './salesService';

const QUEUE_KEY = '@ventureroot_sync_queue';

export interface SyncAction {
  id: string;
  type: 'record_sale' | 'update_stock' | 'create_product' | 'record_stock_movement';
  payload: any;
  timestamp: number;
  retryCount: number;
}

class SyncService {
  private isSyncing = false;

  /**
   * Adds an action to the offline queue.
   */
  async addToQueue(type: SyncAction['type'], payload: any) {
    try {
      const queueJson = await AsyncStorage.getItem(QUEUE_KEY);
      const queue: SyncAction[] = queueJson ? JSON.parse(queueJson) : [];
      
      const newAction: SyncAction = {
        id: Math.random().toString(36).substring(7),
        type,
        payload,
        timestamp: Date.now(),
        retryCount: 0
      };

      queue.push(newAction);
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
      
      // Try to sync immediately if possible
      this.sync();
    } catch (error) {
      console.error('Failed to add to sync queue:', error);
    }
  }

  /**
   * Processes the offline queue.
   */
  async sync() {
    if (this.isSyncing) return;
    this.isSyncing = true;

    try {
      const queueJson = await AsyncStorage.getItem(QUEUE_KEY);
      if (!queueJson) {
        this.isSyncing = false;
        return;
      }

      const queue: SyncAction[] = JSON.parse(queueJson);
      if (queue.length === 0) {
        this.isSyncing = false;
        return;
      }

      const remainingQueue: SyncAction[] = [];

      for (const action of queue) {
        try {
          await this.processAction(action);
        } catch (error) {
          console.warn(`Sync failed for action ${action.id}, will retry:`, error);
          if (action.retryCount < 5) {
            remainingQueue.push({ ...action, retryCount: action.retryCount + 1 });
          }
        }
      }

      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remainingQueue));
    } catch (error) {
      console.error('Global sync error:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  private async processAction(action: SyncAction) {
    switch (action.type) {
      case 'record_sale':
        await salesService.processSale(action.payload);
        break;
      case 'update_stock':
        await inventoryService.updateProduct(action.payload.productId, action.payload.update);
        break;
      case 'create_product':
        await inventoryService.createProduct(action.payload);
        break;
      case 'record_stock_movement':
        await inventoryService.recordStockMovement(action.payload);
        break;
    }
  }

  async getQueueSize(): Promise<number> {
    const queueJson = await AsyncStorage.getItem(QUEUE_KEY);
    if (!queueJson) return 0;
    const queue: SyncAction[] = JSON.parse(queueJson);
    return queue.length;
  }
}

export const syncService = new SyncService();
