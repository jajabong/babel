import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

import { MessageItem, Message } from '../MessageItem'

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

describe('MessageItem', () => {
  const mockUserMessage: Message = {
    role: 'user',
    text: 'Hello, how are you?',
  }

  const mockMasterMessage: Message = {
    role: 'master',
    text: 'I am doing well, thank you!',
  }

  const mockSystemMessage: Message = {
    role: 'system',
    text: '⚡ Auto-injecting into Gemini...',
  }

  const mockOptimizedPromptMessage: Message = {
    role: 'master',
    text: 'Act as an expert developer and create a React component...',
    isOptimizedPrompt: true,
  }

  const mockAiMessage: Message = {
    role: 'ai',
    text: 'I am Gemini, here to help you!',
  }

  it('renders sidebar user message', () => {
    render(
      <MessageItem message={mockUserMessage} index={0} variant='sidebar' />
    )

    expect(screen.getByText('Hello, how are you?')).toBeInTheDocument()
  })

  it('renders sidebar master message', () => {
    render(
      <MessageItem message={mockMasterMessage} index={0} variant='sidebar' />
    )

    expect(screen.getByText('I am doing well, thank you!')).toBeInTheDocument()
  })

  it('renders sidebar system message', () => {
    render(
      <MessageItem message={mockSystemMessage} index={0} variant='sidebar' />
    )

    expect(
      screen.getByText('⚡ Auto-injecting into Gemini...')
    ).toBeInTheDocument()
  })

  it('renders optimized prompt with copy button', () => {
    render(
      <MessageItem
        message={mockOptimizedPromptMessage}
        index={0}
        variant='sidebar'
      />
    )

    expect(
      screen.getByText(
        'Act as an expert developer and create a React component...'
      )
    ).toBeInTheDocument()
    expect(screen.getByText('Optimized Prompt')).toBeInTheDocument()
    expect(screen.getByText('Copy')).toBeInTheDocument()
  })

  it('renders target AI message with avatar', () => {
    render(
      <MessageItem
        message={mockAiMessage}
        index={0}
        variant='target'
        showAvatar={true}
      />
    )

    expect(screen.getByText('Gemini')).toBeInTheDocument()
    expect(
      screen.getByText('I am Gemini, here to help you!')
    ).toBeInTheDocument()
    expect(screen.getByAltText('Gemini')).toBeInTheDocument()
  })

  it('renders target user message with avatar', () => {
    const { container } = render(
      <MessageItem
        message={mockUserMessage}
        index={0}
        variant='target'
        showAvatar={true}
      />
    )

    expect(screen.getByText('You')).toBeInTheDocument()
    expect(screen.getByText('Hello, how are you?')).toBeInTheDocument()
    expect(container.querySelector('.fa-user')).toBeInTheDocument()
  })

  it('renders target message without avatar', () => {
    render(
      <MessageItem
        message={mockAiMessage}
        index={0}
        variant='target'
        showAvatar={false}
      />
    )

    expect(screen.getByText('Gemini')).toBeInTheDocument()
    expect(
      screen.getByText('I am Gemini, here to help you!')
    ).toBeInTheDocument()
    expect(screen.queryByAltText('Gemini')).not.toBeInTheDocument()
  })

  it('handles different message roles correctly', () => {
    const { rerender } = render(
      <MessageItem message={mockUserMessage} index={0} variant='target' />
    )
    expect(screen.getByText('You')).toBeInTheDocument()

    rerender(<MessageItem message={mockAiMessage} index={0} variant='target' />)
    expect(screen.getByText('Gemini')).toBeInTheDocument()
  })

  it('renders both user and AI messages in target variant', () => {
    const { container, rerender } = render(
      <MessageItem message={mockUserMessage} index={0} variant='target' />
    )

    // Check that user message renders correctly
    expect(screen.getByText('You')).toBeInTheDocument()
    expect(screen.getByText('Hello, how are you?')).toBeInTheDocument()
    expect(container.querySelector('.fa-user')).toBeInTheDocument()

    rerender(<MessageItem message={mockAiMessage} index={0} variant='target' />)

    // Check that AI message renders correctly
    expect(screen.getByText('Gemini')).toBeInTheDocument()
    expect(
      screen.getByText('I am Gemini, here to help you!')
    ).toBeInTheDocument()
    expect(screen.getByAltText('Gemini')).toBeInTheDocument()
  })
})
