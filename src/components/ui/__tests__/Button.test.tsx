import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { Button } from '../Button'

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

describe('Button', () => {
  it('renders with default props', () => {
    render(<Button>Click me</Button>)

    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
    expect(button).toHaveTextContent('Click me')
    expect(button).toHaveClass('button')
  })

  it('renders with icon', () => {
    const { container } = render(<Button icon='fa-user'>With Icon</Button>)

    const icon = container.querySelector('.fa-user')
    expect(icon).toBeInTheDocument()
    expect(screen.getByText('With Icon')).toBeInTheDocument()
  })

  it('applies disabled state', () => {
    render(<Button disabled>Disabled</Button>)

    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
  })

  it('handles click events', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click me</Button>)

    const button = screen.getByRole('button')
    button.click()
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('applies custom className', () => {
    render(<Button className='custom-class'>Custom</Button>)

    const button = screen.getByRole('button')
    expect(button).toHaveClass('button')
    expect(button).toHaveClass('custom-class')
  })

  it('renders different variants', () => {
    const { rerender } = render(<Button variant='primary'>Primary</Button>)
    expect(screen.getByRole('button')).toBeInTheDocument()

    rerender(<Button variant='secondary'>Secondary</Button>)
    expect(screen.getByRole('button')).toBeInTheDocument()

    rerender(<Button variant='ghost'>Ghost</Button>)
    expect(screen.getByRole('button')).toBeInTheDocument()

    rerender(<Button variant='mode'>Mode</Button>)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('renders different sizes', () => {
    const { rerender } = render(<Button size='sm'>Small</Button>)
    expect(screen.getByRole('button')).toBeInTheDocument()

    rerender(<Button size='md'>Medium</Button>)
    expect(screen.getByRole('button')).toBeInTheDocument()

    rerender(<Button size='lg'>Large</Button>)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('supports different button types', () => {
    render(<Button type='submit'>Submit</Button>)

    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('type', 'submit')
  })
})
