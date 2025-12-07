/**
 * Context API Module
 * Central export point for all context providers and hooks
 */

// Context Providers
export { AppProvider, useAppState } from './AppContext'
export { ChatProvider, useChatState } from './ChatContext'
export { SettingsProvider, useSettings } from './SettingsContext'

// Specialized selectors
export {
  useAppProcessing,
  useAppPendingPrompt,
  useAppError,
  useAppTheme,
} from './AppContext'

export {
  useSidebarChat,
  useTargetChat,
  useOptimisationHistory,
} from './ChatContext'

export {
  useAPISettings,
  useUISettings,
  useChatSettings,
  useOptimizationSettings,
  usePrivacySettings,
} from './SettingsContext'

// Default exports
export { default as AppContext } from './AppContext'
export { default as ChatContext } from './ChatContext'
export { default as SettingsContext } from './SettingsContext'

// Combined Provider for convenience
import React, { ReactNode } from 'react'

import { AppProvider } from './AppContext'
import { ChatProvider } from './ChatContext'
import { SettingsProvider } from './SettingsContext'

interface CombinedProvidersProps {
  children: ReactNode
}

export const CombinedProviders: React.FC<CombinedProvidersProps> = ({
  children,
}) => {
  return React.createElement(
    SettingsProvider,
    null,
    React.createElement(
      AppProvider,
      null,
      React.createElement(ChatProvider, null, children)
    )
  )
}

export default CombinedProviders
