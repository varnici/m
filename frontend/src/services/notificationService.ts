import { BaseService } from './baseService';

export type NotificationType =
  | 'loan_status'
  | 'payment_due'
  | 'credit_limit'
  | 'system'
  | 'order_request'
  | 'fund_transfer'
  | 'payment_receipt';

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  related_entity_type?: string | null;
  related_entity_id?: string | null;
  notification_metadata?: Record<string, unknown> | null;
  created_at: string;
}

export interface NotificationListResponse {
  items: AppNotification[];
  total: number;
  unread_count: number;
}

export class NotificationService extends BaseService {
  async list(unreadOnly = false, skip = 0, limit = 50): Promise<NotificationListResponse> {
    const params = new URLSearchParams({
      unread_only: String(unreadOnly),
      skip: String(skip),
      limit: String(limit),
    });
    const response = await this.fetchWithAuth(`/v1/notifications?${params}`);
    return response.json();
  }

  async markRead(notificationId: string): Promise<AppNotification> {
    const response = await this.fetchWithAuth(`/v1/notifications/${notificationId}/read`, {
      method: 'PATCH',
    });
    return response.json();
  }

  async markAllRead(): Promise<{ marked_read: number }> {
    const response = await this.fetchWithAuth('/v1/notifications/read-all', {
      method: 'POST',
    });
    return response.json();
  }

  async registerDevice(pushToken: string, platform: 'ios' | 'android'): Promise<void> {
    await this.fetchWithAuth('/v1/notifications/register-device', {
      method: 'POST',
      body: JSON.stringify({ push_token: pushToken, platform }),
    });
  }
}

export const notificationService = new NotificationService();
