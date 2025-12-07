import { useEffect, useRef, useCallback, useState } from 'react'

// Performance metrics interface
export interface PerformanceMetrics {
  // Core Web Vitals
  fcp?: number // First Contentful Paint
  lcp?: number // Largest Contentful Paint
  fid?: number // First Input Delay
  cls?: number // Cumulative Layout Shift
  ttfb?: number // Time to First Byte

  // Custom metrics
  renderTime?: number
  interactionTime?: number
  memoryUsage?: number

  // Navigation timing
  domContentLoaded?: number
  loadComplete?: number

  // Resource timing
  resourceCount?: number
  totalResourceSize?: number
}

export interface PerformanceEntry {
  name: string
  startTime: number
  duration: number
  type: 'navigation' | 'render' | 'interaction' | 'resource'
}

export interface UsePerformanceMonitorReturn {
  metrics: PerformanceMetrics
  entries: PerformanceEntry[]
  recordRender: (name: string) => void
  recordInteraction: (name: string, callback?: () => void) => void
  getReport: () => string
  resetMetrics: () => void
}

// Enhanced performance monitoring hook
export const usePerformanceMonitor = (): UsePerformanceMonitorReturn => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({})
  const [entries, setEntries] = useState<PerformanceEntry[]>([])
  const renderStartRef = useRef<number | null>(null)
  const observersRef = useRef<{
    observer?: PerformanceObserver
    lcpObserver?: PerformanceObserver
    fidObserver?: PerformanceObserver
    clsObserver?: PerformanceObserver
  }>({})

  // Record Core Web Vitals
  const recordCoreWebVitals = useCallback(() => {
    try {
      // First Contentful Paint
      const fcpEntry = performance.getEntriesByName(
        'first-contentful-paint'
      )[0] as PerformancePaintTiming
      if (fcpEntry) {
        setMetrics(prev => ({ ...prev, fcp: Math.round(fcpEntry.startTime) }))
      }

      // Navigation timing
      const navigationEntry = performance.getEntriesByType(
        'navigation'
      )[0] as PerformanceNavigationTiming
      if (navigationEntry) {
        setMetrics(prev => ({
          ...prev,
          domContentLoaded: Math.round(
            navigationEntry.domContentLoadedEventEnd -
              navigationEntry.navigationStart
          ),
          loadComplete: Math.round(
            navigationEntry.loadEventEnd - navigationEntry.navigationStart
          ),
          ttfb: Math.round(
            navigationEntry.responseStart - navigationEntry.requestStart
          ),
        }))
      }

      // Resource timing summary
      const resourceEntries = performance.getEntriesByType('resource')
      const totalSize = resourceEntries.reduce((acc, entry) => {
        const resource = entry as PerformanceResourceTiming
        return acc + (resource.transferSize || 0)
      }, 0)

      setMetrics(prev => ({
        ...prev,
        resourceCount: resourceEntries.length,
        totalResourceSize: totalSize,
      }))
    } catch (error) {
      console.warn('Error recording Core Web Vitals:', error)
    }
  }, [])

  // Largest Contentful Paint observer
  const observeLCP = useCallback(() => {
    if (!window.PerformanceObserver) return

    try {
      const lcpObserver = new PerformanceObserver(entryList => {
        const entries = entryList.getEntries()
        const lastEntry = entries[entries.length - 1] as any
        if (lastEntry) {
          setMetrics(prev => ({
            ...prev,
            lcp: Math.round(lastEntry.startTime),
          }))
        }
      })

      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })
      observersRef.current.lcpObserver = lcpObserver
    } catch (error) {
      console.warn('LCP observer not supported:', error)
    }
  }, [])

  // First Input Delay observer
  const observeFID = useCallback(() => {
    if (!window.PerformanceObserver) return

    try {
      const fidObserver = new PerformanceObserver(entryList => {
        const entries = entryList.getEntries()
        entries.forEach((entry: any) => {
          if (entry.processingStart) {
            setMetrics(prev => ({
              ...prev,
              fid: Math.round(entry.processingStart - entry.startTime),
            }))
          }
        })
      })

      fidObserver.observe({ entryTypes: ['first-input'] })
      observersRef.current.fidObserver = fidObserver
    } catch (error) {
      console.warn('FID observer not supported:', error)
    }
  }, [])

  // Cumulative Layout Shift observer
  const observeCLS = useCallback(() => {
    if (!window.PerformanceObserver) return

    try {
      let clsValue = 0
      const clsObserver = new PerformanceObserver(entryList => {
        const entries = entryList.getEntries()
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value
            setMetrics(prev => ({
              ...prev,
              cls: Math.round(clsValue * 1000) / 1000,
            }))
          }
        })
      })

      clsObserver.observe({ entryTypes: ['layout-shift'] })
      observersRef.current.clsObserver = clsObserver
    } catch (error) {
      console.warn('CLS observer not supported:', error)
    }
  }, [])

  // Record render performance
  const recordRender = useCallback((name: string) => {
    const startTime = performance.now()
    renderStartRef.current = startTime

    // Use requestAnimationFrame to measure after render
    requestAnimationFrame(() => {
      const endTime = performance.now()
      const duration = endTime - (renderStartRef.current || startTime)

      const entry: PerformanceEntry = {
        name,
        startTime,
        duration,
        type: 'render',
      }

      setEntries(prev => [...prev, entry])
      setMetrics(prev => ({
        ...prev,
        renderTime: Math.round(duration),
      }))

      renderStartRef.current = null
    })
  }, [])

  // Record interaction performance
  const recordInteraction = useCallback(
    (name: string, callback?: () => void) => {
      const startTime = performance.now()

      const wrappedCallback = () => {
        const endTime = performance.now()
        const duration = endTime - startTime

        const entry: PerformanceEntry = {
          name,
          startTime,
          duration,
          type: 'interaction',
        }

        setEntries(prev => [...prev, entry])
        setMetrics(prev => ({
          ...prev,
          interactionTime: Math.round(duration),
        }))

        callback?.()
      }

      return wrappedCallback
    },
    []
  )

  // Get performance report
  const getReport = useCallback(() => {
    const report = `
🚀 Performance Report
====================

Core Web Vitals:
- First Contentful Paint (FCP): ${metrics.fcp || 'N/A'}ms
- Largest Contentful Paint (LCP): ${metrics.lcp || 'N/A'}ms
- First Input Delay (FID): ${metrics.fid || 'N/A'}ms
- Cumulative Layout Shift (CLS): ${metrics.cls || 'N/A'}
- Time to First Byte (TTFB): ${metrics.ttfb || 'N/A'}ms

Navigation Timing:
- DOM Content Loaded: ${metrics.domContentLoaded || 'N/A'}ms
- Load Complete: ${metrics.loadComplete || 'N/A'}ms

Custom Metrics:
- Render Time: ${metrics.renderTime || 'N/A'}ms
- Interaction Time: ${metrics.interactionTime || 'N/A'}ms
- Memory Usage: ${metrics.memoryUsage || 'N/A'}MB

Resource Metrics:
- Resource Count: ${metrics.resourceCount || 'N/A'}
- Total Resource Size: ${metrics.totalResourceSize ? Math.round(metrics.totalResourceSize / 1024) + 'KB' : 'N/A'}

Performance Entries: ${entries.length}
${entries
  .slice(-5)
  .map(e => `- ${e.name}: ${Math.round(e.duration)}ms (${e.type})`)
  .join('\n')}

Performance Grades:
${metrics.fcp && metrics.fcp < 1800 ? '✅' : '❌'} FCP (< 1.8s)
${metrics.lcp && metrics.lcp < 2500 ? '✅' : '❌'} LCP (< 2.5s)
${metrics.fid && metrics.fid < 100 ? '✅' : '❌'} FID (< 100ms)
${metrics.cls && metrics.cls < 0.1 ? '✅' : '❌'} CLS (< 0.1)
    `.trim()

    return report
  }, [metrics, entries])

  // Reset metrics
  const resetMetrics = useCallback(() => {
    setMetrics({})
    setEntries([])
  }, [])

  // Memory usage monitoring
  const recordMemoryUsage = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      const usedMemory = memory
        ? Math.round(memory.usedJSHeapSize / 1024 / 1024)
        : undefined
      setMetrics(prev => ({ ...prev, memoryUsage: usedMemory }))
    }
  }, [])

  // Initialize performance monitoring
  useEffect(() => {
    // Record initial metrics
    recordCoreWebVitals()
    recordMemoryUsage()

    // Set up observers
    observeLCP()
    observeFID()
    observeCLS()

    // Periodic memory monitoring
    const memoryInterval = setInterval(recordMemoryUsage, 5000)

    // Cleanup
    return () => {
      clearInterval(memoryInterval)

      // Disconnect observers
      Object.values(observersRef.current).forEach(observer => {
        observer?.disconnect()
      })
    }
  }, [
    recordCoreWebVitals,
    observeLCP,
    observeFID,
    observeCLS,
    recordMemoryUsage,
  ])

  return {
    metrics,
    entries,
    recordRender,
    recordInteraction,
    getReport,
    resetMetrics,
  }
}
