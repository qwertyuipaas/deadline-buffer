import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { calculateStartByDate, getTodayIso, formatFriendlyDate } from '../lib/dateCalc'
import { useToast } from '../context/ToastContext'

// Note: DatePicker is a UI component — the hook just manages the deadline string value.
// The consuming component (ProjectView / TaskDrawer) renders DatePicker and calls setDeadline.

/**
 * Manages the "add a task" form state and submission.
 * @param {string} projectId
 * @param {Function} onSuccess - called after a task is successfully added
 */
export function useTaskForm(projectId, onSuccess) {
  const toast = useToast()
  const todayIso = getTodayIso()

  const [taskName, setTaskName] = useState('')
  const [deadline, setDeadline] = useState('')
  const [hours, setHours] = useState('')
  const [priority, setPriority] = useState('medium')
  const [assignedMemberId, setAssignedMemberId] = useState('')
  const [taskError, setTaskError] = useState('')
  const [taskSubmitting, setTaskSubmitting] = useState(false)

  function resetForm() {
    setTaskName('')
    setDeadline('')
    setHours('')
    setPriority('medium')
    setAssignedMemberId('')
    setTaskError('')
  }

  async function handleAddTask(e) {
    e.preventDefault()
    setTaskError('')

    const trimmedName = taskName.trim()
    if (!trimmedName) { setTaskError("Task name can't be empty."); return }
    if (!deadline) { setTaskError('Pick a deadline.'); return }
    if (deadline < todayIso) { setTaskError("Deadline can't be in the past — pick today or a future date."); return }
    const hoursNum = Number(hours)
    if (!Number.isFinite(hoursNum) || hoursNum <= 0) { setTaskError('Estimated hours must be a positive number (e.g. 1, 2.5, 6).'); return }
    if (hoursNum > 168) { setTaskError('Estimated hours seems too large for a single task (max 168h). Double-check your input?'); return }

    setTaskSubmitting(true)
    const startByDate = calculateStartByDate(deadline, hoursNum, priority)

    const { error } = await supabase.from('tasks').insert({
      project_id: projectId,
      name: trimmedName,
      deadline,
      estimated_hours: hoursNum,
      priority,
      start_by_date: startByDate,
      assigned_member_id: assignedMemberId || null,
    })

    setTaskSubmitting(false)

    if (error) {
      setTaskError(error.message)
      toast.error(error.message)
      return
    }

    toast.success(`"${trimmedName}" added — start by ${formatFriendlyDate(startByDate)}.`)
    resetForm()
    onSuccess?.()
  }

  return {
    taskName, setTaskName,
    deadline, setDeadline,
    hours, setHours,
    priority, setPriority,
    assignedMemberId, setAssignedMemberId,
    taskError, taskSubmitting,
    handleAddTask,
    resetForm,
    todayIso,
  }
}
