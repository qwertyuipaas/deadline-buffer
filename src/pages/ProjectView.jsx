import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { isOverdue, getTodayIso, getDaysUntilDeadline, getUrgencyLevel, formatFriendlyDate, calculateStartByDate, calculateBufferDays, getDaysBetween, toLocalIsoDate } from '../lib/dateCalc'
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
import Logo from '../components/Logo'
import { exportProjectToIcs, formatProjectSummary } from '../lib/exportUtils'

const PROJECT_VIEW_STEPS = [
  {
    targetId: 'tour-project-export-actions', icon: '📅',
    tag: 'Step 1 of 4 · Share', title: 'Put Tasks in Your Calendar or Group Chat',
    desc: '"Add to my calendar" puts every task into Google or Apple Calendar. "Copy for group chat" copies a neat task list you can paste into Messenger, WhatsApp, or Discord.',
    tip: 'Your calendar will show both the day to start and the due date.', preferredPlacement: 'bottom',
  },
  {
    targetId: 'tour-project-members-section', icon: '👥',
    tag: 'Step 2 of 4 · Teammates', title: 'See Who Is Busy and Who Is Free',
    desc: 'Each bar shows how many hours of work a teammate has compared to how much free time they said they have. A red bar means they have too much.',
    tip: 'When you add a task, we suggest the teammate with the most free time.', preferredPlacement: 'bottom',
  },
  {
    targetId: 'tour-project-task-controls', icon: '🔍',
    tag: 'Step 3 of 4 · Find Tasks', title: 'Search and Sort Your Tasks',
    desc: 'Type to find a task, show only unfinished ones, or sort by which one you need to start first.',
    tip: 'Handy when a project has lots of tasks.', preferredPlacement: 'bottom',
  },
  {
    targetId: 'tour-project-add-task-btn', icon: '⏱️',
    tag: 'Step 4 of 4 · Add a Task', title: 'Add Your First Task',
    desc: 'Tell us when it is due and roughly how long it will take. We will tell you which day to start so you are not rushing at the last minute.',
    tip: 'Not sure how long it takes? Just pick Quick, Medium, or Big.', preferredPlacement: 'bottom',
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
  done:     'Done ✓',
  fine:     (t) => `You have time · Start ${formatFriendlyDate(t.start_by_date)}`,
  soon:     (t) => `Start soon · ${formatFriendlyDate(t.start_by_date)}`,
  critical: (t, today = getTodayIso()) => {
    if (t && toLocalIsoDate(t.deadline) === today) return 'Due today · Work on it now'
    return 'Start today · Time is short'
  },
  overdue:  (t) => (t?.deadline ? `Late · Was due ${formatFriendlyDate(t.deadline)}` : 'Late'),
}
const priorityStyles  = { low: 'bg-paper-dim text-graphite', medium: 'bg-highlight-soft text-ink', high: 'bg-deadline-soft text-deadline' }
const priorityWeight  = { high: 0, medium: 1, low: 2 }
const PRIORITY_NAMES  = { low: 'Low importance', medium: 'Medium importance', high: 'High importance' }
const INPUT_CLS = 'w-full rounded-lg border border-ink/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-buffer/50 focus:border-buffer'

// Quick picks so people don't have to guess an exact number of hours
const HOUR_PRESETS = [
  { hours: '1', label: 'Quick',  hint: '~1 hour · quiz, short reading' },
  { hours: '4', label: 'Medium', hint: '~4 hours · essay, worksheet, lab' },
  { hours: '8', label: 'Big',    hint: '~8 hours · report, slides, big paper' },
]

// Explains in plain words what each importance level does to the start date
const PRIORITY_HINTS = {
  low:    'Simple task. We add only a little extra time.',
  medium: 'Normal task. We add some extra time in case it takes longer.',
  high:   'Very important or hard. We add the most extra time for surprises.',
}

// Task form fields (defined outside component to keep DOM focus stable)
function TaskFormFields({ form, members: memberList, isGroup: groupMode, tasks = [] }) {
  const suggested = getSuggestedMemberOrder(memberList, tasks)
  const hoursNum = Number(form.hours)
  const previewValid = form.deadline && Number.isFinite(hoursNum) && hoursNum > 0
  const previewStartBy = previewValid ? calculateStartByDate(form.deadline, hoursNum, form.priority, form.todayIso) : null

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="block text-xs text-graphite mb-1">What do you need to do?</label>
        <input required value={form.taskName} onChange={(e) => form.setTaskName(e.target.value)} className={INPUT_CLS} placeholder="e.g. Write history essay" />
      </div>
      <div>
        <label className="block text-xs text-graphite mb-1">When is it due?</label>
        <DatePicker value={form.deadline} onChange={(iso) => form.setDeadline(iso)} min={form.todayIso} placeholder="Pick the due date" required />
      </div>
      <div>
        <label className="block text-xs text-graphite mb-1">How many hours will it take?</label>
        <input type="number" min="0.5" step="0.5" required value={form.hours} onChange={(e) => form.setHours(e.target.value)} className={INPUT_CLS} placeholder="e.g. 4" />
      </div>
      <div className="sm:col-span-2 -mt-2">
        <p className="text-[11px] text-graphite mb-1.5">Not sure? Pick one:</p>
        <div className="grid grid-cols-3 gap-2">
          {HOUR_PRESETS.map((p) => {
            const active = form.hours === p.hours
            return (
              <button
                key={p.hours}
                type="button"
                onClick={() => form.setHours(p.hours)}
                className={`text-left rounded-lg border px-2.5 py-2 transition ${active ? 'border-buffer bg-buffer-soft ring-1 ring-buffer/40' : 'border-ink/10 bg-paper hover:bg-paper-dim'}`}
              >
                <span className="block text-xs font-semibold text-ink">{p.label}</span>
                <span className="block text-[10px] text-graphite leading-snug mt-0.5">{p.hint}</span>
              </button>
            )
          })}
        </div>
      </div>
      <div className="sm:col-span-2">
        <label className="block text-xs text-graphite mb-1">How important is it?</label>
        <select value={form.priority} onChange={(e) => form.setPriority(e.target.value)} className={INPUT_CLS}>
          <option value="low">Low – simple task</option>
          <option value="medium">Medium – normal task</option>
          <option value="high">High – very important or hard</option>
        </select>
        <p className="text-[11px] text-graphite mt-1">{PRIORITY_HINTS[form.priority]}</p>
      </div>
      {groupMode && memberList.length > 0 && (
        <div className="sm:col-span-2">
          <label className="block text-xs text-graphite mb-0.5">Who will do it?</label>
          <p className="text-[11px] text-graphite mb-2">The bar shows how busy each person already is.</p>
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-paper transition">
              <input type="radio" name="assignee" value="" checked={form.assignedMemberId === ''} onChange={() => form.setAssignedMemberId('')} className="accent-buffer" />
              <span className="text-sm text-graphite">Decide later</span>
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
                      {isBest     && <span className="text-[10px] font-medium bg-buffer text-white px-1.5 py-0.5 rounded-full">most free time</span>}
                      {stats.overloaded && <span className="text-[10px] font-medium bg-deadline-soft text-deadline px-1.5 py-0.5 rounded-full">too busy</span>}
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
          (() => {
            const isDueToday = form.deadline === form.todayIso
            const bufferDays = calculateBufferDays(hoursNum, form.priority)
            const daysUntil = getDaysBetween(form.todayIso, form.deadline)
            const isTight = !isDueToday && bufferDays > daysUntil

            if (isDueToday) {
              return (
                <div className="flex items-center justify-between gap-3 rounded-xl bg-deadline-soft border border-deadline/30 px-4 py-3 animate-fade-in">
                  <div className="text-xs text-deadline leading-snug">
                    <strong className="font-semibold block">⚠️ This is due today</strong>
                    Start right away to fit in your {hoursNum} hour{hoursNum === 1 ? '' : 's'} of work.
                  </div>
                  <strong className="font-display text-sm text-deadline whitespace-nowrap">Start today</strong>
                </div>
              )
            }

            if (isTight) {
              return (
                <div className="flex items-center justify-between gap-3 rounded-xl bg-highlight-soft border border-highlight/40 px-4 py-3 animate-fade-in">
                  <div className="text-xs text-ink leading-snug">
                    <strong className="font-semibold block">⚡ Time is short</strong>
                    This usually needs about {bufferDays} days, but it's due in {daysUntil} day{daysUntil === 1 ? '' : 's'}. Start today.
                  </div>
                  <strong className="font-display text-sm text-ink whitespace-nowrap">Start today</strong>
                </div>
              )
            }

            return (
              <div className="rounded-xl bg-buffer-soft border border-buffer/30 px-4 py-3 animate-fade-in">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-graphite leading-snug">👉 Start this on:</span>
                  <strong className="font-display text-sm text-buffer whitespace-nowrap">{formatFriendlyDate(previewStartBy)}</strong>
                </div>
                <p className="text-[11px] text-graphite mt-1.5 leading-relaxed">
                  That gives you about {bufferDays} days to finish, working around 2 hours a day, with some extra time in case things take longer.
                </p>
              </div>
            )
          })()
        ) : (
          <p className="text-[11px] text-graphite/70 leading-relaxed px-1">Fill in the due date and hours, and we'll tell you <strong>which day to start</strong> so you don't have to rush.</p>
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
  const overdueCount = tasks.filter((t) => isOverdue(t, todayIso)).length
  const dueTodayCount = tasks.filter((t) => t.status !== 'done' && toLocalIsoDate(t.deadline) === todayIso).length
  const startTodayCount = tasks.filter((t) => t.status !== 'done' && toLocalIsoDate(t.deadline) !== todayIso && toLocalIsoDate(t.start_by_date) === todayIso).length
  const dueSoonCount = tasks.filter((t) => t.status !== 'done' && getDaysUntilDeadline(t.deadline, todayIso) > 0 && getDaysUntilDeadline(t.deadline, todayIso) <= 7).length
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
              <button type="button" onClick={() => setGuideOpen(true)} className="text-xs text-buffer hover:text-buffer/80 bg-buffer-soft px-2.5 py-1 rounded-lg transition active:scale-95 flex items-center gap-1 font-medium shadow-xs" title="Learn how this app works">
                ❓ Help
              </button>
              <button type="button" onClick={() => { const s = formatProjectSummary(project, tasks, members); navigator.clipboard.writeText(s); toast.success('Copied! Paste it into your group chat.') }} className="text-xs text-graphite hover:text-ink border border-ink/15 hover:border-ink/30 px-2.5 py-1 rounded-lg bg-white transition flex items-center gap-1.5 shadow-xs active:scale-95" title="Copy a task list you can paste into Messenger, WhatsApp, or Discord">
                💬 Copy for group chat
              </button>
              <button type="button" onClick={() => { exportProjectToIcs(project, tasks, members); toast.success('Calendar file downloaded! Open it to add your tasks to your calendar.') }} className="text-xs text-buffer hover:text-buffer/80 border border-buffer/20 hover:border-buffer/40 px-2.5 py-1 rounded-lg bg-buffer-soft transition flex items-center gap-1.5 font-medium shadow-xs active:scale-95" title="Downloads a file. Open it to add all tasks to Google or Apple Calendar.">
                📅 Add to my calendar
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
            <div className="flex gap-3 mt-4 text-xs flex-wrap items-center">
              {overdueCount > 0 && <span className="text-deadline font-medium bg-deadline-soft px-2 py-0.5 rounded-full">{overdueCount} late</span>}
              {dueTodayCount > 0 && <span className="text-deadline font-medium bg-deadline-soft/80 px-2 py-0.5 rounded-full">⚠️ {dueTodayCount} due today</span>}
              {startTodayCount > 0 && <span className="text-ink font-medium bg-highlight-soft px-2 py-0.5 rounded-full">🔥 {startTodayCount} to start today</span>}
              <span className={dueSoonCount > 0 ? 'text-ink font-medium' : 'text-graphite'}>{dueSoonCount} due this week</span>
              {overdueCount === 0 && dueTodayCount === 0 && startTodayCount === 0 && dueSoonCount === 0 && <span className="text-buffer font-medium">✓ You're on track</span>}
            </div>
          </section>
        )}

        {/* Members — group only */}
        {isGroup && (
          <section id="tour-project-members-section" className="bg-white rounded-xl border border-ink/10 p-6">
            <h2 className="text-sm font-semibold text-ink">Teammates</h2>
            <p className="text-[11px] text-graphite mt-0.5 mb-4">The bar shows how much work each person has compared to their free time. Red means too much.</p>
            {members.length > 0 && (
              <ul className="flex flex-col gap-2 mb-4">
                {members.map((m) => {
                  const stats = getMemberStats(m, tasks)
                  return (
                    <li key={m.id} className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-lg px-3 py-2.5 ${stats.overloaded ? 'bg-deadline-soft' : 'bg-paper'}`}>
                      <span className={`text-sm font-medium min-w-[80px] sm:min-w-[100px] ${stats.overloaded ? 'text-deadline' : 'text-ink'}`}>{m.display_name}</span>
                      <div className="flex-1 min-w-[120px] max-w-xs"><MemberWorkloadBar activeHours={stats.activeHours} capacity={stats.capacity} size="sm" /></div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-graphite">{stats.done} of {stats.assigned} done</span>
                        <button onClick={() => requestRemoveMember(m)} title="Remove teammate" aria-label={`Remove ${m.display_name}`} className="text-graphite/40 hover:text-deadline text-xs transition px-1.5 py-0.5 rounded hover:bg-white/60">
                          Remove
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
            <form onSubmit={memberForm.handleAddMember} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
              <div className="sm:col-span-6">
                <label className="block text-xs text-graphite mb-1">Teammate's name</label>
                <input required value={memberForm.memberName} onChange={(e) => memberForm.setMemberName(e.target.value)} className="w-full rounded-lg border border-ink/15 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-buffer/50 focus:border-buffer" placeholder="e.g. Jamie" />
              </div>
              <div className="sm:col-span-3">
                <label className="block text-xs text-graphite mb-1" title="How many hours a week this person can spend on this project">Free hours a week</label>
                <div className="relative">
                  <input type="number" min="1" max="80" required value={memberForm.memberHours} onChange={(e) => memberForm.setMemberHours(e.target.value)} className="w-full rounded-lg border border-ink/15 pl-2.5 pr-12 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-buffer/50 focus:border-buffer" />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-graphite pointer-events-none font-medium">hours</span>
                </div>
              </div>
              <div className="sm:col-span-3">
                <button type="submit" disabled={memberForm.memberSubmitting} className="w-full bg-ink text-paper rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-ink-soft disabled:opacity-50 transition">
                  {memberForm.memberSubmitting ? 'Adding…' : '+ Add teammate'}
                </button>
              </div>
            </form>
            <p className="text-[11px] text-graphite mt-2">Tip: most students can give a project about 6–10 hours a week.</p>
            {memberForm.memberError && <p className="text-xs text-deadline bg-deadline-soft border border-deadline/20 rounded-lg px-3 py-2 mt-2">{memberForm.memberError}</p>}
          </section>
        )}

        {/* Tasks */}
        <section>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              <h2 className="text-sm font-semibold text-ink">Tasks</h2>
              <p className="text-[11px] text-graphite mt-0.5 max-w-md leading-relaxed">Each task shows <strong>which day to start</strong> so you can finish without rushing.</p>
            </div>
            <div id="tour-project-task-controls" className="flex flex-wrap gap-2 items-center w-full sm:w-auto">
              {tasks.length > 0 && (
                <>
                  <div className="relative w-full sm:w-auto sm:min-w-[140px] flex-1">
                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Find a task..." className="w-full text-xs rounded-lg border border-ink/15 pl-7 pr-2.5 py-1.5 bg-white text-ink placeholder:text-graphite/60 focus:outline-none focus:ring-2 focus:ring-buffer/50 focus:border-buffer transition" />
                    <svg className="w-3.5 h-3.5 text-graphite absolute left-2 top-1/2 -translate-y-1/2" viewBox="0 0 16 16" fill="none">
                      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.3"/>
                      <path d="M11 11L14.5 14.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-xs rounded-lg border border-ink/15 px-2 py-1.5 bg-white text-graphite flex-1 sm:flex-initial">
                    <option value="all">Show all</option><option value="not_started">Not started</option><option value="in_progress">Working on it</option><option value="done">Done</option>
                  </select>
                  {isGroup && (
                    <select value={memberFilter} onChange={(e) => setMemberFilter(e.target.value)} className="text-xs rounded-lg border border-ink/15 px-2 py-1.5 bg-white text-graphite flex-1 sm:flex-initial">
                      <option value="all">Everyone</option><option value="unassigned">No one yet</option>
                      {members.map((m) => <option key={m.id} value={m.id}>{m.display_name}</option>)}
                    </select>
                  )}
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="text-xs rounded-lg border border-ink/15 px-2 py-1.5 bg-white text-graphite flex-1 sm:flex-initial">
                    <option value="start_by">Order: start first</option><option value="deadline">Order: due first</option><option value="priority">Order: most important</option><option value="name">Order: A to Z</option>
                  </select>
                </>
              )}
              <button id="tour-project-add-task-btn" onClick={() => setDrawerMode('add')} className="w-full sm:w-auto justify-center bg-ink text-paper text-xs font-medium rounded-lg px-3.5 py-1.5 hover:bg-ink-soft transition flex items-center gap-1">
                + Add task
              </button>
            </div>
          </div>

          {tasks.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3 text-[11px] text-graphite">
              <span className="font-medium text-ink">What the colored bar means:</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-full bg-buffer inline-block" /> Free time before you start</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-full bg-highlight inline-block" /> Time to work on it</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-full bg-deadline inline-block" /> Late</span>
            </div>
          )}

          {tasks.length === 0 ? (
            <div className="bg-white rounded-2xl border border-ink/10 p-8 text-center shadow-xs animate-fade-up">
              <div className="w-12 h-12 rounded-2xl bg-buffer-soft text-buffer flex items-center justify-center mx-auto mb-3 font-display text-xl font-bold">+</div>
              <h3 className="font-display font-semibold text-base text-ink mb-1">No tasks yet</h3>
              <p className="text-xs text-graphite mb-5 max-w-sm mx-auto leading-relaxed">Add something you need to do, when it's due, and about how long it takes. We'll tell you which day to start so you never have to cram.</p>
              <div className="flex flex-wrap justify-center items-center gap-2 mb-5">
                <span className="text-[11px] text-graphite w-full mb-1">Try an example:</span>
                {[{ name: 'Write history essay', hours: '4', priority: 'medium', label: '📄 Essay (4 hours)' }, { name: 'Group presentation slides', hours: '8', priority: 'high', label: '📊 Slides (8 hours)' }].map((ex) => (
                  <button key={ex.name} type="button" onClick={() => { taskForm.setTaskName(ex.name); taskForm.setHours(ex.hours); taskForm.setPriority(ex.priority); setDrawerMode('add') }} className="text-[11px] text-graphite hover:text-ink bg-paper hover:bg-paper-dim border border-ink/10 px-2.5 py-1 rounded-lg transition">
                    {ex.label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap justify-center items-center gap-3">
                <button type="button" onClick={() => setDrawerMode('add')} className="inline-flex items-center gap-2 bg-ink text-paper rounded-xl px-5 py-2.5 text-xs font-semibold hover:bg-ink-soft active:scale-95 transition shadow-sm">
                  <span>+</span> Add your first task
                </button>
              </div>
            </div>
          ) : visibleTasks.length === 0 ? (
            <div className="bg-white rounded-xl border border-ink/10 p-6 text-center">
              <p className="text-sm text-graphite mb-3">No tasks match this filter.</p>
              <button onClick={() => { setStatusFilter('all'); setMemberFilter('all'); setSearchQuery('') }} className="text-xs text-buffer hover:underline">Clear search and filters</button>
            </div>
          ) : (
            <ul className="space-y-3">
              {visibleTasks.map((task, i) => {
                const urgency = getUrgencyLevel(task, todayIso)
                const member  = members.find((m) => m.id === task.assigned_member_id)
                const isEditing = taskEdit.editingTaskId === task.id

                if (isEditing) return (
                  <li key={task.id} className="bg-white rounded-xl border border-buffer/40 p-4">
                    <form onSubmit={taskEdit.handleSaveEditTask} className="grid gap-3 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                         <label className="block text-xs text-graphite mb-1">What do you need to do?</label>
                        <input required autoFocus value={taskEdit.editFields.name} onChange={(e) => taskEdit.setEditFields({ ...taskEdit.editFields, name: e.target.value })} className={INPUT_CLS} />
                      </div>
                      <div>
                        <label className="block text-xs text-graphite mb-1">When is it due?</label>
                        <DatePicker value={taskEdit.editFields.deadline} onChange={(iso) => taskEdit.setEditFields({ ...taskEdit.editFields, deadline: iso })} min={taskEdit.editFields.deadline && taskEdit.editFields.deadline < todayIso ? taskEdit.editFields.deadline : todayIso} placeholder="Pick the due date" required />
                      </div>
                      <div>
                        <label className="block text-xs text-graphite mb-1">How many hours will it take?</label>
                        <input type="number" min="0.5" step="0.5" required value={taskEdit.editFields.estimated_hours} onChange={(e) => taskEdit.setEditFields({ ...taskEdit.editFields, estimated_hours: e.target.value })} className={INPUT_CLS} />
                      </div>
                      <div>
                        <label className="block text-xs text-graphite mb-1">How important is it?</label>
                        <select value={taskEdit.editFields.priority} onChange={(e) => taskEdit.setEditFields({ ...taskEdit.editFields, priority: e.target.value })} className={INPUT_CLS}>
                          <option value="low">Low – simple task</option><option value="medium">Medium – normal task</option><option value="high">High – very important or hard</option>
                        </select>
                      </div>
                      {isGroup && (
                        <div>
                          <label className="block text-xs text-graphite mb-1">Who will do it?</label>
                          <select value={taskEdit.editFields.assigned_member_id} onChange={(e) => taskEdit.setEditFields({ ...taskEdit.editFields, assigned_member_id: e.target.value })} className={INPUT_CLS}>
                            <option value="">Decide later</option>
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
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${priorityStyles[task.priority]}`}>{PRIORITY_NAMES[task.priority] || task.priority}</span>
                          </div>
                          <p className="text-xs text-graphite mt-1">
                            Due {formatFriendlyDate(task.deadline)} · {task.estimated_hours} hour{Number(task.estimated_hours) === 1 ? '' : 's'} of work{isGroup && member && ` · ${member.display_name}`}{isGroup && !member && ' · No one assigned yet'}
                          </p>
                          <div className="mt-3 max-w-sm">
                            <BufferBar todayIso={todayIso} startByDate={task.start_by_date} deadline={task.deadline} status={task.status} size="sm" />
                          </div>
                          <span className={`text-xs font-medium mt-2 inline-block px-2 py-1 rounded-full ${URGENCY_BADGE[urgency]}`}>
                            {typeof URGENCY_LABEL[urgency] === 'function' ? URGENCY_LABEL[urgency](task, todayIso) : URGENCY_LABEL[urgency]}
                          </span>
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <select value={task.status} onChange={(e) => handleStatusChange(task.id, e.target.value)} className="text-xs rounded-lg border border-ink/15 px-2 py-1 bg-white" aria-label="Task progress">
                            <option value="not_started">Not started</option><option value="in_progress">Working on it</option><option value="done">Done ✓</option>
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
