import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { isOverdue, getTodayIso, getDaysUntilDeadline, getUrgencyLevel, formatFriendlyDate, calculateStartByDate } from '../lib/dateCalc'
import { getMemberStats, getSuggestedMemberOrder } from '../lib/groupUtils'
import { useToast } from '../context/ToastContext'
import { useProjectData } from '../hooks/useProjectData'
import { useTaskForm } from '../hooks/useTaskForm'
import { useMemberForm } from '../hooks/useMemberForm'
import { useTaskEdit } from '../hooks/useTaskEdit'
import LoadingSkeleton from '../components/LoadingSkeleton'
import ConfirmDialog from '../components/ConfirmDialog'
import BufferBar from '../components/BufferBar'
import MemberWorkloadBar from '../components/MemberWorkloadBar'
import TaskDrawer from '../components/TaskDrawer'
import DatePicker from '../components/DatePicker'
import HowItWorksModal from '../components/HowItWorksModal'
import ProductTour from '../components/ProductTour'
import NotificationBell from '../components/NotificationBell'
import InstallAppButton from '../components/InstallAppButton'
import Logo from '../components/Logo'
import { exportProjectToIcs, formatProjectSummary } from '../lib/exportUtils'

const PROJECT_VIEW_STEPS = [
  {
    targetId: 'tour-project-export-actions', icon: '📅',
    tag: 'Step 1 of 4 · Export & Sync', title: 'Calendar & Team Sharing Hub',
    desc: 'Export assignments directly to Google/Apple Calendar (.ics) or copy a formatted markdown summary for Discord, Slack, or WhatsApp.',
    tip: 'Your exported calendar events include calculated start-by dates!', preferredPlacement: 'bottom',
  },
  {
    targetId: 'tour-project-members-section', icon: '👥',
    tag: 'Step 2 of 4 · Team Balance', title: 'Teammate Workload Balancing',
    desc: 'Visual workload progress bars track each person\'s assigned hours against their capacity (hrs/wk) and flag overload alerts.',
    tip: 'Tasks are automatically suggested to teammates with the most free hours.', preferredPlacement: 'bottom',
  },
  {
    targetId: 'tour-project-task-controls', icon: '🔍',
    tag: 'Step 3 of 4 · Task Search & Filters', title: 'Filter & Sort Assignments',
    desc: 'Quickly find tasks by name or assignee, filter by status, and sort by calculated start-by urgency.',
    tip: 'Use the search box to immediately find tasks in large projects.', preferredPlacement: 'bottom',
  },
  {
    targetId: 'tour-project-add-task-btn', icon: '⏱️',
    tag: 'Step 4 of 4 · Add Tasks & Buffers', title: 'Add Assignments & Auto-Buffer',
    desc: 'Click here (or press N) to add a task with its deadline and estimated hours. The algorithm instantly generates your Start-By Date!',
    tip: 'Press N on your keyboard anywhere on this page to quickly open the task drawer.', preferredPlacement: 'bottom',
  },
]

const URGENCY_BADGE = {
  done:     'bg-paper-dim text-graphite',
  fine:     'bg-buffer-soft text-buffer',
  soon:     'bg-highlight-soft text-ink',
  critical: 'bg-deadline-soft text-deadline font-semibold',
  overdue:  'bg-deadline text-white font-semibold',
}
const URGENCY_LABEL = {
  done:     'Done',
  fine:     (t) => `Start by ${formatFriendlyDate(t.start_by_date)}`,
  soon:     (t) => `Start soon — ${formatFriendlyDate(t.start_by_date)}`,
  critical: () => 'Start today',
  overdue:  () => "Start now — you're behind",
}
const priorityStyles  = { low: 'bg-paper-dim text-graphite', medium: 'bg-highlight-soft text-ink', high: 'bg-deadline-soft text-deadline' }
const priorityWeight  = { high: 0, medium: 1, low: 2 }
const INPUT_CLS = 'w-full rounded-lg border border-ink/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-buffer/50 focus:border-buffer'

// Task form fields (defined outside component to keep DOM focus stable)
function TaskFormFields({ form, members: memberList, isGroup: groupMode, tasks = [] }) {
  const suggested = getSuggestedMemberOrder(memberList, tasks)
  const hoursNum = Number(form.hours)
  const previewValid = form.deadline && Number.isFinite(hoursNum) && hoursNum > 0 && form.deadline >= form.todayIso
  const previewStartBy = previewValid ? calculateStartByDate(form.deadline, hoursNum, form.priority) : null

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="block text-xs text-graphite mb-1">Task name</label>
        <input required value={form.taskName} onChange={(e) => form.setTaskName(e.target.value)} className={INPUT_CLS} placeholder="e.g. Draft literature review" />
      </div>
      <div>
        <label className="block text-xs text-graphite mb-1">Deadline</label>
        <DatePicker value={form.deadline} onChange={(iso) => form.setDeadline(iso)} min={form.todayIso} placeholder="Pick a deadline" required />
      </div>
      <div>
        <label className="block text-xs text-graphite mb-1">Estimated hours</label>
        <input type="number" min="0.5" step="0.5" required value={form.hours} onChange={(e) => form.setHours(e.target.value)} className={INPUT_CLS} placeholder="e.g. 6" />
      </div>
      <div>
        <label className="block text-xs text-graphite mb-1">Priority</label>
        <select value={form.priority} onChange={(e) => form.setPriority(e.target.value)} className={INPUT_CLS}>
          <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
        </select>
      </div>
      {groupMode && memberList.length > 0 && (
        <div className="sm:col-span-2">
          <label className="block text-xs text-graphite mb-2">Assign to</label>
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-paper transition">
              <input type="radio" name="assignee" value="" checked={form.assignedMemberId === ''} onChange={() => form.setAssignedMemberId('')} className="accent-buffer" />
              <span className="text-sm text-graphite">Unassigned</span>
            </label>
            {suggested.map((m, i) => {
              const stats = getMemberStats(m, tasks)
              const isBest = i === 0 && suggested.length > 1
              return (
                <label key={m.id} className={`flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-paper transition ${form.assignedMemberId === m.id ? 'bg-buffer-soft ring-1 ring-buffer/40' : ''}`}>
                  <input type="radio" name="assignee" value={m.id} checked={form.assignedMemberId === m.id} onChange={() => form.setAssignedMemberId(m.id)} className="accent-buffer" />
                  <span className="flex-1 min-w-0">
                    <span className="text-sm text-ink flex items-center gap-1.5">
                      {m.display_name}
                      {isBest     && <span className="text-[10px] font-medium bg-buffer text-white px-1.5 py-0.5 rounded-full">suggested</span>}
                      {stats.overloaded && <span className="text-[10px] font-medium bg-deadline-soft text-deadline px-1.5 py-0.5 rounded-full">overloaded</span>}
                    </span>
                    <MemberWorkloadBar activeHours={stats.activeHours} capacity={stats.capacity} size="xs" />
                  </span>
                </label>
              )
            })}
          </div>
        </div>
      )}
      <div className="sm:col-span-2">
        {previewValid ? (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-buffer-soft border border-buffer/30 px-4 py-3 animate-fade-in">
            <span className="text-xs text-graphite leading-snug">Based on your inputs, you should start this task by:</span>
            <strong className="font-display text-sm text-buffer whitespace-nowrap">{formatFriendlyDate(previewStartBy)}</strong>
          </div>
        ) : (
          <p className="text-[11px] text-graphite/70 leading-relaxed px-1">Pick a deadline and estimated hours — we'll automatically calculate your calm <strong>Start-By date</strong> with a safety buffer.</p>
        )}
      </div>
      {form.taskError && (
        <div className="sm:col-span-2">
          <p className="text-xs text-deadline bg-deadline-soft border border-deadline/20 rounded-lg px-3 py-2">{form.taskError}</p>
        </div>
      )}
      <div className="sm:col-span-2 flex gap-2 pt-2">
        <button type="submit" disabled={form.taskSubmitting} className="bg-ink text-paper rounded-lg px-4 py-2 text-sm font-medium hover:bg-ink-soft disabled:opacity-50 transition">
          {form.taskSubmitting ? 'Saving…' : 'Save task'}
        </button>
      </div>
    </div>
  )
}

export default function ProjectView() {
  const { projectId } = useParams()
  const toast = useToast()
  const todayIso = getTodayIso()

  const { project, members, tasks, setTasks, loading, loadError, reload } = useProjectData(projectId)
  const [drawerMode, setDrawerMode] = useState(null)
  const taskForm   = useTaskForm(projectId, () => { reload(); setDrawerMode(null) })
  const taskEdit   = useTaskEdit(() => { reload(); setDrawerMode(null) })
  const memberForm = useMemberForm(projectId, members, reload)

  const [renaming, setRenaming]               = useState(false)
  const [renameValue, setRenameValue]         = useState('')
  const [renameSubmitting, setRenameSubmitting] = useState(false)
  const [confirmTarget, setConfirmTarget]     = useState(null)
  const [confirmLoading, setConfirmLoading]   = useState(false)
  const [searchQuery, setSearchQuery]         = useState('')
  const [statusFilter, setStatusFilter]       = useState('all')
  const [memberFilter, setMemberFilter]       = useState('all')
  const [sortBy, setSortBy]                   = useState('start_by')
  const [guideOpen, setGuideOpen]             = useState(false)
  const [tourOpen, setTourOpen]               = useState(false)

  useEffect(() => {
    if (!localStorage.getItem('deadline_buffer_spotlight_projectview_v1')) {
      const t = setTimeout(() => setTourOpen(true), 700)
      return () => clearTimeout(t)
    }
  }, [])

  useEffect(() => {
    function handleKey(e) {
      const el = e.target
      const active = document.activeElement
      const isInput = [el, active].some((n) => n && (n.tagName === 'INPUT' || n.tagName === 'TEXTAREA' || n.tagName === 'SELECT' || n.isContentEditable))
      const modalOpen = document.querySelector('[role="dialog"][aria-modal="true"]') !== null
      if (drawerMode || isInput || modalOpen) return
      if (e.key === 'n' || e.key === 'N') { e.preventDefault(); setDrawerMode('add') }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [drawerMode])

  async function handleStatusChange(taskId, status) {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)))
    const { error } = await supabase.from('tasks').update({ status }).eq('id', taskId)
    if (error) { toast.error(error.message); reload() }
    else if (status === 'done') toast.success('Marked done.')
  }

  function requestDeleteTask(task) { setConfirmTarget({ kind: 'task', id: task.id, label: task.name }) }
  async function confirmDeleteTask() {
    if (!confirmTarget) return
    setConfirmLoading(true)
    const { error } = await supabase.from('tasks').delete().eq('id', confirmTarget.id)
    setConfirmLoading(false); setConfirmTarget(null)
    if (error) { toast.error(error.message); return }
    toast.success('Task deleted.'); reload()
  }

  function requestRemoveMember(member) {
    setConfirmTarget({ kind: 'member', id: member.id, label: member.display_name, assignedCount: tasks.filter((t) => t.assigned_member_id === member.id).length })
  }
  async function confirmRemoveMember() {
    if (!confirmTarget) return
    setConfirmLoading(true)
    const { error } = await supabase.from('project_members').delete().eq('id', confirmTarget.id)
    setConfirmLoading(false); setConfirmTarget(null)
    if (error) { toast.error(error.message); return }
    toast.success(`${confirmTarget.label} removed.`); reload()
  }

  async function handleSaveRename(e) {
    e.preventDefault()
    const trimmed = renameValue.trim(); if (!trimmed) return
    setRenameSubmitting(true)
    const { error } = await supabase.from('projects').update({ name: trimmed }).eq('id', projectId)
    setRenameSubmitting(false)
    if (error) { toast.error(error.message); return }
    setRenaming(false); toast.success('Project renamed.'); reload()
  }

  if (loading) return <div className="min-h-screen bg-paper"><div className="max-w-3xl mx-auto px-4 py-8"><LoadingSkeleton rows={4} /></div></div>
  if (loadError) return (
    <div className="max-w-md mx-auto mt-10 text-center">
      <p className="text-sm text-deadline bg-deadline-soft border border-deadline/20 rounded-lg px-4 py-3 mb-3">{loadError}</p>
      <button onClick={reload} className="text-sm text-buffer hover:underline">Try again</button>
    </div>
  )
  if (!project) return (
    <div className="max-w-md mx-auto mt-10 text-center">
      <p className="text-graphite text-sm mb-3">Project not found, or you don't have access to it.</p>
      <Link to="/dashboard" className="text-sm text-buffer hover:underline">← Back to dashboard</Link>
    </div>
  )

  const isGroup     = project.type === 'group'
  const totalTasks  = tasks.length
  const doneTasks   = tasks.filter((t) => t.status === 'done').length
  const overdueCount = tasks.filter((t) => isOverdue(t)).length
  const dueSoonCount = tasks.filter((t) => t.status !== 'done' && getDaysUntilDeadline(t.deadline) >= 0 && getDaysUntilDeadline(t.deadline) <= 7).length
  const percentDone = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0

  let visibleTasks = tasks.filter((t) => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false
    if (isGroup && memberFilter !== 'all') {
      if (memberFilter === 'unassigned' && t.assigned_member_id) return false
      if (memberFilter !== 'unassigned' && t.assigned_member_id !== memberFilter) return false
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const assigneeName = members.find((m) => m.id === t.assigned_member_id)?.display_name?.toLowerCase() || ''
      if (!t.name.toLowerCase().includes(q) && !assigneeName.includes(q)) return false
    }
    return true
  })
  visibleTasks = [...visibleTasks].sort((a, b) => {
    if (sortBy === 'deadline') return a.deadline.localeCompare(b.deadline)
    if (sortBy === 'priority') return priorityWeight[a.priority] - priorityWeight[b.priority]
    if (sortBy === 'name')     return a.name.localeCompare(b.name)
    return (a.start_by_date || '').localeCompare(b.start_by_date || '')
  })

  return (
    <div className="min-h-screen bg-paper">
      <header className="bg-white border-b border-ink/10 animate-fade-in">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/dashboard" className="text-sm text-graphite hover:text-ink transition-colors">← Dashboard</Link>
            <Logo />
          </div>
          <div className="flex items-center justify-between gap-3 mt-3 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
              {renaming ? (
                <form onSubmit={handleSaveRename} className="flex items-center gap-2">
                  <input autoFocus value={renameValue} onChange={(e) => setRenameValue(e.target.value)} className="font-display text-xl font-semibold text-ink border-b border-buffer focus:outline-none bg-transparent" />
                  <button type="submit" disabled={renameSubmitting} className="text-xs text-buffer hover:underline disabled:opacity-50">Save</button>
                  <button type="button" onClick={() => setRenaming(false)} className="text-xs text-graphite hover:underline">Cancel</button>
                </form>
              ) : (
                <>
                  <h1 className="font-display text-xl font-semibold text-ink">{project.name}</h1>
                  <button onClick={() => { setRenameValue(project.name); setRenaming(true) }} className="text-xs text-graphite/60 hover:text-buffer transition">Rename</button>
                </>
              )}
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${isGroup ? 'bg-highlight-soft text-ink' : 'bg-buffer-soft text-buffer'}`}>
                {isGroup ? 'Group' : 'Solo'}
              </span>
            </div>

            <div id="tour-project-export-actions" className="flex items-center gap-2 flex-wrap">
              <InstallAppButton />
              <NotificationBell urgentTasks={tasks.filter((t) => t.start_by_date && t.start_by_date <= todayIso && t.status !== 'done')} />
              <button type="button" onClick={() => setGuideOpen(true)} className="text-xs text-buffer hover:text-buffer/80 bg-buffer-soft px-2.5 py-1 rounded-lg transition active:scale-95 flex items-center gap-1 font-medium shadow-xs" title="How Deadline Buffer works">
                Guide
              </button>
              <button type="button" onClick={() => { const s = formatProjectSummary(project, tasks, members); navigator.clipboard.writeText(s); toast.success('Project summary copied to clipboard!') }} className="text-xs text-graphite hover:text-ink border border-ink/15 hover:border-ink/30 px-2.5 py-1 rounded-lg bg-white transition flex items-center gap-1.5 shadow-xs active:scale-95" title="Copy markdown summary for group chats">
                Copy Summary
              </button>
              <button type="button" onClick={() => { exportProjectToIcs(project, tasks, members); toast.success('Calendar (.ics) file downloaded!') }} className="text-xs text-buffer hover:text-buffer/80 border border-buffer/20 hover:border-buffer/40 px-2.5 py-1 rounded-lg bg-buffer-soft transition flex items-center gap-1.5 font-medium shadow-xs active:scale-95" title="Download .ics file for Google Calendar / Apple Calendar">
                Add to Calendar
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Progress */}
        {totalTasks > 0 && (
          <section className="bg-white rounded-xl border border-ink/10 p-6 animate-fade-up delay-50">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-ink">Progress</h2>
              <span className="font-mono text-sm text-graphite">{doneTasks}/{totalTasks} done</span>
            </div>
            <div className="h-2 w-full bg-paper-dim rounded-full overflow-hidden">
              <div className="h-full bg-buffer animate-bar-grow rounded-full" style={{ width: `${percentDone}%` }} />
            </div>
            <div className="flex gap-4 mt-4 text-xs flex-wrap">
              <span className={overdueCount > 0 ? 'text-deadline font-medium' : 'text-graphite'}>{overdueCount} overdue</span>
              <span className={dueSoonCount > 0 ? 'text-ink font-medium' : 'text-graphite'}>{dueSoonCount} due within 7 days</span>
              {overdueCount === 0 && dueSoonCount === 0 && <span className="text-buffer font-medium">✓ All on track</span>}
            </div>
          </section>
        )}

        {/* Members — group only */}
        {isGroup && (
          <section id="tour-project-members-section" className="bg-white rounded-xl border border-ink/10 p-6">
            <h2 className="text-sm font-semibold text-ink mb-4">Members</h2>
            {members.length > 0 && (
              <ul className="flex flex-col gap-2 mb-4">
                {members.map((m) => {
                  const stats = getMemberStats(m, tasks)
                  return (
                    <li key={m.id} className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg px-3 py-2.5 ${stats.overloaded ? 'bg-deadline-soft' : 'bg-paper'}`}>
                      <span className={`text-sm font-medium min-w-[100px] ${stats.overloaded ? 'text-deadline' : 'text-ink'}`}>{m.display_name}</span>
                      <div className="flex-1 min-w-[140px]"><MemberWorkloadBar activeHours={stats.activeHours} capacity={stats.capacity} size="sm" /></div>
                      <span className="text-xs text-graphite shrink-0">{stats.done}/{stats.assigned} tasks done</span>
                      <button onClick={() => requestRemoveMember(m)} title="Remove member" aria-label={`Remove ${m.display_name}`} className="text-graphite/40 hover:text-deadline text-xs transition shrink-0 px-1.5 py-0.5 rounded hover:bg-white/60">
                        Remove
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
            <form onSubmit={memberForm.handleAddMember} className="flex flex-wrap gap-2 items-end">
              <div>
                <label className="block text-xs text-graphite mb-1">Teammate Name</label>
                <input required value={memberForm.memberName} onChange={(e) => memberForm.setMemberName(e.target.value)} className="rounded-lg border border-ink/15 px-2 py-1.5 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-buffer/50 focus:border-buffer" placeholder="e.g. Jamie" />
              </div>
              <div>
                <label className="block text-xs text-graphite mb-1">Weekly Capacity</label>
                <div className="relative">
                  <input type="number" min="1" max="80" required value={memberForm.memberHours} onChange={(e) => memberForm.setMemberHours(e.target.value)} className="rounded-lg border border-ink/15 pl-2.5 pr-12 py-1.5 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-buffer/50 focus:border-buffer" />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-graphite pointer-events-none font-medium">hrs/wk</span>
                </div>
              </div>
              <button type="submit" disabled={memberForm.memberSubmitting} className="bg-ink text-paper rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-ink-soft disabled:opacity-50 transition">
                {memberForm.memberSubmitting ? 'Adding…' : '+ Add member'}
              </button>
            </form>
            {memberForm.memberError && <p className="text-xs text-deadline bg-deadline-soft border border-deadline/20 rounded-lg px-3 py-2 mt-2">{memberForm.memberError}</p>}
          </section>
        )}

        {/* Tasks */}
        <section>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              <h2 className="text-sm font-semibold text-ink">Tasks</h2>
              <p className="text-[11px] text-graphite mt-0.5 max-w-md leading-relaxed">Each task gets a color-coded <strong>Start-By date</strong> — the latest day you can begin and still finish comfortably.</p>
            </div>
            <div id="tour-project-task-controls" className="flex flex-wrap gap-2 items-center">
              {tasks.length > 0 && (
                <>
                  <div className="relative min-w-[140px] flex-1 sm:flex-initial">
                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search tasks..." className="w-full text-xs rounded-lg border border-ink/15 pl-7 pr-2.5 py-1.5 bg-white text-ink placeholder:text-graphite/60 focus:outline-none focus:ring-2 focus:ring-buffer/50 focus:border-buffer transition" />
                    <svg className="w-3.5 h-3.5 text-graphite absolute left-2 top-1/2 -translate-y-1/2" viewBox="0 0 16 16" fill="none">
                      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.3"/>
                      <path d="M11 11L14.5 14.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-xs rounded-lg border border-ink/15 px-2 py-1.5 bg-white text-graphite">
                    <option value="all">All statuses</option><option value="not_started">Not started</option><option value="in_progress">In progress</option><option value="done">Done</option>
                  </select>
                  {isGroup && (
                    <select value={memberFilter} onChange={(e) => setMemberFilter(e.target.value)} className="text-xs rounded-lg border border-ink/15 px-2 py-1.5 bg-white text-graphite">
                      <option value="all">Everyone</option><option value="unassigned">Unassigned</option>
                      {members.map((m) => <option key={m.id} value={m.id}>{m.display_name}</option>)}
                    </select>
                  )}
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="text-xs rounded-lg border border-ink/15 px-2 py-1.5 bg-white text-graphite">
                    <option value="start_by">Sort: start-by date</option><option value="deadline">Sort: deadline</option><option value="priority">Sort: priority</option><option value="name">Sort: name</option>
                  </select>
                </>
              )}
              <button id="tour-project-add-task-btn" onClick={() => setDrawerMode('add')} className="bg-ink text-paper text-xs font-medium rounded-lg px-3 py-1.5 hover:bg-ink-soft transition">
                + Add task <span className="ml-1.5 opacity-50 font-mono hidden sm:inline">N</span>
              </button>
            </div>
          </div>

          {tasks.length === 0 ? (
            <div className="bg-white rounded-2xl border border-ink/10 p-8 text-center shadow-xs animate-fade-up">
              <div className="w-12 h-12 rounded-2xl bg-buffer-soft text-buffer flex items-center justify-center mx-auto mb-3 font-display text-xl font-bold">+</div>
              <h3 className="font-display font-semibold text-base text-ink mb-1">No tasks added yet</h3>
              <p className="text-xs text-graphite mb-5 max-w-sm mx-auto leading-relaxed">Add an assignment deadline and estimated work hours. Deadline Buffer will automatically calculate your calm start-by date — you'll never have to guess when to begin again.</p>
              <div className="flex flex-wrap justify-center items-center gap-2 mb-5">
                {[{ name: 'Draft literature review', hours: '6', priority: 'high', label: 'e.g. Literature Review (6h)' }, { name: 'Problem set solutions', hours: '4', priority: 'medium', label: 'e.g. Problem Set (4h)' }].map((ex) => (
                  <button key={ex.name} type="button" onClick={() => { taskForm.setTaskName(ex.name); taskForm.setHours(ex.hours); taskForm.setPriority(ex.priority); setDrawerMode('add') }} className="text-[11px] text-graphite hover:text-ink bg-paper hover:bg-paper-dim border border-ink/10 px-2.5 py-1 rounded-lg transition">
                    {ex.label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap justify-center items-center gap-3 mb-5">
                <button type="button" onClick={() => setDrawerMode('add')} className="inline-flex items-center gap-2 bg-ink text-paper rounded-xl px-5 py-2.5 text-xs font-semibold hover:bg-ink-soft active:scale-95 transition shadow-sm">
                  <span>+</span> Add your first task <span className="opacity-50 font-mono text-[10px] ml-1 bg-white/20 px-1.5 py-0.5 rounded">N</span>
                </button>
              </div>
              <p className="text-[11px] text-graphite/70 flex items-center justify-center gap-1.5">
                Tip: Use the keyboard shortcut <kbd className="bg-paper border border-ink/20 px-1 py-0.5 rounded font-mono text-[10px]">N</kbd> anytime to quickly add a task
              </p>
            </div>
          ) : visibleTasks.length === 0 ? (
            <div className="bg-white rounded-xl border border-ink/10 p-6 text-center">
              <p className="text-sm text-graphite mb-3">No tasks match this filter.</p>
              <button onClick={() => { setStatusFilter('all'); setMemberFilter('all'); setSearchQuery('') }} className="text-xs text-buffer hover:underline">Clear search and filters</button>
            </div>
          ) : (
            <ul className="space-y-3">
              {visibleTasks.map((task, i) => {
                const urgency = getUrgencyLevel(task)
                const member  = members.find((m) => m.id === task.assigned_member_id)
                const isEditing = taskEdit.editingTaskId === task.id

                if (isEditing) return (
                  <li key={task.id} className="bg-white rounded-xl border border-buffer/40 p-4">
                    <form onSubmit={taskEdit.handleSaveEditTask} className="grid gap-3 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <label className="block text-xs text-graphite mb-1">Task name</label>
                        <input required autoFocus value={taskEdit.editFields.name} onChange={(e) => taskEdit.setEditFields({ ...taskEdit.editFields, name: e.target.value })} className={INPUT_CLS} />
                      </div>
                      <div>
                        <label className="block text-xs text-graphite mb-1">Deadline</label>
                        <DatePicker value={taskEdit.editFields.deadline} onChange={(iso) => taskEdit.setEditFields({ ...taskEdit.editFields, deadline: iso })} min={todayIso} placeholder="Pick a deadline" required />
                      </div>
                      <div>
                        <label className="block text-xs text-graphite mb-1">Estimated hours</label>
                        <input type="number" min="0.5" step="0.5" required value={taskEdit.editFields.estimated_hours} onChange={(e) => taskEdit.setEditFields({ ...taskEdit.editFields, estimated_hours: e.target.value })} className={INPUT_CLS} />
                      </div>
                      <div>
                        <label className="block text-xs text-graphite mb-1">Priority</label>
                        <select value={taskEdit.editFields.priority} onChange={(e) => taskEdit.setEditFields({ ...taskEdit.editFields, priority: e.target.value })} className={INPUT_CLS}>
                          <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                        </select>
                      </div>
                      {isGroup && (
                        <div>
                          <label className="block text-xs text-graphite mb-1">Assign to</label>
                          <select value={taskEdit.editFields.assigned_member_id} onChange={(e) => taskEdit.setEditFields({ ...taskEdit.editFields, assigned_member_id: e.target.value })} className={INPUT_CLS}>
                            <option value="">Unassigned</option>
                            {members.map((m) => <option key={m.id} value={m.id}>{m.display_name}</option>)}
                          </select>
                        </div>
                      )}
                      {taskEdit.editError && <div className="sm:col-span-2"><p className="text-xs text-deadline bg-deadline-soft border border-deadline/20 rounded-lg px-3 py-2">{taskEdit.editError}</p></div>}
                      <div className="sm:col-span-2 flex gap-2">
                        <button type="submit" disabled={taskEdit.editSubmitting} className="bg-ink text-paper rounded-lg px-4 py-2 text-sm font-medium hover:bg-ink-soft disabled:opacity-50 transition">{taskEdit.editSubmitting ? 'Saving…' : 'Save changes'}</button>
                        <button type="button" onClick={taskEdit.handleCancelEditTask} className="text-sm text-graphite hover:text-ink px-4 py-2 transition">Cancel</button>
                      </div>
                    </form>
                  </li>
                )

                return (
                  <li key={task.id} className="animate-card-in" style={{ animationDelay: `${i * 50}ms` }}>
                    <div className="bg-white rounded-xl border border-ink/10 p-4 hover:border-ink/20 hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex-1 min-w-[200px]">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-ink">{task.name}</p>
                            <span className={`text-[10px] font-medium uppercase tracking-wide px-1.5 py-0.5 rounded ${priorityStyles[task.priority]}`}>{task.priority}</span>
                          </div>
                          <p className="text-xs text-graphite mt-1">
                            {task.estimated_hours}h{isGroup && member && ` · ${member.display_name}`}{isGroup && !member && ' · Unassigned'}
                          </p>
                          <div className="mt-3 max-w-sm">
                            <BufferBar todayIso={todayIso} startByDate={task.start_by_date} deadline={task.deadline} status={task.status} size="sm" />
                          </div>
                          <span className={`text-xs font-medium mt-2 inline-block px-2 py-1 rounded-full ${URGENCY_BADGE[urgency]}`}>
                            {typeof URGENCY_LABEL[urgency] === 'function' ? URGENCY_LABEL[urgency](task) : URGENCY_LABEL[urgency]}
                          </span>
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <select value={task.status} onChange={(e) => handleStatusChange(task.id, e.target.value)} className="text-xs rounded-lg border border-ink/15 px-2 py-1 bg-white">
                            <option value="not_started">Not started</option><option value="in_progress">In progress</option><option value="done">Done</option>
                          </select>
                          <div className="flex gap-2">
                            <button onClick={() => taskEdit.handleStartEditTask(task)} className="text-xs text-buffer hover:underline">Edit</button>
                            <button onClick={() => requestDeleteTask(task)} className="text-xs text-deadline hover:underline">Delete</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </main>

      <TaskDrawer open={drawerMode === 'add'} onClose={() => { setDrawerMode(null); taskForm.resetForm() }} title="Add a task">
        <form onSubmit={taskForm.handleAddTask}>
          <TaskFormFields form={taskForm} members={members} isGroup={isGroup} tasks={tasks} />
        </form>
      </TaskDrawer>

      <ConfirmDialog
        open={!!confirmTarget}
        title={confirmTarget?.kind === 'task' ? 'Delete task?' : 'Remove member?'}
        message={confirmTarget?.kind === 'task' ? `Delete "${confirmTarget?.label}"? This can't be undone.` : confirmTarget?.assignedCount > 0 ? `${confirmTarget?.label} has ${confirmTarget.assignedCount} task(s) assigned. Removing them will unassign those tasks. Continue?` : `Remove ${confirmTarget?.label} from this project?`}
        confirmLabel={confirmTarget?.kind === 'task' ? 'Delete' : 'Remove'}
        danger loading={confirmLoading}
        onConfirm={confirmTarget?.kind === 'task' ? confirmDeleteTask : confirmRemoveMember}
        onCancel={() => setConfirmTarget(null)}
      />
      <HowItWorksModal open={guideOpen} onClose={() => setGuideOpen(false)} onStartTour={() => setTourOpen(true)} />
      <ProductTour steps={PROJECT_VIEW_STEPS} tourKey="deadline_buffer_spotlight_projectview_v1" isOpen={tourOpen} onClose={() => setTourOpen(false)} onComplete={() => setTourOpen(false)} />
    </div>
  )
}
