import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import {
  mockHealth,
  initialMockIncidents,
  mockAnalyticsSummary,
  getMockAnalysis,
  mockRecalledMemories,
} from './mockData';
import {
  IncidentDetail,
  IncidentListResponse,
  ResolveResponse,
  Feedback,
} from '../types';

// API Base URL strictly adhering to docs/API_CONTRACT.md (default: http://localhost:8000/api)
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

/* =========================================================================
   DEV-ONLY MOCK ADAPTER (ACTIVE ONLY WHEN VITE_USE_MOCKS === 'true')
   ========================================================================= */

// In-memory mutable store for local development preview
const devMockStore: {
  incidents: IncidentDetail[];
} = {
  incidents: JSON.parse(JSON.stringify(initialMockIncidents)),
};

if (USE_MOCKS) {
  console.warn(
    '%c[TraceMind DEV MOCK ACTIVE]%c VITE_USE_MOCKS=true. Using mock adapter strictly conforming to docs/API_CONTRACT.md. Turn off for live demo.',
    'background: #0d9488; color: #fff; font-weight: bold; padding: 2px 6px; border-radius: 3px;',
    'color: #38bdf8;'
  );

  // Custom adapter that intercepts and provides simulated contract data
  apiClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    // Artificial latency to simulate real network ops feel
    await new Promise((resolve) => setTimeout(resolve, 250));

    const url = config.url || '';
    const method = (config.method || 'get').toLowerCase();

    // 1. GET /health
    if (url === '/health' && method === 'get') {
      return {
        data: mockHealth,
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    }

    // 2. GET /incidents
    if (url === '/incidents' && method === 'get') {
      const params = config.params || {};
      let items = [...devMockStore.incidents];

      if (params.status) {
        items = items.filter((inc) => inc.status === params.status);
      }
      if (params.severity) {
        items = items.filter((inc) => inc.severity === params.severity);
      }
      if (params.service) {
        items = items.filter((inc) =>
          inc.service.toLowerCase().includes(params.service.toLowerCase())
        );
      }
      if (params.search) {
        const query = params.search.toLowerCase();
        items = items.filter(
          (inc) =>
            inc.title.toLowerCase().includes(query) ||
            inc.id.toLowerCase().includes(query) ||
            inc.symptoms.toLowerCase().includes(query)
        );
      }
      if (typeof params.is_demo === 'boolean') {
        items = items.filter((inc) => inc.is_demo === params.is_demo);
      }

      const total = items.length;
      const offset = Number(params.offset || 0);
      const limit = Number(params.limit || 50);
      const paginated = items.slice(offset, offset + limit);

      const response: IncidentListResponse = {
        items: paginated,
        total,
        limit,
        offset,
      };

      return {
        data: response,
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    }

    // 3. POST /incidents
    if (url === '/incidents' && method === 'post') {
      const payload = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
      const nextNum = devMockStore.incidents.length + 1;
      const newId = `INC-${String(nextNum).padStart(3, '0')}`;
      const now = new Date().toISOString();

      const newIncident: IncidentDetail = {
        id: newId,
        title: payload.title,
        service: payload.service,
        environment: payload.environment || 'production',
        severity: payload.severity || 'medium',
        status: 'open',
        symptoms: payload.symptoms || '',
        error_logs: payload.error_logs || '',
        created_at: now,
        updated_at: now,
        resolved_at: null,
        is_demo: false,
        analyses: [],
        resolution: null,
        feedback: [],
      };

      devMockStore.incidents.unshift(newIncident);

      return {
        data: newIncident,
        status: 201,
        statusText: 'Created',
        headers: {},
        config,
      };
    }

    // 4. GET /incidents/:id
    const singleIncidentMatch = url.match(/^\/incidents\/([^/]+)$/);
    if (singleIncidentMatch && method === 'get') {
      const id = singleIncidentMatch[1];
      const found = devMockStore.incidents.find((inc) => inc.id === id);
      if (!found) {
        throw new AxiosError(
          `Incident ${id} was not found`,
          '404',
          config,
          undefined,
          {
            data: {
              error: {
                code: 'INCIDENT_NOT_FOUND',
                message: `Incident ${id} was not found`,
                details: null,
              },
            },
            status: 404,
            statusText: 'Not Found',
            headers: {},
            config,
          }
        );
      }
      return {
        data: found,
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    }

    // 5. POST /incidents/:id/analyze
    const analyzeMatch = url.match(/^\/incidents\/([^/]+)\/analyze$/);
    if (analyzeMatch && method === 'post') {
      const id = analyzeMatch[1];
      const found = devMockStore.incidents.find((inc) => inc.id === id);
      if (!found) {
        throw new AxiosError('Incident not found', '404', config, undefined, {
          data: { error: { code: 'INCIDENT_NOT_FOUND', message: `Incident ${id} not found` } },
          status: 404,
          statusText: 'Not Found',
          headers: {},
          config,
        });
      }
      const payload = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
      const useMemory = Boolean(payload?.use_memory);
      const analysis = getMockAnalysis(found, useMemory);

      found.analyses.push(analysis);
      if (found.status === 'open') {
        found.status = 'investigating';
      }

      return {
        data: analysis,
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    }

    // 6. POST /incidents/:id/resolve
    const resolveMatch = url.match(/^\/incidents\/([^/]+)\/resolve$/);
    if (resolveMatch && method === 'post') {
      const id = resolveMatch[1];
      const found = devMockStore.incidents.find((inc) => inc.id === id);
      if (!found) {
        throw new AxiosError('Incident not found', '404', config, undefined, {
          data: { error: { code: 'INCIDENT_NOT_FOUND', message: `Incident ${id} not found` } },
          status: 404,
          statusText: 'Not Found',
          headers: {},
          config,
        });
      }
      const payload = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
      const now = new Date().toISOString();

      const resolution = {
        id: Date.now(),
        incident_id: id,
        confirmed_cause: payload.confirmed_cause || '',
        steps_taken: payload.steps_taken || [],
        verified_resolution: payload.verified_resolution || '',
        failed_attempts: payload.failed_attempts || [],
        outcome: payload.outcome || '',
        created_at: now,
      };

      found.status = 'resolved';
      found.resolved_at = now;
      found.updated_at = now;
      found.resolution = resolution;

      const response: ResolveResponse = {
        incident_id: id,
        status: 'resolved',
        resolved_at: now,
        resolution,
        retained_in_hindsight: true,
        hindsight_status: 'retained',
        error: null,
      };

      return {
        data: response,
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    }

    // 7. POST /incidents/:id/feedback
    const feedbackMatch = url.match(/^\/incidents\/([^/]+)\/feedback$/);
    if (feedbackMatch && method === 'post') {
      const id = feedbackMatch[1];
      const found = devMockStore.incidents.find((inc) => inc.id === id);
      const payload = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
      const now = new Date().toISOString();

      const newFeedback: Feedback = {
        id: Date.now(),
        incident_id: id,
        analysis_id: payload.analysis_id,
        feedback_type: payload.feedback_type,
        notes: payload.notes || null,
        modified_recommendation: payload.modified_recommendation || null,
        created_at: now,
      };

      if (found) {
        found.feedback.push(newFeedback);
      }

      return {
        data: newFeedback,
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    }

    // 8. POST /memory/recall
    if (url === '/memory/recall' && method === 'post') {
      const payload = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
      const query = (payload?.query || '').toLowerCase();

      const filtered = mockRecalledMemories.results.filter((m) =>
        m.text.toLowerCase().includes(query) ||
        (m.entities || []).some((e) => e.toLowerCase().includes(query))
      );

      return {
        data: {
          query: payload?.query || '',
          results: filtered.length > 0 ? filtered : mockRecalledMemories.results,
          total: filtered.length > 0 ? filtered.length : mockRecalledMemories.results.length,
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    }

    // 9. GET /analytics/summary
    if (url === '/analytics/summary' && method === 'get') {
      return {
        data: mockAnalyticsSummary,
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    }

    // Fallback for unhandled mock route
    throw new AxiosError(`Mock route not implemented: ${method.toUpperCase()} ${url}`, '404', config);
  };
}

