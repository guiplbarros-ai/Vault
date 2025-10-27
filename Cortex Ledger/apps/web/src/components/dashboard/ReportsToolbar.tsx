'use client'

export function ReportsToolbar() {
  return (
    <div className="card bg-hero px-4 py-3 flex flex-wrap gap-2 items-center justify-between">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold">Relatórios</h2>
        <span className="text-xs text-muted">últimos 3 meses</span>
      </div>
      <div className="flex items-center gap-2">
        <button className="btn-ghost">Período</button>
        <button className="btn-ghost">Comparar</button>
        <button className="btn-ghost">CSV</button>
        <button className="btn-ghost">Excel</button>
      </div>
    </div>
  )
}


