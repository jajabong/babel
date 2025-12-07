import React, { useState } from 'react'

export interface CopyButtonProps {
  text: string
  className?: string
}

export const CopyButton: React.FC<CopyButtonProps> = ({
  text,
  className = '',
}) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className={`copy-button ${className}`}
      style={{
        position: 'absolute',
        top: '8px',
        right: '8px',
        background: 'rgba(255,255,255,0.1)',
        border: 'none',
        borderRadius: '4px',
        padding: '4px 8px',
        color: '#ccc',
        cursor: 'pointer',
        fontSize: '0.75rem',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        transition: 'background 0.2s',
        zIndex: 5,
      }}
      onMouseEnter={e =>
        (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')
      }
      onMouseLeave={e =>
        (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')
      }
    >
      <i className={`fa-solid ${copied ? 'fa-check' : 'fa-copy'}`}></i>
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

export default CopyButton
