/**
 * Inventory Hooks Barrel File
 * Re-exports domain-specific hooks for backward compatibility.
 * This maintains existing imports while allowing the project to scale.
 */

export * from './inventoryKeys';
export * from './useProducts';
export * from './useStock';
export * from './useSuppliers';
export * from './usePurchaseOrders';
export * from './useAnalytics';
export * from './useVoiceVision';
