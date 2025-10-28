export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div>
        <div className="h-9 w-48 animate-pulse bg-slate-200 dark:bg-graphite-700 rounded" />
        <div className="mt-1 h-5 w-64 animate-pulse bg-slate-200 dark:bg-graphite-700 rounded" />
      </div>

      {/* Accounts Overview Skeleton */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-2xl border border-slate-200 dark:border-graphite-700 bg-white dark:bg-graphite-800 p-6">
            <div className="mb-4 h-6 w-32 animate-pulse bg-slate-200 dark:bg-graphite-700 rounded" />
            <div className="h-8 w-40 animate-pulse bg-slate-200 dark:bg-graphite-700 rounded" />
          </div>
        ))}
      </div>

      {/* DFC and Budget Charts Skeleton */}
      <div className="grid gap-6 md:grid-cols-2">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-2xl border border-slate-200 dark:border-graphite-700 bg-white dark:bg-graphite-800 p-6">
            <div className="mb-4 h-6 w-48 animate-pulse bg-slate-200 dark:bg-graphite-700 rounded" />
            <div className="h-64 animate-pulse bg-slate-200 dark:bg-graphite-700 rounded" />
          </div>
        ))}
      </div>

      {/* Evolution Chart Skeleton */}
      <div className="rounded-2xl border border-slate-200 dark:border-graphite-700 bg-white dark:bg-graphite-800 p-6">
        <div className="mb-4 h-6 w-56 animate-pulse bg-slate-200 dark:bg-graphite-700 rounded" />
        <div className="h-80 animate-pulse bg-slate-200 dark:bg-graphite-700 rounded" />
      </div>

      {/* Bottom Cards Skeleton */}
      <div className="grid gap-6 md:grid-cols-2">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-2xl border border-slate-200 dark:border-graphite-700 bg-white dark:bg-graphite-800 p-6">
            <div className="mb-4 h-6 w-40 animate-pulse bg-slate-200 dark:bg-graphite-700 rounded" />
            <div className="space-y-3">
              {[1, 2, 3, 4].map((j) => (
                <div key={j} className="h-12 animate-pulse bg-slate-200 dark:bg-graphite-700 rounded" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
