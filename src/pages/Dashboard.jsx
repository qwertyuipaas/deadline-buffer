import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { getDaysUntilDeadline, getUrgencyLevel, getTodayIso, getBufferHealth, formatFriendlyDate } from '../lib/dateCalc'
import LoadingSkeleton from '../components/LoadingSkeleton'
import ConfirmDialog from '../components/ConfirmDialog'
import HowItWorksModal from '../components/HowItWorksModal'
import OnboardingChecklist from '../components/OnboardingChecklist'
import ProductTour from '../components/ProductTour'
import Logo from '../components/Logo'
import { checkUsernameAvailability, validateUsernameFormat, saveUserProfile } from '../lib/profileService'

const URGENCY_STYLES = {
  overdue: 'bg-deadline text-white font-bold',
  critical: 'bg-deadline-soft text-deadline font-semibold',
  soon: 'bg-highlight-soft text-ink font-semibold',
  fine: 'bg-buffer-soft text-buffer font-medium',
  done: 'bg-paper-dim text-graphite',
}
const URGENCY_LABELS = {
  overdue: 'Overdue · Start now',
  critical: 'Start today',
  soon: 'Start soon',
  fine: 'Safe buffer',
  done: 'Done',
}
const BUFFER_TIPS = [
  'Starting a 6-hour assignment 3 days early reduces cramming stress by 70%.',
  'Break large milestones into 2–3 hour chunks to maintain focus and momentum.',
  'Group projects succeed when workload is assigned by real availability, not equal splits.',
  'High-priority tasks get larger automatic buffer zones so unexpected delays don\'t derail you.',
]
const PROJECT_TEMPLATES = [
  { icon: '🎓', name: 'Senior Thesis / Capstone',        type: 'solo',  desc: 'Multi-chapter research project with high-priority buffer pacing.',    badge: '14-day buffer' },
  { icon: '👥', name: 'Group Presentation & Report',      type: 'group', desc: 'Team slide deck and research split across member capacities.',         badge: 'Team split'    },
  { icon: '🔬', name: 'Weekly Lab Report & Problem Set',  type: 'solo',  desc: 'Fast-paced weekly assignments with 3-day start-by cushion.',           badge: 'Weekly pace'   },
  { icon: '📚', name: 'Final Exam Preparation',           type: 'solo',  desc: 'Multi-week study schedule spaced out to avoid all-nighters.',          badge: 'Exam cushion'  },
]

// Reusable metric card
function StatCard({ label, value, valueClass = 'text-ink', sub, subClass = 'text-graphite' }) {
  return (
    <div className="bg-paper/70 rounded-2xl p-4 border border-ink/5">
      <span className="text-xs font-medium text-graphite block">{label}</span>
      <span className={`font-display text-2xl font-bold mt-1 block ${valueClass}`}>{value}</span>
      <span className={`text-[11px] mt-0.5 block ${subClass}`}>{sub}</span>
    </div>
  )
}

// Deadline badge helper
function deadlineBadge(daysUntil) {
  if (daysUntil < 0)  return { cls: 'bg-deadline text-white font-bold',           label: 'Overdue deadline' }
  if (daysUntil <= 2) return { cls: 'bg-deadline-soft text-deadline font-bold',   label: daysUntil === 0 ? 'Due today' : 'Due tomorrow' }
  if (daysUntil <= 5) return { cls: 'bg-highlight-soft text-ink font-semibold',   label: `Due in ${daysUntil}d` }
  return               { cls: 'bg-paper text-graphite',                            label: `Due in ${daysUntil}d` }
}

export default function Dashboard() {
  const [projects, setProjects]               = useState([])
  const [taskStats, setTaskStats]             = useState({})
  const [nextDeadlines, setNextDeadlines]     = useState({})
  const [urgentTasks, setUrgentTasks]         = useState([])
  const [upcomingTimeline, setUpcomingTimeline] = useState([])
  const [totalCompleted, setTotalCompleted]   = useState(0)
  const [totalActive, setTotalActive]         = useState(0)
  const [totalHoursNeeded, setTotalHoursNeeded] = useState(0)
  const [bufferHealth, setBufferHealth]       = useState(100)
  const [loading, setLoading]                 = useState(true)
  const [error, setError]                     = useState('')
  const [deleteTarget, setDeleteTarget]       = useState(null)
  const [deleting, setDeleting]               = useState(false)
  const [sortBy, setSortBy]                   = useState('recent')
  const [mounted, setMounted]                 = useState(false)
  const [guideOpen, setGuideOpen]             = useState(false)
  const [tourOpen, setTourOpen]               = useState(false)
  const [scratchNote, setScratchNote]         = useState(() => localStorage.getItem('deadline_buffer_scratchpad') || '')
  const [editingName, setEditingName]         = useState(false)
  const [nameDraft, setNameDraft]             = useState('')
  const [nameSubmitting, setNameSubmitting]   = useState(false)

  const { user, signOut, updateProfile } = useAuth()
  const toast = useToast()
  const todayIso = getTodayIso()

  const displayName = user?.user_metadata?.display_name || user?.user_metadata?.full_name || null
  const hour = new Date().getHours()
  const timeGreeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const todayFormatted = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
  const dailyTip = BUFFER_TIPS[new Date().getDate() % BUFFER_TIPS.length]

  useEffect(() => {
    loadProjects()
    const t = setTimeout(() => setMounted(true), 50)
    const hasSeenTour = localStorage.getItem('deadline_buffer_spotlight_tour_v1')
    if (!hasSeenTour) {
      const tourTimer = setTimeout(() => setTourOpen(true), 800)
      return () => { clearTimeout(t); clearTimeout(tourTimer) }
    }
    return () => clearTimeout(t)
  }, [])

  function handleScratchNoteChange(e) {
    setScratchNote(e.target.value)
    localStorage.setItem('deadline_buffer_scratchpad', e.target.value)
  }

  async function handleSaveName(e) {
    e.preventDefault()
    const trimmed = nameDraft.trim()
    if (!trimmed) return

    const formatCheck = validateUsernameFormat(trimmed)
    if (!formatCheck.valid) {
      toast.error(formatCheck.message)
      return
    }

    setNameSubmitting(true)
    const availCheck = await checkUsernameAvailability(trimmed, user?.id)
    if (!availCheck.available) {
      setNameSubmitting(false)
      toast.error(availCheck.message || 'Username is already taken.')
      return
    }

    const { error } = await updateProfile(trimmed)
    if (!error && user?.id) {
      await saveUserProfile(user.id, trimmed)
    }
    setNameSubmitting(false)

    if (!error) {
      setEditingName(false)
      toast.success('Username updated.')
    } else {
      toast.error(error.message)
    }
  }

  async function loadProjects() {
    setLoading(true); setError('')
    const { data: projectList, error: projErr } = await supabase
      .from('projects').select('*').order('created_at', { ascending: false })
    if (projErr) { setError(projErr.message); setLoading(false); return }
    setProjects(projectList || [])

    const projectIds = (projectList || []).map((p) => p.id)
    if (projectIds.length > 0) {
      const { data: taskRows, error: taskErr } = await supabase
        .from('tasks')
        .select('id, project_id, name, status, deadline, start_by_date, estimated_hours, priority')
        .in('project_id', projectIds)

      if (!taskErr && taskRows) {
        const stats = {}, deadlines = {}
        const projectMap = new Map((projectList || []).map((p) => [p.id, p]))
        let activeCount = 0, completedCount = 0, hoursNeeded = 0
        const activeTaskList = [], allUpcoming = []

        for (const row of taskRows) {
          stats[row.project_id] ??= { total: 0, done: 0 }
          stats[row.project_id].total += 1
          if (row.status === 'done') {
            stats[row.project_id].done += 1
            completedCount += 1
          } else {
            activeCount += 1
            hoursNeeded += Number(row.estimated_hours || 0)
            const taskObj = {
              ...row,
              projectName: projectMap.get(row.project_id)?.name || 'Project',
              urgency: getUrgencyLevel(row, todayIso),
              daysUntil: getDaysUntilDeadline(row.deadline),
            }
            activeTaskList.push(taskObj)
            allUpcoming.push(taskObj)
            if (row.deadline >= todayIso && (!deadlines[row.project_id] || row.deadline < deadlines[row.project_id])) {
              deadlines[row.project_id] = row.deadline
            }
          }
        }

        const urgencyOrder = { overdue: 0, critical: 1, soon: 2, fine: 3, done: 4 }
        activeTaskList.sort((a, b) => {
          const diff = (urgencyOrder[a.urgency] ?? 3) - (urgencyOrder[b.urgency] ?? 3)
          return diff !== 0 ? diff : (a.start_by_date || a.deadline).localeCompare(b.start_by_date || b.deadline)
        })
        allUpcoming.sort((a, b) => (a.deadline || '').localeCompare(b.deadline || ''))

        setTaskStats(stats); setNextDeadlines(deadlines)
        setUrgentTasks(activeTaskList.slice(0, 4)); setUpcomingTimeline(allUpcoming.slice(0, 5))
        setTotalActive(activeCount); setTotalCompleted(completedCount)
        setTotalHoursNeeded(hoursNeeded); setBufferHealth(getBufferHealth(taskRows))
      }
    }
    setLoading(false)
  }

  async function confirmDeleteProject() {
    if (!deleteTarget) return
    setDeleting(true)
    const { error } = await supabase.from('projects').delete().eq('id', deleteTarget.id)
    setDeleting(false); setDeleteTarget(null)
    if (error) { toast.error(error.message); return }
    toast.success(`"${deleteTarget.name}" deleted.`)
    loadProjects()
  }

  const sortedProjects = [...projects].sort((a, b) => {
    if (sortBy === 'nearest') return (nextDeadlines[a.id] ?? '9999').localeCompare(nextDeadlines[b.id] ?? '9999')
    return new Date(b.created_at) - new Date(a.created_at)
  })

  return (
    <div className="min-h-screen bg-paper text-ink pb-16">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-ink/10 sticky top-0 z-20 shadow-2xs animate-fade-in">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              id="tour-guide-btn"
              type="button"
              onClick={() => setGuideOpen(true)}
              className="text-xs font-medium text-buffer hover:text-buffer/80 bg-buffer-soft px-3 py-1.5 rounded-lg transition active:scale-95 flex items-center gap-1.5 shadow-2xs"
            >
              <span className="hidden sm:inline">How it works</span><span className="sm:hidden">Guide</span>
            </button>
            <div className="text-right hidden sm:block">
              {editingName ? (
                <form onSubmit={handleSaveName} className="flex items-center gap-1.5">
                  <input
                    autoFocus value={nameDraft} onChange={(e) => setNameDraft(e.target.value)}
                    placeholder="Username"
                    className="text-xs font-semibold text-ink border-b border-buffer focus:outline-none bg-transparent w-24"
                  />
                  <button type="submit" disabled={nameSubmitting} className="text-[11px] text-buffer hover:underline disabled:opacity-50">Save</button>
                  <button type="button" onClick={() => setEditingName(false)} className="text-[11px] text-graphite hover:underline">Cancel</button>
                </form>
              ) : (
                <button onClick={() => { setNameDraft(displayName || ''); setEditingName(true) }} className="text-right group" title="Edit username">
                  <span className="text-xs font-semibold text-ink block group-hover:text-buffer transition">{displayName || 'Set a username'}</span>
                  <span className="text-[11px] text-graphite block">{user?.email}</span>
                </button>
              )}
            </div>
            <button onClick={signOut} className="text-xs font-medium text-graphite hover:text-ink border border-ink/15 hover:border-ink/30 px-3 py-1.5 rounded-lg transition active:scale-95 bg-white">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Greeting & Motivation Banner */}
        <section className="bg-white rounded-3xl border border-ink/10 p-6 sm:p-8 shadow-xs relative overflow-hidden animate-fade-up">
          <div className="absolute top-0 right-0 w-80 h-80 bg-buffer/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none z-0" />
          <div className="absolute bottom-0 right-1/4 w-60 h-60 bg-highlight/10 rounded-full blur-2xl -mb-20 pointer-events-none z-0" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-start justify-between gap-5">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-xs font-mono font-medium text-buffer bg-buffer-soft px-2.5 py-0.5 rounded-full whitespace-nowrap">{todayFormatted}</span>
                {totalActive === 0 && totalCompleted > 0 && (
                  <span className="text-xs font-mono font-medium text-highlight bg-highlight-soft px-2.5 py-0.5 rounded-full whitespace-nowrap">Ahead of schedule</span>
                )}
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink leading-snug">
                {timeGreeting}{displayName ? `, ${displayName}` : ''}
              </h1>
              <p className="text-sm text-graphite mt-1.5 max-w-xl leading-relaxed">
                {totalActive === 0 && totalCompleted > 0
                  ? 'All tasks are complete with safe buffers remaining. Enjoy your free time or start a new project.'
                  : totalActive > 0
                  ? `You have ${totalActive} active task${totalActive !== 1 ? 's' : ''} (${totalHoursNeeded}h estimated work). Keep ahead of your start-by dates.`
                  : 'Welcome to Deadline Buffer. Create your first project to turn due dates into stress-free start dates.'}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0 lg:pt-1">
              <Link id="tour-new-project-btn" to="/projects/new" className="bg-ink text-paper text-sm font-semibold rounded-xl px-5 py-3 hover:bg-ink-soft active:scale-95 transition-all shadow-sm flex items-center gap-2 whitespace-nowrap">
                <span>+</span> New Project
              </Link>
            </div>
          </div>

          {/* Metric Highlights Bar */}
          <div id="tour-metrics-bar" className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-8 pt-6 border-t border-ink/10">
            <StatCard label="Active Tasks"  value={totalActive}     sub={`${totalHoursNeeded}h total work`} />
            <StatCard label="Completed"     value={totalCompleted}  valueClass="text-buffer" sub="✓ Tasks on-track" subClass="text-buffer font-medium" />
            <StatCard label="Projects"      value={projects.length} sub={`${projects.filter((p) => p.type === 'group').length} Group · ${projects.filter((p) => p.type === 'solo').length} Solo`} />
            <StatCard
              label="Buffer Health"
              value={`${bufferHealth}%`}
              valueClass={bufferHealth >= 70 ? 'text-buffer' : bufferHealth >= 40 ? 'text-highlight' : 'text-deadline'}
              sub={bufferHealth >= 70 ? 'Safe cushion rate' : bufferHealth >= 40 ? 'Some tasks at risk' : 'Many tasks overdue'}
            />
          </div>
        </section>

        {/* Onboarding Checklist */}
        <OnboardingChecklist
          projectCount={projects.length}
          totalTasks={totalActive + totalCompleted}
          onOpenGuide={() => setGuideOpen(true)}
          onStartTour={() => setTourOpen(true)}
        />

        {/* Main Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column */}
          <div className="lg:col-span-8 space-y-8">
            {/* Urgent Triage Strip */}
            {!loading && totalActive > 0 && urgentTasks.length > 0 && (
              <section className="bg-white rounded-2xl border border-ink/10 p-5 shadow-xs animate-fade-up">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-display font-semibold text-base text-ink">Today's Focus & Start Dates</h2>
                  <span className="text-xs font-mono text-graphite">{urgentTasks.length} task{urgentTasks.length !== 1 ? 's' : ''} to prioritize</span>
                </div>
                <div className="space-y-2.5">
                  {urgentTasks.map((t) => (
                    <Link key={t.id} to={`/projects/${t.project_id}`} className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-paper hover:bg-paper-dim border border-ink/5 transition-all group hover:scale-[1.01]">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm text-ink group-hover:text-buffer transition-colors truncate">{t.name}</p>
                        <p className="text-xs text-graphite mt-0.5 truncate">
                          <strong>{t.projectName}</strong> · {t.estimated_hours ? `${t.estimated_hours}h work · ` : ''}
                          {t.daysUntil < 0 ? `Overdue by ${Math.abs(t.daysUntil)} day${Math.abs(t.daysUntil) !== 1 ? 's' : ''}` : `Due in ${t.daysUntil} day${t.daysUntil !== 1 ? 's' : ''}`}
                        </p>
                      </div>
                      <span className={`text-xs px-3 py-1 rounded-full shrink-0 ${URGENCY_STYLES[t.urgency] || 'bg-paper-dim text-graphite'}`}>
                        {URGENCY_LABELS[t.urgency] || t.urgency}
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Projects Section */}
            <section className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="font-display text-xl font-bold text-ink">Your Projects</h2>
                  {!loading && <p className="text-xs text-graphite mt-0.5">{projects.length} project{projects.length !== 1 ? 's' : ''} active</p>}
                </div>
                <div className="flex items-center gap-2">
                  {projects.length > 1 && (
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="text-xs rounded-xl border border-ink/15 px-3 py-2 bg-white text-graphite transition-colors hover:border-ink/30 cursor-pointer shadow-2xs">
                      <option value="recent">Sort: Most recent</option>
                      <option value="nearest">Sort: Nearest deadline</option>
                    </select>
                  )}
                  <Link to="/projects/new" className="bg-ink text-paper text-xs font-medium rounded-xl px-3.5 py-2 hover:bg-ink-soft active:scale-95 transition shadow-2xs">
                    + New Project
                  </Link>
                </div>
              </div>

              {loading && <LoadingSkeleton rows={3} />}
              {error && <p className="text-sm text-deadline bg-deadline-soft border border-deadline/20 rounded-xl px-4 py-3">{error}</p>}

              {!loading && !error && projects.length === 0 && (
                <div className="text-center py-12 px-6 bg-white rounded-3xl border border-ink/10 shadow-xs animate-fade-up">
                  <div className="w-14 h-14 rounded-2xl bg-buffer-soft text-buffer flex items-center justify-center mx-auto mb-4 font-display text-2xl font-bold">+</div>
                  <h3 className="font-display text-lg font-bold text-ink mb-1">No projects created yet</h3>
                  <p className="text-graphite text-sm mb-6 max-w-sm mx-auto leading-relaxed">Set up your first solo assignment or group project to start tracking start-by dates and member workload.</p>
                  <Link to="/projects/new" className="inline-flex items-center gap-2 bg-ink text-paper rounded-xl px-6 py-3 text-sm font-semibold hover:bg-ink-soft active:scale-95 transition shadow-sm">
                    <span>+</span> Create your first project
                  </Link>
                </div>
              )}

              {!loading && !error && projects.length > 0 && (
                <ul className="space-y-3.5">
                  {sortedProjects.map((project, i) => {
                    const stats = taskStats[project.id] ?? { total: 0, done: 0 }
                    const pct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0
                    const daysUntil = nextDeadlines[project.id] != null ? getDaysUntilDeadline(nextDeadlines[project.id]) : null
                    const badge = daysUntil !== null ? deadlineBadge(daysUntil) : null
                    return (
                      <li key={project.id} className={`bg-white rounded-2xl border border-ink/10 p-5 transition-all duration-200 hover:border-ink/30 hover:shadow-md group ${mounted ? 'animate-card-in' : 'opacity-0'}`} style={{ animationDelay: `${Math.min(i * 60, 400)}ms` }}>
                        <div className="flex items-start justify-between gap-4">
                          <Link to={`/projects/${project.id}`} className="min-w-0 flex-1 block">
                            <div>
                              <div className="flex items-center gap-2.5 flex-wrap">
                                <span className="font-display font-semibold text-ink text-base group-hover:text-buffer transition-colors truncate">{project.name}</span>
                                <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${project.type === 'group' ? 'bg-highlight-soft text-ink' : 'bg-buffer-soft text-buffer'}`}>
                                  {project.type === 'group' ? 'Group' : 'Solo'}
                                </span>
                              </div>
                              {project.description && <p className="text-xs text-graphite mt-1.5 line-clamp-1">{project.description}</p>}
                              <div className="flex items-center gap-3 mt-3 flex-wrap">
                                <div className="w-28 h-2 bg-paper-dim rounded-full overflow-hidden">
                                  <div className="h-full bg-buffer rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-xs text-graphite font-mono">
                                  {stats.total === 0 ? <span className="text-buffer font-medium">No tasks yet — add one to begin</span> : `${stats.done}/${stats.total} done (${pct}%)`}
                                </span>
                                {badge && <span className={`text-xs ml-auto shrink-0 font-medium px-2.5 py-0.5 rounded-md ${badge.cls}`}>{badge.label}</span>}
                              </div>
                            </div>
                          </Link>
                          <button type="button" onClick={() => setDeleteTarget(project)} className="text-graphite/30 hover:text-deadline transition-colors p-2 rounded-xl hover:bg-deadline-soft shrink-0 self-start" title="Delete project" aria-label={`Delete ${project.name}`}>
                            <svg width="16" height="16" viewBox="0 0 15 15" fill="none">
                              <path d="M2.5 4.5H12.5M5.5 4.5V2.5C5.5 1.94772 5.94772 1.5 6.5 1.5H8.5C9.05228 1.5 9.5 1.94772 9.5 2.5V4.5M6 7.5V11.5M9 7.5V11.5M3.5 4.5L4.1 12.1C4.15 12.65 4.6 13.5 5.2 13.5H9.8C10.4 13.5 10.85 12.65 10.9 12.1L11.5 4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>

            {/* Quick Starter Templates */}
            <section id="tour-templates-section" className="bg-white rounded-3xl border border-ink/10 p-6 shadow-xs space-y-4">
              <div>
                <h3 className="font-display font-bold text-base text-ink">Quick Project Starters</h3>
                <p className="text-xs text-graphite mt-0.5">Launch popular academic project structures with one click:</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {PROJECT_TEMPLATES.map((tmpl, idx) => (
                  <Link key={idx} to={`/projects/new?name=${encodeURIComponent(tmpl.name)}&type=${tmpl.type}&desc=${encodeURIComponent(tmpl.desc)}`} className="p-3.5 rounded-2xl border border-ink/10 bg-paper/50 hover:bg-paper hover:border-ink/25 transition-all text-left group hover:scale-[1.01]">
                    <div className="flex items-center justify-end gap-2 mb-1.5">
                      <span className="text-[10px] font-mono font-medium text-buffer bg-buffer-soft px-2 py-0.5 rounded-full">{tmpl.badge}</span>
                    </div>
                    <h4 className="font-semibold text-xs text-ink group-hover:text-buffer transition-colors">{tmpl.name}</h4>
                    <p className="text-[11px] text-graphite mt-1 leading-snug">{tmpl.desc}</p>
                  </Link>
                ))}
              </div>
            </section>
          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            {/* Deadline Horizon */}
            <section className="bg-white rounded-2xl border border-ink/10 p-5 shadow-xs">
              <h3 className="font-display font-bold text-sm text-ink mb-3 flex items-center justify-between">
                <span>Deadline Horizon</span>
                <span className="text-[11px] font-mono text-graphite font-normal">Next 14 days</span>
              </h3>
              {upcomingTimeline.length === 0 ? (
                <div className="py-6 text-center text-xs text-graphite bg-paper/60 rounded-xl border border-ink/5">No upcoming deadlines pending. You're fully in the clear!</div>
              ) : (
                <div className="space-y-2.5">
                  {upcomingTimeline.map((item) => (
                    <Link key={item.id} to={`/projects/${item.project_id}`} className="block p-2.5 rounded-xl bg-paper/60 hover:bg-paper border border-ink/5 transition text-xs group">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-ink group-hover:text-buffer transition-colors truncate">{item.name}</span>
                        <span className="text-[10px] font-mono font-semibold text-deadline shrink-0">{item.daysUntil === 0 ? 'Today' : `${item.daysUntil}d left`}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-graphite mt-1">
                        <span className="truncate">{item.projectName}</span>
                        <span>Due: {formatFriendlyDate(item.deadline)}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            {/* Quick Scratchpad */}
            <section id="tour-scratchpad" className="bg-white rounded-2xl border border-ink/10 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-display font-bold text-sm text-ink">Quick Scratchpad</h3>
                <span className="text-[10px] text-graphite font-mono">Auto-saved</span>
              </div>
              <textarea
                value={scratchNote} onChange={handleScratchNoteChange}
                placeholder="Jot down a quick deadline thought, reading assignment, or reminder..."
                rows={4}
                className="w-full text-xs rounded-xl border border-ink/10 bg-paper/60 p-3 focus:outline-none focus:ring-2 focus:ring-buffer/40 focus:bg-white resize-none text-ink placeholder:text-graphite/50 transition leading-relaxed"
              />
            </section>

            {/* Buffer Tip */}
            <section className="bg-gradient-to-br from-buffer-soft/70 to-highlight-soft/50 rounded-2xl border border-buffer/20 p-5 shadow-xs">
              <span className="text-[11px] font-mono font-bold text-buffer uppercase tracking-wider block mb-1.5">Buffer Strategy</span>
              <p className="text-xs text-ink leading-relaxed font-medium">"{dailyTip}"</p>
            </section>
          </div>
        </div>
      </main>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete project?"
        message={`"${deleteTarget?.name}" and all its tasks and members will be permanently deleted.`}
        confirmLabel="Delete project"
        danger loading={deleting}
        onConfirm={confirmDeleteProject}
        onCancel={() => setDeleteTarget(null)}
      />
      <HowItWorksModal open={guideOpen} onClose={() => setGuideOpen(false)} onStartTour={() => setTourOpen(true)} />
      <ProductTour tourKey="deadline_buffer_spotlight_tour_v1" isOpen={tourOpen} onClose={() => setTourOpen(false)} onComplete={() => setTourOpen(false)} />
    </div>
  )
}
