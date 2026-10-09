import { useEffect } from 'react'

// Modal explaining the buffer calculation formula and group workload rules
export default function HowItWorksModal({ open, onClose, onStartTour }) {
  useEffect(() => {
    if (!open) return
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-ink/40 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg bg-white rounded-3xl border border-ink/10 shadow-2xl p-6 sm:p-8 z-10 animate-card-in max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-ink/10">
          <div className="flex items-center gap-2">
            <div>
              <h2 className="font-display font-bold text-lg text-ink">How This App Works</h2>
              <p className="text-xs text-graphite">A quick guide. No tech skills needed.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full bg-paper hover:bg-paper-dim flex items-center justify-center text-graphite hover:text-ink text-sm transition"
          >
            ✕
          </button>
        </div>

        {/* 3 Core Rules */}
        <div className="space-y-4 py-5 text-xs sm:text-sm">
          {/* Concept 1 */}
          <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-buffer-soft/50 border border-buffer/20">
            <div className="min-w-0">
              <h3 className="font-display font-bold text-ink text-sm">1. We tell you which day to start</h3>
              <p className="text-graphite text-xs mt-1 leading-relaxed">
                Add a task, its due date, and about how many hours it takes. We assume you can work on it about <strong>2 hours a day</strong>, add a little extra time in case it runs long, and show you <strong>the day to start</strong>.
              </p>
              <p className="text-graphite text-xs mt-2 leading-relaxed bg-white/70 rounded-lg px-2.5 py-2">
                <strong>Example:</strong> A 4-hour essay due Friday → about 2 days of work + extra time → <strong>start on Tuesday</strong>.
              </p>
            </div>
          </div>

          {/* Concept 2 */}
          <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-highlight-soft/50 border border-highlight/20">
            <div className="min-w-0">
              <h3 className="font-display font-bold text-ink text-sm">2. Group work is shared fairly</h3>
              <p className="text-graphite text-xs mt-1 leading-relaxed">
                For group projects, enter how many free hours each teammate has per week. When you add a task, we point out <strong>who has the most free time</strong> and warn you if someone has <strong>too much</strong> work.
              </p>
            </div>
          </div>

          {/* Concept 3 */}
          <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-paper border border-ink/10">
            <div className="min-w-0">
              <h3 className="font-display font-bold text-ink text-sm">3. Colors show what to do</h3>
              <ul className="text-graphite text-xs mt-1.5 leading-relaxed space-y-1">
                <li><span className="inline-block w-2.5 h-2.5 rounded-full bg-buffer mr-1.5 align-middle" /><strong>Green:</strong> You have time. Relax or work on other things.</li>
                <li><span className="inline-block w-2.5 h-2.5 rounded-full bg-highlight mr-1.5 align-middle" /><strong>Yellow:</strong> Your start day is coming up soon.</li>
                <li><span className="inline-block w-2.5 h-2.5 rounded-full bg-deadline mr-1.5 align-middle" /><strong>Red:</strong> Start today, or it's already late.</li>
              </ul>
            </div>
          </div>

          {/* Shortcut hint */}
          <div className="p-3 rounded-xl bg-paper-dim/60 text-xs text-graphite">
            <strong className="text-ink">Tip:</strong> Not sure how many hours something takes? Just pick <strong>Quick</strong>, <strong>Medium</strong>, or <strong>Big</strong> when adding a task. You can change it later.
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-ink/10 flex items-center justify-between gap-3">
          {onStartTour ? (
            <button
              type="button"
              onClick={() => {
                onClose()
                onStartTour()
              }}
              className="text-xs font-semibold text-buffer hover:text-buffer/80 transition flex items-center gap-1.5 hover:underline"
            >
              Show me around the page
            </button>
          ) : <span />}
          <button
            type="button"
            onClick={onClose}
            className="bg-ink text-paper text-xs font-semibold rounded-xl px-5 py-2.5 hover:bg-ink-soft active:scale-95 transition"
          >
            Got it, let's go! →
          </button>
        </div>
      </div>
    </div>
  )
}
