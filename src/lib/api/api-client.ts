import axios from 'axios'
import type { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios'
import type { ProblemDetail, RefreshRequest } from '@/types'

// ========== Token Management ==========

let accessToken: string | null = null

const REFRESH_TOKEN_KEY = 'dox_refresh_token'
const ACCESS_TOKEN_KEY = 'dox_access_token'
const USER_KEY = 'dox_user'

// Restore accessToken from sessionStorage on module load (survives page refresh)
accessToken = sessionStorage.getItem(ACCESS_TOKEN_KEY)

export function getAccessToken(): string | null {
  return accessToken
}

export function setAccessToken(token: string | null): void {
  accessToken = token
  if (token) {
    sessionStorage.setItem(ACCESS_TOKEN_KEY, token)
  } else {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY)
  }
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function setRefreshToken(token: string | null): void {
  if (token) {
    localStorage.setItem(REFRESH_TOKEN_KEY, token)
  } else {
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  }
}

export function getStoredUser(): string | null {
  return sessionStorage.getItem(USER_KEY)
}

export function setStoredUser(json: string | null): void {
  if (json) {
    sessionStorage.setItem(USER_KEY, json)
  } else {
    sessionStorage.removeItem(USER_KEY)
  }
}

export function clearTokens(): void {
  accessToken = null
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  sessionStorage.removeItem(ACCESS_TOKEN_KEY)
  sessionStorage.removeItem(USER_KEY)
}

// ========== Error Classes ==========

export class ApiError extends Error {
  constructor(
    public readonly problemDetail: ProblemDetail,
    public readonly status: number,
  ) {
    super(problemDetail.detail || problemDetail.title)
    this.name = 'ApiError'
  }
}

export class NetworkError extends Error {
  constructor(message: string = 'Sem conexão com o servidor') {
    super(message)
    this.name = 'NetworkError'
  }
}

// ========== Axios Instance ==========

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ========== Request Interceptor ==========

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (accessToken && !config.headers?.['Skip-Auth']) {
      config.headers.Authorization = `Bearer ${accessToken}`
    }
    delete config.headers['Skip-Auth']
    return config
  },
)

// ========== Response Interceptor (auto-refresh) ==========

let refreshPromise: Promise<boolean> | null = null

async function refreshAccessToken(): Promise<boolean> {
  const refresh = getRefreshToken()
  if (!refresh) return false

  try {
    const res = await axios.post<{ accessToken: string; refreshToken: string }>(
      `${API_BASE_URL}/auth/refresh`,
      { refreshToken: refresh } satisfies RefreshRequest,
      { headers: { 'Content-Type': 'application/json' } },
    )
    setAccessToken(res.data.accessToken)
    setRefreshToken(res.data.refreshToken)
    return true
  } catch {
    clearTokens()
    return false
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    // Network error (no response)
    if (!error.response) {
      return Promise.reject(new NetworkError())
    }

    const { status, data } = error.response
    const originalRequest = error.config

    // Auto-refresh on TOKEN_EXPIRED
    if (
      status === 401 &&
      originalRequest &&
      !(originalRequest as InternalAxiosRequestConfig & { _retry?: boolean })._retry
    ) {
      const problemData = data as ProblemDetail | null
      const errorCode = problemData?.properties?.errorCode

      if (errorCode === 'TOKEN_EXPIRED') {
        (originalRequest as InternalAxiosRequestConfig & { _retry?: boolean })._retry = true

        // Deduplicate concurrent refresh attempts
        if (!refreshPromise) {
          refreshPromise = refreshAccessToken().finally(() => {
            refreshPromise = null
          })
        }

        const refreshed = await refreshPromise
        if (refreshed) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`
          return api(originalRequest)
        }
      }
    }

    // Parse ProblemDetail from response
    const responseData = data as Record<string, unknown> | null
    if (responseData && typeof responseData.type === 'string' && responseData.type.startsWith('urn:dox:error:')) {
      return Promise.reject(new ApiError(responseData as unknown as ProblemDetail, status))
    }

    // Fallback for non-ProblemDetail errors
    return Promise.reject(
      new ApiError(
        {
          type: 'urn:dox:error:INTERNAL_ERROR',
          title: 'Erro desconhecido',
          status,
          detail: 'O servidor retornou um erro inesperado.',
          instance: originalRequest?.url || '',
          properties: {
            errorCode: 'INTERNAL_ERROR',
            timestamp: new Date().toISOString(),
          },
        },
        status,
      ),
    )
  },
)

export { api }
