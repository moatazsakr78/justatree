export default function InventoryLoading() {
  return (
    <div className="min-h-screen bg-[var(--dash-bg-base)] pt-12">
      <div className="h-12 fixed top-0 left-0 right-0 bg-[var(--dash-header-bg)] border-b border-[var(--dash-border-default)] z-50" />

      <div className="p-4 space-y-4">
        {/* Search + filters */}
        <div className="flex items-center gap-3">
          <div className="h-10 bg-[var(--dash-bg-surface)] rounded-lg flex-1 animate-pulse" />
          <div className="h-10 bg-[var(--dash-bg-surface)] rounded w-28 animate-pulse" />
          <div className="h-10 bg-[var(--dash-bg-surface)] rounded w-28 animate-pulse" />
        </div>

        {/* Table skeleton */}
        <div className="bg-[var(--dash-bg-surface)] rounded-lg overflow-hidden">
          <div className="h-12 bg-[var(--dash-bg-highlight)] animate-pulse" />
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-14 border-b border-[var(--dash-border-default)] flex items-center px-4 gap-4">
              <div className="w-10 h-10 bg-[var(--dash-bg-highlight)] rounded animate-pulse" />
              <div className="h-4 bg-[var(--dash-bg-highlight)] rounded flex-1 animate-pulse" />
              <div className="h-4 bg-[var(--dash-bg-highlight)] rounded w-20 animate-pulse" />
              <div className="h-4 bg-[var(--dash-bg-highlight)] rounded w-16 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
