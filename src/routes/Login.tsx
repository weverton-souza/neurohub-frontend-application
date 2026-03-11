import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useError } from '@/contexts/ErrorContext'
import Button from '@/components/ui/Button'
import logoDox from '@/assets/logo-dox.svg'
import loginBg from '@/assets/login_background.svg'

function EyeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853" />
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
    </svg>
  )
}

export default function Login() {
  const { login } = useAuth()
  const { showError } = useError()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await login({ email, password })
      navigate('/', { replace: true })
    } catch (err) {
      showError(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 overflow-hidden bg-gray-100" style={{ height: '100dvh' }}>
      <img
        src={loginBg}
        alt=""
        className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none"
      />

      <div
        className="absolute inset-0 pointer-events-none z-[1]"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.25) 1.2px, transparent 1.2px)',
          backgroundSize: '22px 22px',
          maskImage: 'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0) 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0) 100%)',
        }}
      />

      <div className="relative z-20 h-dvh flex items-center justify-center gap-12 lg:gap-20 px-4 sm:px-8">
        <div className="w-full max-w-[380px] bg-white backdrop-blur-2xl border border-gray-200/30 rounded-3xl px-6 sm:px-8 py-6 sm:py-8"
            style={{ boxShadow: '0 8px 30px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)' }}>
          <img src={logoDox} alt="Dox" className="h-10 mx-auto mb-6" />

          <button
            type="button"
            className="w-full flex items-center justify-center gap-2.5 border border-gray-300/60 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors bg-white"
          >
            <GoogleIcon />
            Entrar com Google
          </button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300/60" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white/50 px-3 text-gray-400 rounded">Ou entre com e-mail</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="w-full rounded-lg border border-gray-300/80 bg-white/40 px-3 py-2.5 sm:py-1.5 text-base sm:text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none transition-colors placeholder:text-gray-400"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Senha
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300/80 bg-white/50 px-3 py-2.5 sm:py-1.5 pr-9 text-base sm:text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none transition-colors placeholder:text-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-xs text-gray-600">Manter conectado</span>
              </label>
              <Link
                to="#"
                className="text-xs text-brand-600 hover:text-brand-700 font-medium"
              >
                Esqueceu a senha?
              </Link>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Entrando...' : 'Login'}
            </Button>
          </form>

          <p className="text-center text-xs text-gray-500 mt-4">
            Não tem conta?{' '}
            <Link to="/cadastro" className="text-brand-600 hover:text-brand-700 font-medium">
              Criar conta
            </Link>
          </p>
        </div>

        <div className="hidden md:block text-center z-10 shrink-0">
          <span className="block text-2xl lg:text-3xl xl:text-4xl font-medium text-gray-900 leading-tight">
            Pense diferente.
          </span>
          <span className="block text-4xl lg:text-5xl xl:text-6xl font-bold text-gray-900 leading-tight">
            Crie Melhor!
          </span>
        </div>
      </div>
    </div>
  )
}
