/**
 * TraceMind API Contract Types (v1)
 * Strictly synchronized with docs/API_CONTRACT.md (including Issue 4 analytics contract updates)
 */

export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type Environment = 'production' | 'staging' | 'development';
export type Status = 'open' | 'investigating' | 'mitigated' | 'resolved';
export type FeedbackType = 'accept' | 'reject' | 'modify';

export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy' | string;
  engine?: string;
  model?: string;
  bank_id?: string;
  message?: string;
}

export interface HealthResponse {
  status: 'ok' | 'degraded' | 'error' | string;
  version: string;
  services: {
    database: ServiceHealth;
    groq: ServiceHealth;
    hindsight: ServiceHealth;
  };
}

export interface Incident {
  id: string;
  title: string;
  service: string;
  environment: Environment;
  severity: Severity;
  status: Status;
  symptoms: string;
  error_logs: string;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  is_demo: boolean;
}

export interface IncidentCreateRequest {
  title: string;
  service: string;
  environment: Environment;
  severity: Severity;
  symptoms: string;
  error_logs: string;
}

export interface IncidentListParams {
  status?: Status;
  severity?: Severity;
  service?: string;
  is_demo?: boolean;
  limit?: number;
  offset?: number;
  search?: string;
}

export interface IncidentListResponse {
  items: Incident[];
  total: number;
  limit: number;
  offset: number;
}

export interface Hypothesis {
  description: string;
  confidence: 'high' | 'medium' | 'low';
  rationale: string;
}

export interface RecalledMemory {
  id: string;
  text: string;
  type: string;
  entities?: string[];
  score?: number | null;
  metadata?: {
    service?: string;
    incident_id?: string;
    [key: string]: unknown;
  };
}

export interface Analysis {
  id: number;
  incident_id: string;
  use_memory: boolean;
  model_used: string;
  latency_ms: number;
  hypotheses: Hypothesis[];
  investigation_steps: string[];
  recommendation: string;
  uncertainty_note: string;
  recalled_memories: RecalledMemory[];
  warnings?: string[];
  created_at: string;
}

export interface Resolution {
  id: number;
  incident_id: string;
  confirmed_cause: string;
  steps_taken: string[];
  verified_resolution: string;
  failed_attempts: string[];
  outcome: string;
  created_at: string;
}

export interface Feedback {
  id: number;
  incident_id: string;
  analysis_id: number;
  feedback_type: FeedbackType;
  notes?: string | null;
  modified_recommendation?: string | null;
  created_at: string;
}

export interface IncidentDetail extends Incident {
  analyses: Analysis[];
  resolution: Resolution | null;
  feedback: Feedback[];
}

export interface AnalyzeRequest {
  use_memory: boolean;
}

export interface ResolveRequest {
  confirmed_cause: string;
  steps_taken: string[];
  verified_resolution: string;
  failed_attempts: string[];
  outcome: string;
}

export interface ResolveResponse {
  incident_id: string;
  status: 'resolved';
  resolved_at: string;
  resolution: Resolution;
  retained_in_hindsight: boolean;
  hindsight_status: string;
  error?: string | null;
}

export interface FeedbackRequest {
  analysis_id: number;
  feedback_type: FeedbackType;
  notes?: string | null;
  modified_recommendation?: string | null;
}

export interface MemoryRecallRequest {
  query: string;
  types?: string[];
  budget?: 'low' | 'mid' | 'high' | string;
}

export interface MemoryRecallResponse {
  query: string;
  results: RecalledMemory[];
  total: number;
}

export interface DemoBenchmark {
  basis: 'seeded_sample' | string;
  total_sample_incidents: number;
  resolved_sample_incidents: number;
  avg_sample_resolution_minutes: number;
}

export interface MemoryImpact {
  basis: 'live_runs' | 'insufficient_live_data' | string;
  avg_minutes_to_resolve_with_memory: number | null;
  avg_minutes_to_resolve_without_memory: number | null;
  time_saved_percentage: number | null;
  recall_hit_rate: number | null;
  recall_hit_rate_note?: string | null;
  feedback_accept_rate: number | null;
  demo_benchmark?: DemoBenchmark | null;
  live_samples_count?: number;
}

export interface AnalyticsSummary {
  total_incidents: number;
  live_incidents?: number;
  demo_incidents?: number;
  open_incidents: number;
  resolved_incidents: number;
  memory_impact: MemoryImpact;
  severity_breakdown: Record<Severity | string, number>;
  service_breakdown: Record<string, number>;
}

export interface ApiErrorPayload {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
