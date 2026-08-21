export default function LoadingSkeleton({ rows = 3 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-xl border border-ink/10 p-4 overflow-hidden animate-card-in"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <div className="h-4 skeleton-shimmer rounded w-1/3 mb-3" />
          <div className="h-3 skeleton-shimmer rounded w-2/3 mb-2" />
          <div className="h-2 skeleton-shimmer rounded w-full mt-4" />
        </div>
      ))}
    </div>
  )
}
