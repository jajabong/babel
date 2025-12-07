import React from 'react'

export interface LoadingSpinnerProps {
  text?: string
  variant?: 'default' | 'gemini' | 'analyzing'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  text,
  variant = 'default',
  size = 'md',
  className = '',
}) => {
  const getSpinnerStyles = (): React.CSSProperties => {
    switch (variant) {
      case 'analyzing':
        return {
          alignSelf: 'flex-start',
          padding: '10px',
          color: '#888',
          fontSize: '0.8rem',
        }
      case 'gemini':
        return {
          display: 'flex',
          gap: '20px',
        }
      case 'default':
      default:
        return {}
    }
  }

  const getIconClass = (): string => {
    switch (variant) {
      case 'analyzing':
        return 'fa-circle-notch fa-spin'
      case 'gemini':
        return 'fa-spin'
      default:
        return 'fa-circle-notch fa-spin'
    }
  }

  const getSizeStyles = (): React.CSSProperties => {
    switch (size) {
      case 'sm':
        return { fontSize: '0.75rem' }
      case 'md':
        return { fontSize: '1rem' }
      case 'lg':
        return { fontSize: '1.5rem' }
      default:
        return {}
    }
  }

  const getImageSize = (): { width: number; height: number } => {
    switch (size) {
      case 'sm':
        return { width: 24, height: 24 }
      case 'md':
        return { width: 32, height: 32 }
      case 'lg':
        return { width: 48, height: 48 }
      default:
        return { width: 32, height: 32 }
    }
  }

  return (
    <div className={`loading-spinner ${className}`} style={getSpinnerStyles()}>
      {variant === 'gemini' ? (
        <>
          <img
            src='https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg'
            width={getImageSize().width}
            height={getImageSize().height}
            alt='Gemini'
            className='fa-spin'
            style={{ animationDuration: '3s' }}
          />
          {text && (
            <div style={{ color: '#888', alignSelf: 'center' }}>{text}</div>
          )}
        </>
      ) : (
        <>
          <i
            className={`fa-solid ${getIconClass()}`}
            style={getSizeStyles()}
          ></i>
          {text && <span style={{ marginLeft: '8px' }}>{text}</span>}
        </>
      )}
    </div>
  )
}

export default LoadingSpinner
