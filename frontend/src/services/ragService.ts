import { BaseService } from './baseService';

export interface RagCitation {
  source_id: string;
  title: string;
  source_uri?: string | null;
  score: number;
  excerpt: string;
  metadata: Record<string, any>;
}

export interface RagGraphInsight {
  entity: string;
  relationship: string;
  evidence: string;
  score: number;
}

export interface RagBusinessAction {
  title: string;
  rationale: string;
  expected_impact: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  metric_to_watch?: string | null;
}

export interface RagQueryResponse {
  answer: string;
  citations: RagCitation[];
  graph_insights: RagGraphInsight[];
  recommended_actions: RagBusinessAction[];
  multimodal_output: Array<Record<string, any>>;
  confidence: number;
  retrieval_mode: string;
  latency_ms: number;
}

export class RagService extends BaseService {
  async chat(
    userId: string,
    message: string,
    tenantId?: string,
    shopId?: string
  ): Promise<RagQueryResponse> {
    const response = await this.fetchWithAuth('/v1/rag/chat', {
      method: 'POST',
      body: JSON.stringify({
        user_id: userId,
        tenant_id: tenantId || userId,
        shop_id: shopId,
        message,
      }),
    });

    return response.json();
  }
}

export const ragService = new RagService();
