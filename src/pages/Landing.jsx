import { useState, useEffect, useRef } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getTodayIso, calculateStartByDate } from '../lib/dateCalc'
import BufferBar from '../components/BufferBar'
import MemberWorkloadBar from '../components/MemberWorkloadBar'
import Logo from '../components/Logo'

// Words to cycle through in the animated typewriter header
const ROTATING_WORDS = [
  'your thesis.',
  'group projects.',
  'research papers.',
  'problem sets.',
  'capstone reports.',
  'final presentations.',
]

function useTypewriter(words, typingSpeed = 90, deletingSpeed = 45, pauseTime = 1600) {
  const [index, setIndex] = useState(0)
  const [subIndex, setSubIndex] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const currentWord = words[index % words.length]

    if (!isDeleting && subIndex === currentWord.length) {
      const timeout = setTimeout(() => setIsDeleting(true), pauseTime)
      return () => clearTimeout(timeout)
    }

    if (isDeleting && subIndex === 0) {
      setIsDeleting(false)
      setIndex((prev) => (prev + 1) % words.length)
      return
    }

    const timeout = setTimeout(
      () => {
        setSubIndex((prev) => prev + (isDeleting ? -1 : 1))
      },
      isDeleting ? deletingSpeed : typingSpeed
    )

    return () => clearTimeout(timeout)
  }, [subIndex, isDeleting, index, words, typingSpeed, deletingSpeed, pauseTime])

  return words[index % words.length].substring(0, subIndex)
}

// Carousel Slide Definitions
const CAROUSEL_SLIDES = [
  {
    id: 'group',
    tabTitle: 'Group Workload',
    badge: 'Feature 01 · Team Balancing',
    title: 'Assign work to who actually has room',
    description: 'Split project tasks into hours and assign them to teammates based on real weekly availability.',
  },
  {
    id: 'buffer',
    tabTitle: 'Deadline Buffer',
    badge: 'Feature 02 · Start-By Date',
    title: 'Turn deadlines into realistic start-by dates',
    description: 'Never start 12 hours before it’s due. The buffer gives you a calm cushion that scales with priority.',
  },
  {
    id: 'urgency',
    tabTitle: 'Urgency Triage',
    badge: 'Feature 03 · Smart Alerts',
    title: 'Know what needs your focus today',
    description: 'Color-coded urgency indicators alert you before a task becomes critical or overdue.',
  },
  {
    id: 'setup',
    tabTitle: 'Rapid Setup',
    badge: 'Feature 04 · Zero Friction',
    title: 'Set up projects and members in 30 seconds',
    description: 'No complicated enterprise project boards. Just solo task lists or group projects ready to go.',
  },
]

// Slide 1 Dynamic Group Scenarios
const GROUP_SCENARIOS = [
  { taskIdx: 0, memberId: 'm2', note: 'Jamie has 6h free — auto-suggested' },
  { taskIdx: 1, memberId: 'm3', note: 'Sam assigned 5h task — exceeds weekly limit' },
  { taskIdx: 1, memberId: 'm1', note: 'Reassigned to Alex → Balanced safely (9/10h) ✓' },
  { taskIdx: 2, memberId: 'm2', note: 'Summary task assigned to Jamie → Safe buffer (4/8h) ✓' },
]

// Slide 2 Dynamic Solo Scenarios
const SOLO_SCENARIOS = [
  { name: 'Physiology Lab Report', hours: 8, priority: 'high', daysOut: 10, pace: 'Start 6 days early (2h/day)' },
  { name: 'Senior Thesis Chapter 2', hours: 14, priority: 'high', daysOut: 14, pace: 'Start 10 days early (2.5h/day)' },
  { name: 'Calculus Problem Set', hours: 4, priority: 'medium', daysOut: 6, pace: 'Start 3 days early (1.5h/day)' },
  { name: 'Machine Learning Term Paper', hours: 10, priority: 'high', daysOut: 12, pace: 'Start 8 days early (2h/day)' },
]

export default function Landing() {
  const { user, loading } = useAuth()
  const typedWord = useTypewriter(ROTATING_WORDS)
  const today = getTodayIso()

  // Interactive playground state on the solo hero card
  const [demoHours, setDemoHours] = useState(6)
  const [demoPriority, setDemoPriority] = useState('high')

  // Smooth Carousel State (Switches infinitely every 2 seconds)
  const [activeSlide, setActiveSlide] = useState(0)
  const [isCarouselPaused, setIsCarouselPaused] = useState(false)
  const interactionTimeoutRef = useRef(null)

  // Internal auto-switching sub-states
  const [groupStep, setGroupStep] = useState(0)
  const [soloStep, setSoloStep] = useState(0)
  const [urgencyStep, setUrgencyStep] = useState(0)
  const [setupStep, setSetupStep] = useState(0)

  // Infinite Carousel Loop: auto-advances every 6 seconds (slow enough to read a slide)
  const SLIDE_INTERVAL_MS = 6000

  useEffect(() => {
    if (isCarouselPaused) return
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % CAROUSEL_SLIDES.length)
    }, SLIDE_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [isCarouselPaused])

  // Auto-cycle internal slide sub-animations in sync with the carousel
  useEffect(() => {
    if (isCarouselPaused) return
    const subTimer = setInterval(() => {
      setGroupStep((prev) => (prev + 1) % GROUP_SCENARIOS.length)
      setSoloStep((prev) => (prev + 1) % SOLO_SCENARIOS.length)
      setUrgencyStep((prev) => (prev + 1) % 4)
      setSetupStep((prev) => (prev + 1) % 3)
    }, SLIDE_INTERVAL_MS)
    return () => clearInterval(subTimer)
  }, [isCarouselPaused])

  // Helper to handle interactive clicks inside slides: pauses timer temporarily
  function handleInteractiveAction() {
    setIsCarouselPaused(true)
    clearTimeout(interactionTimeoutRef.current)
    interactionTimeoutRef.current = setTimeout(() => {
      setIsCarouselPaused(false)
    }, 5000)
  }

  function getFutureDate(days) {
    const d = new Date(today + 'T00:00:00')
    d.setDate(d.getDate() + days)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  const demoDeadline = getFutureDate(8)
  const interactiveStartBy = calculateStartByDate(demoDeadline, demoHours, demoPriority)

  // Slide 1 computations
  const groupTasks = [
    { id: 'gt1', name: 'Final presentation slides', hours: 3, priority: 'high', days: 5 },
    { id: 'gt2', name: 'Data analysis & charts', hours: 5, priority: 'medium', days: 7 },
    { id: 'gt3', name: 'Executive summary draft', hours: 2, priority: 'low', days: 4 },
  ]
  const currentGroupScenario = GROUP_SCENARIOS[groupStep]
  const currentGroupTask = groupTasks[currentGroupScenario.taskIdx]
  const currentGroupDeadline = getFutureDate(currentGroupTask.days)
  const currentGroupStartBy = calculateStartByDate(currentGroupDeadline, currentGroupTask.hours, currentGroupTask.priority)

  const groupMembers = [
    { id: 'm1', name: 'Alex', cap: 10, base: 4 },
    { id: 'm2', name: 'Jamie', cap: 8, base: 2 },
    { id: 'm3', name: 'Sam', cap: 6, base: 5 },
  ]

  // Slide 2 computations
  const currentSoloScenario = SOLO_SCENARIOS[soloStep]
  const currentSoloDeadline = getFutureDate(currentSoloScenario.daysOut)
  const currentSoloStartBy = calculateStartByDate(currentSoloDeadline, currentSoloScenario.hours, currentSoloScenario.priority)

  if (!loading && user) return <Navigate to="/dashboard" replace />

  return (
    <div className="min-h-screen bg-paper text-ink overflow-x-hidden">
      {/* ── Decorative background blobs ── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-buffer/8 rounded-full blur-3xl animate-fade-in delay-300" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-highlight/8 rounded-full blur-3xl animate-fade-in delay-500" />
      </div>

      {/* ── Header ── */}
      <header className="max-w-5xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between animate-fade-in">
        <div className="animate-logo-pop">
          <Logo />
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <Link
              to="/dashboard"
              className="bg-ink text-paper text-xs sm:text-sm font-semibold rounded-xl px-4 py-2 hover:bg-ink-soft active:scale-95 transition-all shadow-sm flex items-center gap-1.5"
            >
              <span>Dashboard</span>
              <span>→</span>
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm font-medium text-ink hover:text-buffer transition-colors px-3 py-1.5"
              >
                Sign in
              </Link>
              <Link
                to="/signup"
                className="bg-ink text-paper text-xs sm:text-sm font-medium rounded-lg px-4 py-2 hover:bg-ink-soft active:scale-95 transition-all shadow-sm"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </header>

      {/* ── Hero Section with Animated Letters ── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-10 pb-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            {/* Pill Tag */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium bg-buffer/10 text-buffer border border-buffer/20 mb-5 animate-fade-up delay-100">
              <span className="w-2 h-2 rounded-full bg-buffer animate-pulse" />
              <span>For students who cut it close</span>
            </div>

            {/* Main Headline with Animated Typewriter Letters */}
            <h1 className="font-display text-4xl sm:text-5xl lg:text-[54px] font-bold leading-[1.08] tracking-tight text-ink animate-fade-up delay-150">
              Know exactly when to start{' '}
              <span className="text-buffer block border-b-2 border-buffer/30 pb-0.5 min-h-[1.15em] min-w-[14ch] sm:min-w-[17ch] whitespace-nowrap">
                {typedWord}
                <span className="animate-pulse text-ink font-light ml-0.5">|</span>
              </span>
            </h1>

            <p className="mt-5 text-graphite text-base leading-relaxed max-w-md animate-fade-up delay-200">
              Deadline Buffer turns a due date into a start-by date based on realistic work hours
              and priority. Solo assignments and group projects, same clear answer.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3 animate-fade-up delay-250">
              {user ? (
                <Link
                  to="/dashboard"
                  className="bg-ink text-paper text-sm font-semibold rounded-xl px-6 py-3.5
                    hover:bg-ink-soft active:scale-95 transition-all duration-150 shadow-md
                    relative overflow-hidden group"
                >
                  <span className="relative flex items-center gap-2">
                    Go to your Dashboard <span>→</span>
                  </span>
                </Link>
              ) : (
                <>
                  <Link
                    to="/signup"
                    className="bg-ink text-paper text-sm font-semibold rounded-xl px-6 py-3.5
                      hover:bg-ink-soft active:scale-95 transition-all duration-150 shadow-md
                      relative overflow-hidden group"
                  >
                    <span
                      className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700"
                      aria-hidden="true"
                    />
                    <span className="relative flex items-center gap-2">
                      Get started free <span>→</span>
                    </span>
                  </Link>
                  <Link
                    to="/login"
                    className="text-sm font-medium text-graphite hover:text-ink transition-colors px-3 py-2"
                  >
                    I have an account
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* ── Interactive Live Solo Buffer Bar Card ── */}
          <div className="bg-white rounded-2xl border border-ink/10 p-6 shadow-md animate-fade-up delay-300 relative hover:shadow-lg transition-all duration-300">
            {/* Live Interactive Header */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono font-medium text-buffer bg-buffer-soft px-2.5 py-0.5 rounded-full">
                Interactive solo demo
              </span>
              <span className="text-xs text-graphite font-medium">Due in 8 days</span>
            </div>

            <p className="font-display font-semibold text-lg text-ink mb-3">
              Draft literature review
            </p>

            {/* Interactive hours & priority pills */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <div className="flex items-center gap-1 bg-paper rounded-lg p-1 border border-ink/10">
                {[3, 6, 10].map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setDemoHours(h)}
                    className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                      demoHours === h
                        ? 'bg-white text-ink shadow-sm font-semibold'
                        : 'text-graphite hover:text-ink'
                    }`}
                  >
                    {h} hrs
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 bg-paper rounded-lg p-1 border border-ink/10">
                {['low', 'medium', 'high'].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setDemoPriority(p)}
                    className={`px-2.5 py-1 text-xs rounded-md font-medium capitalize transition-all ${
                      demoPriority === p
                        ? 'bg-white text-ink shadow-sm font-semibold'
                        : 'text-graphite hover:text-ink'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Computed BufferBar */}
            <div className="bg-paper p-4 rounded-xl border border-ink/5">
              <BufferBar
                todayIso={today}
                startByDate={interactiveStartBy}
                deadline={demoDeadline}
                status="not_started"
                size="lg"
              />
            </div>

            {/* Result callout */}
            <div className="flex items-center justify-between mt-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-buffer inline-block" />
                <span className="text-graphite">Buffer (safe zone)</span>
              </div>
              <div className="font-medium text-ink bg-highlight-soft px-2.5 py-1 rounded-md">
                Start by <strong>{interactiveStartBy}</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 🌟 SMOOTH 2-SECOND INFINITE LOOPING CAROUSEL ── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-14">
        {/* Section Title */}
        <div className="text-center mb-8 animate-fade-up">
          <span className="inline-block text-xs font-mono font-medium text-buffer uppercase tracking-widest bg-buffer-soft px-3 py-1 rounded-full mb-2">
            Automated & Interactive Showcase
          </span>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-ink tracking-tight">
            See Deadline Buffer in Action
          </h2>
        </div>

        {/* Carousel Container */}
        <div
          onMouseEnter={() => setIsCarouselPaused(true)}
          onMouseLeave={() => setIsCarouselPaused(false)}
          className="bg-white rounded-3xl border border-ink/10 shadow-xl overflow-hidden relative transition-all duration-300"
        >
          {/* Top Carousel Navigation Tabs with Active Fill Indicator */}
          <div className="flex items-center justify-center border-b border-ink/10 bg-paper/50 px-4 sm:px-6 py-3 overflow-x-auto gap-2">
            <div className="flex items-center gap-1 sm:gap-2 mx-auto">
              {CAROUSEL_SLIDES.map((slide, idx) => (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => {
                    setActiveSlide(idx)
                    handleInteractiveAction()
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-300 flex items-center gap-1.5 shrink-0 ${
                    activeSlide === idx
                      ? 'bg-ink text-paper shadow-md font-semibold scale-[1.03]'
                      : 'text-graphite hover:text-ink hover:bg-white'
                  }`}
                >
                  <span>{slide.tabTitle}</span>
                </button>
              ))}
            </div>

          </div>

          {/* Sliding Track with enhanced 750ms smooth physics glide */}
          <div
            className="carousel-track"
            style={{
              transform: `translateX(-${activeSlide * 100}%)`,
              transition: 'transform 750ms cubic-bezier(0.25, 1, 0.5, 1)',
              willChange: 'transform',
            }}
          >
            {/* ============================================================ */}
            {/* SLIDE 1: Group Workload Balancing (Interactive & Auto-Cycling) */}
            {/* ============================================================ */}
            <div
              className={`w-full shrink-0 p-6 sm:p-10 flex flex-col justify-between transition-all duration-700 ${
                activeSlide === 0 ? 'opacity-100 scale-100' : 'opacity-40 scale-[0.98]'
              }`}
            >
              <div className="mb-5">
                <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                  <span className="text-xs font-mono font-medium text-highlight bg-highlight-soft px-3 py-1 rounded-full">
                    {CAROUSEL_SLIDES[0].badge}
                  </span>
                  <span className="text-xs text-graphite font-mono">
                    {currentGroupScenario.note}
                  </span>
                </div>
                <h3 className="font-display text-2xl sm:text-3xl font-bold text-ink">
                  {CAROUSEL_SLIDES[0].title}
                </h3>
                <p className="text-sm text-graphite mt-1 max-w-xl">
                  {CAROUSEL_SLIDES[0].description}
                </p>
              </div>

              {/* Dynamic Interactive Group Simulator */}
              <div className="bg-paper rounded-2xl p-5 border border-ink/10 mb-4 space-y-4">
                {/* Select task */}
                <div>
                  <label className="block text-[11px] font-semibold text-graphite uppercase tracking-wider mb-2">
                    Click to switch task:
                  </label>
                  <div className="grid sm:grid-cols-3 gap-2">
                    {groupTasks.map((t, idx) => {
                      const isActive = currentGroupScenario.taskIdx === idx
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setGroupStep(idx)
                            handleInteractiveAction()
                          }}
                          className={`p-2.5 rounded-xl border text-left text-xs transition-all duration-300 cursor-pointer ${
                            isActive
                              ? 'bg-ink text-paper border-ink shadow-md font-semibold scale-[1.02]'
                              : 'bg-white text-ink border-ink/10 hover:border-ink/30'
                          }`}
                        >
                          <p className="font-medium truncate flex items-center justify-between">
                            <span>{t.name}</span>
                            {isActive && <span className="w-1.5 h-1.5 rounded-full bg-buffer block animate-ping" />}
                          </p>
                          <p className={`text-[10px] mt-0.5 ${isActive ? 'text-paper/70' : 'text-graphite'}`}>
                            {t.hours} hrs · <span className="capitalize">{t.priority}</span>
                          </p>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Animated Member workload bars */}
                <div>
                  <label className="block text-[11px] font-semibold text-graphite uppercase tracking-wider mb-2">
                    Live Team Availability (Click to assign):
                  </label>
                  <div className="space-y-2">
                    {groupMembers.map((m) => {
                      const isAssigned = currentGroupScenario.memberId === m.id
                      const totalHours = isAssigned ? m.base + currentGroupTask.hours : m.base
                      const isOverloaded = totalHours > m.cap
                      const isSuggested = isAssigned && m.id === 'm2' && !isOverloaded

                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            const targetIdx = GROUP_SCENARIOS.findIndex(
                              (s) => s.memberId === m.id && s.taskIdx === currentGroupScenario.taskIdx
                            )
                            if (targetIdx !== -1) setGroupStep(targetIdx)
                            handleInteractiveAction()
                          }}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all duration-500 cursor-pointer ${
                            isAssigned
                              ? isOverloaded
                                ? 'bg-deadline-soft border-deadline shadow-md scale-[1.01]'
                                : 'bg-buffer-soft border-buffer shadow-md scale-[1.01]'
                              : 'bg-white border-ink/10 hover:border-ink/30'
                          }`}
                        >
                          <div className="min-w-[65px] shrink-0">
                            <span className="text-xs font-bold text-ink block">{m.name}</span>
                            <span className="text-[10px] text-graphite">cap: {m.cap}h/wk</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <MemberWorkloadBar activeHours={totalHours} capacity={m.cap} size="sm" />
                          </div>
                          <div className="shrink-0 text-right">
                            {isAssigned && isOverloaded ? (
                              <span className="text-[10px] font-bold text-deadline bg-white px-2 py-0.5 rounded shadow-xs animate-badge-pop">
                                ⚠️ Overloaded (+{totalHours - m.cap}h)
                              </span>
                            ) : isSuggested ? (
                              <span className="text-[10px] font-bold text-buffer bg-white px-2 py-0.5 rounded shadow-xs animate-badge-pop flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-buffer animate-ping" />
                                Suggested ({m.cap - totalHours}h free)
                              </span>
                            ) : isAssigned ? (
                              <span className="text-[10px] font-medium text-ink bg-white px-2 py-0.5 rounded shadow-xs">
                                ✓ Assigned ({m.cap - totalHours}h left)
                              </span>
                            ) : (
                              <span className="text-[10px] text-graphite bg-white/70 px-1.5 py-0.5 rounded">
                                {m.cap - totalHours}h free
                              </span>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Result Buffer Bar */}
                <div className="bg-white p-3 rounded-xl border border-ink/10 transition-all duration-300">
                  <div className="flex items-center justify-between text-xs text-graphite mb-1.5">
                    <span>Task: <strong>"{currentGroupTask.name}"</strong></span>
                    <span>Start by: <strong className="text-ink">{currentGroupStartBy}</strong></span>
                  </div>
                  <BufferBar
                    todayIso={today}
                    startByDate={currentGroupStartBy}
                    deadline={currentGroupDeadline}
                    status="not_started"
                    size="sm"
                  />
                </div>
              </div>
            </div>

            {/* ============================================================ */}
            {/* SLIDE 2: Solo Deadline Buffer (Interactive & Auto-Cycling)   */}
            {/* ============================================================ */}
            <div
              className={`w-full shrink-0 p-6 sm:p-10 flex flex-col justify-between transition-all duration-700 ${
                activeSlide === 1 ? 'opacity-100 scale-100' : 'opacity-40 scale-[0.98]'
              }`}
            >
              <div className="mb-5">
                <span className="text-xs font-mono font-medium text-buffer bg-buffer-soft px-3 py-1 rounded-full mb-2 inline-block">
                  {CAROUSEL_SLIDES[1].badge}
                </span>
                <h3 className="font-display text-2xl sm:text-3xl font-bold text-ink">
                  {CAROUSEL_SLIDES[1].title}
                </h3>
                <p className="text-sm text-graphite mt-1 max-w-xl">
                  {CAROUSEL_SLIDES[1].description}
                </p>
              </div>

              <div className="bg-paper rounded-2xl p-6 border border-ink/10 space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-ink/10 shadow-xs transition-all duration-300">
                    <p className="text-[10px] font-bold text-graphite uppercase tracking-wider mb-1">Current Assignment</p>
                    <p className="font-display font-semibold text-lg text-ink truncate">{currentSoloScenario.name}</p>
                    <p className="text-xs text-graphite mt-1">
                      Estimated: <strong>{currentSoloScenario.hours}.0 hours</strong> · <span className="capitalize">{currentSoloScenario.priority}</span> Priority
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-ink/10 shadow-xs transition-all duration-300">
                    <p className="text-[10px] font-bold text-graphite uppercase tracking-wider mb-1">Recommended Schedule</p>
                    <p className="font-display font-bold text-xl text-buffer truncate">{currentSoloScenario.pace}</p>
                    <p className="text-xs text-graphite mt-1">Start by <strong>{currentSoloStartBy}</strong></p>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-ink/10 shadow-xs">
                  <div className="flex items-center justify-between text-xs text-graphite mb-2">
                    <span className="font-medium text-ink">Timeline Visualisation</span>
                    <span>Due in {currentSoloScenario.daysOut} days</span>
                  </div>
                  <BufferBar
                    todayIso={today}
                    startByDate={currentSoloStartBy}
                    deadline={currentSoloDeadline}
                    status="not_started"
                    size="lg"
                  />
                  <div className="flex items-center justify-between text-xs text-graphite mt-3 pt-2 border-t border-ink/5">
                    <span className="flex items-center gap-1.5 text-buffer font-medium">
                      <span className="w-2.5 h-2.5 rounded-full bg-buffer block" /> Safe buffer zone
                    </span>
                    <span className="flex items-center gap-1.5 text-highlight font-medium">
                      <span className="w-2.5 h-2.5 rounded-full bg-highlight block" /> Work window
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ============================================================ */}
            {/* SLIDE 3: Urgency Triage (Interactive & Auto-Cycling Cards)   */}
            {/* ============================================================ */}
            <div
              className={`w-full shrink-0 p-6 sm:p-10 flex flex-col justify-between transition-all duration-700 ${
                activeSlide === 2 ? 'opacity-100 scale-100' : 'opacity-40 scale-[0.98]'
              }`}
            >
              <div className="mb-5">
                <span className="text-xs font-mono font-medium text-deadline bg-deadline-soft px-3 py-1 rounded-full mb-2 inline-block">
                  {CAROUSEL_SLIDES[2].badge}
                </span>
                <h3 className="font-display text-2xl sm:text-3xl font-bold text-ink">
                  {CAROUSEL_SLIDES[2].title}
                </h3>
                <p className="text-sm text-graphite mt-1 max-w-xl">
                  {CAROUSEL_SLIDES[2].description}
                </p>
              </div>

              <div className="bg-paper rounded-2xl p-5 border border-ink/10 space-y-2.5">
                {[
                  { title: 'Organic Chemistry Problem Set', hrs: '4h', badge: 'Start today — you need 4 hours', badgeStyle: 'bg-deadline text-white font-bold' },
                  { title: 'History Midterm Essay Draft', hrs: '6h', badge: 'Start soon — Due Thursday', badgeStyle: 'bg-highlight-soft text-ink font-semibold' },
                  { title: 'Computer Science Lab 4', hrs: '3h', badge: 'Safe buffer — Start by next week', badgeStyle: 'bg-buffer-soft text-buffer font-semibold' },
                  { title: 'Weekly Discussion Board Post', hrs: '1h', badge: '✓ Completed', badgeStyle: 'bg-white text-graphite font-medium' },
                ].map((item, i) => {
                  const isHighlighted = urgencyStep === i
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setUrgencyStep(i)
                        handleInteractiveAction()
                      }}
                      className={`w-full p-3.5 rounded-xl border flex items-center justify-between flex-wrap gap-2 text-left transition-all duration-500 cursor-pointer ${
                        isHighlighted
                          ? 'bg-white border-buffer ring-2 ring-buffer/30 shadow-md scale-[1.01]'
                          : 'bg-white/80 border-ink/10 opacity-75 hover:opacity-100'
                      }`}
                    >
                      <div>
                        <p className="font-semibold text-sm text-ink flex items-center gap-1.5">
                          <span>{item.title}</span>
                          {isHighlighted && <span className="w-1.5 h-1.5 rounded-full bg-buffer block animate-ping" />}
                        </p>
                        <p className="text-xs text-graphite mt-0.5">{item.hrs} work time</p>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full ${item.badgeStyle}`}>
                        {item.badge}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* ============================================================ */}
            {/* SLIDE 4: Quick 30-Second Setup (Interactive & Auto-Cycling)  */}
            {/* ============================================================ */}
            <div
              className={`w-full shrink-0 p-6 sm:p-10 flex flex-col justify-between transition-all duration-700 ${
                activeSlide === 3 ? 'opacity-100 scale-100' : 'opacity-40 scale-[0.98]'
              }`}
            >
              <div className="mb-5">
                <span className="text-xs font-mono font-medium text-ink bg-paper-dim px-3 py-1 rounded-full mb-2 inline-block">
                  {CAROUSEL_SLIDES[3].badge}
                </span>
                <h3 className="font-display text-2xl sm:text-3xl font-bold text-ink">
                  {CAROUSEL_SLIDES[3].title}
                </h3>
                <p className="text-sm text-graphite mt-1 max-w-xl">
                  {CAROUSEL_SLIDES[3].description}
                </p>
              </div>

              <div className="bg-paper rounded-2xl p-6 border border-ink/10 grid sm:grid-cols-3 gap-4">
                {[
                  { num: '01', title: 'Create Project', desc: 'Pick Solo or Group with optional description.' },
                  { num: '02', title: 'Add Teammates', desc: 'Enter members and their hours/week directly.' },
                  { num: '03', title: 'Buffer Tasks', desc: 'Enter tasks and start dates are calculated automatically.' },
                ].map((step, idx) => {
                  const isActive = setupStep === idx
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSetupStep(idx)
                        handleInteractiveAction()
                      }}
                      className={`p-5 rounded-2xl border text-center space-y-2 transition-all duration-500 cursor-pointer ${
                        isActive
                          ? 'bg-white border-buffer ring-2 ring-buffer/30 shadow-lg scale-[1.03]'
                          : 'bg-white/80 border-ink/10 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <span className="font-mono text-sm text-buffer block">{step.num}</span>
                      <h4 className="font-display font-bold text-ink text-base">{step.title}</h4>
                      <p className="text-xs text-graphite">{step.desc}</p>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Bottom Carousel Progress Indicators (Dots / Fill bar) */}
          <div className="border-t border-ink/10 bg-paper/30 px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {CAROUSEL_SLIDES.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setActiveSlide(idx)
                    handleInteractiveAction()
                  }}
                  aria-label={`Go to slide ${idx + 1}`}
                  className={`h-2 rounded-full transition-all duration-500 ${
                    activeSlide === idx
                      ? 'w-8 bg-buffer shadow-xs'
                      : 'w-2 bg-ink/20 hover:bg-ink/40'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="bg-white border-y border-ink/10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink mb-10 animate-fade-up">
            How it works
          </h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              {
                n: '01',
                title: 'Add a task',
                body: 'Enter your deadline, how many hours it will realistically take, and its priority level.',
              },
              {
                n: '02',
                title: 'Get a start-by date',
                body: 'The buffer automatically scales with priority, so high-stakes work gets a larger cushion.',
              },
              {
                n: '03',
                title: 'Stay ahead of it',
                body: 'The visual bar tells you at a glance whether you still have room, or whether today is the day.',
              },
            ].map((step, i) => (
              <div
                key={step.n}
                className="animate-fade-up"
                style={{ animationDelay: `${100 + i * 80}ms` }}
              >
                <p className="font-mono text-xs text-buffer mb-2 font-bold">{step.n}</p>
                <h3 className="font-display font-semibold text-ink text-lg mb-1.5">{step.title}</h3>
                <p className="text-sm text-graphite leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA strip ── */}
      <section className="bg-ink text-paper">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 text-center animate-fade-up">
          <h2 className="font-display text-3xl font-bold mb-3">Stop guessing when to start.</h2>
          <p className="text-paper/60 text-sm mb-6 max-w-md mx-auto">
            Free forever for students. No credit card. Takes 30 seconds to set up your first task.
          </p>
          <Link
            to="/signup"
            className="inline-flex items-center gap-2 bg-buffer text-white text-sm font-semibold rounded-xl px-7 py-3.5
              hover:bg-buffer/90 active:scale-95 transition-all duration-150 shadow-lg"
          >
            Create free account →
          </Link>
        </div>
      </section>

      <footer className="max-w-5xl mx-auto px-4 sm:px-6 py-10 border-t border-ink/10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-graphite">
            Deadline Buffer — built for students who put things off.
          </p>
          <div className="flex items-center gap-4 text-xs text-graphite">
            <Link to="/signup" className="hover:text-ink transition-colors">Sign Up</Link>
            <Link to="/login" className="hover:text-ink transition-colors">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
