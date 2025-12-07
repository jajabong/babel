import React, { useState, useEffect, useMemo } from 'react'

import {
  usePerformanceMonitor,
  type PerformanceMetrics,
} from '../../hooks/usePerformanceMonitor'

import { Button } from './Button'

interface PerformanceGrade {
  metric: string
  value: number | string
  threshold: number
  unit: string
  status: 'good' | 'needs-improvement' | 'poor'
}

export const PerformanceDashboard: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const { metrics, entries, getReport, resetMetrics } = usePerformanceMonitor()

  // Calculate performance grades
  const performanceGrades = useMemo((): PerformanceGrade[] => {
    const grades: PerformanceGrade[] = []

    // FCP
    if (metrics.fcp !== undefined) {
      grades.push({
        metric: 'First Contentful Paint',
        value: metrics.fcp,
        threshold: 1800,
        unit: 'ms',
        status:
          metrics.fcp < 1000
            ? 'good'
            : metrics.fcp < 1800
              ? 'needs-improvement'
              : 'poor',
      })
    }

    // LCP
    if (metrics.lcp !== undefined) {
      grades.push({
        metric: 'Largest Contentful Paint',
        value: metrics.lcp,
        threshold: 2500,
        unit: 'ms',
        status:
          metrics.lcp < 1200
            ? 'good'
            : metrics.lcp < 2500
              ? 'needs-improvement'
              : 'poor',
      })
    }

    // FID
    if (metrics.fid !== undefined) {
      grades.push({
        metric: 'First Input Delay',
        value: metrics.fid,
        threshold: 100,
        unit: 'ms',
        status:
          metrics.fid < 50
            ? 'good'
            : metrics.fid < 100
              ? 'needs-improvement'
              : 'poor',
      })
    }

    // CLS
    if (metrics.cls !== undefined) {
      grades.push({
        metric: 'Cumulative Layout Shift',
        value: metrics.cls.toFixed(3),
        threshold: 0.1,
        unit: '',
        status:
          metrics.cls < 0.025
            ? 'good'
            : metrics.cls < 0.1
              ? 'needs-improvement'
              : 'poor',
      })
    }

    // TTFB
    if (metrics.ttfb !== undefined) {
      grades.push({
        metric: 'Time to First Byte',
        value: metrics.ttfb,
        threshold: 800,
        unit: 'ms',
        status:
          metrics.ttfb < 400
            ? 'good'
            : metrics.ttfb < 800
              ? 'needs-improvement'
              : 'poor',
      })
    }

    return grades
  }, [metrics])

  // Calculate overall performance score
  const overallScore = useMemo(() => {
    if (performanceGrades.length === 0) return 0

    const goodCount = performanceGrades.filter(g => g.status === 'good').length
    const needsImprovementCount = performanceGrades.filter(
      g => g.status === 'needs-improvement'
    ).length

    // Simple scoring: good = 100, needs-improvement = 70, poor = 0
    const score = performanceGrades.reduce((acc, grade) => {
      switch (grade.status) {
        case 'good':
          return acc + 100
        case 'needs-improvement':
          return acc + 70
        case 'poor':
          return acc + 0
        default:
          return acc
      }
    }, 0)

    return Math.round(score / performanceGrades.length)
  }, [performanceGrades])

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      // Force re-render to update metrics
      window.dispatchEvent(new Event('resize'))
    }, 2000)

    return () => clearInterval(interval)
  }, [autoRefresh])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good':
        return '#22c55e'
      case 'needs-improvement':
        return '#eab308'
      case 'poor':
        return '#ef4444'
      default:
        return '#6b7280'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good':
        return 'fa-check-circle'
      case 'needs-improvement':
        return 'fa-exclamation-triangle'
      case 'poor':
        return 'fa-times-circle'
      default:
        return 'fa-question-circle'
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return '#22c55e'
    if (score >= 70) return '#eab308'
    if (score >= 50) return '#f97316'
    return '#ef4444'
  }

  if (!isVisible) {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 1000,
        }}
      >
        <Button
          onClick={() => setIsVisible(true)}
          variant='ghost'
          icon='fa-tachometer-alt'
          style={{
            backgroundColor: '#1f2937',
            color: '#fff',
            borderRadius: '50%',
            width: '48px',
            height: '48px',
            fontSize: '1.2rem',
          }}
        />
      </div>
    )
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        width: '420px',
        maxHeight: '80vh',
        backgroundColor: '#1f2937',
        border: '1px solid #374151',
        borderRadius: '12px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
        zIndex: 1000,
        overflow: 'hidden',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px',
          backgroundColor: '#111827',
          borderBottom: '1px solid #374151',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <i
            className='fa-solid fa-tachometer-alt'
            style={{ color: '#3b82f6', fontSize: '1.2rem' }}
          />
          <h3
            style={{
              margin: 0,
              color: '#fff',
              fontSize: '1rem',
              fontWeight: 600,
            }}
          >
            Performance Monitor
          </h3>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            onClick={() => setAutoRefresh(!autoRefresh)}
            variant='ghost'
            icon={autoRefresh ? 'fa-pause' : 'fa-play'}
            style={{
              backgroundColor: autoRefresh ? '#3b82f6' : 'transparent',
              color: '#fff',
              padding: '6px',
              borderRadius: '4px',
            }}
          />
          <Button
            onClick={() => setIsVisible(false)}
            variant='ghost'
            icon='fa-times'
            style={{
              backgroundColor: 'transparent',
              color: '#9ca3af',
              padding: '6px',
              borderRadius: '4px',
            }}
          />
        </div>
      </div>

      <div
        style={{
          padding: '16px',
          maxHeight: 'calc(80vh - 140px)',
          overflowY: 'auto',
        }}
      >
        {/* Overall Score */}
        <div
          style={{
            backgroundColor: '#111827',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '16px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              color: '#9ca3af',
              fontSize: '0.75rem',
              marginBottom: '8px',
            }}
          >
            PERFORMANCE SCORE
          </div>
          <div
            style={{
              fontSize: '2.5rem',
              fontWeight: 'bold',
              color: getScoreColor(overallScore),
              marginBottom: '4px',
            }}
          >
            {overallScore}
          </div>
          <div style={{ color: '#6b7280', fontSize: '0.8rem' }}>
            {overallScore >= 90
              ? 'Excellent'
              : overallScore >= 70
                ? 'Good'
                : overallScore >= 50
                  ? 'Needs Work'
                  : 'Poor'}
          </div>
        </div>

        {/* Core Web Vitals */}
        <div style={{ marginBottom: '16px' }}>
          <h4
            style={{
              margin: '0 0 12px 0',
              color: '#fff',
              fontSize: '0.9rem',
              fontWeight: 600,
            }}
          >
            Core Web Vitals
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {performanceGrades.map((grade, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: '#111827',
                  padding: '12px',
                  borderRadius: '6px',
                }}
              >
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <i
                    className={`fa-solid ${getStatusIcon(grade.status)}`}
                    style={{
                      color: getStatusColor(grade.status),
                      fontSize: '0.9rem',
                    }}
                  />
                  <span style={{ color: '#d1d5db', fontSize: '0.85rem' }}>
                    {grade.metric}
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <span
                    style={{
                      color: getStatusColor(grade.status),
                      fontSize: '0.9rem',
                      fontWeight: 600,
                    }}
                  >
                    {grade.value}
                    {grade.unit}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Additional Metrics */}
        <div style={{ marginBottom: '16px' }}>
          <h4
            style={{
              margin: '0 0 12px 0',
              color: '#fff',
              fontSize: '0.9rem',
              fontWeight: 600,
            }}
          >
            Additional Metrics
          </h4>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
            }}
          >
            <div
              style={{
                backgroundColor: '#111827',
                padding: '12px',
                borderRadius: '6px',
              }}
            >
              <div
                style={{
                  color: '#9ca3af',
                  fontSize: '0.75rem',
                  marginBottom: '4px',
                }}
              >
                Render Time
              </div>
              <div
                style={{ color: '#3b82f6', fontSize: '1rem', fontWeight: 600 }}
              >
                {metrics.renderTime || 'N/A'}ms
              </div>
            </div>
            <div
              style={{
                backgroundColor: '#111827',
                padding: '12px',
                borderRadius: '6px',
              }}
            >
              <div
                style={{
                  color: '#9ca3af',
                  fontSize: '0.75rem',
                  marginBottom: '4px',
                }}
              >
                Memory
              </div>
              <div
                style={{ color: '#10b981', fontSize: '1rem', fontWeight: 600 }}
              >
                {metrics.memoryUsage || 'N/A'}MB
              </div>
            </div>
            <div
              style={{
                backgroundColor: '#111827',
                padding: '12px',
                borderRadius: '6px',
              }}
            >
              <div
                style={{
                  color: '#9ca3af',
                  fontSize: '0.75rem',
                  marginBottom: '4px',
                }}
              >
                Resources
              </div>
              <div
                style={{ color: '#8b5cf6', fontSize: '1rem', fontWeight: 600 }}
              >
                {metrics.resourceCount || 'N/A'}
              </div>
            </div>
            <div
              style={{
                backgroundColor: '#111827',
                padding: '12px',
                borderRadius: '6px',
              }}
            >
              <div
                style={{
                  color: '#9ca3af',
                  fontSize: '0.75rem',
                  marginBottom: '4px',
                }}
              >
                Total Size
              </div>
              <div
                style={{ color: '#f59e0b', fontSize: '1rem', fontWeight: 600 }}
              >
                {metrics.totalResourceSize
                  ? Math.round(metrics.totalResourceSize / 1024) + 'KB'
                  : 'N/A'}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Entries */}
        {entries.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <h4
              style={{
                margin: '0 0 12px 0',
                color: '#fff',
                fontSize: '0.9rem',
                fontWeight: 600,
              }}
            >
              Recent Performance Entries
            </h4>
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}
            >
              {entries
                .slice(-5)
                .reverse()
                .map((entry, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: '#111827',
                      padding: '8px 12px',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                    }}
                  >
                    <span style={{ color: '#9ca3af' }}>{entry.name}</span>
                    <span style={{ color: '#d1d5db', fontWeight: 500 }}>
                      {Math.round(entry.duration)}ms ({entry.type})
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            onClick={() => {
              const report = getReport()
              navigator.clipboard.writeText(report)
            }}
            variant='secondary'
            size='sm'
            icon='fa-copy'
          >
            Copy Report
          </Button>
          <Button
            onClick={resetMetrics}
            variant='ghost'
            size='sm'
            icon='fa-redo'
            style={{ color: '#ef4444' }}
          >
            Reset
          </Button>
        </div>
      </div>
    </div>
  )
}

PerformanceDashboard.displayName = 'PerformanceDashboard'

export default PerformanceDashboard
