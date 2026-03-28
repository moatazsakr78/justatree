export default function DashboardPageLoading() {
  return (
    <div className="min-h-screen bg-[var(--dash-bg-base)] pt-12">
      <div className="h-12 fixed top-0 left-0 right-0 bg-[var(--dash-header-bg)] border-b border-[var(--dash-border-default)] z-50" />

      <div className="p-4 space-y-4">
        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-[var(--dash-bg-surface)] rounded-lg animate-pulse" />
          ))}
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-64 bg-[var(--dash-bg-surface)] rounded-lg animate-pulse" />
          <div className="h-64 bg-[var(--dash-bg-surface)] rounded-lg animate-pulse" />
        </div>

        {/* Recent activity */}
        <div className="h-48 bg-[var(--dash-bg-surface)] rounded-lg animate-pulse" />
      </div>
    </div>
  )
}
