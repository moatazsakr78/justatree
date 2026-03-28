export default function SuppliersLoading() {
  return (
    <div className="min-h-screen bg-[var(--dash-bg-base)] pt-12">
      <div className="h-12 fixed top-0 left-0 right-0 bg-[var(--dash-header-bg)] border-b border-[var(--dash-border-default)] z-50" />

      <div className="p-4 space-y-4">
        {/* Search + actions */}
        <div className="flex items-center gap-3">
          <div className="h-10 bg-[var(--dash-bg-surface)] rounded-lg flex-1 animate-pulse" />
          <div className="h-10 bg-[var(--dash-bg-surface)] rounded w-32 animate-pulse" />
        </div>

        {/* Table skeleton */}
        <div className="bg-[var(--dash-bg-surface)] rounded-lg overflow-hidden">
          <div className="h-12 bg-[var(--dash-bg-highlight)] animate-pulse" />
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-16 border-b border-[var(--dash-border-default)] flex items-center px-4 gap-4">
              <div className="w-10 h-10 bg-[var(--dash-bg-highlight)] rounded-full animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-[var(--dash-bg-highlight)] rounded w-1/3 animate-pulse" />
                <div className="h-3 bg-[var(--dash-bg-highlight)] rounded w-1/4 animate-pulse" />
              </div>
              <div className="h-4 bg-[var(--dash-bg-highlight)] rounded w-20 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
