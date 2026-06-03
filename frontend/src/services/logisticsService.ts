import { BaseService } from './baseService';

export interface ClusterParticipant {
  id: string;
  user_label: string;
  order_reference: string;
  latitude: number;
  longitude: number;
  status: 'pending' | 'confirmed';
  share_kobo: number;
  volume_units: number;
  joined_at: string;
}

export interface ClusterDelivery {
  id: string;
  title: string;
  description: string;
  status: 'forming' | 'in_transit' | 'completed';
  target_participants: number;
  participants_count: number;
  discount_percent: number;
  center_latitude: number;
  center_longitude: number;
  created_at: string;
  participants: ClusterParticipant[];
}

export class LogisticsService extends BaseService {
  async getActiveCluster(): Promise<ClusterDelivery> {
    const response = await this.fetchWithAuth('/v1/clusters/active');
    return response.json();
  }

  async lockPayment(clusterId: string): Promise<ClusterDelivery> {
    const response = await this.fetchWithAuth(`/v1/clusters/${clusterId}/lock-payment`, {
      method: 'POST',
    });
    return response.json();
  }

  async dispatchCluster(clusterId: string): Promise<ClusterDelivery> {
    const response = await this.fetchWithAuth(`/v1/clusters/${clusterId}/dispatch`, {
      method: 'POST',
    });
    return response.json();
  }
}

export const logisticsService = new LogisticsService();
