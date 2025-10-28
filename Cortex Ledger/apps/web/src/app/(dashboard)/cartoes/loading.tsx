import { Card } from '@/components/ui/card'

export default function CartoesLoading() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-9 w-64 bg-slate-200 dark:bg-graphite-700 rounded animate-pulse" />
          <div className="h-4 w-96 bg-slate-200 dark:bg-graphite-700 rounded animate-pulse mt-2" />
        </div>
        <div className="h-10 w-40 bg-slate-200 dark:bg-graphite-700 rounded animate-pulse" />
      </div>

      {/* Cards de Resumo Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="h-4 w-24 bg-slate-200 dark:bg-graphite-700 rounded animate-pulse" />
                <div className="h-8 w-32 bg-slate-200 dark:bg-graphite-700 rounded animate-pulse mt-2" />
              </div>
              <div className="h-12 w-12 bg-slate-200 dark:bg-graphite-700 rounded-xl animate-pulse" />
            </div>
          </Card>
        ))}
      </div>

      {/* Lista de Cartões Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="h-6 w-40 bg-slate-200 dark:bg-graphite-700 rounded animate-pulse" />
                <div className="h-4 w-24 bg-slate-200 dark:bg-graphite-700 rounded animate-pulse mt-2" />
              </div>
              <div className="h-6 w-6 bg-slate-200 dark:bg-graphite-700 rounded animate-pulse" />
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="h-4 w-12 bg-slate-200 dark:bg-graphite-700 rounded animate-pulse" />
                  <div className="h-4 w-16 bg-slate-200 dark:bg-graphite-700 rounded animate-pulse" />
                </div>
                <div className="h-2 w-full bg-slate-200 dark:bg-graphite-700 rounded-full animate-pulse" />
                <div className="flex items-center justify-between mt-1">
                  <div className="h-3 w-24 bg-slate-200 dark:bg-graphite-700 rounded animate-pulse" />
                  <div className="h-3 w-20 bg-slate-200 dark:bg-graphite-700 rounded animate-pulse" />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-graphite-700">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="h-3 w-20 bg-slate-200 dark:bg-graphite-700 rounded animate-pulse" />
                    <div className="h-6 w-28 bg-slate-200 dark:bg-graphite-700 rounded animate-pulse mt-1" />
                  </div>
                  <div className="text-right">
                    <div className="h-3 w-16 bg-slate-200 dark:bg-graphite-700 rounded animate-pulse" />
                    <div className="h-5 w-12 bg-slate-200 dark:bg-graphite-700 rounded animate-pulse mt-1" />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-graphite-700">
                <div className="h-9 w-full bg-slate-200 dark:bg-graphite-700 rounded animate-pulse" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
