export default function ReportsLoading() {
  return (
    <div className="min-h-screen bg-[var(--dash-bg-base)] pt-12">
      <div className="h-12 fixed top-0 left-0 right-0 bg-[var(--dash-header-bg)] border-b border-[var(--dash-border-default)] z-50" />

      <div className="p-4 space-y-4">
        {/* Date filter bar */}
        <div className="flex items-center gap-3">
          <div className="h-10 bg-[var(--dash-bg-surface)] rounded w-40 animate-pulse" />
          <div className="h-10 bg-[var(--dash-bg-surface)] rounded w-40 animate-pulse" />
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-[var(--dash-bg-surface)] rounded-lg animate-pulse" />
          ))}
        </div>

        {/* Chart area */}
        <div className="h-72 bg-[var(--dash-bg-surface)] rounded-lg animate-pulse" />
      </div>
    </div>
  )
}
