export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="h-9 w-40 animate-pulse bg-slate-200 dark:bg-graphite-700 rounded" />
          <div className="mt-1 h-5 w-96 animate-pulse bg-slate-200 dark:bg-graphite-700 rounded" />
        </div>
        <div className="h-10 w-48 animate-pulse bg-slate-200 dark:bg-graphite-700 rounded" />
      </div>

      {/* Month Selector Skeleton */}
      <div className="flex items-center justify-center gap-3 p-4 bg-white dark:bg-graphite-800 rounded-2xl border border-slate-200 dark:border-graphite-700">
        <div className="h-10 w-28 animate-pulse bg-slate-200 dark:bg-graphite-700 rounded" />
        <div className="h-6 w-48 animate-pulse bg-slate-200 dark:bg-graphite-700 rounded" />
        <div className="h-10 w-28 animate-pulse bg-slate-200 dark:bg-graphite-700 rounded" />
      </div>

      {/* Overview Cards Skeleton */}
      <div className="grid gap-6 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-slate-200 dark:border-graphite-700 bg-white dark:bg-graphite-800 p-6">
            <div className="mb-2 h-5 w-32 animate-pulse bg-slate-200 dark:bg-graphite-700 rounded" />
            <div className="h-8 w-40 animate-pulse bg-slate-200 dark:bg-graphite-700 rounded" />
            <div className="mt-2 h-4 w-24 animate-pulse bg-slate-200 dark:bg-graphite-700 rounded" />
          </div>
        ))}
      </div>

      {/* Chart Skeleton */}
      <div className="rounded-2xl border border-slate-200 dark:border-graphite-700 bg-white dark:bg-graphite-800 p-6">
        <div className="mb-4 h-6 w-56 animate-pulse bg-slate-200 dark:bg-graphite-700 rounded" />
        <div className="h-80 animate-pulse bg-slate-200 dark:bg-graphite-700 rounded" />
      </div>

      {/* Budgets List Skeleton */}
      <div>
        <div className="mb-4 h-7 w-56 animate-pulse bg-slate-200 dark:bg-graphite-700 rounded" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="rounded-2xl border border-slate-200 dark:border-graphite-700 bg-white dark:bg-graphite-800 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className="h-12 w-12 animate-pulse bg-slate-200 dark:bg-graphite-700 rounded-full" />
                  <div className="flex-1">
                    <div className="h-5 w-32 animate-pulse bg-slate-200 dark:bg-graphite-700 rounded mb-2" />
                    <div className="h-4 w-48 animate-pulse bg-slate-200 dark:bg-graphite-700 rounded" />
                  </div>
                </div>
                <div className="h-10 w-20 animate-pulse bg-slate-200 dark:bg-graphite-700 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
