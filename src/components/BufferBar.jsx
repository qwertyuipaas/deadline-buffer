import { getDaysBetween, toLocalIsoDate } from '../lib/dateCalc'

// Visual timeline bar showing the safe buffer window (teal) vs active work window (coral/amber)
export default function BufferBar({ todayIso, startByDate, deadline, status = 'not_started', size = 'md' }) {
  const done = status === 'done'
  const inProgress = status === 'in_progress'

  const today = toLocalIsoDate(todayIso)
  const start = toLocalIsoDate(startByDate)
  const due = toLocalIsoDate(deadline)

  const bufferDaysRaw = getDaysBetween(today, start)
  const workDaysRaw = Math.max(1, getDaysBetween(start, due))
  const overdue = !done && bufferDaysRaw < 0

  const bufferDays = Math.max(0, bufferDaysRaw)
  const totalDays = Math.max(1, bufferDays + workDaysRaw)
  const bufferPct = Math.round((bufferDays / totalDays) * 100)
  const workPct = 100 - bufferPct

  const trackHeight = size === 'lg' ? 'h-3' : size === 'sm' ? 'h-1.5' : 'h-2'
  const workColor = done || inProgress ? 'bg-graphite-soft' : overdue ? 'bg-deadline' : 'bg-highlight'
  const bufferColor = done ? 'bg-graphite-soft' : 'bg-buffer'

  // Human-readable summary for screen readers
  const srLabel = done
    ? `Task completed. Deadline was ${deadline || 'unspecified'}.`
    : overdue
      ? `Overdue — you should have started by ${start || 'today'}. Deadline is ${deadline || 'unspecified'}.`
      : bufferDays === 0
        ? `Start today. Deadline is ${deadline || 'unspecified'}.`
        : `${bufferDays} day${bufferDays === 1 ? '' : 's'} left before you need to start (${start}). Deadline is ${deadline}.`

  return (
    <div className="w-full">
      {/* Accessible text summary for screen readers */}
      <span className="sr-only">{srLabel}</span>

      <div
        className={`flex w-full ${trackHeight} rounded-full overflow-hidden bg-paper-dim`}
        aria-hidden="true"
      >
        {bufferPct > 0 && (
          <div
            className={`${bufferColor} transition-[width] duration-300`}
            style={{ width: `${bufferPct}%` }}
          />
        )}
        <div
          className={`${workColor} transition-[width] duration-300`}
          style={{ width: `${workPct}%` }}
        />
      </div>

      {size !== 'sm' && (
        <div className="flex justify-between text-[10px] font-mono text-graphite-soft mt-1.5 tracking-wide">
          <span>Today</span>
          {done ? (
            <span className="text-graphite">Completed ✓</span>
          ) : (
            <span>Start {start || '—'}</span>
          )}
          <span>Due {due || '—'}</span>
        </div>
      )}
    </div>
  )
}