export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-9 w-48 animate-pulse bg-slate-200 dark:bg-graphite-700 rounded" />
          <div className="mt-1 h-5 w-96 animate-pulse bg-slate-200 dark:bg-graphite-700 rounded" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-24 animate-pulse bg-slate-200 dark:bg-graphite-700 rounded" />
          <div className="h-10 w-24 animate-pulse bg-slate-200 dark:bg-graphite-700 rounded" />
        </div>
      </div>

      {/* Filters Skeleton */}
      <div className="rounded-2xl border border-slate-200 dark:border-graphite-700 bg-white dark:bg-graphite-800 p-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-24 animate-pulse bg-slate-200 dark:bg-graphite-700 rounded" />
              <div className="h-10 animate-pulse bg-slate-200 dark:bg-graphite-700 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="rounded-2xl border border-slate-200 dark:border-graphite-700 bg-white dark:bg-graphite-800">
        <div className="p-6 border-b border-slate-200 dark:border-graphite-700">
          <div className="h-6 w-48 animate-pulse bg-slate-200 dark:bg-graphite-700 rounded" />
          <div className="mt-1 h-4 w-64 animate-pulse bg-slate-200 dark:bg-graphite-700 rounded" />
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
              <div key={i} className="h-16 animate-pulse bg-slate-200 dark:bg-graphite-700 rounded" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
