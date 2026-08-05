import { useEffect } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { notificationService } from '@/services/notificationService';

/**
 * Push-token registration scaffolding: requests permission and stores the
 * Expo push token server-side via POST /v1/notifications/register-device.
 * This alone does NOT deliver push notifications — that needs Expo's push
 * service to actually be triggered server-side, which needs push
 * credentials (APNs key / FCM server key) not yet configured on this
 * server. Notifications work fully in-app (NotificationsScreen) without
 * this; this hook just gets the token on file so remote delivery is a
 * server-side activation later, not a client change.
 */
export function usePushNotificationRegistration(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    (async () => {
      try {
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.DEFAULT,
          });
        }

        const existing = await Notifications.getPermissionsAsync();
        let status = existing.status;
        if (status !== 'granted') {
          const requested = await Notifications.requestPermissionsAsync();
          status = requested.status;
        }
        if (status !== 'granted' || cancelled) return;

        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
        const token = await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId } : undefined
        );
        if (cancelled) return;

        const platform = Platform.OS === 'ios' ? 'ios' : 'android';
        await notificationService.registerDevice(token.data, platform);
      } catch (err) {
        // Non-fatal: in-app notifications keep working without a push token
        // (e.g. simulators, permission denied, no push credentials yet).
        console.warn('Push notification registration skipped:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled]);
}
