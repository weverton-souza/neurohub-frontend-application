import axios from 'axios'
import type { LoginRequest, RegisterRequest, AuthResponse, AuthUser } from '@/types'
import { api, setAccessToken, setRefreshToken, clearTokens, getRefreshToken, API_BASE_URL } from '@/lib/api/api-client'

export async function login(credentials: LoginRequest): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/login', credentials)
  setAccessToken(data.accessToken)
  setRefreshToken(data.refreshToken)
  return data
}

export async function register(request: RegisterRequest): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/register', request)
  setAccessToken(data.accessToken)
  setRefreshToken(data.refreshToken)
  return data
}

export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken()
  try {
    if (refreshToken) {
      await api.post('/auth/logout', { refreshToken })
    }
  } finally {
    clearTokens()
  }
}

let refreshPromise: Promise<AuthResponse | null> | null = null

export async function refreshSession(): Promise<AuthResponse | null> {
  // Deduplicate concurrent calls (e.g. React StrictMode double-mount)
  if (refreshPromise) return refreshPromise

  const refreshToken = getRefreshToken()
  if (!refreshToken) return null

  refreshPromise = (async () => {
    try {
      // Use raw axios to bypass interceptors — avoids recursive refresh loop
      const { data } = await axios.post<AuthResponse>(
        `${API_BASE_URL}/auth/refresh`,
        { refreshToken },
        { headers: { 'Content-Type': 'application/json' } },
      )
      setAccessToken(data.accessToken)
      setRefreshToken(data.refreshToken)
      return data
    } catch (err) {
      // Only clear tokens on auth rejection (4xx), not on network/server errors
      if (axios.isAxiosError(err) && err.response && err.response.status < 500) {
        clearTokens()
      }
      return null
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

export async function switchTenant(tenantId: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/switch-tenant', { tenantId })
  setAccessToken(data.accessToken)
  setRefreshToken(data.refreshToken)
  return data
}

export function isAuthenticated(): boolean {
  return !!getRefreshToken()
}

export function authResponseToUser(response: AuthResponse): AuthUser {
  return {
    id: response.userId,
    email: response.email,
    name: response.name,
    tenantId: response.tenantId,
    vertical: response.vertical,
  }
}
