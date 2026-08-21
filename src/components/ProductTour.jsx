import { useEffect, useState, useCallback, useRef } from 'react'

const DEFAULT_STEPS = [
  {
    targetId: 'tour-metrics-bar',
    icon: '📊',
    tag: 'Step 1 of 5 · At-a-Glance Overview',
    title: 'See Your Whole Semester Instantly',
    desc: 'Active tasks, completed assignments, and buffer health score tell you how much cushion you still have before any deadline is at risk.',
    tip: 'Higher buffer health = more room to breathe. Keep it above 70% for stress-free studying.',
    preferredPlacement: 'bottom',
  },
  {
    targetId: 'tour-new-project-btn',
    icon: '✨',
    tag: 'Step 2 of 5 · Create Your First Project',
    title: 'Start a Solo or Group Project',
    desc: 'Whether it\'s a thesis, a group presentation, or weekly problem sets, you can set it up in 30 seconds. For group projects, add each member\'s weekly available hours (hrs/wk).',
    tip: 'Don\'t worry — you can always rename or edit your project later.',
    preferredPlacement: 'bottom',
  },
  {
    targetId: 'tour-templates-section',
    icon: '🚀',
    tag: 'Step 3 of 5 · Instant Project Templates',
    title: 'Use a Template to Skip Setup',
    desc: 'Need to get started in seconds? Pick one of these popular academic structures and it will pre-fill your project with the right pace settings.',
    tip: 'Templates automatically configure the ideal buffer cushion for that assignment type.',
    preferredPlacement: 'top',
  },
  {
    targetId: 'tour-scratchpad',
    icon: '📝',
    tag: 'Step 4 of 5 · Quick Notes That Save Themselves',
    title: 'Never Lose a Deadline Thought',
    desc: 'This note box auto-saves as you type — use it for page numbers, quick reminders, or group chat tasks you want to remember later.',
    tip: 'Your notes stay saved on this device even if you refresh the page.',
    preferredPlacement: 'left',
  },
  {
    targetId: 'tour-guide-btn',
    icon: '💡',
    tag: 'Step 5 of 5 · Help Is Always One Click Away',
    title: 'Review the Formula & Pro Tips',
    desc: 'This button reopens the full guide whenever you need a refresher — including how the buffer is calculated and the keyboard shortcut N to add a task.',
    tip: 'You\'re now ready to turn due dates into calm start-by dates. Welcome aboard! 🎉',
    preferredPlacement: 'bottom',
  },
]

/**
 * Canva-Style Interactive Element Spotlight Tour Component
 * Accepts custom steps & tourKey for any page or section.
 */
export default function ProductTour({
  steps = DEFAULT_STEPS,
  tourKey = 'deadline_buffer_spotlight_dashboard_v1',
  isOpen,
  onClose,
  onComplete,
}) {
  const [currentStep, setCurrentStep] = useState(0)
  const [rect, setRect] = useState(null)
  const [placement, setPlacement] = useState('bottom')
  const tooltipRef = useRef(null)

  const activeSteps = steps.filter(Boolean)
  const step = activeSteps[currentStep] || activeSteps[0]
  const isLast = currentStep === activeSteps.length - 1

  // Update target element coordinates
  const updateTargetRect = useCallback(() => {
    if (!isOpen || !step) return
    const el = document.getElementById(step.targetId)
    if (el) {
      const b = el.getBoundingClientRect()
      setRect({
        top: b.top,
        left: b.left,
        width: b.width,
        height: b.height,
        bottom: b.bottom,
        right: b.right,
      })

      // Determine best placement (top / bottom / left / right)
      const windowWidth = window.innerWidth
      const windowHeight = window.innerHeight
      let chosen = step.preferredPlacement || 'bottom'

      if (chosen === 'bottom' && b.bottom + 220 > windowHeight) {
        chosen = 'top'
      } else if (chosen === 'top' && b.top - 220 < 0) {
        chosen = 'bottom'
      } else if (chosen === 'left' && b.left < 360) {
        chosen = 'bottom'
      } else if (chosen === 'right' && windowWidth - b.right < 360) {
        chosen = 'bottom'
      }

      setPlacement(chosen)
    } else {
      setRect(null)
    }
  }, [isOpen, step])

  // Scroll element into view on step change
  useEffect(() => {
    if (!isOpen || !step) return
    const el = document.getElementById(step.targetId)
    if (el) {
      // Calculate position immediately so the tooltip doesn't flash at
      // center-screen before jumping to the real target.
      updateTargetRect()
      // inline:'nearest' avoids horizontal scrolling of wide containers,
      // which used to leave the page shifted sideways after the tour closed.
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
      const t = setTimeout(updateTargetRect, 250)
      return () => clearTimeout(t)
    } else {
      setRect(null)
    }
  }, [isOpen, currentStep, step, updateTargetRect])

  // Listen to scroll and resize
  useEffect(() => {
    if (!isOpen) return
    window.addEventListener('resize', updateTargetRect)
    window.addEventListener('scroll', updateTargetRect, true)
    return () => {
      window.removeEventListener('resize', updateTargetRect)
      window.removeEventListener('scroll', updateTargetRect, true)
    }
  }, [isOpen, updateTargetRect])

  // Prevent the page behind the tour from scrolling/shifting while it's open —
  // otherwise the background layout can jump around under the fixed overlay.
  useEffect(() => {
    if (!isOpen) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [isOpen])

  // Reset step on open
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0)
    }
  }, [isOpen])

  // Close on escape
  useEffect(() => {
    if (!isOpen) return
    function handleKeyDown(e) {
      if (e.key === 'Escape') handleSkip()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  if (!isOpen || !step) return null

  function handleNext() {
    if (isLast) {
      handleFinish()
    } else {
      setCurrentStep((prev) => prev + 1)
    }
  }

  function handlePrev() {
    setCurrentStep((prev) => Math.max(0, prev - 1))
  }

  function handleSkip() {
    localStorage.setItem(tourKey, 'true')
    onClose?.()
  }

  function handleFinish() {
    localStorage.setItem(tourKey, 'true')
    onComplete?.()
    onClose?.()
  }

  const PADDING = 8
  const spotlightTop = rect ? Math.max(0, rect.top - PADDING) : 0
  const spotlightLeft = rect ? Math.max(0, rect.left - PADDING) : 0
  const spotlightWidth = rect ? rect.width + PADDING * 2 : 0
  const spotlightHeight = rect ? rect.height + PADDING * 2 : 0

  // Calculate Tooltip Position
  let tooltipStyle = {}
  if (rect) {
    const tooltipWidth = 380
    const estimatedTooltipHeight = 260
    const margin = 14

    if (placement === 'bottom') {
      tooltipStyle = {
        top: Math.max(16, Math.min(window.innerHeight - estimatedTooltipHeight - 16, rect.bottom + margin)),
        left: Math.max(16, Math.min(window.innerWidth - tooltipWidth - 16, rect.left + rect.width / 2 - tooltipWidth / 2)),
      }
    } else if (placement === 'top') {
      tooltipStyle = {
        top: Math.max(16, Math.min(window.innerHeight - estimatedTooltipHeight - 16, rect.top - margin - estimatedTooltipHeight)),
        left: Math.max(16, Math.min(window.innerWidth - tooltipWidth - 16, rect.left + rect.width / 2 - tooltipWidth / 2)),
      }
    } else if (placement === 'left') {
      tooltipStyle = {
        top: Math.max(16, Math.min(window.innerHeight - estimatedTooltipHeight - 16, rect.top)),
        left: Math.max(16, rect.left - tooltipWidth - margin),
      }
    } else if (placement === 'right') {
      tooltipStyle = {
        top: Math.max(16, Math.min(window.innerHeight - estimatedTooltipHeight - 16, rect.top)),
        left: Math.min(window.innerWidth - tooltipWidth - 16, rect.right + margin),
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 pointer-events-auto overflow-hidden">
      {/* ── Canva-Style Real-Time SVG Spotlight Cutout Mask ── */}
      <svg className="fixed inset-0 w-full h-full pointer-events-none transition-all duration-300">
        <defs>
          <mask id="canva-spotlight-mask">
            {/* White covers entire screen */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {/* Black cut-out for the target element */}
            {rect && (
              <rect
                x={spotlightLeft}
                y={spotlightTop}
                width={spotlightWidth}
                height={spotlightHeight}
                rx="16"
                fill="black"
              />
            )}
          </mask>
        </defs>
        {/* Dark Dimmed Backdrop with cutout mask */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(15, 23, 42, 0.65)"
          mask="url(#canva-spotlight-mask)"
        />
      </svg>

      {/* Transparent Click Catcher for backdrop */}
      <div
        className="fixed inset-0 z-40 bg-transparent cursor-pointer"
        onClick={handleSkip}
        aria-hidden="true"
      />

      {/* ── Glowing Pulsing Spotlight Ring Around Element ── */}
      {rect && (
        <div
          className="fixed z-40 pointer-events-none border-2 border-buffer rounded-2xl ring-4 ring-buffer/40 shadow-[0_0_30px_rgba(20,184,166,0.6)] transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]"
          style={{
            top: spotlightTop,
            left: spotlightLeft,
            width: spotlightWidth,
            height: spotlightHeight,
          }}
        >
          {/* Animated corner beacon */}
          <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-buffer animate-ping" />
          <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-buffer border-2 border-white shadow-xs" />
        </div>
      )}

      {/* ── Floating Canva-Style Arrow-Pointed Tooltip Card ── */}
      <div
        ref={tooltipRef}
        role="dialog"
        aria-modal="true"
        className="fixed z-50 w-[92vw] max-w-[380px] bg-white rounded-3xl border border-ink/10 shadow-2xl p-5 sm:p-6 animate-card-in transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]"
        style={rect ? tooltipStyle : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
      >
        {/* Pointer Arrow Notch */}
        {rect && placement === 'bottom' && (
          <div className="absolute -top-2 left-8 w-4 h-4 bg-white border-t border-l border-ink/10 rotate-45" />
        )}
        {rect && placement === 'top' && (
          <div className="absolute -bottom-2 left-8 w-4 h-4 bg-white border-b border-r border-ink/10 rotate-45" />
        )}
        {rect && placement === 'left' && (
          <div className="absolute top-8 -right-2 w-4 h-4 bg-white border-t border-r border-ink/10 rotate-45" />
        )}
        {rect && placement === 'right' && (
          <div className="absolute top-8 -left-2 w-4 h-4 bg-white border-b border-l border-ink/10 rotate-45" />
        )}

        {/* Header Tag & Close */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <span className="text-[10px] font-mono font-bold text-buffer bg-buffer-soft px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-buffer animate-pulse" />
            {step.tag}
          </span>
          <button
            type="button"
            onClick={handleSkip}
            className="text-[11px] text-graphite hover:text-ink font-medium px-2 py-0.5 rounded-md hover:bg-paper transition"
          >
              Skip
            </button>
        </div>

        {/* Content */}
        <div className="space-y-2">
          <h3 className="font-display font-bold text-base text-ink">
            {step.title}
          </h3>

          <p className="text-xs text-graphite leading-relaxed">
            {step.desc}
          </p>

          <div className="p-2.5 rounded-xl bg-paper/80 border border-ink/5 text-[11px] text-graphite leading-snug flex items-start gap-1.5">
            <span className="text-buffer font-bold shrink-0">Tip:</span>
            <span>{step.tip}</span>
          </div>
        </div>

        {/* Progress Dots & Buttons */}
        <div className="flex items-center justify-between pt-3.5 mt-3.5 border-t border-ink/10">
          <div className="flex items-center gap-1.5">
            {activeSteps.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCurrentStep(i)}
                aria-label={`Go to step ${i + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  currentStep === i ? 'w-5 bg-buffer' : 'w-1.5 bg-ink/20 hover:bg-ink/40'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={handlePrev}
                className="text-xs font-medium text-graphite hover:text-ink px-2.5 py-1.5 rounded-lg hover:bg-paper transition"
              >
                ← Back
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="bg-ink text-paper text-xs font-semibold rounded-xl px-3.5 py-1.5 hover:bg-ink-soft active:scale-95 transition shadow-sm flex items-center gap-1"
            >
              <span>{isLast ? 'Done' : 'Next →'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
