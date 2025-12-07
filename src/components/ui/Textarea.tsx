import React, { forwardRef } from 'react'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  variant?: 'sidebar' | 'target'
  resize?: 'none' | 'vertical' | 'horizontal' | 'both'
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      variant = 'sidebar',
      resize = 'none',
      className = '',
      style = {},
      ...props
    },
    ref
  ) => {
    const getTextareaStyles = (): React.CSSProperties => {
      switch (variant) {
        case 'sidebar':
          return {
            width: '100%',
            backgroundColor: 'var(--bg-sidebar-input)',
            border: '1px solid #444',
            borderRadius: '8px',
            padding: '12px',
            paddingRight: '40px',
            color: '#fff',
            resize,
            height: '96px',
            fontFamily: 'inherit',
            boxSizing: 'border-box',
            outline: 'none',
            display: 'block',
            ...style,
          }
        case 'target':
          return {
            width: '100%',
            padding: '16px',
            paddingRight: '50px',
            borderRadius: '12px',
            border: '1px solid #ccc',
            resize,
            height: '56px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
            fontFamily: 'inherit',
            fontSize: '1rem',
            boxSizing: 'border-box',
            backgroundColor: '#f0f4f9',
            color: '#333',
            display: 'block',
            ...style,
          }
        default:
          return {
            width: '100%',
            border: '1px solid #ccc',
            borderRadius: '4px',
            padding: '8px',
            resize,
            fontFamily: 'inherit',
            fontSize: '0.9rem',
            boxSizing: 'border-box',
            outline: 'none',
            display: 'block',
            ...style,
          }
      }
    }

    return (
      <textarea
        ref={ref}
        className={`textarea ${className}`}
        style={getTextareaStyles()}
        {...props}
      />
    )
  }
)

Textarea.displayName = 'Textarea'

export default Textarea
