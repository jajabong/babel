import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { CopyButton } from '../CopyButton'

// Custom matcher for class names
expect.extend({
  toHaveClass(received: HTMLElement, className: string) {
    const pass = received.classList.contains(className)
    return {
      message: () =>
        `expected element ${pass ? 'not ' : ''}to have class "${className}"`,
      pass,
    }
  },
})

// Mock navigator.clipboard
const mockWriteText = vi.fn()
Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText,
  },
})

describe('CopyButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders copy button with initial state', () => {
    const { container } = render(<CopyButton text='Test text' />)

    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
    expect(screen.getByText('Copy')).toBeInTheDocument()
    expect(container.querySelector('.fa-copy')).toBeInTheDocument()
  })

  it('copies text to clipboard when clicked', async () => {
    render(<CopyButton text='Test text' />)

    const button = screen.getByRole('button')
    fireEvent.click(button)

    expect(mockWriteText).toHaveBeenCalledWith('Test text')
  })

  it('shows copied state after clicking', async () => {
    const { container } = render(<CopyButton text='Test text' />)

    const button = screen.getByRole('button')
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText('Copied')).toBeInTheDocument()
      expect(container.querySelector('.fa-check')).toBeInTheDocument()
    })
  })

  it('reverts to original state after 2 seconds', () => {
    vi.useFakeTimers()
    const { container } = render(<CopyButton text='Test text' />)

    const button = screen.getByRole('button')

    act(() => {
      fireEvent.click(button)
    })

    // Check initial state change
    expect(screen.getByText('Copied')).toBeInTheDocument()
    expect(container.querySelector('.fa-check')).toBeInTheDocument()

    // Fast forward time
    act(() => {
      vi.advanceTimersByTime(2000)
    })

    // Should revert back
    expect(screen.getByText('Copy')).toBeInTheDocument()
    expect(container.querySelector('.fa-copy')).toBeInTheDocument()

    vi.useRealTimers()
  })

  it('applies custom className', () => {
    render(<CopyButton text='Test text' className='custom-class' />)

    const button = screen.getByRole('button')
    expect(button).toHaveClass('copy-button')
    expect(button).toHaveClass('custom-class')
  })
})
