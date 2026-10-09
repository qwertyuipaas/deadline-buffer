// Group project workload calculations and auto-assign suggestions
// Pure functions with no Supabase calls so they are easy to test

// Returns the total non-done hours currently assigned to a member
export function getMemberWorkloadHours(memberId, tasks) {
  return tasks
    .filter((t) => t.assigned_member_id === memberId && t.status !== 'done')
    .reduce((sum, t) => sum + Number(t.estimated_hours), 0)
}

// Calculates task count, active hours, and overload status for a member
export function getMemberStats(member, tasks) {
  const assigned = tasks.filter((t) => t.assigned_member_id === member.id)
  const done = assigned.filter((t) => t.status === 'done')
  const activeHours = getMemberWorkloadHours(member.id, tasks)
  const capacity = Number(member.hours_per_week)
  return {
    assigned: assigned.length,
    done: done.length,
    activeHours,
    capacity,
    pct: capacity > 0 ? Math.min(100, Math.round((activeHours / capacity) * 100)) : 0,
    overloaded: activeHours > capacity,
  }
}

// Sorts teammates by most remaining free hours first
export function getSuggestedMemberOrder(members, tasks, _newTaskHours = 0) {
  return [...members].sort((a, b) => {
    const aLoad = getMemberWorkloadHours(a.id, tasks)
    const bLoad = getMemberWorkloadHours(b.id, tasks)
    const aRoom = Number(a.hours_per_week) - aLoad
    const bRoom = Number(b.hours_per_week) - bLoad
    return bRoom - aRoom
  })
}

// Suggests the teammate with the lightest current workload
export function getAutoAssignSuggestion(members, tasks) {
  if (!members.length) return null
  const sorted = getSuggestedMemberOrder(members, tasks)
  return sorted[0]?.id ?? null
}
