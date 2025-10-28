import React from 'react'

interface Props {
	columns: string[]
	rows: Array<Record<string, string>>
	errors?: string[]
}

export function ImportPreview({ columns, rows, errors = [] }: Props) {
	if (errors.length) {
		return (
			<div className="text-sm text-red-600 dark:text-red-400">
				{errors.map((e, i) => (
					<p key={i}>{e}</p>
				))}
			</div>
		)
	}
	if (!rows.length) {
		return <p className="text-neutral-500">Nenhum dado para pré-visualizar.</p>
	}
	return (
		<div className="overflow-x-auto border rounded-md">
			<table className="min-w-full text-sm">
				<thead>
					<tr>
						{columns.map((c) => (
							<th key={c} className="text-left px-3 py-2 bg-neutral-50 dark:bg-neutral-900 font-semibold">
								{c}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{rows.slice(0, 10).map((r, idx) => (
						<tr key={idx} className="border-t">
							{columns.map((c) => (
								<td key={c} className="px-3 py-2 whitespace-nowrap">
									{r[c] ?? ''}
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	)
}
