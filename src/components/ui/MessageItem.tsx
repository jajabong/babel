import React from 'react'

import { CopyButton } from './CopyButton'

export interface Message {
  role: 'user' | 'master' | 'system' | 'ai'
  text: string
  isOptimizedPrompt?: boolean
}

export interface MessageItemProps {
  message: Message
  index: number
  variant?: 'sidebar' | 'target'
  showAvatar?: boolean
}

// Memoized message content components for performance
const SidebarMessage = React.memo(({ message }: { message: Message }) => {
  if (message.role === 'system') {
    return (
      <div
        style={{
          alignSelf: 'center',
          color: 'var(--accent-color)',
          fontSize: '0.8rem',
          fontWeight: 500,
          backgroundColor: 'rgba(16, 163, 127, 0.1)',
          padding: '4px 12px',
          borderRadius: '12px',
        }}
      >
        {message.text}
      </div>
    )
  }

  return (
    <div
      style={{
        alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
        maxWidth: '90%',
        backgroundColor:
          message.role === 'user'
            ? 'var(--user-msg-bg)'
            : 'var(--master-msg-bg)',
        padding: message.isOptimizedPrompt ? '0' : '12px 16px',
        borderRadius: '12px',
        fontSize: '0.9rem',
        lineHeight: '1.5',
        borderBottomRightRadius: message.role === 'user' ? '2px' : '12px',
        borderTopLeftRadius: message.role === 'master' ? '2px' : '12px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        position: 'relative',
        wordWrap: 'break-word',
        wordBreak: 'break-word',
        overflowWrap: 'anywhere',
      }}
    >
      {message.isOptimizedPrompt ? (
        <OptimizedPromptContent text={message.text} />
      ) : (
        message.text
      )}
    </div>
  )
})

SidebarMessage.displayName = 'SidebarMessage'

const OptimizedPromptContent = React.memo(({ text }: { text: string }) => (
  <div style={{ position: 'relative' }}>
    <div
      style={{
        padding: '8px 12px',
        background: 'rgba(0,0,0,0.2)',
        fontSize: '0.75rem',
        color: '#aaa',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <span>
        <i
          className='fa-solid fa-wand-magic-sparkles'
          style={{ marginRight: '6px' }}
        ></i>
        Optimized Prompt
      </span>
    </div>
    <CopyButton text={text} />
    <div
      style={{
        padding: '12px 16px',
        whiteSpace: 'pre-wrap',
        fontFamily: 'Consolas, monospace',
        fontSize: '0.85rem',
      }}
    >
      {text}
    </div>
  </div>
))

OptimizedPromptContent.displayName = 'OptimizedPromptContent'

const TargetMessage = React.memo(
  ({ message, showAvatar }: { message: Message; showAvatar: boolean }) => (
    <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
      {showAvatar && (
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: message.role === 'ai' ? 'transparent' : '#8e8ea0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            flexShrink: 0,
          }}
        >
          {message.role === 'ai' ? (
            <img
              src='https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg'
              width='32'
              height='32'
              alt='Gemini'
              loading='lazy'
            />
          ) : (
            <i className='fa-solid fa-user'></i>
          )}
        </div>
      )}
      <div style={{ flex: 1, maxWidth: '100%', minWidth: 0 }}>
        <div style={{ fontWeight: 600, marginBottom: '5px', color: '#333' }}>
          {message.role === 'ai' ? 'Gemini' : 'You'}
        </div>
        <div
          style={{
            lineHeight: '1.6',
            color: '#333',
            whiteSpace: 'pre-wrap',
            backgroundColor:
              message.role === 'user' ? '#f0f0f0' : 'transparent',
            padding: message.role === 'user' ? '15px' : '0',
            borderRadius: '8px',
            overflowWrap: 'break-word',
          }}
        >
          {message.text}
        </div>
      </div>
    </div>
  )
)

TargetMessage.displayName = 'TargetMessage'

export const MessageItem: React.FC<MessageItemProps> = React.memo(
  ({ message, index, variant = 'sidebar', showAvatar = true }) => {
    return (
      <div key={index}>
        {variant === 'sidebar' ? (
          <SidebarMessage message={message} />
        ) : (
          <TargetMessage message={message} showAvatar={showAvatar} />
        )}
      </div>
    )
  }
)

MessageItem.displayName = 'MessageItem'

export default MessageItem
