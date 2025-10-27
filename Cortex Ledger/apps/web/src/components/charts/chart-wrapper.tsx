'use client'

import { useEffect, useRef, memo } from 'react'
import type { EChartsOption } from 'echarts'

interface ChartWrapperProps {
  option: EChartsOption
  height?: string
  className?: string
}

export const ChartWrapper = memo(function ChartWrapper({ option, height = '300px', className = '' }: ChartWrapperProps) {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<any>(null)
  const isLoading = useRef(false)

  useEffect(() => {
    if (!chartRef.current || isLoading.current) return

    isLoading.current = true

    // Lazy load echarts
    import('echarts').then((echarts) => {
      if (!chartRef.current) return

      // Initialize chart
      if (!chartInstance.current) {
        chartInstance.current = echarts.init(chartRef.current, undefined, {
          renderer: 'canvas',
          width: 'auto',
          height: 'auto',
        })
      }

      // Set option with merge strategy
      chartInstance.current.setOption(option, {
        notMerge: false,
        lazyUpdate: true,
      })

      isLoading.current = false
    })

    // Handle resize with debounce
    let resizeTimer: NodeJS.Timeout
    const handleResize = () => {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => {
        chartInstance.current?.resize({
          animation: {
            duration: 200,
          },
        })
      }, 100)
    }

    window.addEventListener('resize', handleResize)

    return () => {
      clearTimeout(resizeTimer)
      window.removeEventListener('resize', handleResize)
    }
  }, [option])

  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose()
        chartInstance.current = null
      }
    }
  }, [])

  return <div ref={chartRef} style={{ height, width: '100%' }} className={className} />
})
