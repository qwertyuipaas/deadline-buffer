// Core "Deadline Buffer" logic: turn a deadline into a recommended start-by date.
//
// Approach: estimate how many focused hours/day a student can realistically give,
// pad it with a safety buffer that scales with priority, and count backward
// from the deadline.

const ASSUMED_FOCUSED_HOURS_PER_DAY = 2 // realistic daily study time for one task

// Formats a Date as a local YYYY-MM-DD string.
// IMPORTANT: don't use date.toISOString().split('T')[0] for this -- toISOString()
// converts to UTC first, which silently shifts the date backward by one day for
// any timezone ahead of UTC (e.g. Philippines, most of Asia/Europe/Australia).
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
  const multiplier = PRIORITY_BUFFER_MULTIPLIER[priority] ?? 1.3
  const rawDaysNeeded = estimatedHours / ASSUMED_FOCUSED_HOURS_PER_DAY
  const bufferedDays = rawDaysNeeded * multiplier

  // Always round up (better to suggest starting a bit early than too late)
  // and guarantee at least 1 day of buffer.
  return Math.max(1, Math.ceil(bufferedDays))
}

/**
 * Calculate the recommended start-by date given a deadline string (YYYY-MM-DD).
 * @param {string} deadline - ISO date string
 * @param {number} estimatedHours
 * @param {'low'|'medium'|'high'} priority
 * @returns {string} ISO date string (YYYY-MM-DD) for the recommended start date
 */
export function calculateStartByDate(deadline, estimatedHours, priority) {
  const bufferDays = calculateBufferDays(estimatedHours, priority)
  const deadlineDate = new Date(deadline + 'T00:00:00')
  const startDate = new Date(deadlineDate)
  startDate.setDate(startDate.getDate() - bufferDays)
  return toLocalIsoDate(startDate)
}

/**
 * Returns true if the recommended start date has already passed
 * relative to today, meaning the student is behind schedule.
 * NOTE: field is start_by_date (snake_case) matching the DB column name.
 */
export function isOverdue({ start_by_date, status }) {
  if (status === 'done') return false
  const today = toLocalIsoDate(new Date())
  return start_by_date < today
}

// Exported so pages can compute "today" the same safe way (e.g. for date
// input min values), instead of each reimplementing toISOString().split('T')[0].
export function getTodayIso() {
  return toLocalIsoDate(new Date())
}

/**
 * Number of calendar days from today until the given deadline (negative = past).
 * @param {string} deadline - YYYY-MM-DD
 */
export function getDaysUntilDeadline(deadline) {
  const today = new Date(getTodayIso() + 'T00:00:00')
  const due = new Date(deadline + 'T00:00:00')
  return Math.round((due - today) / 86400000)
}

/**
 * Urgency level based on how far the start-by date is from today.
 * Drives colour decisions in a single place instead of scattered ternaries.
 * @param {{ start_by_date: string, deadline: string, status: string }} task
 * @returns {'done'|'overdue'|'critical'|'soon'|'fine'}
 */
export function getUrgencyLevel(task) {
  if (task.status === 'done') return 'done'
  const today = getTodayIso()
  if (!task.start_by_date || task.start_by_date < today) return 'overdue'
  const daysUntilStart = Math.round(
    (new Date(task.start_by_date + 'T00:00:00') - new Date(today + 'T00:00:00')) / 86400000
  )
  if (daysUntilStart === 0) return 'critical' // must start today
  if (daysUntilStart <= 2) return 'soon'
  return 'fine'
}
