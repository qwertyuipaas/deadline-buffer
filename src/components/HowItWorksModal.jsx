import { useEffect } from 'react'

/**
 * An interactive modal explaining how Deadline Buffer works,
 * how buffers are calculated, and group balancing rules.
 */
export default function HowItWorksModal({ open, onClose, onStartTour }) {
  useEffect(() => {
    if (!open) return
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

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
            <span className="text-2xl">💡</span>
            <div>
              <h2 className="font-display font-bold text-lg text-ink">How Deadline Buffer Works</h2>
              <p className="text-xs text-graphite">A 60-second guide to stress-free deadlines</p>
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
            <span className="text-2xl shrink-0">⏱️</span>
            <div>
              <h3 className="font-display font-bold text-ink text-sm">1. Turn Due Dates into Start Dates</h3>
              <p className="text-graphite text-xs mt-1 leading-relaxed">
                Enter how many hours a task will take and its priority. The algorithm gives you a <strong>Start-By Date</strong> with an automatic safety cushion so you never cram at the last minute.
              </p>
            </div>
          </div>

          {/* Concept 2 */}
          <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-highlight-soft/50 border border-highlight/20">
            <span className="text-2xl shrink-0">👥</span>
            <div>
              <h3 className="font-display font-bold text-ink text-sm">2. Smart Group Workload Balancing</h3>
              <p className="text-graphite text-xs mt-1 leading-relaxed">
                Set each teammate’s weekly capacity (e.g. <code>8 hrs/wk</code>). The app suggests who has free capacity and flags <strong>⚠️ Overloaded</strong> when tasks exceed someone's limit.
              </p>
            </div>
          </div>

          {/* Concept 3 */}
          <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-paper border border-ink/10">
            <span className="text-2xl shrink-0">🚦</span>
            <div>
              <h3 className="font-display font-bold text-ink text-sm">3. Color-Coded Urgency Triage</h3>
              <p className="text-graphite text-xs mt-1 leading-relaxed">
                <strong>🟢 Safe buffer</strong> = You have plenty of time.<br />
                <strong>🟡 Start soon</strong> = Approaching your start window.<br />
                <strong>🔴 Start today</strong> = You need to begin work today to finish comfortably.
              </p>
            </div>
          </div>

          {/* Shortcut hint */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-paper-dim/60 text-xs text-graphite font-mono">
            <span>⚡ Pro Tip: Press <kbd className="bg-white border border-ink/20 px-1.5 py-0.5 rounded shadow-2xs text-ink font-bold">N</kbd> on any project to add a task quickly.</span>
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
              <span>🎬</span> Interactive Tour
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
