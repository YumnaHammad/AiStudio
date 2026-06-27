import { useAuthStore } from './auth-store';
import type { ApiError, ApiResponse } from './types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export class ApiRequestError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public body?: ApiError,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  skipAuth?: boolean;
};

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken, setTokens, clearAuth } = useAuthStore.getState();
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      clearAuth();
      return null;
    }

    const json = (await res.json()) as ApiResponse<{
      accessToken: string;
      refreshToken: string;
    }>;
    const { accessToken, refreshToken: newRefresh } = json.data;
    setTokens(accessToken, newRefresh);
    return accessToken;
  } catch {
    clearAuth();
    return null;
  }
}

async function getValidToken(skipAuth?: boolean): Promise<string | null> {
  if (skipAuth) return null;
  const { accessToken } = useAuthStore.getState();
  return accessToken;
}

async function parseResponse<T>(res: Response): Promise<T> {
  const contentType = res.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    if (!res.ok) {
      throw new ApiRequestError(res.status, res.statusText);
    }
    return undefined as T;
  }

  const json = await res.json();

  if (!res.ok) {
    const err = json as ApiError;
    throw new ApiRequestError(
      res.status,
      err.message ?? 'Request failed',
      err,
    );
  }

  return json as T;
}

export async function api<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, skipAuth, headers: customHeaders, ...rest } = options;

  const makeRequest = async (token: string | null): Promise<Response> => {
    const headers: Record<string, string> = {
      ...(customHeaders as Record<string, string>),
    };

    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return fetch(`${BASE_URL}${path}`, {
      ...rest,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  };

  let token = await getValidToken(skipAuth);
  let res = await makeRequest(token);

  if (res.status === 401 && !skipAuth) {
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
    }
    token = await refreshPromise;
    if (token) {
      res = await makeRequest(token);
    }
  }

  return parseResponse<T>(res);
}

export async function apiData<T>(
  path: string,
  options?: RequestOptions,
): Promise<T> {
  const response = await api<ApiResponse<T>>(path, options);
  return response.data;
}

export async function apiPaginated<T>(
  path: string,
  options?: RequestOptions,
): Promise<{ data: T[]; meta: NonNullable<ApiResponse<T[]>['meta']> }> {
  const response = await api<ApiResponse<T[]>>(path, options);
  return {
    data: response.data,
    meta: response.meta ?? { total: 0, page: 1, limit: 20, totalPages: 0 },
  };
}

export const apiClient = {
  auth: {
    login: (email: string, password: string) =>
      apiData<import('./types').AuthResponse>('/auth/login', {
        method: 'POST',
        body: { email, password },
        skipAuth: true,
      }),
    register: (data: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      organizationName: string;
    }) =>
      apiData<import('./types').AuthResponse>('/auth/register', {
        method: 'POST',
        body: data,
        skipAuth: true,
      }),
    logout: (refreshToken?: string) =>
      apiData<{ success: boolean }>('/auth/logout', {
        method: 'POST',
        body: { refreshToken },
      }),
    changePassword: (currentPassword: string, newPassword: string) =>
      apiData<{ success: boolean }>('/auth/password', {
        method: 'PATCH',
        body: { currentPassword, newPassword },
      }),
    invite: (email: string, role: string) =>
      apiData<{ success: boolean }>('/auth/invite', {
        method: 'POST',
        body: { email, role },
      }),
  },
  dashboard: {
    summary: () => apiData<import('./types').DashboardSummary>('/dashboard/summary'),
  },
  campaigns: {
    list: (page = 1, limit = 20) =>
      apiPaginated<import('./types').Campaign>(
        `/campaigns?page=${page}&limit=${limit}`,
      ),
    get: (id: string) => apiData<import('./types').Campaign>(`/campaigns/${id}`),
    create: (data: { name: string; description?: string }) =>
      apiData<import('./types').Campaign>('/campaigns', {
        method: 'POST',
        body: data,
      }),
    update: (id: string, data: { name?: string; description?: string }) =>
      apiData<import('./types').Campaign>(`/campaigns/${id}`, {
        method: 'PATCH',
        body: data,
      }),
    delete: (id: string) =>
      apiData<{ success: boolean }>(`/campaigns/${id}`, { method: 'DELETE' }),
  },
  projects: {
    list: (params?: { page?: number; limit?: number; campaignId?: string; status?: string }) => {
      const search = new URLSearchParams();
      if (params?.page) search.set('page', String(params.page));
      if (params?.limit) search.set('limit', String(params.limit));
      if (params?.campaignId) search.set('campaignId', params.campaignId);
      if (params?.status) search.set('status', params.status);
      const qs = search.toString();
      return apiPaginated<import('./types').ProjectSummary>(
        `/projects${qs ? `?${qs}` : ''}`,
      );
    },
    get: (id: string) =>
      apiData<import('./types').ProjectDetail>(`/projects/${id}`),
    create: (data: {
      campaignId: string;
      topic: string;
      language?: string;
      videoStyle?: string;
      platform?: string;
      durationTarget?: number;
      autoApprove?: boolean;
      customScript?: string;
    }) =>
      apiData<{ project: import('./types').ProjectDetail; workflow: unknown }>(
        '/projects',
        { method: 'POST', body: data },
      ),
    approve: (id: string) =>
      apiData<import('./types').ProjectDetail>(`/projects/${id}/approve`, {
        method: 'POST',
      }),
    cancel: (id: string) =>
      apiData<import('./types').ProjectDetail>(`/projects/${id}/cancel`, {
        method: 'POST',
      }),
    resume: (id: string) =>
      apiData<import('./types').ProjectDetail>(`/projects/${id}/resume`, {
        method: 'POST',
      }),
    retryRender: (id: string) =>
      apiData<{ videoId: string; jobId: string }>(`/projects/${id}/retry-render`, {
        method: 'POST',
      }),
    workflow: (projectId: string) =>
      apiData<import('./types').WorkflowExecution | null>(
        `/projects/${projectId}/workflow`,
      ),
    retryWorker: (projectId: string, workerKey: string) =>
      apiData<unknown>(`/projects/${projectId}/workflow/retry/${workerKey}`, {
        method: 'POST',
      }),
  },
  prompts: {
    list: (workerKey?: string) =>
      apiData<import('./types').Prompt[]>(
        `/prompts${workerKey ? `?workerKey=${workerKey}` : ''}`,
      ),
    get: (id: string) => apiData<import('./types').Prompt>(`/prompts/${id}`),
    create: (data: { workerKey: string; purpose: string; description?: string }) =>
      apiData<import('./types').Prompt>('/prompts', { method: 'POST', body: data }),
    update: (id: string, data: { purpose?: string; description?: string }) =>
      apiData<import('./types').Prompt>(`/prompts/${id}`, {
        method: 'PATCH',
        body: data,
      }),
    createVersion: (id: string, content: string, variables?: unknown[]) =>
      apiData<import('./types').PromptVersion>(`/prompts/${id}/versions`, {
        method: 'POST',
        body: { content, variables },
      }),
    activateVersion: (id: string, versionId: string) =>
      apiData<import('./types').Prompt>(`/prompts/${id}/versions/${versionId}/activate`, {
        method: 'PATCH',
      }),
  },
  queues: {
    list: () => apiData<import('./types').QueueStats[]>('/queues'),
    jobs: (name: string, status = 'waiting', start = 0, end = 20) =>
      apiData<import('./types').QueueJob[]>(
        `/queues/${name}/jobs?status=${status}&start=${start}&end=${end}`,
      ),
    cancelJob: (name: string, jobId: string) =>
      apiData<{ success: boolean }>(`/queues/${name}/jobs/${jobId}/cancel`, {
        method: 'POST',
      }),
    retryJob: (name: string, jobId: string) =>
      apiData<{ success: boolean }>(`/queues/${name}/jobs/${jobId}/retry`, {
        method: 'POST',
      }),
  },
  users: {
    me: () => apiData<import('./types').UserProfile>('/users/me'),
    members: () => apiData<import('./types').WorkspaceMember[]>('/users/members'),
  },
  apiKeys: {
    list: () => apiData<import('./types').ApiKey[]>('/settings/api-keys'),
    create: (data: { provider: string; label: string; key: string }) =>
      apiData<import('./types').ApiKey & { key: string }>('/settings/api-keys', {
        method: 'POST',
        body: data,
      }),
    delete: (id: string) =>
      apiData<{ success: boolean }>(`/settings/api-keys/${id}`, {
        method: 'DELETE',
      }),
  },
};
