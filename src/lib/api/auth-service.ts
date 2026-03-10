import type { LoginRequest, RegisterRequest, AuthResponse, AuthUser } from '@/types'
import { api, setAccessToken, setRefreshToken, clearTokens, getRefreshToken } from '@/lib/api/api-client'

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

export async function refreshSession(): Promise<AuthResponse | null> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return null

  try {
    const { data } = await api.post<AuthResponse>('/auth/refresh', { refreshToken })
    setAccessToken(data.accessToken)
    setRefreshToken(data.refreshToken)
    return data
  } catch {
    clearTokens()
    return null
  }
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
