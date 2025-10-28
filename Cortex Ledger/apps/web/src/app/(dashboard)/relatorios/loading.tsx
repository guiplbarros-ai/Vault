export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-9 w-40 animate-pulse bg-slate-200 dark:bg-graphite-700 rounded" />
          <div className="mt-1 h-5 w-96 animate-pulse bg-slate-200 dark:bg-graphite-700 rounded" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-32 animate-pulse bg-slate-200 dark:bg-graphite-700 rounded" />
          <div className="h-10 w-24 animate-pulse bg-slate-200 dark:bg-graphite-700 rounded" />
        </div>
      </div>

      {/* Timeline Navigator Skeleton */}
      <div className="rounded-2xl border border-slate-200 dark:border-graphite-700 bg-white dark:bg-graphite-800 p-6">
        <div className="flex items-center justify-center gap-4">
          <div className="h-10 w-32 animate-pulse bg-slate-200 dark:bg-graphite-700 rounded" />
          <div className="h-6 w-48 animate-pulse bg-slate-200 dark:bg-graphite-700 rounded" />
          <div className="h-10 w-32 animate-pulse bg-slate-200 dark:bg-graphite-700 rounded" />
        </div>
      </div>

      {/* Filters Skeleton */}
      <div className="rounded-2xl border border-slate-200 dark:border-graphite-700 bg-white dark:bg-graphite-800 p-6">
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-24 animate-pulse bg-slate-200 dark:bg-graphite-700 rounded" />
              <div className="h-10 animate-pulse bg-slate-200 dark:bg-graphite-700 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Summary Cards Skeleton */}
      <div className="grid gap-6 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-slate-200 dark:border-graphite-700 bg-white dark:bg-graphite-800 p-6">
            <div className="mb-2 h-5 w-32 animate-pulse bg-slate-200 dark:bg-graphite-700 rounded" />
            <div className="h-8 w-40 animate-pulse bg-slate-200 dark:bg-graphite-700 rounded" />
          </div>
        ))}
      </div>

      {/* Charts Skeleton */}
      <div className="grid gap-6 lg:grid-cols-2">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-2xl border border-slate-200 dark:border-graphite-700 bg-white dark:bg-graphite-800 p-6">
            <div className="mb-4 h-6 w-48 animate-pulse bg-slate-200 dark:bg-graphite-700 rounded" />
            <div className="h-80 animate-pulse bg-slate-200 dark:bg-graphite-700 rounded" />
          </div>
        ))}
      </div>

      {/* Monthly Trend Skeleton */}
      <div className="rounded-2xl border border-slate-200 dark:border-graphite-700 bg-white dark:bg-graphite-800 p-6">
        <div className="mb-4 h-6 w-56 animate-pulse bg-slate-200 dark:bg-graphite-700 rounded" />
        <div className="h-96 animate-pulse bg-slate-200 dark:bg-graphite-700 rounded" />
      </div>
    </div>
  )
}
