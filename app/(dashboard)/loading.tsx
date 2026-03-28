export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-[var(--dash-bg-base)] pt-12">
      {/* Header skeleton */}
      <div className="h-12 fixed top-0 left-0 right-0 bg-[var(--dash-header-bg)] border-b border-[var(--dash-border-default)] z-50" />

      {/* Content skeleton */}
      <div className="p-4 space-y-4">
        {/* Page title */}
        <div className="h-8 bg-[var(--dash-bg-surface)] rounded w-1/4 animate-pulse" />

        {/* Action bar */}
        <div className="flex gap-2">
          <div className="h-10 bg-[var(--dash-bg-surface)] rounded w-32 animate-pulse" />
          <div className="h-10 bg-[var(--dash-bg-surface)] rounded w-32 animate-pulse" />
        </div>

        {/* Content area */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 bg-[var(--dash-bg-surface)] rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  )
}
