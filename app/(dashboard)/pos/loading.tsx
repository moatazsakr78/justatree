export default function POSLoading() {
  return (
    <div className="min-h-screen bg-[var(--dash-bg-base)] pt-12">
      {/* Header skeleton */}
      <div className="h-12 fixed top-0 left-0 right-0 bg-[var(--dash-header-bg)] border-b border-[var(--dash-border-default)] z-50" />

      <div className="flex h-[calc(100vh-3rem)]">
        {/* Product grid area */}
        <div className="flex-1 p-4 space-y-3">
          {/* Search bar */}
          <div className="h-10 bg-[var(--dash-bg-surface)] rounded-lg animate-pulse" />

          {/* Category tabs */}
          <div className="flex gap-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-8 bg-[var(--dash-bg-surface)] rounded-full w-20 animate-pulse" />
            ))}
          </div>

          {/* Product grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="aspect-square bg-[var(--dash-bg-surface)] rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
