// Core "Deadline Buffer" logic: turn a deadline into a recommended start-by date.
// Approach: count backward from the deadline using realistic daily study hours
// padded with a priority-scaled safety buffer.

const ASSUMED_FOCUSED_HOURS_PER_DAY = 2

// Formats a Date as local YYYY-MM-DD (avoids toISOString UTC shift for non-UTC timezones).
function toLocalIsoDate(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

const PRIORITY_BUFFER_MULTIPLIER = { low: 1.1, medium: 1.3, high: 1.6 }

export function calculateBufferDays(estimatedHours, priority) {
  const hours = Number(estimatedHours)
  const safeHours = Number.isFinite(hours) && hours > 0 ? hours : 1
  const multiplier = PRIORITY_BUFFER_MULTIPLIER[priority] ?? 1.3
  return Math.max(1, Math.ceil((safeHours / ASSUMED_FOCUSED_HOURS_PER_DAY) * multiplier))
}

export function calculateStartByDate(deadline, estimatedHours, priority) {
  if (!deadline) return ''
  const deadlineDate = new Date(deadline + 'T00:00:00')
  if (Number.isNaN(deadlineDate.getTime())) return ''
  const startDate = new Date(deadlineDate)
  startDate.setDate(startDate.getDate() - calculateBufferDays(estimatedHours, priority))
  return toLocalIsoDate(startDate)
}

export function isOverdue({ start_by_date, status }) {
  if (status === 'done' || !start_by_date) return false
  return start_by_date < toLocalIsoDate(new Date())
}

export function getTodayIso() {
  return toLocalIsoDate(new Date())
}

export function getDaysUntilDeadline(deadline) {
  if (!deadline) return 0
  const today = new Date(getTodayIso() + 'T00:00:00')
  const due   = new Date(deadline + 'T00:00:00')
  return Math.round((due - today) / 86400000)
}

export function getUrgencyLevel(task) {
  if (task.status === 'done') return 'done'
  const today = getTodayIso()
  if (!task.start_by_date || task.start_by_date < today) return 'overdue'
  const daysUntilStart = Math.round((new Date(task.start_by_date + 'T00:00:00') - new Date(today + 'T00:00:00')) / 86400000)
  if (daysUntilStart === 0) return 'critical'
  if (daysUntilStart <= 2) return 'soon'
  return 'fine'
}

export function formatFriendlyDate(isoDate, options = {}) {
  if (!isoDate) return ''
  const date = new Date(isoDate + 'T00:00:00')
  if (Number.isNaN(date.getTime())) return isoDate
  try {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', ...options })
  } catch {
    return isoDate
  }
}

export function getBufferHealth(tasks = [], today = getTodayIso()) {
  const active = tasks.filter((t) => t.status !== 'done')
  if (active.length === 0) return 100

  let total = 0, overduePenalty = 0
  for (const t of active) {
    if (!t.start_by_date || !t.deadline) { total++; continue }
    const daysBeforeStart = Math.round((new Date(t.start_by_date + 'T00:00:00') - new Date(today + 'T00:00:00')) / 86400000)
    if (daysBeforeStart < 0) { overduePenalty += 35; continue }
    const totalWindow = Math.max(1, Math.round((new Date(t.deadline + 'T00:00:00') - new Date(today + 'T00:00:00')) / 86400000))
    total += Math.min(1, Math.max(0, daysBeforeStart / totalWindow)) * 100
  }

  return Math.max(0, Math.min(100, Math.round(total / Math.max(active.length, 1) - overduePenalty)))
}
