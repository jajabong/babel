import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

import { LoadingSpinner } from '../LoadingSpinner'

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

describe('LoadingSpinner', () => {
  it('renders default spinner', () => {
    const { container } = render(<LoadingSpinner />)

    const spinner = container.querySelector('.fa-circle-notch')
    expect(spinner).toBeInTheDocument()
    expect(spinner).toHaveClass('fa-spin')
  })

  it('renders with custom text', () => {
    render(<LoadingSpinner text='Loading...' />)

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('renders analyzing variant', () => {
    const { container } = render(
      <LoadingSpinner variant='analyzing' text='Analyzing & Optimizing...' />
    )

    const spinner = container.querySelector('.fa-circle-notch')
    expect(spinner).toBeInTheDocument()
    expect(screen.getByText('Analyzing & Optimizing...')).toBeInTheDocument()
  })

  it('renders gemini variant', () => {
    render(<LoadingSpinner variant='gemini' text='Thinking...' />)

    const geminiImage = screen.getByAltText('Gemini')
    expect(geminiImage).toBeInTheDocument()
    expect(geminiImage).toHaveClass('fa-spin')
    expect(screen.getByText('Thinking...')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(<LoadingSpinner className='custom-spinner' />)

    const spinnerContainer = container.querySelector('.loading-spinner')
    expect(spinnerContainer).toHaveClass('custom-spinner')
  })

  it('renders different sizes', () => {
    const { container, rerender } = render(<LoadingSpinner size='sm' />)
    expect(container.querySelector('.fa-circle-notch')).toBeInTheDocument()

    rerender(<LoadingSpinner size='md' />)
    expect(container.querySelector('.fa-circle-notch')).toBeInTheDocument()

    rerender(<LoadingSpinner size='lg' />)
    expect(container.querySelector('.fa-circle-notch')).toBeInTheDocument()
  })

  it('gemini variant has correct animation duration', () => {
    const { container } = render(<LoadingSpinner variant='gemini' />)

    const geminiImage = container.querySelector('img[alt="Gemini"]')
    expect(geminiImage).toHaveStyle('animation-duration: 3s')
  })
})
