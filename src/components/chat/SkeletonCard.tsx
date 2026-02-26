/** Skeleton loading card — matches IdolSelector card layout with shimmer animation */
export function SkeletonCard() {
  return (
    <div className="w-full">
      <div className="idol-card glass-card rounded-2xl overflow-hidden flex items-stretch">
        {/* Avatar placeholder */}
        <div className="w-24 shrink-0" style={{ aspectRatio: '1/1' }}>
          <div className="w-full h-full skeleton-shimmer" />
        </div>

        {/* Info placeholder */}
        <div className="flex-1 px-4 py-3 flex flex-col justify-center gap-2">
          <div className="flex items-center gap-2">
            <div className="h-5 w-24 rounded-full skeleton-shimmer" />
            <div className="h-4 w-10 rounded-full skeleton-shimmer" />
          </div>
          <div className="h-3 w-16 rounded-full skeleton-shimmer" />
          <div className="h-3.5 w-40 rounded-full skeleton-shimmer" />
        </div>

        {/* Arrow placeholder */}
        <div className="flex items-center pr-4">
          <div className="w-4 h-4 rounded skeleton-shimmer" />
        </div>
      </div>
    </div>
  );
}

/** Skeleton card for group rooms (2×2 photo grid layout) */
export function SkeletonGroupCard() {
  return (
    <div className="w-full">
      <div className="idol-card glass-card rounded-2xl overflow-hidden flex items-stretch">
        {/* 2×2 photo grid placeholder */}
        <div className="grid grid-cols-2 gap-0 shrink-0" style={{ width: 96, height: 96 }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton-shimmer" />
          ))}
        </div>

        {/* Info placeholder */}
        <div className="flex-1 px-4 py-3 flex flex-col justify-center gap-2">
          <div className="h-5 w-28 rounded-full skeleton-shimmer" />
          <div className="h-3 w-20 rounded-full skeleton-shimmer" />
          <div className="h-3.5 w-44 rounded-full skeleton-shimmer" />
        </div>

        {/* Arrow placeholder */}
        <div className="flex items-center pr-4">
          <div className="w-4 h-4 rounded skeleton-shimmer" />
        </div>
      </div>
    </div>
  );
}
