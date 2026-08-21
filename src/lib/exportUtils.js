/**
 * Generates and triggers download of an iCalendar (.ics) file for a project's tasks.
 * Compatible with Google Calendar, Apple Calendar, Outlook, and other calendar apps.
 *
 * @param {Object} project - { name, description }
 * @param {Array}  tasks   - array of tasks
 * @param {Array}  members - array of project members
 */
export function exportProjectToIcs(project, tasks, members = []) {
  if (!tasks || tasks.length === 0) return

  const memberMap = new Map(members.map((m) => [m.id, m.display_name]))

  function escapeIcsText(text) {
    return String(text)
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n')
  }

  function formatIcsDate(isoDate) {
    if (!isoDate) return ''
    return isoDate.replace(/-/g, '')
  }

  // Format a Date as a LOCAL YYYYMMDD string. Never use toISOString() here —
  // it converts to UTC first, which shifts dates backward by one day for
  // timezones ahead of UTC (e.g. Asia, Europe, Australia).
  function toLocalIcsDate(date) {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}${m}${d}`
  }

  function formatIcsTimestamp() {
    const now = new Date()
    return now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  }

  const dtstamp = formatIcsTimestamp()

  const events = tasks
    .filter((t) => t.deadline)
    .map((task) => {
      const assigneeName = task.assigned_member_id ? memberMap.get(task.assigned_member_id) : 'Unassigned'
      const startIso = task.start_by_date || task.deadline
      const dueIso = task.deadline

      const icsStart = formatIcsDate(startIso)
      // For all-day events in ICS, end date is non-inclusive, so add 1 day
      const dueObj = new Date(dueIso + 'T00:00:00')
      dueObj.setDate(dueObj.getDate() + 1)
      const icsEnd = toLocalIcsDate(dueObj)

      const priorityLabel = (task.priority || 'medium').toUpperCase()
      const summary = escapeIcsText(`[${priorityLabel}] ${task.name} (${project.name})`)
      const description = escapeIcsText(
        `Task: ${task.name}\nProject: ${project.name}\nPriority: ${priorityLabel}\nEstimated Hours: ${task.estimated_hours || 0}h\nAssigned to: ${assigneeName}\nSuggested Start: ${startIso}\nDeadline: ${dueIso}`
      )

      return [
        'BEGIN:VEVENT',
        `UID:${task.id || Math.random().toString(36).slice(2)}@deadlinebuffer.app`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART;VALUE=DATE:${icsStart}`,
        `DTEND;VALUE=DATE:${icsEnd}`,
        `SUMMARY:${summary}`,
        `DESCRIPTION:${description}`,
        'STATUS:CONFIRMED',
        'END:VEVENT',
      ].join('\r\n')
    })
    .join('\r\n')

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Deadline Buffer//Student Task Planner//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${project.name} - Deadlines`,
    events,
    'END:VCALENDAR',
  ].join('\r\n')

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', `${project.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_deadlines.ics`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Formats a clean text summary of a project and its tasks to copy to clipboard for Discord / Slack / WhatsApp.
 */
export function formatProjectSummary(project, tasks, members = []) {
  const memberMap = new Map(members.map((m) => [m.id, m.display_name]))
  const lines = [
    `📋 ${project.name} (Deadline Buffer Summary)`,
    project.description ? `📝 ${project.description}` : '',
    '',
    '--- TASKS & SCHEDULE ---',
  ].filter(Boolean)

  tasks.forEach((t) => {
    const statusMark = t.status === 'done' ? '✅ [DONE]' : t.status === 'in_progress' ? '⏳ [IN PROGRESS]' : '📌 [TODO]'
    const assignee = t.assigned_member_id ? ` · 👤 ${memberMap.get(t.assigned_member_id) || 'Member'}` : ''
    const hours = t.estimated_hours ? ` (${t.estimated_hours}h)` : ''
    const start = t.start_by_date ? ` · 🚀 Start by: ${t.start_by_date}` : ''
    const due = t.deadline ? ` · 📅 Due: ${t.deadline}` : ''

    lines.push(`${statusMark} ${t.name}${hours}${assignee}${start}${due}`)
  })

  lines.push('')
  lines.push('Generated via Deadline Buffer')

  return lines.join('\n')
}
