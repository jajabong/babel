import React, { useMemo, useCallback, useRef, useEffect, useState } from 'react'

import { MessageItem } from './MessageItem'
import type { Message } from './MessageItem'

interface VirtualizedMessageListProps {
  messages: Message[]
  variant?: 'sidebar' | 'target'
  itemHeight?: number
  overscan?: number
  className?: string
  style?: React.CSSProperties
  onScroll?: (scrollTop: number) => void
}

interface VirtualItem {
  index: number
  start: number
  end: number
  height: number
  message: Message
}

export const VirtualizedMessageList: React.FC<VirtualizedMessageListProps> =
  React.memo(
    ({
      messages,
      variant = 'sidebar',
      itemHeight = 120,
      overscan = 5,
      className = '',
      style = {},
      onScroll,
    }) => {
      const containerRef = useRef<HTMLDivElement>(null)
      const scrollElementRef = useRef<HTMLDivElement>(null)
      const [scrollTop, setScrollTop] = useState(0)
      const [containerHeight, setContainerHeight] = useState(0)

      // Estimate item heights (could be made more sophisticated with actual measurement)
      const getItemHeight = useCallback(
        (message: Message): number => {
          // Basic height estimation based on message length and type
          const baseHeight = variant === 'sidebar' ? 80 : 100
          const lineHeight = 20
          const lines = Math.min(Math.ceil(message.text.length / 50), 10)
          const estimatedHeight = baseHeight + lines * lineHeight

          // Add extra height for optimized prompts or special content
          if (message.isOptimizedPrompt) {
            return estimatedHeight + 40
          }

          return Math.min(estimatedHeight, 300) // Cap maximum height
        },
        [variant]
      )

      // Calculate total height and item positions
      const { totalHeight, items } = useMemo(() => {
        let currentTop = 0
        const calculatedItems: VirtualItem[] = []

        messages.forEach((message, index) => {
          const height = getItemHeight(message)
          calculatedItems.push({
            index,
            start: currentTop,
            end: currentTop + height,
            height,
            message,
          })
          currentTop += height
        })

        return {
          totalHeight: currentTop,
          items: calculatedItems,
        }
      }, [messages, getItemHeight])

      // Calculate visible items
      const visibleItems = useMemo(() => {
        const startIndex = items.findIndex(
          item => item.end > scrollTop - overscan * itemHeight
        )
        const endIndex = items.findIndex(
          item =>
            item.start > scrollTop + containerHeight + overscan * itemHeight
        )

        return items.slice(
          Math.max(0, startIndex),
          endIndex === -1 ? items.length : endIndex + 1
        )
      }, [items, scrollTop, containerHeight, overscan, itemHeight])

      // Handle scroll events
      const handleScroll = useCallback(
        (event: React.UIEvent<HTMLDivElement>) => {
          const newScrollTop = event.currentTarget.scrollTop
          setScrollTop(newScrollTop)
          onScroll?.(newScrollTop)
        },
        [onScroll]
      )

      // Update container height
      useEffect(() => {
        const updateHeight = () => {
          if (containerRef.current) {
            setContainerHeight(containerRef.current.clientHeight)
          }
        }

        updateHeight()

        const resizeObserver = new ResizeObserver(updateHeight)
        if (containerRef.current) {
          resizeObserver.observe(containerRef.current)
        }

        return () => resizeObserver.disconnect()
      }, [])

      // Auto-scroll to bottom when new messages are added (only if already at bottom)
      const autoScrollToBottom = useCallback(() => {
        if (scrollElementRef.current && containerRef.current) {
          const { scrollTop, scrollHeight, clientHeight } =
            scrollElementRef.current
          const isAtBottom = scrollHeight - scrollTop - clientHeight < 50

          if (isAtBottom) {
            scrollElementRef.current.scrollTop = scrollHeight
          }
        }
      }, [])

      // Auto-scroll when messages change
      useEffect(() => {
        const timer = setTimeout(autoScrollToBottom, 100)
        return () => clearTimeout(timer)
      }, [messages.length, autoScrollToBottom])

      // If few messages, render without virtualization for simplicity
      if (messages.length < 10) {
        return (
          <div
            ref={containerRef}
            className={className}
            style={{
              height: '100%',
              overflowY: 'auto',
              ...style,
            }}
          >
            <div
              style={{
                padding: '15px',
                display: 'flex',
                flexDirection: 'column',
                gap: '15px',
              }}
            >
              {messages.map((message, index) => (
                <MessageItem
                  key={`${index}-${message.text.slice(0, 20)}`}
                  message={message}
                  index={index}
                  variant={variant}
                />
              ))}
            </div>
          </div>
        )
      }

      return (
        <div
          ref={containerRef}
          className={className}
          style={{
            height: '100%',
            overflow: 'hidden',
            position: 'relative',
            ...style,
          }}
        >
          <div
            ref={scrollElementRef}
            style={{
              height: '100%',
              overflowY: 'auto',
              position: 'relative',
            }}
            onScroll={handleScroll}
          >
            {/* Total height spacer */}
            <div style={{ height: totalHeight, position: 'relative' }}>
              {/* Visible items */}
              {visibleItems.map(({ index, start, height, message }) => (
                <div
                  key={`${index}-${message.text.slice(0, 20)}`}
                  style={{
                    position: 'absolute',
                    top: start,
                    left: 0,
                    right: 0,
                    height,
                  }}
                >
                  <div
                    style={{
                      padding: variant === 'sidebar' ? '0 15px' : '0',
                      height: '100%',
                      display: variant === 'sidebar' ? 'flex' : 'block',
                      flexDirection: variant === 'sidebar' ? 'column' : 'unset',
                      justifyContent:
                        variant === 'sidebar' ? 'flex-end' : 'unset',
                      alignItems: variant === 'sidebar' ? 'center' : 'unset',
                    }}
                  >
                    <MessageItem
                      message={message}
                      index={index}
                      variant={variant}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )
    }
  )

VirtualizedMessageList.displayName = 'VirtualizedMessageList'

export default VirtualizedMessageList
