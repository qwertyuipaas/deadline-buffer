// Group project utilities
// All functions are pure (no Supabase calls) so they're easy to test and reuse.

/**
 * Returns the total non-done hours currently assigned to a member.
 * @param {string} memberId
 * @param {Array} tasks
 */
export function getMemberWorkloadHours(memberId, tasks) {
  return tasks
    .filter((t) => t.assigned_member_id === memberId && t.status !== 'done')
    .reduce((sum, t) => sum + Number(t.estimated_hours), 0)
}

/**
 * Returns rich stats for a single member.
 * @param {{ id: string, hours_per_week: number }} member
 * @param {Array} tasks
 */
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

/**
 * Returns members sorted by remaining capacity (lightest first),
 * and identifies the single best suggestion if there are multiple members.
 * @param {Array} members
 * @param {Array} tasks
 * @param {number} [newTaskHours=0] - hours of the task being assigned (used to detect future overload)
 */
export function getSuggestedMemberOrder(members, tasks, newTaskHours = 0) {
  return [...members].sort((a, b) => {
    const aLoad = getMemberWorkloadHours(a.id, tasks)
    const bLoad = getMemberWorkloadHours(b.id, tasks)
    // Primary: remaining capacity (capacity - load), descending
    const aRoom = Number(a.hours_per_week) - aLoad
    const bRoom = Number(b.hours_per_week) - bLoad
    return bRoom - aRoom
  })
}

/**
 * Returns the member id of the best auto-assign target (most remaining capacity).
 * Returns null if there are no members or all are overloaded.
 * @param {Array} members
 * @param {Array} tasks
 */
export function getAutoAssignSuggestion(members, tasks) {
  if (!members.length) return null
  const sorted = getSuggestedMemberOrder(members, tasks)
  return sorted[0]?.id ?? null
}
