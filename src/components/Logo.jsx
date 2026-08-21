export default function Logo({ size = 'md' }) {
  const textSize = size === 'lg' ? 'text-2xl' : 'text-lg'
  const mark = size === 'lg' ? 20 : 16

  return (
    <span className="inline-flex items-center gap-2 font-display font-semibold text-ink select-none">
      <svg width={mark} height={mark} viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <rect x="0.5" y="0.5" width="19" height="19" rx="5" fill="#0E8F82" />
        <path d="M9 0.5H15C17.4853 0.5 19.5 2.51472 19.5 5V15C19.5 17.4853 17.4853 19.5 15 19.5H9V0.5Z" fill="#16192B" />
      </svg>
      <span className={textSize}>
        Deadline<span className="text-buffer">Buffer</span>
      </span>
    </span>
  )
}
