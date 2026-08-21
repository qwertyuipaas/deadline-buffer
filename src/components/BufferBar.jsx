// The signature visual of the app: a literal picture of the product's thesis.
// A task's timeline has two segments -- the buffer (time you have before you
// need to start) and the work window (start-by date through the deadline).
// This renders both to scale, so a glance tells you how much room is left.

const DAY_MS = 86400000

function daysBetween(a, b) {
  return Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / DAY_MS)
}

/**
 * @param {string} todayIso - YYYY-MM-DD
 * @param {string} startByDate - YYYY-MM-DD
 * @param {string} deadline - YYYY-MM-DD
 * @param {'not_started'|'in_progress'|'done'} status
 * @param {'sm'|'md'|'lg'} size
 */
export default function BufferBar({ todayIso, startByDate, deadline, status = 'not_started', size = 'md' }) {
  const done = status === 'done'

  const bufferDaysRaw = daysBetween(todayIso, startByDate)
  const workDaysRaw = Math.max(1, daysBetween(startByDate, deadline))
  const overdue = !done && bufferDaysRaw < 0

  const bufferDays = Math.max(0, bufferDaysRaw)
  const totalDays = Math.max(1, bufferDays + workDaysRaw)
  const bufferPct = (bufferDays / totalDays) * 100
  const workPct = 100 - bufferPct

  const trackHeight = size === 'lg' ? 'h-3' : size === 'sm' ? 'h-1.5' : 'h-2'
  const workColor = done ? 'bg-graphite-soft' : overdue ? 'bg-deadline' : 'bg-highlight'

  // Human-readable summary for screen readers
  const srLabel = done
    ? `Task completed. Deadline was ${deadline}.`
    : overdue
      ? `Overdue — you should have started by ${startByDate}. Deadline is ${deadline}.`
      : bufferDays === 0
        ? `Start today. Deadline is ${deadline}.`
        : `${bufferDays} day${bufferDays === 1 ? '' : 's'} left before you need to start (${startByDate}). Deadline is ${deadline}.`

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
            className="bg-buffer transition-[width] duration-300"
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
            <span>Start {startByDate}</span>
          )}
          <span>Due {deadline}</span>
        </div>
      )}
    </div>
  )
}
