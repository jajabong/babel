import React, { useMemo } from 'react'

export interface ButtonProps {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: 'primary' | 'secondary' | 'ghost' | 'mode'
  size?: 'sm' | 'md' | 'lg'
  icon?: string
  className?: string
  style?: React.CSSProperties
  type?: 'button' | 'submit' | 'reset'
}

// Memoized style calculations for performance
const getVariantStyles = (
  variant: string,
  disabled: boolean
): React.CSSProperties => {
  const baseStyles: React.CSSProperties = {
    border: 'none',
    borderRadius: '6px',
    cursor: disabled ? 'default' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontSize: '0.8rem',
    fontWeight: 400,
    transition: 'all 0.2s',
  }

  switch (variant) {
    case 'primary':
      return {
        ...baseStyles,
        backgroundColor: disabled ? '#666' : 'var(--accent-color)',
        color: '#fff',
      }
    case 'secondary':
      return {
        ...baseStyles,
        backgroundColor: disabled ? '#ddd' : '#007bff',
        color: '#fff',
      }
    case 'ghost':
      return {
        ...baseStyles,
        backgroundColor: 'transparent',
        color: disabled ? '#666' : '#888',
        padding: '8px',
        borderRadius: '50%',
      }
    case 'mode':
      return {
        ...baseStyles,
        backgroundColor: 'var(--bg-sidebar-input)',
        border: '1px solid transparent',
        color: '#fff',
        padding: '10px',
      }
    default:
      return baseStyles
  }
}

const getSizeStyles = (size: string): React.CSSProperties => {
  switch (size) {
    case 'sm':
      return { padding: '4px 8px', fontSize: '0.75rem' }
    case 'md':
      return { padding: '8px 16px', fontSize: '0.8rem' }
    case 'lg':
      return { padding: '12px 24px', fontSize: '1rem' }
    default:
      return {}
  }
}

export const Button: React.FC<ButtonProps> = React.memo(
  ({
    children,
    onClick,
    disabled = false,
    variant = 'primary',
    size = 'md',
    icon,
    className = '',
    style = {},
    type = 'button',
  }) => {
    // Memoize the combined styles to prevent recalculations
    const buttonStyles = useMemo(
      () => ({
        ...getVariantStyles(variant, disabled),
        ...getSizeStyles(size),
        ...style,
      }),
      [variant, disabled, size, style]
    )

    return (
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={`button ${className}`}
        style={buttonStyles}
      >
        {icon && <i className={`fa-solid ${icon}`}></i>}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export default Button
