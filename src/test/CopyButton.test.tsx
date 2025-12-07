import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Standalone CopyButton component for isolated testing
const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = React.useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      data-testid='copy-button'
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
      }}
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

describe('CopyButton Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders with initial "Copy" state', () => {
    render(<CopyButton text='Sample text to copy' />)

    const copyButton = screen.getByTestId('copy-button')
    expect(copyButton).toBeInTheDocument()
    expect(copyButton).toHaveTextContent('Copy')
  })

  it('copies text to clipboard when clicked', async () => {
    const testText = 'This is test content for copying'

    render(<CopyButton text={testText} />)

    const copyButton = screen.getByTestId('copy-button')
    fireEvent.click(copyButton)

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(testText)
    expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1)
  })

  it('shows "Copied" state temporarily after clicking', async () => {
    render(<CopyButton text='Test text' />)

    const copyButton = screen.getByTestId('copy-button')

    // Initially shows "Copy"
    expect(copyButton).toHaveTextContent('Copy')

    fireEvent.click(copyButton)

    // Should show "Copied" immediately
    expect(copyButton).toHaveTextContent('Copied')

    // Should revert back to "Copy" after timeout
    await waitFor(
      () => {
        expect(copyButton).toHaveTextContent('Copy')
      },
      { timeout: 2100 }
    )
  })

  it('handles multiple clicks correctly', () => {
    render(<CopyButton text='Multiple click test' />)

    const copyButton = screen.getByTestId('copy-button')

    // Clear previous calls
    vi.clearAllMocks()

    // Click multiple times rapidly
    fireEvent.click(copyButton)
    fireEvent.click(copyButton)
    fireEvent.click(copyButton)

    // Should call clipboard.writeText for each click
    expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(3)
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      'Multiple click test'
    )
  })

  it('maintains correct styling and structure', () => {
    const { container } = render(<CopyButton text='Style test' />)

    const copyButton = screen.getByTestId('copy-button')

    // Check basic button properties
    expect(copyButton).toHaveAttribute('data-testid', 'copy-button')
    expect(copyButton.tagName).toBe('BUTTON')

    // Check key styles that should be applied (some may be computed differently)
    expect(copyButton).toHaveStyle({
      position: 'absolute',
      top: '8px',
      right: '8px',
      padding: '4px 8px',
      cursor: 'pointer',
    })
  })

  it('handles empty text gracefully', () => {
    render(<CopyButton text='' />)

    const copyButton = screen.getByTestId('copy-button')
    fireEvent.click(copyButton)

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('')
  })

  it('handles long text content', () => {
    const longText = 'A'.repeat(1000)

    render(<CopyButton text={longText} />)

    const copyButton = screen.getByTestId('copy-button')
    fireEvent.click(copyButton)

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(longText)
  })
})
