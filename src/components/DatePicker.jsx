import { useEffect, useRef, useState } from 'react'
import { getTodayIso } from '../lib/dateCalc'

// Month names (full and short)
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const SHORT_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]
const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function parseIso(iso) {
  if (!iso) return null
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function toIso(date) {
  if (!date) return ''
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatDisplay(iso) {
  if (!iso) return ''
  const date = parseIso(iso)
  return date
    ? `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
    : ''
}

/**
 * A styled date picker that replaces <input type="date">.
 * Features quick Year & Month jump view so users don't have to paginate one-by-one.
 *
 * @param {string}   value       - ISO date string (YYYY-MM-DD) or ''
 * @param {Function} onChange    - called with new ISO string
 * @param {string}   min         - ISO date string for earliest allowed date (optional)
 * @param {string}   placeholder - text when no date selected
 * @param {boolean}  required    - marks field as required (for form validation)
 */
export default function DatePicker({
  value,
  onChange,
  min,
  placeholder = 'Pick a date',
  required = false,
}) {
  const [open, setOpen] = useState(false)
  const [viewMode, setViewMode] = useState('days') // 'days' | 'months' | 'years'
  const [month, setMonth] = useState(() => {
    const d = value ? parseIso(value) : new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  // Year range start for the 12-year grid (e.g. 2024 to 2035)
  const [yearGridStart, setYearGridStart] = useState(() => {
    const y = (value ? parseIso(value) : new Date()).getFullYear()
    return Math.floor(y / 12) * 12
  })

  const containerRef = useRef(null)
  const todayIso = getTodayIso()
  const minDate = min ? parseIso(min) : null

  // Reset viewMode and month when opening
  useEffect(() => {
    if (open) {
      const d = value ? parseIso(value) : new Date()
      setMonth(new Date(d.getFullYear(), d.getMonth(), 1))
      setYearGridStart(Math.floor(d.getFullYear() / 12) * 12)
      setViewMode('days')
    }
  }, [open, value])

  // Close on outside click or Escape
  useEffect(() => {
    if (!open) return
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    function handleKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  function handleDaySelect(day) {
    if (!day) return
    if (minDate) {
      const d = new Date(day.getFullYear(), day.getMonth(), day.getDate())
      const m = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())
      if (d < m) return
    }
    onChange(toIso(day))
    setOpen(false)
  }

  function handleMonthSelect(monthIdx) {
    const newDate = new Date(month.getFullYear(), monthIdx, 1)
    setMonth(newDate)
    setViewMode('days')
  }

  function handleYearSelect(selectedYear) {
    const newDate = new Date(selectedYear, month.getMonth(), 1)
    setMonth(newDate)
    setViewMode('months')
  }

  function prevMonth() {
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))
  }
  function nextMonth() {
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))
  }

  function prevYear() {
    setMonth((m) => new Date(m.getFullYear() - 1, m.getMonth(), 1))
  }
  function nextYear() {
    setMonth((m) => new Date(m.getFullYear() + 1, m.getMonth(), 1))
  }

  function prevYearGrid() {
    setYearGridStart((y) => y - 12)
  }
  function nextYearGrid() {
    setYearGridStart((y) => y + 12)
  }

  // Build calendar day grid
  function buildDays() {
    const year = month.getFullYear()
    const mon = month.getMonth()
    const firstDay = new Date(year, mon, 1).getDay()
    const daysInMonth = new Date(year, mon + 1, 0).getDate()
    const daysInPrev = new Date(year, mon, 0).getDate()

    const cells = []
    // Previous month padding
    for (let i = firstDay - 1; i >= 0; i--) {
      cells.push({ day: daysInPrev - i, current: false, date: new Date(year, mon - 1, daysInPrev - i) })
    }
    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, current: true, date: new Date(year, mon, d) })
    }
    // Next month padding to fill 6 rows
    let next = 1
    while (cells.length % 7 !== 0 || cells.length < 35) {
      cells.push({ day: next++, current: false, date: new Date(year, mon + 1, next - 1) })
    }
    return cells
  }

  const cells = buildDays()
  const currentYear = month.getFullYear()
  const yearsList = Array.from({ length: 12 }, (_, i) => yearGridStart + i)

  return (
    <div ref={containerRef} className="relative">
      {/* Hidden native input for form validation */}
      <input
        type="text"
        readOnly
        required={required}
        value={value || ''}
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
      />

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`w-full flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-sm text-left
          focus:outline-none focus:ring-2 focus:ring-buffer/50 focus:border-buffer transition-all
          ${value ? 'text-ink border-ink/15' : 'text-graphite border-ink/15'}
          ${open ? 'border-buffer ring-2 ring-buffer/30' : 'hover:border-ink/30'}`}
      >
        <span className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="text-graphite shrink-0">
            <rect x="1" y="3" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M5 1v3M11 1v3M1 7h14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          {value ? formatDisplay(value) : <span className="text-graphite">{placeholder}</span>}
        </span>
        <svg
          width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"
          className={`text-graphite shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        >
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Calendar popover */}
      {open && (
        <div
          role="dialog"
          aria-label="Date picker"
          className="absolute top-full mt-2 left-0 z-50 bg-white rounded-xl border border-ink/10 shadow-xl p-4 w-72 animate-[modal-in_0.15s_ease-out]"
        >
          {/* ========================================================= */}
          {/* 1. DAYS VIEW                                              */}
          {/* ========================================================= */}
          {viewMode === 'days' && (
            <>
              {/* Header with Month + Year click button to jump */}
              <div className="flex items-center justify-between mb-3">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-paper transition text-graphite hover:text-ink"
                  aria-label="Previous month"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>

                {/* Clickable Month & Year Header to open Month/Year selector */}
                <button
                  type="button"
                  onClick={() => setViewMode('months')}
                  title="Click to jump to another month or year"
                  className="flex items-center gap-1 font-display font-semibold text-sm text-ink px-2 py-1 rounded-lg hover:bg-paper hover:text-buffer transition-colors group"
                >
                  <span>{MONTHS[month.getMonth()]} {month.getFullYear()}</span>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true" className="text-graphite group-hover:text-buffer transition-transform group-hover:translate-y-0.5">
                    <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>

                <button
                  type="button"
                  onClick={nextMonth}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-paper transition text-graphite hover:text-ink"
                  aria-label="Next month"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>

              {/* Day column headers */}
              <div className="grid grid-cols-7 mb-1">
                {DAYS.map((d) => (
                  <div key={d} className="text-center text-[10px] font-medium text-graphite py-1">
                    {d}
                  </div>
                ))}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7 gap-y-0.5">
                {cells.map((cell, idx) => {
                  const cellIso = toIso(cell.date)
                  const isSelected = value && cellIso === value
                  const isToday = cellIso === todayIso
                  const isDisabled = minDate
                    ? cell.date < new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())
                    : false

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleDaySelect(cell.date)}
                      disabled={isDisabled}
                      className={`h-8 w-full flex items-center justify-center rounded-lg text-xs font-medium transition-all
                        ${!cell.current ? 'text-graphite/40' : ''}
                        ${isDisabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
                        ${isSelected
                          ? 'bg-buffer text-white shadow-sm'
                          : isToday && !isDisabled
                            ? 'bg-buffer-soft text-buffer ring-1 ring-buffer/40'
                            : cell.current && !isDisabled
                              ? 'hover:bg-paper-dim text-ink'
                              : ''
                        }`}
                    >
                      {cell.day}
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {/* ========================================================= */}
          {/* 2. MONTHS VIEW (12-month grid with Year picker at top)     */}
          {/* ========================================================= */}
          {viewMode === 'months' && (
            <div className="animate-fade-in">
              <div className="flex items-center justify-between mb-3">
                <button
                  type="button"
                  onClick={prevYear}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-paper transition text-graphite hover:text-ink"
                  aria-label="Previous year"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>

                {/* Clickable Year to open Year Grid */}
                <button
                  type="button"
                  onClick={() => {
                    setYearGridStart(Math.floor(currentYear / 12) * 12)
                    setViewMode('years')
                  }}
                  title="Click to select a year"
                  className="flex items-center gap-1 font-display font-semibold text-sm text-ink px-2 py-1 rounded-lg hover:bg-paper hover:text-buffer transition-colors group"
                >
                  <span>{currentYear}</span>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true" className="text-graphite group-hover:text-buffer transition-transform group-hover:translate-y-0.5">
                    <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>

                <button
                  type="button"
                  onClick={nextYear}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-paper transition text-graphite hover:text-ink"
                  aria-label="Next year"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>

              {/* 12 Months Grid */}
              <div className="grid grid-cols-3 gap-2 py-2">
                {SHORT_MONTHS.map((name, idx) => {
                  const isCurrentSelectedMonth = month.getMonth() === idx
                  const isPastMonth = minDate
                    ? currentYear < minDate.getFullYear() ||
                      (currentYear === minDate.getFullYear() && idx < minDate.getMonth())
                    : false

                  return (
                    <button
                      key={name}
                      type="button"
                      disabled={isPastMonth}
                      onClick={() => handleMonthSelect(idx)}
                      className={`py-2.5 rounded-lg text-xs font-medium transition-all ${
                        isPastMonth
                          ? 'opacity-30 cursor-not-allowed text-graphite'
                          : isCurrentSelectedMonth
                            ? 'bg-buffer text-white font-semibold shadow-sm'
                            : 'hover:bg-paper-dim text-ink'
                      }`}
                    >
                      {name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 3. YEARS VIEW (12-year grid range)                        */}
          {/* ========================================================= */}
          {viewMode === 'years' && (
            <div className="animate-fade-in">
              <div className="flex items-center justify-between mb-3">
                <button
                  type="button"
                  onClick={prevYearGrid}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-paper transition text-graphite hover:text-ink"
                  aria-label="Previous 12 years"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>

                <span className="font-display font-semibold text-sm text-ink">
                  {yearGridStart} – {yearGridStart + 11}
                </span>

                <button
                  type="button"
                  onClick={nextYearGrid}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-paper transition text-graphite hover:text-ink"
                  aria-label="Next 12 years"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>

              {/* 12 Years Grid */}
              <div className="grid grid-cols-3 gap-2 py-2">
                {yearsList.map((yr) => {
                  const isSelectedYear = currentYear === yr
                  const isPastYear = minDate ? yr < minDate.getFullYear() : false

                  return (
                    <button
                      key={yr}
                      type="button"
                      disabled={isPastYear}
                      onClick={() => handleYearSelect(yr)}
                      className={`py-2.5 rounded-lg text-xs font-medium transition-all ${
                        isPastYear
                          ? 'opacity-30 cursor-not-allowed text-graphite'
                          : isSelectedYear
                            ? 'bg-buffer text-white font-semibold shadow-sm'
                            : 'hover:bg-paper-dim text-ink'
                      }`}
                    >
                      {yr}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* Footer (Clear / Today / Back to Calendar)                */}
          {/* ========================================================= */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-ink/10">
            {viewMode !== 'days' ? (
              <button
                type="button"
                onClick={() => setViewMode('days')}
                className="text-xs text-buffer hover:underline font-medium"
              >
                ← Back to days
              </button>
            ) : (
              <button
                type="button"
                onClick={() => { onChange(''); setOpen(false) }}
                className="text-xs text-graphite hover:text-deadline transition-colors"
              >
                Clear
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                const today = parseIso(todayIso)
                if (!minDate || today >= minDate) {
                  setMonth(new Date(today.getFullYear(), today.getMonth(), 1))
                  handleDaySelect(today)
                }
              }}
              className="text-xs text-buffer hover:underline font-medium"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
