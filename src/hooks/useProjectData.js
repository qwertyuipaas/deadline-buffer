import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

/**
 * Loads and refreshes all data for a single project.
 * Returns { project, members, tasks, loading, loadError, reload }
 */
export function useProjectData(projectId) {
  const [project, setProject] = useState(null)
  const [members, setMembers] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const loadAll = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const [projectRes, memberRes, taskRes] = await Promise.all([
        supabase.from('projects').select('*').eq('id', projectId).single(),
        supabase.from('project_members').select('*').eq('project_id', projectId),
        supabase.from('tasks').select('*').eq('project_id', projectId).order('start_by_date'),
      ])

      if (projectRes.error && projectRes.error.code !== 'PGRST116') throw projectRes.error
      if (memberRes.error) throw memberRes.error
      if (taskRes.error) throw taskRes.error

      setProject(projectRes.data ?? null)
      setMembers(memberRes.data ?? [])
      setTasks(taskRes.data ?? [])
    } catch (err) {
      setLoadError(err.message || 'Something went wrong loading this project.')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  return { project, members, tasks, setTasks, loading, loadError, reload: loadAll }
}
