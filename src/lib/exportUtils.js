import { toLocalIsoDate, addDays } from './dateCalc'

// Generates and downloads an iCalendar (.ics) file with start-by dates and deadlines
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

  function formatIcsTimestamp() {
    const now = new Date()
    return now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  }

  const dtstamp = formatIcsTimestamp()

  const events = tasks
    .filter((t) => t.deadline)
    .map((task) => {
      const assigneeName = task.assigned_member_id ? memberMap.get(task.assigned_member_id) : 'Unassigned'
      const startIso = toLocalIsoDate(task.start_by_date || task.deadline)
      const dueIso = toLocalIsoDate(task.deadline)

      const icsStart = startIso.replace(/-/g, '')
      // For all-day events in ICS, end date is non-inclusive, so add 1 day
      const icsEnd = addDays(dueIso, 1).replace(/-/g, '')

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

// Creates a formatted text summary for copying into Discord, Slack, or WhatsApp
export function formatProjectSummary(project, tasks, members = []) {
  const memberMap = new Map(members.map((m) => [m.id, m.display_name]))
  const lines = [
    `📋 ${project.name}`,
    project.description ? `📝 ${project.description}` : '',
    '',
    '--- TASKS & SCHEDULE ---',
  ].filter(Boolean)

  tasks.forEach((t) => {
    const statusMark = t.status === 'done' ? '✅ [Done]' : t.status === 'in_progress' ? '⏳ [In Progress]' : '📌 [To Do]'
    const assignee = t.assigned_member_id ? ` · 👤 ${memberMap.get(t.assigned_member_id) || 'Member'}` : ''
    const hours = t.estimated_hours ? ` (${t.estimated_hours}h)` : ''
    const start = t.start_by_date ? ` · 🚀 Start by: ${t.start_by_date}` : ''
    const due = t.deadline ? ` · 📅 Due: ${t.deadline}` : ''

    lines.push(`${statusMark} ${t.name}${hours}${assignee}${start}${due}`)
  })

  lines.push('')
  lines.push('Shared from Deadline Buffer')

  return lines.join('\n')
}
