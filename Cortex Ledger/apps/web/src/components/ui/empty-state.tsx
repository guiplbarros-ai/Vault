'use client'

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="card card-elev py-16 flex flex-col items-center text-center gap-3">
      <div className="h-12 w-12 rounded-2xl bg-primary/15 grid place-items-center">
        <div className="h-6 w-6 rounded-xl bg-primary/70" />
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      {hint && <p className="text-sm text-muted max-w-md">{hint}</p>}
      {action}
    </div>
  )
}


