import { useState, useEffect, useRef } from 'react'
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  isNotificationEnabled,
  setNotificationEnabled,
  sendTestNotification,
} from '../lib/notificationService'
import { useToast } from '../context/ToastContext'
import { formatFriendlyDate } from '../lib/dateCalc'

export default function NotificationBell({ urgentTasks = [] }) {
  const [open, setOpen] = useState(false)
  const [permission, setPermission] = useState('default')
  const [enabled, setEnabled] = useState(false)
  const [testing, setTesting] = useState(false)
  const popoverRef = useRef(null)
  const toast = useToast()

  useEffect(() => {
    setPermission(getNotificationPermission())
    setEnabled(isNotificationEnabled())

    // Close on outside click
    function handleClickOutside(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  async function handleToggleNotifications() {
    if (!isNotificationSupported()) {
      toast.error('Notifications are not supported in this browser.')
      return
    }

    if (permission !== 'granted') {
      const result = await requestNotificationPermission()
      setPermission(result)
      if (result === 'granted') {
        setEnabled(true)
        toast.success('Start-by notifications enabled!')
        sendTestNotification()
      } else if (result === 'denied') {
        toast.error('Notification permission was blocked in browser settings.')
      }
    } else {
      const nextState = !enabled
      setEnabled(nextState)
      setNotificationEnabled(nextState)
      toast.success(nextState ? 'Notifications enabled' : 'Notifications paused')
    }
  }

  async function handleTestClick() {
    setTesting(true)
    const success = await sendTestNotification()
    setTesting(false)
    if (success) {
      toast.success('Test alert sent! Check your notification center.')
    } else {
      toast.error('Could not send notification. Please enable permissions first.')
    }
  }

  const supported = isNotificationSupported()

  return (
    <div className="relative" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        title="Start-by notifications & reminders"
        className={`relative p-2 rounded-lg text-graphite hover:text-ink hover:bg-paper transition active:scale-95 border ${
          enabled ? 'border-buffer/30 bg-buffer-soft/40 text-buffer' : 'border-ink/10 bg-white'
        }`}
      >
        <svg
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>

        {/* Status Dot */}
        {enabled ? (
          <span className="absolute top-1 right-1 w-2 h-2 bg-buffer rounded-full ring-2 ring-white" />
        ) : urgentTasks.length > 0 ? (
          <span className="absolute top-1 right-1 w-2 h-2 bg-highlight rounded-full ring-2 ring-white animate-pulse" />
        ) : null}
      </button>

      {/* Popover Menu */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-88 bg-white rounded-2xl border border-ink/10 shadow-xl p-4.5 z-40 animate-scale-in text-ink space-y-4">
          <div className="flex items-center justify-between border-b border-ink/10 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-base">🔔</span>
              <h3 className="font-display font-bold text-sm">Start-By Reminders</h3>
            </div>
            <span
              className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full ${
                enabled
                  ? 'bg-buffer-soft text-buffer'
                  : permission === 'denied'
                  ? 'bg-deadline-soft text-deadline'
                  : 'bg-paper text-graphite'
              }`}
            >
              {enabled ? 'Active' : permission === 'denied' ? 'Blocked' : 'Off'}
            </span>
          </div>

          <p className="text-xs text-graphite leading-relaxed">
            Get calm browser alerts right on your start-by date so you never miss your study buffer window.
          </p>

          {/* Toggle Switch Card */}
          <div className="flex items-center justify-between bg-paper p-3 rounded-xl border border-ink/5">
            <div>
              <span className="text-xs font-semibold block text-ink">
                Browser Notifications
              </span>
              <span className="text-[11px] text-graphite block">
                {permission === 'granted'
                  ? enabled
                    ? 'Receiving daily start-by alerts'
                    : 'Alerts temporarily paused'
                  : permission === 'denied'
                  ? 'Blocked in browser site settings'
                  : 'Requires browser permission'}
              </span>
            </div>
            <button
              type="button"
              onClick={handleToggleNotifications}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition active:scale-95 ${
                enabled
                  ? 'bg-buffer text-white hover:bg-buffer/90'
                  : 'bg-ink text-paper hover:bg-ink-soft'
              }`}
            >
              {enabled ? 'Enabled ✓' : 'Enable'}
            </button>
          </div>

          {/* Urgent tasks starting today / overdue */}
          {urgentTasks.length > 0 && (
            <div className="space-y-2 pt-1 border-t border-ink/5">
              <span className="text-[11px] font-mono font-medium text-graphite block">
                Today's Start Queue ({urgentTasks.length})
              </span>
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                {urgentTasks.map((t) => (
                  <div
                    key={t.id}
                    className="p-2 rounded-lg bg-paper/60 border border-ink/5 text-xs flex items-center justify-between gap-2"
                  >
                    <span className="font-medium text-ink truncate">{t.name}</span>
                    <span className="text-[10px] font-mono text-buffer shrink-0">
                      Start {formatFriendlyDate(t.start_by_date)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action footer */}
          <div className="pt-2 border-t border-ink/10 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleTestClick}
              disabled={testing || !supported}
              className="text-xs text-buffer hover:underline font-medium flex items-center gap-1 disabled:opacity-50"
            >
              <span>🧪</span> {testing ? 'Sending…' : 'Send Test Alert'}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs text-graphite hover:text-ink px-2 py-1 rounded hover:bg-paper"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
