// Mini visual bar showing a member's current task hours vs weekly capacity
export default function MemberWorkloadBar({ activeHours, capacity, size = 'sm', showLabel = true }) {
  const pct = capacity > 0 ? Math.min(100, Math.round((activeHours / capacity) * 100)) : 0
  const overloaded = activeHours > capacity

  const trackH = size === 'xs' ? 'h-1' : size === 'sm' ? 'h-1.5' : 'h-2'
  const fillColor = overloaded ? 'bg-deadline' : pct >= 80 ? 'bg-highlight' : 'bg-buffer'

  return (
    <span className="flex items-center gap-1.5 min-w-0">
      {showLabel && (
        <span className={`text-[10px] font-mono shrink-0 ${overloaded ? 'text-deadline' : 'text-graphite'}`}>
          {activeHours}/{capacity}h
        </span>
      )}
      <span
        className={`flex-1 ${trackH} rounded-full overflow-hidden bg-paper-dim min-w-[40px]`}
        role="meter"
        aria-valuenow={activeHours}
        aria-valuemin={0}
        aria-valuemax={capacity}
        aria-label={`${activeHours} of ${capacity} hours per week used`}
      >
        <span
          className={`block h-full ${fillColor} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </span>
      {overloaded && (
        <span className="text-[10px] text-deadline shrink-0" aria-label="overloaded">⚠</span>
      )}
    </span>
  )
}
