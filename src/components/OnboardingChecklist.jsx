import { useState } from 'react'
import { Link } from 'react-router-dom'

/**
 * 3-Step Interactive Onboarding Checklist for new users on the Dashboard.
 */
export default function OnboardingChecklist({ projectCount = 0, totalTasks = 0, onOpenGuide, onStartTour }) {
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem('deadline_buffer_onboarding_dismissed') === 'true'
  })

  if (dismissed && projectCount > 0 && totalTasks > 0) return null

  const step1Done = true // signed up
  const step2Done = projectCount > 0
  const step3Done = totalTasks > 0
  const allDone = step1Done && step2Done && step3Done

  function handleDismiss() {
    setDismissed(true)
    localStorage.setItem('deadline_buffer_onboarding_dismissed', 'true')
  }

  return (
    <section className="bg-gradient-to-br from-white via-paper/60 to-buffer-soft/30 rounded-3xl border border-buffer/20 p-5 sm:p-6 shadow-xs relative overflow-hidden animate-fade-up">
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-xl bg-buffer text-white flex items-center justify-center text-sm font-bold shadow-xs">
            {allDone ? '🎉' : '🚀'}
          </span>
          <div>
            <h2 className="font-display font-bold text-base text-ink">
              {allDone ? 'Setup Complete!' : 'Getting Started with Deadline Buffer'}
            </h2>
            <p className="text-xs text-graphite">
              {allDone
                ? "You've completed the initial setup. Keep adding assignments to stay stress-free!"
                : 'Follow these 3 quick steps to turn your deadlines into calm start-by dates.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onStartTour && (
            <button
              type="button"
              onClick={onStartTour}
              className="text-xs font-semibold text-buffer hover:text-buffer/80 bg-white border border-buffer/20 px-3 py-1.5 rounded-xl transition shadow-2xs flex items-center gap-1.5"
            >
              <span>🎬</span> Interactive Tour
            </button>
          )}
          <button
            type="button"
            onClick={onOpenGuide}
            className="text-xs font-medium text-graphite hover:text-ink bg-white border border-ink/15 px-3 py-1.5 rounded-xl transition shadow-2xs"
          >
            💡 Guide
          </button>
          {allDone && (
            <button
              type="button"
              onClick={handleDismiss}
              className="text-xs text-graphite/60 hover:text-ink transition p-1"
              title="Dismiss"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 3 Step Checklist Grid */}
      <div className="grid sm:grid-cols-3 gap-3">
        {/* Step 1 */}
        <div className="p-3.5 rounded-2xl bg-white border border-buffer/30 shadow-2xs flex items-start gap-3">
          <span className="w-6 h-6 rounded-full bg-buffer text-white text-xs flex items-center justify-center font-bold shrink-0">
            ✓
          </span>
          <div>
            <h3 className="font-semibold text-xs text-ink">1. Create Account</h3>
            <p className="text-[11px] text-buffer font-medium mt-0.5">Completed ✓</p>
          </div>
        </div>

        {/* Step 2 */}
        <div
          className={`p-3.5 rounded-2xl border transition-all flex items-start gap-3 ${
            step2Done
              ? 'bg-white border-buffer/30 shadow-2xs'
              : 'bg-white/80 border-ink/15 hover:border-buffer/50 hover:bg-white'
          }`}
        >
          <span
            className={`w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold shrink-0 ${
              step2Done ? 'bg-buffer text-white' : 'bg-paper-dim text-graphite'
            }`}
          >
            {step2Done ? '✓' : '2'}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-xs text-ink">2. Create a Project</h3>
            {step2Done ? (
              <p className="text-[11px] text-buffer font-medium mt-0.5">Project ready ✓</p>
            ) : (
              <Link
                to="/projects/new"
                className="inline-block text-[11px] text-buffer font-bold hover:underline mt-0.5"
              >
                + Create project →
              </Link>
            )}
          </div>
        </div>

        {/* Step 3 */}
        <div
          className={`p-3.5 rounded-2xl border transition-all flex items-start gap-3 ${
            step3Done
              ? 'bg-white border-buffer/30 shadow-2xs'
              : 'bg-white/80 border-ink/15 hover:border-buffer/50 hover:bg-white'
          }`}
        >
          <span
            className={`w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold shrink-0 ${
              step3Done ? 'bg-buffer text-white' : 'bg-paper-dim text-graphite'
            }`}
          >
            {step3Done ? '✓' : '3'}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-xs text-ink">3. Add Your First Task</h3>
            {step3Done ? (
              <p className="text-[11px] text-buffer font-medium mt-0.5">Buffer calculated ✓</p>
            ) : (
              <p className="text-[11px] text-graphite mt-0.5">
                Open a project & press <kbd className="bg-paper border border-ink/20 px-1 py-0.2 rounded font-mono text-[10px]">N</kbd>
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
