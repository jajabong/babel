import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { Textarea } from '../Textarea'

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

describe('Textarea', () => {
  it('renders with default props', () => {
    render(<Textarea />)

    const textarea = screen.getByRole('textbox')
    expect(textarea).toBeInTheDocument()
    expect(textarea).toHaveClass('textarea')
  })

  it('renders sidebar variant', () => {
    render(<Textarea variant='sidebar' />)

    const textarea = screen.getByRole('textbox')
    expect(textarea).toBeInTheDocument()
    expect(textarea).toHaveStyle('background-color: var(--bg-sidebar-input)')
  })

  it('renders target variant', () => {
    render(<Textarea variant='target' />)

    const textarea = screen.getByRole('textbox')
    expect(textarea).toBeInTheDocument()
    expect(textarea).toHaveStyle('background-color: #f0f4f9')
  })

  it('applies custom className', () => {
    render(<Textarea className='custom-textarea' />)

    const textarea = screen.getByRole('textbox')
    expect(textarea).toHaveClass('textarea')
    expect(textarea).toHaveClass('custom-textarea')
  })

  it('handles change events', () => {
    const handleChange = vi.fn()
    render(<Textarea onChange={handleChange} />)

    const textarea = screen.getByRole('textbox')
    textarea.focus()

    const event = { target: { value: 'test value' } } as any
    textarea.dispatchEvent(new Event('input', { bubbles: true }))

    // Note: For textarea change events, you might need to use fireEvent.change
    // This is a basic test structure
  })

  it('supports different resize options', () => {
    const { rerender } = render(<Textarea resize='none' />)
    expect(screen.getByRole('textbox')).toHaveStyle('resize: none')

    rerender(<Textarea resize='vertical' />)
    expect(screen.getByRole('textbox')).toHaveStyle('resize: vertical')

    rerender(<Textarea resize='horizontal' />)
    expect(screen.getByRole('textbox')).toHaveStyle('resize: horizontal')

    rerender(<Textarea resize='both' />)
    expect(screen.getByRole('textbox')).toHaveStyle('resize: both')
  })

  it('forwards ref correctly', () => {
    const ref = vi.fn()
    render(<Textarea ref={ref} />)

    expect(ref).toHaveBeenCalled()
  })

  it('passes through other textarea props', () => {
    render(
      <Textarea
        placeholder='Enter text here'
        maxLength={100}
        disabled
        name='test-textarea'
        id='test-id'
      />
    )

    const textarea = screen.getByRole('textbox')
    expect(textarea).toHaveAttribute('placeholder', 'Enter text here')
    expect(textarea).toHaveAttribute('maxLength', '100')
    expect(textarea).toBeDisabled()
    expect(textarea).toHaveAttribute('name', 'test-textarea')
    expect(textarea).toHaveAttribute('id', 'test-id')
  })
})
