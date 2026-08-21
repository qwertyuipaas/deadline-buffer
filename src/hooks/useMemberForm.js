import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useToast } from '../context/ToastContext'

/**
 * Manages "add a member" form state and submission for group projects.
 * @param {string} projectId
 * @param {Array} members - current member list (for duplicate-name check)
 * @param {Function} onSuccess - called after a member is successfully added
 */
export function useMemberForm(projectId, members, onSuccess) {
  const toast = useToast()

  const [memberName, setMemberName] = useState('')
  const [memberHours, setMemberHours] = useState('10')
  const [memberError, setMemberError] = useState('')
  const [memberSubmitting, setMemberSubmitting] = useState(false)

  function resetMemberForm() {
    setMemberName('')
    setMemberHours('10')
    setMemberError('')
  }

  async function handleAddMember(e) {
    e.preventDefault()
    setMemberError('')

    const trimmedName = memberName.trim()
    if (!trimmedName) { setMemberError("Member name can't be empty."); return }
    const hoursNum = Number(memberHours)
    if (!hoursNum || hoursNum <= 0) { setMemberError('Hours per week must be greater than 0.'); return }
    if (members.some((m) => m.display_name.toLowerCase() === trimmedName.toLowerCase())) {
      setMemberError('Someone with that name is already on this project.')
      return
    }

    setMemberSubmitting(true)
    const { error } = await supabase.from('project_members').insert({
      project_id: projectId,
      display_name: trimmedName,
      hours_per_week: hoursNum,
    })
    setMemberSubmitting(false)

    if (error) {
      setMemberError(error.message)
      toast.error(error.message)
      return
    }

    toast.success(`${trimmedName} added to the project.`)
    resetMemberForm()
    onSuccess?.()
  }

  return {
    memberName, setMemberName,
    memberHours, setMemberHours,
    memberError,
    memberSubmitting,
    handleAddMember,
  }
}
