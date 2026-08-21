import { useEffect, useRef } from 'react'

/**
 * A slide-in side panel for adding or editing a task.
 * Closes on Escape, traps focus inside, and prevents body scroll while open.
 *
 * @param {boolean} open
 * @param {Function} onClose
 * @param {string} title - "Add a task" | "Edit task"
 * @param {React.ReactNode} children - the form contents
 */
export default function TaskDrawer({ open, onClose, title, children }) {
  const panelRef = useRef(null)

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  // Prevent body scroll while open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  // Move focus into panel when it opens
  useEffect(() => {
    if (open && panelRef.current) {
      const first = panelRef.current.querySelector('input, select, textarea, button')
      first?.focus()
    }
  }, [open])

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-30 bg-ink/20 backdrop-blur-[2px] transition-opacity duration-200 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`fixed top-0 right-0 h-full z-40 w-full max-w-md bg-white shadow-2xl flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink/10 shrink-0">
          <h2 className="font-display font-semibold text-ink">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close drawer"
            className="text-graphite hover:text-ink transition p-1 rounded-lg focus-visible:ring-2 focus-visible:ring-buffer"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M13.5 4.5L4.5 13.5M4.5 4.5L13.5 13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {open && children}
        </div>
      </div>
    </>
  )
}
