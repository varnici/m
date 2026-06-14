import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { inventoryKeys } from './inventoryKeys';

/**
 * useInventoryRealtime hook
 * 
 * Provides real-time synchronization capabilities for inventory management.
 * Subscribes to Postgres change notifications via Supabase Realtime channels.
 * Automatically invalidates active React Query queries upon data changes.
 * 
 * @param ownerId The UUID of the business owner or organization.
 * @returns { isLive: boolean } connection status indicators.
 */
export function useInventoryRealtime(ownerId?: string) {
  const queryClient = useQueryClient();
  const [isLive, setIsLive] = useState<boolean>(false);

  useEffect(() => {
    if (!ownerId) {
      setIsLive(false);
      return;
    }

    // Define a unique channel name scoped to the owner's workspace
    const channelName = `inventory_realtime_${ownerId}`;
    const channel = supabase.channel(channelName);

    channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products',
          filter: `owner_id=eq.${ownerId}`,
        },
        (payload) => {
          console.debug('[Realtime] Product change detected:', payload.eventType, payload.new);
          // Invalidate cache slices related to products and analytical reports
          queryClient.invalidateQueries({ queryKey: inventoryKeys.products() });
          queryClient.invalidateQueries({ queryKey: inventoryKeys.analytics() });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stock_levels',
        },
        (payload) => {
          console.debug('[Realtime] Stock level change detected:', payload.eventType, payload.new);
          // Invalidate stock caches, analytics and products (which might contain cached totals)
          queryClient.invalidateQueries({ queryKey: inventoryKeys.stock() });
          queryClient.invalidateQueries({ queryKey: inventoryKeys.analytics() });
          queryClient.invalidateQueries({ queryKey: inventoryKeys.products() });
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.error(`[Realtime] Subscription failed for channel ${channelName}:`, err);
          setIsLive(false);
        } else {
          setIsLive(status === 'SUBSCRIBED');
        }
      });

    return () => {
      console.debug(`[Realtime] Cleared channel subscription: ${channelName}`);
      supabase.removeChannel(channel).catch((err) => {
        console.error(`[Realtime] Failed to remove channel ${channelName}:`, err);
      });
    };
  }, [ownerId, queryClient]);

  return { isLive };
}
