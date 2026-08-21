import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { calculateStartByDate } from '../lib/dateCalc'
import { useToast } from '../context/ToastContext'

/**
 * Manages inline task editing state and submission.
 * @param {Function} onSuccess - called after a task is successfully saved
 */
export function useTaskEdit(onSuccess) {
  const toast = useToast()

  const [editingTaskId, setEditingTaskId] = useState(null)
  const [editFields, setEditFields] = useState(null)
  const [editError, setEditError] = useState('')
  const [editSubmitting, setEditSubmitting] = useState(false)

  function handleStartEditTask(task) {
    setEditingTaskId(task.id)
    setEditError('')
    setEditFields({
      name: task.name,
      deadline: task.deadline,
      estimated_hours: String(task.estimated_hours),
      priority: task.priority,
      assigned_member_id: task.assigned_member_id || '',
    })
  }

  function handleCancelEditTask() {
    setEditingTaskId(null)
    setEditFields(null)
    setEditError('')
  }

  async function handleSaveEditTask(e) {
    e.preventDefault()
    setEditError('')

    const trimmedName = editFields.name.trim()
    if (!trimmedName) { setEditError("Task name can't be empty."); return }
    const hoursNum = Number(editFields.estimated_hours)
    if (!Number.isFinite(hoursNum) || hoursNum <= 0) { setEditError('Estimated hours must be a positive number (e.g. 1, 2.5, 6).'); return }
    if (hoursNum > 168) { setEditError('Estimated hours seems too large for a single task (max 168h). Double-check your input?'); return }
    if (!editFields.deadline) { setEditError('Pick a deadline.'); return }

    setEditSubmitting(true)
    const startByDate = calculateStartByDate(editFields.deadline, hoursNum, editFields.priority)

    const { error } = await supabase
      .from('tasks')
      .update({
        name: trimmedName,
        deadline: editFields.deadline,
        estimated_hours: hoursNum,
        priority: editFields.priority,
        start_by_date: startByDate,
        assigned_member_id: editFields.assigned_member_id || null,
      })
      .eq('id', editingTaskId)

    setEditSubmitting(false)

    if (error) {
      setEditError(error.message)
      toast.error(error.message)
      return
    }

    setEditingTaskId(null)
    setEditFields(null)
    toast.success('Task updated.')
    onSuccess?.()
  }

  return {
    editingTaskId,
    editFields, setEditFields,
    editError,
    editSubmitting,
    handleStartEditTask,
    handleCancelEditTask,
    handleSaveEditTask,
  }
}
