'use client'

import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import type { EChartsOption } from 'echarts'

interface ChartWrapperProps {
  option: EChartsOption
  height?: string
  className?: string
}

export function ChartWrapper({ option, height = '300px', className = '' }: ChartWrapperProps) {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!chartRef.current) return

    // Initialize chart
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current, undefined, {
        renderer: 'canvas',
      })
    }

    // Set option
    chartInstance.current.setOption(option, true)

    // Handle resize
    const handleResize = () => {
      chartInstance.current?.resize()
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [option])

  useEffect(() => {
    return () => {
      chartInstance.current?.dispose()
    }
  }, [])

  return <div ref={chartRef} style={{ height }} className={className} />
}
