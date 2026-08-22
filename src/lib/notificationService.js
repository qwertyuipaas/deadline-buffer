// Browser Push & Local Start-By Notification Engine for Deadline Buffer
import { getTodayIso, formatFriendlyDate } from './dateCalc'

export function isNotificationSupported() {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function getNotificationPermission() {
  if (!isNotificationSupported()) return 'unsupported'
  return Notification.permission // 'default' | 'granted' | 'denied'
}

export async function requestNotificationPermission() {
  if (!isNotificationSupported()) return 'unsupported'
  try {
    const permission = await Notification.requestPermission()
    if (permission === 'granted') {
      localStorage.setItem('deadline_buffer_notifications_enabled', 'true')
    }
    return permission
  } catch (err) {
    console.error('Error requesting notification permission:', err)
    return 'denied'
  }
}

export function isNotificationEnabled() {
  return (
    getNotificationPermission() === 'granted' &&
    localStorage.getItem('deadline_buffer_notifications_enabled') !== 'false'
  )
}

export function setNotificationEnabled(enabled) {
  localStorage.setItem('deadline_buffer_notifications_enabled', enabled ? 'true' : 'false')
}

export async function sendLocalNotification(title, options = {}) {
  if (!isNotificationSupported() || getNotificationPermission() !== 'granted') {
    return false
  }

  const defaultOptions = {
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    vibrate: [200, 100, 200],
    ...options,
  }

  try {
    // If service worker is active, use showNotification for broader mobile/PWA support
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration()
      if (registration && registration.showNotification) {
        await registration.showNotification(title, defaultOptions)
        return true
      }
    }
    // Fallback to standard window Notification
    new Notification(title, defaultOptions)
    return true
  } catch (err) {
    console.warn('Failed to send notification via SW, trying window fallback:', err)
    try {
      new Notification(title, defaultOptions)
      return true
    } catch (fallbackErr) {
      console.error('Notification error:', fallbackErr)
      return false
    }
  }
}

/**
 * Sends a test notification so the student can verify their browser settings.
 */
export async function sendTestNotification() {
  const granted = await requestNotificationPermission()
  if (granted !== 'granted') return false

  return sendLocalNotification('🎉 Start-By Reminders Active!', {
    body: "You're all set! Deadline Buffer will alert you when it's time to begin your assignments with calm safety buffers.",
    tag: 'deadline-buffer-test-alert',
  })
}

/**
 * Checks all active project tasks and delivers non-intrusive start-by reminders.
 * Debounced per calendar day so students never get spammed.
 * @param {Array} tasks - active task rows
 * @returns {Array} tasks starting today or overdue
 */
export function checkAndNotifyStartByTasks(tasks = []) {
  if (!tasks || tasks.length === 0) return []
  const todayIso = getTodayIso()

  const activeTasks = tasks.filter((t) => t.status !== 'done')
  const startingToday = []
  const overdueStarts = []

  for (const t of activeTasks) {
    if (!t.start_by_date) continue
    if (t.start_by_date === todayIso) {
      startingToday.push(t)
    } else if (t.start_by_date < todayIso) {
      overdueStarts.push(t)
    }
  }

  // Only fire browser push notifications if user has notifications turned on
  if (isNotificationEnabled()) {
    const storageKey = `deadline_buffer_notified_${todayIso}`
    const alreadyNotified = new Set(
      JSON.parse(localStorage.getItem(storageKey) || '[]')
    )

    const newlyNotified = []

    // 1. Notify for tasks starting today
    for (const t of startingToday) {
      if (!alreadyNotified.has(t.id)) {
        sendLocalNotification(`⏰ Time to start: ${t.name}`, {
          body: `Estimated ${t.estimated_hours || 2}h work · Due ${formatFriendlyDate(t.deadline)} (${t.projectName || 'Project'})`,
          tag: `start-today-${t.id}`,
        })
        alreadyNotified.add(t.id)
        newlyNotified.push(t.id)
      }
    }

    // 2. Notify for urgent overdue starts (if not already alerted today)
    for (const t of overdueStarts) {
      if (!alreadyNotified.has(t.id)) {
        sendLocalNotification(`🚨 Action Needed: ${t.name}`, {
          body: `This task is past its recommended start-by date (${formatFriendlyDate(t.start_by_date)}). Begin soon to keep your buffer!`,
          tag: `overdue-start-${t.id}`,
        })
        alreadyNotified.add(t.id)
        newlyNotified.push(t.id)
      }
    }

    if (newlyNotified.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify([...alreadyNotified]))
    }
  }

  return [...startingToday, ...overdueStarts]
}
