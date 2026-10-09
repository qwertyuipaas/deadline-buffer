// Core "Deadline Buffer" logic: turn a deadline into a recommended start-by date.
// Approach: count backward from the deadline using realistic daily study hours
// padded with a priority-scaled safety buffer.

const ASSUMED_FOCUSED_HOURS_PER_DAY = 2

const PRIORITY_BUFFER_MULTIPLIER = { low: 1.1, medium: 1.3, high: 1.6 }

/**
 * Normalizes any date input (YYYY-MM-DD, ISO string with time, or Date object)
 * into a clean local "YYYY-MM-DD" string.
 */
export function toLocalIsoDate(date) {
  if (!date) return ''
  if (typeof date === 'string') {
    const clean = date.trim().split('T')[0].split(' ')[0]
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean
  }
  const d = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Parses a "YYYY-MM-DD" string cleanly into a Date object at midnight local time
 * without timezone drift.
 */
function parseYMD(isoStr) {
  if (!isoStr) return null
  const clean = toLocalIsoDate(isoStr)
  if (!clean) return null
  const [y, m, d] = clean.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

/**
 * Returns today's date as a local "YYYY-MM-DD" string.
 */
export function getTodayIso() {
  return toLocalIsoDate(new Date())
}

/**
 * Calculates buffer days given estimated hours and task priority.
 */
export function calculateBufferDays(estimatedHours, priority) {
  const hours = Number(estimatedHours)
  const safeHours = Number.isFinite(hours) && hours > 0 ? hours : 1
  const multiplier = PRIORITY_BUFFER_MULTIPLIER[priority] ?? 1.3
  return Math.max(1, Math.ceil((safeHours / ASSUMED_FOCUSED_HOURS_PER_DAY) * multiplier))
}

/**
 * Calculates the start-by date by subtracting buffer days from the deadline date.
 */
export function calculateStartByDate(deadline, estimatedHours, priority, today = getTodayIso()) {
  const deadlineDate = parseYMD(deadline)
  if (!deadlineDate) return ''
  const bufferDays = calculateBufferDays(estimatedHours, priority)
  const startDate = new Date(
    deadlineDate.getFullYear(),
    deadlineDate.getMonth(),
    deadlineDate.getDate() - bufferDays
  )
  const rawIso = toLocalIsoDate(startDate)
  const todayClean = toLocalIsoDate(today) || getTodayIso()
  const deadlineClean = toLocalIsoDate(deadline)

  // If the deadline is today or in the future, the start date cannot be in the past.
  // Clamping to today ensures actionable guidance ("Start today") instead of impossible past dates.
  if (deadlineClean >= todayClean && rawIso < todayClean) {
    return todayClean
  }

  return rawIso
}

/**
 * Adds or subtracts days from a YYYY-MM-DD date string.
 */
export function addDays(isoDate, days) {
  const d = parseYMD(isoDate)
  if (!d) return ''
  const result = new Date(d.getFullYear(), d.getMonth(), d.getDate() + Number(days))
  return toLocalIsoDate(result)
}

/**
 * Calculates calendar days between two YYYY-MM-DD dates (b - a).
 * Uses UTC day timestamps to prevent daylight-saving 23h/25h rounding drift.
 */
export function getDaysBetween(dateA, dateB) {
  const da = parseYMD(dateA)
  const db = parseYMD(dateB)
  if (!da || !db) return 0
  const utc1 = Date.UTC(da.getFullYear(), da.getMonth(), da.getDate())
  const utc2 = Date.UTC(db.getFullYear(), db.getMonth(), db.getDate())
  return Math.round((utc2 - utc1) / 86400000)
}

/**
 * Returns days remaining until deadline relative to today (positive = future, negative = past).
 */
export function getDaysUntilDeadline(deadline, today = getTodayIso()) {
  if (!deadline) return 0
  return getDaysBetween(today, deadline)
}

/**
 * Determines whether a task is overdue.
 * A task is strictly overdue only if its hard deadline has already passed (deadline < today).
 * Tasks due today or in the future are never overdue.
 */
export function isOverdue(task, today = getTodayIso()) {
  if (!task || task.status === 'done') return false
  const todayClean = toLocalIsoDate(today) || getTodayIso()
  const deadline = toLocalIsoDate(task.deadline)
  if (!deadline) return false
  return deadline < todayClean
}

/**
 * Determines the urgency tier of a task: 'done', 'overdue', 'critical', 'soon', or 'fine'.
 */
export function getUrgencyLevel(task, today = getTodayIso()) {
  if (!task || task.status === 'done') return 'done'
  const todayClean = toLocalIsoDate(today) || getTodayIso()
  const deadline = toLocalIsoDate(task.deadline)

  // 1. If hard deadline has passed, the task is overdue
  if (deadline && deadline < todayClean) {
    return 'overdue'
  }

  // 2. If deadline is today, task is critical ('Due today · Start now')
  if (deadline && deadline === todayClean) {
    return 'critical'
  }

  // 3. Check start-by date relative to today
  const startBy = toLocalIsoDate(task.start_by_date) || deadline
  if (!startBy) return 'fine'

  const daysUntilStart = getDaysBetween(todayClean, startBy)
  // If start date has arrived or passed (tight buffer / start immediately)
  if (daysUntilStart <= 0) {
    return 'critical'
  }
  if (daysUntilStart <= 2) {
    return 'soon'
  }
  return 'fine'
}

/**
 * Formats a YYYY-MM-DD string into user-friendly text like "Thu, Oct 15".
 */
export function formatFriendlyDate(isoDate, options = {}) {
  if (!isoDate) return ''
  const d = parseYMD(isoDate)
  if (!d) return isoDate
  try {
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      ...options,
    })
  } catch {
    return isoDate
  }
}

/**
 * Computes an overall 0–100% buffer health score across a list of tasks.
 */
export function getBufferHealth(tasks = [], today = getTodayIso()) {
  if (!Array.isArray(tasks) || tasks.length === 0) return 100
  const active = tasks.filter((t) => t && t.status !== 'done')
  if (active.length === 0) return 100

  const todayClean = toLocalIsoDate(today) || getTodayIso()
  let scoreSum = 0
  let overduePenalty = 0

  for (const t of active) {
    const deadline = toLocalIsoDate(t.deadline)
    if (!deadline) {
      scoreSum += 50
      continue
    }

    const isDeadlinePast = deadline < todayClean
    if (isDeadlinePast) {
      const daysOverdue = Math.abs(getDaysBetween(todayClean, deadline))
      overduePenalty += Math.min(35, 10 + daysOverdue * 5)
    } else {
      const startBy =
        toLocalIsoDate(t.start_by_date) ||
        calculateStartByDate(deadline, t.estimated_hours, t.priority, todayClean)
      const effectiveStart = startBy < todayClean ? todayClean : startBy
      const totalWindow = Math.max(1, getDaysBetween(todayClean, deadline))
      const daysUntilStart = Math.max(0, getDaysBetween(todayClean, effectiveStart))
      const ratio = Math.min(1, Math.max(0, daysUntilStart / totalWindow))
      scoreSum += ratio * 100
    }
  }

  const baseScore = scoreSum / active.length
  const finalScore = Math.round(baseScore - overduePenalty / active.length)
  return Math.max(0, Math.min(100, finalScore))
}
