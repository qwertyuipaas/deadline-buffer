import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Logo from '../components/Logo'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { user, signIn } = useAuth()
  const navigate = useNavigate()


  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true })
    }
  }, [user, navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await signIn(email, password)
    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-paper px-4 relative overflow-hidden">
      {/* Decorative background blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-buffer/10 rounded-full blur-3xl animate-fade-in delay-200" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-highlight/10 rounded-full blur-3xl animate-fade-in delay-400" />
      </div>

      {/* Logo */}
      <Link to="/" className="mb-8 animate-fade-up delay-0">
        <Logo size="lg" />
      </Link>

      {/* Sign In Card */}
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-ink/10 p-8 animate-fade-up delay-100">
        <h1 className="font-display text-2xl font-bold text-ink mb-1">
          Welcome back
        </h1>
        <p className="text-sm text-graphite mb-6">
          Sign in to view your projects and deadlines.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="animate-fade-up delay-150">
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-ink/15 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-buffer/50 focus:border-buffer transition-all"
              placeholder="you@example.com"
            />
          </div>

          <div className="animate-fade-up delay-200">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-ink uppercase tracking-wider" htmlFor="password">
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="text-xs text-graphite hover:text-ink font-medium transition"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-ink/15 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-buffer/50 focus:border-buffer transition-all"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl text-sm bg-deadline-soft border border-deadline/30 text-deadline animate-fade-up flex items-start gap-2">
              <span className="font-bold shrink-0">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <div className="animate-fade-up delay-250 pt-1">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-ink text-paper rounded-xl py-2.5 text-sm font-semibold
                hover:bg-ink-soft active:scale-[0.98]
                disabled:opacity-50 transition-all duration-150 shadow-sm
                relative overflow-hidden group"
            >
              <span
                className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 ease-in-out"
                aria-hidden="true"
              />
              <span className="relative">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                    </svg>
                    Signing in…
                  </span>
                ) : (
                  'Sign In'
                )}
              </span>
            </button>
          </div>
        </form>

        <div className="mt-6 pt-4 border-t border-ink/10 text-center animate-fade-up delay-300">
          <p className="text-sm text-graphite">
            New to Deadline Buffer?{' '}
            <Link
              to="/signup"
              className="font-semibold text-buffer hover:text-buffer/80 hover:underline transition"
            >
              Create account →
            </Link>
          </p>
        </div>
      </div>

      {/* Subtle bottom tagline */}
      <p className="mt-6 text-xs text-graphite/50 animate-fade-up delay-400 font-mono">
        Built for students who cut it close.
      </p>
    </div>
  )
}
