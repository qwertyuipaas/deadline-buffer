// Core "Deadline Buffer" logic: turn a deadline into a recommended start-by date.
//
// Approach: estimate how many focused hours/day a student can realistically give,
// pad it with a safety buffer that scales with priority, and count backward
// from the deadline.

const ASSUMED_FOCUSED_HOURS_PER_DAY = 2 // realistic daily study time for one task

// Formats a Date as a local YYYY-MM-DD string.
// IMPORTANT: don't use date.toISOString().split('T')[0] for this -- toISOString()
// converts to UTC first, which silently shifts the date backward by one day for
// any timezone ahead of UTC (e.g. Philippines, most of Asia, Europe, Australia).
function toLocalIsoDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Priority affects how much extra cushion we add, as a multiplier on top
// of the raw hours-needed estimate. High priority = start earlier / more buffer.
const PRIORITY_BUFFER_MULTIPLIER = {
  low: 1.1,
  medium: 1.3,
  high: 1.6,
}

/**
 * Calculate how many days before the deadline a task should be started.
 * @param {number} estimatedHours - total hours the task is expected to take
 * @param {'low'|'medium'|'high'} priority
 * @returns {number} number of days to count back from the deadline
 */
export function calculateBufferDays(estimatedHours, priority) {
  const hours = Number(estimatedHours)
  // Guard against invalid/negative input — treat as a 1-hour task
  const safeHours = Number.isFinite(hours) && hours > 0 ? hours : 1
  const multiplier = PRIORITY_BUFFER_MULTIPLIER[priority] ?? 1.3
  const rawDaysNeeded = safeHours / ASSUMED_FOCUSED_HOURS_PER_DAY
  const bufferedDays = rawDaysNeeded * multiplier

  // Always turn up (better to suggest starting a bit early than too late)
  // and guarantee at least 1 day of buffer.
  return Math.max(1, Math.ceil(bufferedDays))
}

/**
 * Calculate the recommended start date given a deadline string (YYYY-MM-DD).
 * @param {string} deadline - ISO date string
 * @param {number} estimatedHours
 * @param {'low'|'medium'|'high'} priority
 * @returns {string} ISO date string (YYYY-MM-DD) for the recommended start date
 */
export function calculateStartByDate(deadline, estimatedHours, priority) {
  if (!deadline) return ''
  const bufferDays = calculateBufferDays(estimatedHours, priority)
  const deadlineDate = new Date(deadline + 'T00:00:00')
  if (Number.isNaN(deadlineDate.getTime())) return ''
  const startDate = new Date(deadlineDate)
  startDate.setDate(startDate.getDate() - bufferDays)
  return toLocalIsoDate(startDate)
}

/**
 * Returns true if the suggested start date has already passed
 * relative to today, meaning the student is behind schedule.
 * NOTE: field is start_by_date (snake_case) matching the DB column name.
 */
export function isOverdue({ start_by_date, status }) {
  if (status === 'done') return false
  if (!start_by_date) return false
  const today = toLocalIsoDate(new Date())
  return start_by_date < today
}

// Exported so pages can compute "today" the same safe way (e.g. for date
// input min values) instead of each having to implement toISOString().split('T')[0].
export function getTodayIso() {
  return toLocalIsoDate(new Date())
}

/**
 * Number of calendar days from today until the given deadline (negative = past).
 * @param {string} deadline - YYYY-MM-DD
 */
export function getDaysUntilDeadline(deadline) {
  if (!deadline) return 0
  const today = new Date(getTodayIso() + 'T00:00:00')
  const due = new Date(deadline + 'T00:00:00')
  return Math.round((due - today) / 86400000)
}

/**
 * Urgency level or 'done' based on how far the start-by date is from today.
 * Drives colour decisions in a single place instead of scattered ternaries.
 * @param {{ start_by_date: string, deadline: string, status: string }} task
 * @returns {'done'|'overdue'|'critical'|'soon'|'fine'}
 */
export function getUrgencyLevel(task) {
  if (task.status === 'done') return 'done'
  const today = getTodayIso()
  if (!task.start_by_date || task.start_by_date < today) return 'overdue'

  const startDate = new Date(task.start_by_date + 'T00:00:00')
  if (Number.isNaN(startDate.getTime())) return 'fine'

  const daysUntilStart = Math.round(
    (startDate - new Date(today + 'T00:00:00')) / 86400000
  )
  if (daysUntilStart === 0) return 'critical' // must start today
  if (daysUntilStart <= 2) return 'soon'
  return 'fine'
}

/**
 * Format an ISO date (YYYY-MM-DD) in a friendly, readable form.
 * Example: "2026-08-25" → "Tue, Aug 25"
 * @param {string} isoDate - YYYY-MM-DD
 * @param {object} [options] - Intl.DateTimeFormat options (optional)
 * @returns {string}
 */
export function formatFriendlyDate(isoDate, options = {}) {
  if (!isoDate) return ''
  const date = new Date(isoDate + 'T00:00:00')
  if (Number.isNaN(date.getTime())) return isoDate
  try {
    return date.toLocaleDateString('en-US', {
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
 * Estimate buffer health (0–100) for a collection of tasks.
 * Higher score = tasks are comfortably buffered before their start-by dates.
 * @param {Array<{start_by_date?: string, deadline?: string, status: string}>} tasks
 * @param {string} [today=getTodayIso()] - optional override for tests
 * @returns {number} 0–100 integer
 */
export function getBufferHealth(tasks = [], today = getTodayIso()) {
  const active = tasks.filter((t) => t.status !== 'done')
  if (active.length === 0) return 100

  let total = 0
  let overduePenalty = 0

  for (const t of active) {
    if (!t.start_by_date || !t.deadline) {
      total++
      continue
    }

    const daysBeforeStart = Math.round(
      (new Date(t.start_by_date + 'T00:00:00') - new Date(today + 'T00:00:00')) / 86400000
    )
    if (daysBeforeStart < 0) {
      // Task is overdue — heavily penalised
      overduePenalty += 35
      continue
    }
    // Healthy: buffer depth before the deadline
    const totalWindow = Math.max(
      1,
      Math.round(
        (new Date(t.deadline + 'T00:00:00') - new Date(today + 'T00:00:00')) / 86400000
      )
    )
    // The more "safe buffer" days remain, the better
    const safeRatio = Math.min(1, Math.max(0, daysBeforeStart / Math.max(totalWindow, 1)))
    total += safeRatio * 100
  }

  const denominator = Math.max(active.length, 1)
  const health = Math.round(total / denominator - overduePenalty)
  return Math.max(0, Math.min(100, health))
}
