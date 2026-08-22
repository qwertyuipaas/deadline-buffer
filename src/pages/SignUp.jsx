import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Logo from '../components/Logo'
import BufferBar from '../components/BufferBar'
import { getTodayIso } from '../lib/dateCalc'
import { checkUsernameAvailability, validateUsernameFormat, saveUserProfile } from '../lib/profileService'

// Password strength calculation helper
function evaluatePasswordStrength(password) {
  if (!password) return { score: 0, label: '', color: 'bg-paper-dim' }
  let score = 0
  if (password.length >= 6) score += 1
  if (password.length >= 8) score += 1
  if (/[0-9]/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password) || /[A-Z]/.test(password)) score += 1

  switch (score) {
    case 1:
      return { score: 25, label: 'Weak', color: 'bg-deadline' }
    case 2:
      return { score: 50, label: 'Fair', color: 'bg-highlight' }
    case 3:
      return { score: 75, label: 'Good', color: 'bg-buffer' }
    case 4:
      return { score: 100, label: 'Strong', color: 'bg-buffer' }
    default:
      return { score: 0, label: '', color: 'bg-paper-dim' }
  }
}

export default function SignUp() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [studyFocus, setStudyFocus] = useState('both') // 'solo' | 'group' | 'both'
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)
  const [usernameStatus, setUsernameStatus] = useState({ checking: false, available: null, message: '' })

  const { signUp } = useAuth()
  const navigate = useNavigate()
  const today = getTodayIso()

  const passwordStrength = evaluatePasswordStrength(password)
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword

  // Debounced live username availability check
  useEffect(() => {
    const trimmed = fullName.trim()
    if (!trimmed) {
      setUsernameStatus({ checking: false, available: null, message: '' })
      return
    }

    const formatCheck = validateUsernameFormat(trimmed)
    if (!formatCheck.valid) {
      setUsernameStatus({ checking: false, available: false, message: formatCheck.message })
      return
    }

    setUsernameStatus({ checking: true, available: null, message: '' })
    const timer = setTimeout(async () => {
      const res = await checkUsernameAvailability(trimmed)
      setUsernameStatus({ checking: false, available: res.available, message: res.message })
    }, 350)

    return () => clearTimeout(timer)
  }, [fullName])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setNotice('')

    const trimmedUsername = fullName.trim()
    const usernameValidation = validateUsernameFormat(trimmedUsername)
    if (!usernameValidation.valid) {
      setError(usernameValidation.message)
      return
    }

    // Final availability verification
    const availCheck = await checkUsernameAvailability(trimmedUsername)
    if (!availCheck.available) {
      setError(availCheck.message || 'Username is already taken. Please choose another username.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setLoading(true)

    const { data, error } = await signUp(email, password, {
      data: {
        full_name: trimmedUsername,
        display_name: trimmedUsername,
        study_focus: studyFocus,
      },
    })

    setLoading(false)

    if (error) {
      if (error.message?.toLowerCase().includes('already registered') || error.message?.toLowerCase().includes('already exists')) {
        setError('An account with this email address already exists. Please sign in instead.')
      } else {
        setError(error.message)
      }
      return
    }

    // In Supabase, if email already exists and email confirmations are on,
    // it returns an empty identities array instead of an explicit error.
    if (data?.user && (!data.user.identities || data.user.identities.length === 0)) {
      setError('An account with this email address already exists. Please sign in instead.')
      return
    }

    // Save profile record
    if (data?.user?.id) {
      await saveUserProfile(data.user.id, trimmedUsername)
    }

    // If session exists immediately, user is logged in
    if (data?.session) {
      navigate('/dashboard')
      return
    }

    // Otherwise email verification is required
    setNotice(
      'Account created successfully! Please check your email to verify your account, then sign in.'
    )
  }

  return (
    <div className="min-h-screen bg-paper flex">
      {/* ============================================================ */}
      {/* LEFT PANEL: Student Showcase & Brand Visual (Desktop)       */}
      {/* ============================================================ */}
      <div className="hidden lg:flex lg:w-1/2 bg-ink text-paper p-12 flex-col justify-between relative overflow-hidden">
        {/* Ambient Gradient Glows */}
        <div
          className="absolute -top-32 -left-32 w-96 h-96 bg-buffer/20 rounded-full blur-3xl pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-32 -right-32 w-96 h-96 bg-highlight/15 rounded-full blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        {/* Top: Brand Logo */}
        <div className="relative z-10 animate-fade-in">
          <Link to="/" className="inline-block">
            <span className="inline-flex items-center gap-2 font-display font-semibold text-paper select-none">
              <svg width="22" height="22" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <rect x="0.5" y="0.5" width="19" height="19" rx="5" fill="#0E8F82" />
                <path d="M9 0.5H15C17.4853 0.5 19.5 2.51472 19.5 5V15C19.5 17.4853 17.4853 19.5 15 19.5H9V0.5Z" fill="#F6F6F3" />
              </svg>
              <span className="text-xl">
                Deadline<span className="text-buffer">Buffer</span>
              </span>
            </span>
          </Link>
        </div>

        {/* Center: Live Interactive Preview & Feature Bullets */}
        <div className="relative z-10 max-w-md my-8 space-y-8 animate-fade-up delay-100">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium bg-buffer/20 text-buffer-soft border border-buffer/30 mb-4">
              ✨ Student-first productivity
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight leading-tight">
              Start assignments on time. Split group work without friction.
            </h2>
          </div>

          {/* Interactive Mini Preview Card */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 p-5 shadow-2xl">
            <div className="flex items-center justify-between text-xs text-paper/70 mb-2">
              <span className="font-medium text-paper">Capstone Literature Review</span>
              <span className="font-mono text-buffer-soft">8 hours · High Priority</span>
            </div>
            <BufferBar
              todayIso={today}
              startByDate="2026-08-25"
              deadline="2026-08-30"
              status="not_started"
              size="md"
            />
            <div className="flex items-center justify-between text-[11px] text-paper/60 mt-3 pt-2 border-t border-white/10">
              <span>📅 Suggested start: Aug 25</span>
              <span className="text-highlight font-medium">Safe buffer: 4 days</span>
            </div>
          </div>

          {/* Key Perks */}
          <ul className="space-y-3 text-sm text-paper/80">
            <li className="flex items-center gap-3">
              <span className="w-5 h-5 rounded-full bg-buffer/30 text-buffer-soft flex items-center justify-center text-xs font-bold shrink-0">
                ✓
              </span>
              <span><strong>Realistic start-by dates</strong> based on your estimated hours</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="w-5 h-5 rounded-full bg-buffer/30 text-buffer-soft flex items-center justify-center text-xs font-bold shrink-0">
                ✓
              </span>
              <span><strong>Group workload balancing</strong> to avoid overloading teammates</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="w-5 h-5 rounded-full bg-buffer/30 text-buffer-soft flex items-center justify-center text-xs font-bold shrink-0">
                ✓
              </span>
              <span><strong>No credit card required</strong> — 100% free for students</span>
            </li>
          </ul>
        </div>

        {/* Bottom Tagline */}
        <div className="relative z-10 text-xs text-paper/50 font-mono">
          © {new Date().getFullYear()} Deadline Buffer · Built for students who cut it close.
        </div>
      </div>

      {/* ============================================================ */}
      {/* RIGHT PANEL: Modern Sign Up Form                             */}
      {/* ============================================================ */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-6 sm:px-12 md:px-16 py-12 relative overflow-y-auto">
        <div className="max-w-md w-full mx-auto space-y-6 animate-fade-up">
          {/* Mobile Header Logo */}
          <div className="lg:hidden flex items-center justify-between mb-2">
            <Logo size="md" />
            <Link to="/login" className="text-xs text-buffer font-medium hover:underline">
              Sign In
            </Link>
          </div>

          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink tracking-tight">
              Create your account
            </h1>
            <p className="text-sm text-graphite mt-1.5">
              Set up your student profile in less than a minute.
            </p>
          </div>

          {/* Alerts */}
          {error && (
            <div className="p-3.5 rounded-xl text-sm bg-deadline-soft border border-deadline/30 text-deadline animate-fade-up flex items-start gap-2">
              <span className="font-bold shrink-0">⚠️</span>
              <div className="flex-1">
                <span>{error}</span>
                {error.includes('already exists') && (
                  <Link
                    to="/login"
                    className="block mt-1.5 font-semibold text-xs text-buffer hover:underline"
                  >
                    Sign in to your account here →
                  </Link>
                )}
              </div>
            </div>
          )}
          {notice && (
            <div className="p-4 rounded-xl text-sm bg-buffer-soft border border-buffer/30 text-buffer animate-fade-up">
              <p className="font-semibold mb-1">🎉 Almost there!</p>
              <p>{notice}</p>
              <Link
                to="/login"
                className="mt-3 inline-block font-medium text-xs bg-buffer text-white px-3 py-1.5 rounded-lg hover:bg-buffer/90 transition"
              >
                Go to Sign In →
              </Link>
            </div>
          )}

          {/* Sign Up Form */}
          {!notice && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username */}
              <div>
                <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1" htmlFor="fullName">
                  Username
                </label>
                <div className="relative">
                  <input
                    id="fullName"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. glenp"
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 transition-all ${
                      usernameStatus.available === false
                        ? 'border-deadline focus:ring-deadline/30'
                        : usernameStatus.available === true
                        ? 'border-buffer focus:ring-buffer/30'
                        : 'border-ink/15 focus:ring-buffer/50 focus:border-buffer'
                    }`}
                  />
                  {usernameStatus.checking && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-graphite flex items-center gap-1">
                      <svg className="animate-spin w-3.5 h-3.5 text-buffer" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                      </svg>
                    </span>
                  )}
                </div>

                {/* Live Username Status Helper */}
                {usernameStatus.available === true && (
                  <p className="text-[11px] text-buffer font-medium mt-1">
                    ✓ Username is available
                  </p>
                )}
                {usernameStatus.available === false && (
                  <p className="text-[11px] text-deadline font-medium mt-1">
                    {usernameStatus.message}
                  </p>
                )}
                {usernameStatus.available === null && !usernameStatus.checking && (
                  <p className="text-[11px] text-graphite/60 mt-1">
                    This is what we'll call you around the app — not your email.
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1" htmlFor="email">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@university.edu"
                  className="w-full rounded-xl border border-ink/15 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-buffer/50 focus:border-buffer transition-all"
                />
              </div>

              {/* Password with Show/Hide toggle */}
              <div>
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
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full rounded-xl border border-ink/15 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-buffer/50 focus:border-buffer transition-all"
                />

                {/* Password Strength Meter */}
                {password && (
                  <div className="mt-2 space-y-1">
                    <div className="h-1 w-full bg-paper-dim rounded-full overflow-hidden">
                      <div
                        className={`h-full ${passwordStrength.color} transition-all duration-300`}
                        style={{ width: `${passwordStrength.score}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-graphite">
                      <span>Strength: <strong className="text-ink">{passwordStrength.label}</strong></span>
                      <span>Min 6 characters</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1" htmlFor="confirmPassword">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 transition-all ${
                    passwordsMismatch
                      ? 'border-deadline focus:ring-deadline/30'
                      : passwordsMatch
                        ? 'border-buffer focus:ring-buffer/30'
                        : 'border-ink/15 focus:ring-buffer/50 focus:border-buffer'
                  }`}
                />
                {passwordsMatch && (
                  <p className="text-[11px] text-buffer font-medium mt-1">✓ Passwords match</p>
                )}
                {passwordsMismatch && (
                  <p className="text-[11px] text-deadline font-medium mt-1">Passwords do not match</p>
                )}
              </div>

              {/* Study Style Preference (Solo vs Group) */}
              <div>
                <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
                  How do you mostly work?
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'solo', label: 'Solo Tasks', emoji: '🧑‍💻' },
                    { id: 'group', label: 'Group Work', emoji: '👥' },
                    { id: 'both', label: 'Both', emoji: '⚡' },
                  ].map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setStudyFocus(option.id)}
                      className={`p-2.5 rounded-xl border text-center text-xs font-medium transition-all ${
                        studyFocus === option.id
                          ? 'border-buffer bg-buffer-soft text-buffer font-semibold shadow-sm ring-1 ring-buffer/30'
                          : 'border-ink/10 text-graphite hover:border-ink/20 hover:bg-white'
                      }`}
                    >
                      <span className="block text-sm mb-0.5">{option.emoji}</span>
                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-ink text-paper rounded-xl py-3 text-sm font-semibold
                    hover:bg-ink-soft active:scale-[0.98]
                    disabled:opacity-50 transition-all duration-150 shadow-sm
                    relative overflow-hidden group"
                >
                  <span
                    className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 ease-in-out"
                    aria-hidden="true"
                  />
                  <span className="relative flex items-center justify-center gap-2">
                    {loading ? (
                      <>
                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                        </svg>
                        Creating your account…
                      </>
                    ) : (
                      'Create Account →'
                    )}
                  </span>
                </button>
              </div>

              {/* Disclaimer */}
              <p className="text-[11px] text-graphite/60 text-center leading-relaxed">
                By signing up, you agree to manage your deadlines responsibly and give yourself realistic study buffers.
              </p>
            </form>
          )}

          {/* Footer link to Login */}
          <div className="pt-2 text-center border-t border-ink/10">
            <p className="text-sm text-graphite">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-semibold text-buffer hover:text-buffer/80 hover:underline transition"
              >
                Sign in instead →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
