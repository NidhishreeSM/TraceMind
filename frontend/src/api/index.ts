import { AxiosError } from 'axios';
import { apiClient } from './client';
import {
  HealthResponse,
  IncidentCreateRequest,
  IncidentDetail,
  IncidentListParams,
  IncidentListResponse,
  AnalyzeRequest,
  Analysis,
  ResolveRequest,
  ResolveResponse,
  FeedbackRequest,
  Feedback,
  MemoryRecallRequest,
  MemoryRecallResponse,
  MemoryStatsResponse,
  AnalyticsSummary,
  ApiErrorPayload,
} from '../types';

export * from './client';

/**
 * Standardized error extractor following docs/API_CONTRACT.md error envelope
 * Maps specific system error codes:
 * - HINDSIGHT_UNAVAILABLE -> "Memory service unavailable"
 * - LLM_UNAVAILABLE -> "AI service unavailable"
 */
export function extractErrorMessage(err: unknown): string {
  if (err instanceof AxiosError && err.response?.data) {
    const errorPayload = err.response.data as ApiErrorPayload;
    const code = errorPayload.error?.code;

    if (code === 'HINDSIGHT_UNAVAILABLE') {
      return 'Memory service unavailable';
    }
    if (code === 'LLM_UNAVAILABLE') {
      return 'AI service unavailable';
    }
    if (errorPayload.error?.message) {
      return errorPayload.error.message;
    }
  }
  if (err instanceof Error) {
    return err.message;
  }
  return 'An unexpected network error occurred';
}

export function extractErrorCode(err: unknown): string | undefined {
  if (err instanceof AxiosError && err.response?.data) {
    const errorPayload = err.response.data as ApiErrorPayload;
    return errorPayload.error?.code;
  }
  return undefined;
}

/**
 * GET /api/health
 */
export async function getHealth(): Promise<HealthResponse> {
  const response = await apiClient.get<HealthResponse>('/health');
  return response.data;
}

/**
 * GET /api/incidents
 */
export async function getIncidents(params?: IncidentListParams): Promise<IncidentListResponse> {
  const response = await apiClient.get<IncidentListResponse>('/incidents', { params });
  return response.data;
}

/**
 * GET /api/incidents/{id}
 */
export async function getIncident(id: string): Promise<IncidentDetail> {
  const response = await apiClient.get<IncidentDetail>(`/incidents/${id}`);
  return response.data;
}

/**
 * POST /api/incidents
 */
export async function createIncident(data: IncidentCreateRequest): Promise<IncidentDetail> {
  const response = await apiClient.post<IncidentDetail>('/incidents', data);
  return response.data;
}

/**
 * POST /api/incidents/{id}/analyze
 */
export async function analyzeIncident(id: string, req: AnalyzeRequest): Promise<Analysis> {
  const response = await apiClient.post<Analysis>(`/incidents/${id}/analyze`, req);
  return response.data;
}

/**
 * POST /api/incidents/{id}/resolve
 */
export async function resolveIncident(id: string, req: ResolveRequest): Promise<ResolveResponse> {
  const response = await apiClient.post<ResolveResponse>(`/incidents/${id}/resolve`, req);
  return response.data;
}

/**
 * POST /api/incidents/{id}/feedback
 */
export async function sendFeedback(id: string, req: FeedbackRequest): Promise<Feedback> {
  const response = await apiClient.post<Feedback>(`/incidents/${id}/feedback`, req);
  return response.data;
}

/**
 * POST /api/memory/recall
 * Sends { query } by default, adding optional contract filters only when provided.
 */
export async function recallMemory(req: MemoryRecallRequest): Promise<MemoryRecallResponse> {
  const payload: Record<string, unknown> = {
    query: req.query,
  };
  if (req.types && req.types.length > 0) {
    payload.types = req.types;
  }
  if (req.budget) {
    payload.budget = req.budget;
  }
  if (req.limit) {
    payload.limit = req.limit;
  }

  const response = await apiClient.post<MemoryRecallResponse>('/memory/recall', payload);
  return response.data;
}

/**
 * GET /api/memory/stats
 * Retrieves live memory bank statistics directly from Hindsight API
 */
export async function getMemoryStats(): Promise<MemoryStatsResponse> {
  const response = await apiClient.get<MemoryStatsResponse>('/memory/stats');
  return response.data;
}

/**
 * GET /api/analytics/summary
 */
export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  const response = await apiClient.get<AnalyticsSummary>('/analytics/summary');
  return response.data;
}
