import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { AuthUser, LoginRequest, RegisterRequest } from '@/types'
import {
  login as apiLogin,
  register as apiRegister,
  logout as apiLogout,
  refreshSession,
  switchTenant as apiSwitchTenant,
  authResponseToUser,
} from '@/lib/api/auth-service'
import { clearTokens, getAccessToken, getStoredUser, setStoredUser } from '@/lib/api/api-client'

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (credentials: LoginRequest) => Promise<void>
  register: (data: RegisterRequest) => Promise<void>
  logout: () => Promise<void>
  switchTenant: (tenantId: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Restore user synchronously from sessionStorage (avoids StrictMode race conditions)
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = getStoredUser()
    if (stored && getAccessToken()) {
      try { return JSON.parse(stored) as AuthUser } catch { return null }
    }
    return null
  })
  const [isLoading, setIsLoading] = useState(() => !getStoredUser() || !getAccessToken())

  // Fallback: try refresh token only if no stored session
  useEffect(() => {
    if (getStoredUser() && getAccessToken()) return

    let cancelled = false
    refreshSession()
      .then((response) => {
        if (!cancelled && response) {
          setUser(authResponseToUser(response))
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  // Persist user to sessionStorage whenever it changes
  useEffect(() => {
    setStoredUser(user ? JSON.stringify(user) : null)
  }, [user])

  const login = useCallback(async (credentials: LoginRequest) => {
    const response = await apiLogin(credentials)
    setUser(authResponseToUser(response))
  }, [])

  const register = useCallback(async (data: RegisterRequest) => {
    const response = await apiRegister(data)
    setUser(authResponseToUser(response))
  }, [])

  const logout = useCallback(async () => {
    try {
      await apiLogout()
    } catch {
      clearTokens()
    }
    setUser(null)
  }, [])

  const switchTenant = useCallback(async (tenantId: string) => {
    const response = await apiSwitchTenant(tenantId)
    setUser(authResponseToUser(response))
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        switchTenant,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
