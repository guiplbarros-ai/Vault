// Gera gráfico ASCII simples para preços ao longo do tempo
// Usado no /historico do Telegram

interface DataPoint {
  label: string // Ex: "15/02"
  value: number
}

export function generateAsciiChart(
  points: DataPoint[],
  options: { height?: number; width?: number; title?: string } = {}
): string {
  if (points.length === 0) return '_Sem dados para gráfico_'
  if (points.length === 1) return `${points[0].label}: R$ ${fmtK(points[0].value)}`

  const height = options.height || 6
  const values = points.map((p) => p.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  // Sparkline usando caracteres de bloco
  const sparkChars = '▁▂▃▄▅▆▇█'

  // Gera sparkline
  const sparkline = values
    .map((v) => {
      const normalized = (v - min) / range
      const idx = Math.min(Math.floor(normalized * (sparkChars.length - 1)), sparkChars.length - 1)
      return sparkChars[idx]
    })
    .join('')

  // Monta gráfico compacto (funciona bem no Telegram)
  let chart = ''
  if (options.title) chart += `${options.title}\n`

  chart += `\`R$ ${fmtK(max)}\` ┤ _máx_\n`
  chart += `\`       \` │${sparkline}\n`
  chart += `\`R$ ${fmtK(min)}\` ┤ _mín_\n`

  // Labels de data (primeiro e último)
  const first = points[0].label
  const last = points[points.length - 1].label
  const gap = Math.max(0, sparkline.length - first.length - last.length)
  chart += `\`       \` ${first}${' '.repeat(gap)}${last}`

  return chart
}

// Formata preço em K (ex: 7.500 -> "7.5k", 12.300 -> "12.3k")
function fmtK(value: number): string {
  if (value >= 1000) {
    const k = value / 1000
    return k % 1 === 0 ? `${k.toFixed(0)}k  ` : `${k.toFixed(1)}k`
  }
  return String(Math.round(value)).padEnd(5)
}
