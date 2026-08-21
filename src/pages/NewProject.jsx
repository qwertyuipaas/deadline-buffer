import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import ProductTour from '../components/ProductTour'

const NEW_PROJECT_STEPS = [
  {
    targetId: 'tour-project-name-field',
    icon: '📝',
    tag: 'Step 1 of 3 · Project Name',
    title: 'Give Your Project a Name',
    desc: 'Name your course or goal (e.g. "Senior Thesis", "CS 101 Midterm", or "Weekly Problem Sets").',
    tip: 'Keep it clear so you recognize it on your Dashboard timeline.',
    preferredPlacement: 'bottom',
  },
  {
    targetId: 'tour-project-type-toggle',
    icon: '👥',
    tag: 'Step 2 of 3 · Project Type',
    title: 'Solo vs. Group Assignment',
    desc: 'Choose Solo for individual work, or Group to invite teammates and balance workloads automatically by availability.',
    tip: 'Group projects track weekly member capacity to prevent burnout.',
    preferredPlacement: 'bottom',
  },
  {
    targetId: 'tour-create-project-btn',
    icon: '🚀',
    tag: 'Step 3 of 3 · Get Started',
    title: 'Create Your Workspace',
    desc: 'Once created, you can start adding assignments and deadlines. Deadline Buffer will immediately calculate calm start-by dates for you!',
    tip: 'You can always rename or edit your project later.',
    preferredPlacement: 'top',
  },
]

export default function NewProject() {
  const [searchParams] = useSearchParams()
  const initialName = searchParams.get('name') || ''
  const initialType = searchParams.get('type') || 'solo'
  const initialDesc = searchParams.get('desc') || ''

  const [name, setName] = useState(initialName)
  const [description, setDescription] = useState(initialDesc)
  const [type, setType] = useState(initialType)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [memberRows, setMemberRows] = useState([{ name: '', hours: '10' }])
  const [tourOpen, setTourOpen] = useState(false)

  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('deadline_buffer_spotlight_newproject_v1')
    if (!hasSeenTour) {
      const t = setTimeout(() => setTourOpen(true), 600)
      return () => clearTimeout(t)
    }
  }, [])

  function addMemberRow() {
    setMemberRows((prev) => [...prev, { name: '', hours: '10' }])
  }

  function removeMemberRow(idx) {
    setMemberRows((prev) => prev.filter((_, i) => i !== idx))
  }

  function updateMemberRow(idx, field, value) {
    setMemberRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const trimmedName = name.trim()
    if (!trimmedName) {
      setError("Project name can't be empty.")
      return
    }

    if (type === 'group') {
      const filled = memberRows.filter((r) => r.name.trim())
      for (const r of filled) {
        const h = Number(r.hours)
        if (!h || h <= 0) {
          setError('Each member must have hours/week greater than 0.')
          return
        }
      }
    }

    setLoading(true)

    const { data, error: projErr } = await supabase
      .from('projects')
      .insert({
        name: trimmedName,
        description: description.trim() || null,
        type,
        owner_id: user.id,
      })
      .select()
      .single()

    if (projErr) {
      setError(projErr.message)
      setLoading(false)
      return
    }

    if (type === 'group') {
      const validMembers = memberRows
        .filter((r) => r.name.trim())
        .map((r) => ({
          project_id: data.id,
          display_name: r.name.trim(),
          hours_per_week: Number(r.hours),
        }))

      if (validMembers.length > 0) {
        const { error: memberErr } = await supabase.from('project_members').insert(validMembers)
        if (memberErr) console.warn('Could not add initial members:', memberErr.message)
      }
    }

    navigate(`/projects/${data.id}`)
  }

  return (
    <div className="min-h-screen bg-paper px-4 py-8">
      <div className="max-w-lg mx-auto">
        <Link
          to="/dashboard"
          className="text-sm text-graphite hover:text-ink mb-6 inline-flex items-center gap-1 transition-colors animate-fade-in"
        >
          ← Back to dashboard
        </Link>

        <div className="bg-white rounded-2xl border border-ink/10 p-8 shadow-sm animate-fade-up delay-50">
          <h1 className="font-display text-xl font-semibold text-ink mb-1">New project</h1>
          <p className="text-sm text-graphite mb-6">Fill in the details to get started.</p>

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Name */}
            <div id="tour-project-name-field" className="animate-fade-up delay-100">
              <label className="block text-sm font-medium text-ink mb-1">Project name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-ink/15 px-3 py-2.5 text-sm
                  focus:outline-none focus:ring-2 focus:ring-buffer/50 focus:border-buffer
                  transition-shadow"
                placeholder="e.g. Thesis Chapter 3, CWA Group Project"
              />
            </div>

            {/* Description */}
            <div className="animate-fade-up delay-150">
              <label className="block text-sm font-medium text-ink mb-1">
                Description{' '}
                <span className="text-graphite font-normal text-xs">(optional)</span>
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg border border-ink/15 px-3 py-2.5 text-sm
                  focus:outline-none focus:ring-2 focus:ring-buffer/50 focus:border-buffer
                  transition-shadow"
                placeholder="e.g. Research paper for PHYS 101"
                maxLength={200}
              />
            </div>

            {/* Type toggle */}
            <div id="tour-project-type-toggle" className="animate-fade-up delay-200">
              <label className="block text-sm font-medium text-ink mb-2">Project type</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'solo', label: 'Solo', sub: 'Just for you', active: 'border-buffer bg-buffer-soft text-buffer' },
                  { value: 'group', label: 'Group', sub: 'Assign tasks to members', active: 'border-highlight bg-highlight-soft text-ink' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setType(opt.value)}
                    className={`rounded-lg border px-4 py-3 text-sm font-medium text-left transition-all duration-150 active:scale-[0.98] ${
                      type === opt.value
                        ? opt.active
                        : 'border-ink/15 text-graphite hover:border-ink/30 hover:bg-paper'
                    }`}
                  >
                    {opt.label}
                    <span className="block text-xs font-normal mt-0.5 opacity-70">{opt.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Initial members — group only */}
            {type === 'group' && (
              <div className="animate-fade-up bg-paper/60 rounded-2xl p-4 border border-ink/10 space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-ink">
                    Teammates & Weekly Availability{' '}
                    <span className="text-graphite font-normal text-xs">(optional)</span>
                  </label>
                  <p className="text-xs text-graphite mt-0.5 leading-relaxed">
                    Enter weekly available hours so Deadline Buffer can auto-suggest the best teammate and prevent burnout.
                  </p>
                </div>

                <div className="grid grid-cols-12 gap-2 text-[11px] font-semibold text-graphite uppercase tracking-wider px-1">
                  <span className="col-span-7 sm:col-span-8">Teammate Name</span>
                  <span className="col-span-5 sm:col-span-4">Weekly Capacity</span>
                </div>

                <div className="space-y-2">
                  {memberRows.map((row, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center animate-card-in" style={{ animationDelay: `${idx * 40}ms` }}>
                      <div className="col-span-7 sm:col-span-8">
                        <input
                          type="text"
                          value={row.name}
                          onChange={(e) => updateMemberRow(idx, 'name', e.target.value)}
                          placeholder="e.g. Alex"
                          className="w-full rounded-xl border border-ink/15 px-3 py-2 text-sm bg-white
                            focus:outline-none focus:ring-2 focus:ring-buffer/50 focus:border-buffer transition-shadow"
                        />
                      </div>
                      <div className="col-span-5 sm:col-span-4 flex items-center gap-1.5">
                        <div className="relative flex-1">
                          <input
                            type="number"
                            min="1"
                            max="80"
                            value={row.hours}
                            onChange={(e) => updateMemberRow(idx, 'hours', e.target.value)}
                            className="w-full rounded-xl border border-ink/15 pl-3 pr-14 py-2 text-sm bg-white
                              focus:outline-none focus:ring-2 focus:ring-buffer/50 focus:border-buffer transition-shadow"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-graphite pointer-events-none font-medium">
                            hrs/wk
                          </span>
                        </div>
                        {memberRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeMemberRow(idx)}
                            aria-label="Remove member"
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-graphite/50 hover:text-deadline hover:bg-deadline-soft text-lg leading-none transition-colors"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addMemberRow}
                    className="inline-flex items-center gap-1 text-xs text-buffer font-medium hover:underline pt-1 transition-colors"
                  >
                    <span>+</span> Add another member
                  </button>
                </div>
              </div>
            )}

            {error && (
              <p className="text-sm text-deadline bg-deadline-soft border border-deadline/20 rounded-lg px-3 py-2 animate-fade-up">
                {error}
              </p>
            )}

            <div className="animate-fade-up delay-250 pt-1">
              <button
                id="tour-create-project-btn"
                type="submit"
                disabled={loading}
                className="w-full bg-ink text-paper rounded-lg py-2.5 text-sm font-medium
                  hover:bg-ink-soft active:scale-[0.98]
                  disabled:opacity-50 transition-all duration-150
                  relative overflow-hidden group"
              >
                <span className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] bg-gradient-to-r from-transparent via-white/5 to-transparent transition-transform duration-700" aria-hidden="true" />
                <span className="relative flex items-center justify-center gap-2">
                  {loading && (
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"/>
                    </svg>
                  )}
                  {loading ? 'Creating…' : 'Create project'}
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Canva-Style Spotlight Tour for New Project Page */}
      <ProductTour
        steps={NEW_PROJECT_STEPS}
        tourKey="deadline_buffer_spotlight_newproject_v1"
        isOpen={tourOpen}
        onClose={() => setTourOpen(false)}
        onComplete={() => setTourOpen(false)}
      />
    </div>
  )
}
