import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useMemo,
  useEffect,
  ReactNode,
} from 'react'

import { useLocalStorage } from '../hooks/useLocalStorage'
import type { OptimizationMode } from '../services'

// Settings Interfaces
export interface UserSettings {
  // API Settings
  apiKey: string
  temperature: number
  model: string

  // UI Settings
  theme: 'light' | 'dark' | 'auto'
  language: string
  fontSize: 'small' | 'medium' | 'large'

  // Chat Settings
  selectedMode: OptimizationMode
  autoScroll: boolean
  showTimestamps: boolean
  maxMessages: number

  // Optimization Settings
  outputFormat: 'markdown' | 'plain' | 'json'
  enableAutoOptimization: boolean
  showOptimizationSteps: boolean

  // Privacy Settings
  privacyMode: boolean
  saveChatHistory: boolean
  analyticsEnabled: boolean

  // Advanced Settings
  enableDebugMode: boolean
  customPrompts: Record<string, string>
  shortcutsEnabled: boolean
}

export interface SettingsContextType {
  settings: UserSettings
  actions: {
    // API Settings
    setApiKey: (apiKey: string) => void
    setTemperature: (temperature: number) => void
    setModel: (model: string) => void

    // UI Settings
    setTheme: (theme: 'light' | 'dark' | 'auto') => void
    setLanguage: (language: string) => void
    setFontSize: (fontSize: 'small' | 'medium' | 'large') => void

    // Chat Settings
    setSelectedMode: (mode: OptimizationMode) => void
    setAutoScroll: (autoScroll: boolean) => void
    setShowTimestamps: (showTimestamps: boolean) => void
    setMaxMessages: (maxMessages: number) => void

    // Optimization Settings
    setOutputFormat: (format: 'markdown' | 'plain' | 'json') => void
    setEnableAutoOptimization: (enabled: boolean) => void
    setShowOptimizationSteps: (show: boolean) => void

    // Privacy Settings
    setPrivacyMode: (enabled: boolean) => void
    setSaveChatHistory: (save: boolean) => void
    setAnalyticsEnabled: (enabled: boolean) => void

    // Advanced Settings
    setEnableDebugMode: (enabled: boolean) => void
    setCustomPrompt: (key: string, prompt: string) => void
    removeCustomPrompt: (key: string) => void
    setShortcutsEnabled: (enabled: boolean) => void

    // Bulk operations
    updateSettings: (updates: Partial<UserSettings>) => void
    resetSettings: () => void
    exportSettings: () => string
    importSettings: (settingsJson: string) => boolean
  }
  status: {
    isLoading: boolean
    isSaving: boolean
    lastSaved: number | null
    error: string | null
  }
}

// Default settings
const defaultSettings: UserSettings = {
  // API Settings
  apiKey: process.env.API_KEY || '',
  temperature: 0.7,
  model: 'gemini-2.5-flash',

  // UI Settings
  theme: 'dark',
  language: 'en',
  fontSize: 'medium',

  // Chat Settings
  selectedMode: 'GENERAL',
  autoScroll: true,
  showTimestamps: false,
  maxMessages: 100,

  // Optimization Settings
  outputFormat: 'markdown',
  enableAutoOptimization: true,
  showOptimizationSteps: false,

  // Privacy Settings
  privacyMode: true,
  saveChatHistory: true,
  analyticsEnabled: false,

  // Advanced Settings
  enableDebugMode: false,
  customPrompts: {},
  shortcutsEnabled: true,
}

// LocalStorage hook for settings
const useSettingsStorage = () => {
  return useLocalStorage<UserSettings>({
    key: 'babelprompt-settings',
    defaultValue: defaultSettings,
  })
}

// Context
const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined
)

// Provider component
export const SettingsProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { value: settings, set: setSettings, isLoading } = useSettingsStorage()
  const [isSaving, setIsSaving] = React.useState(false)
  const [lastSaved, setLastSaved] = React.useState<number | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  // Update settings with error handling and loading state
  const updateSettings = useCallback(
    async (updates: Partial<UserSettings>) => {
      try {
        setIsSaving(true)
        setError(null)

        const newSettings = { ...settings, ...updates }
        setSettings(newSettings)
        setLastSaved(Date.now())
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save settings')
        console.error('Settings update error:', err)
      } finally {
        setIsSaving(false)
      }
    },
    [settings, setSettings]
  )

  // Individual setters wrapped in useCallback
  const actions = useMemo(
    () => ({
      // API Settings
      setApiKey: (apiKey: string) => updateSettings({ apiKey }),
      setTemperature: (temperature: number) => updateSettings({ temperature }),
      setModel: (model: string) => updateSettings({ model }),

      // UI Settings
      setTheme: (theme: 'light' | 'dark' | 'auto') => updateSettings({ theme }),
      setLanguage: (language: string) => updateSettings({ language }),
      setFontSize: (fontSize: 'small' | 'medium' | 'large') =>
        updateSettings({ fontSize }),

      // Chat Settings
      setSelectedMode: (mode: OptimizationMode) =>
        updateSettings({ selectedMode: mode }),
      setAutoScroll: (autoScroll: boolean) => updateSettings({ autoScroll }),
      setShowTimestamps: (showTimestamps: boolean) =>
        updateSettings({ showTimestamps }),
      setMaxMessages: (maxMessages: number) => updateSettings({ maxMessages }),

      // Optimization Settings
      setOutputFormat: (format: 'markdown' | 'plain' | 'json') =>
        updateSettings({ outputFormat: format }),
      setEnableAutoOptimization: (enabled: boolean) =>
        updateSettings({ enableAutoOptimization: enabled }),
      setShowOptimizationSteps: (show: boolean) =>
        updateSettings({ showOptimizationSteps: show }),

      // Privacy Settings
      setPrivacyMode: (enabled: boolean) =>
        updateSettings({ privacyMode: enabled }),
      setSaveChatHistory: (save: boolean) =>
        updateSettings({ saveChatHistory: save }),
      setAnalyticsEnabled: (enabled: boolean) =>
        updateSettings({ analyticsEnabled: enabled }),

      // Advanced Settings
      setEnableDebugMode: (enabled: boolean) =>
        updateSettings({ enableDebugMode: enabled }),
      setCustomPrompt: (key: string, prompt: string) =>
        updateSettings({
          customPrompts: { ...settings.customPrompts, [key]: prompt },
        }),
      removeCustomPrompt: (key: string) => {
        const newCustomPrompts = { ...settings.customPrompts }
        delete newCustomPrompts[key]
        updateSettings({ customPrompts: newCustomPrompts })
      },
      setShortcutsEnabled: (enabled: boolean) =>
        updateSettings({ shortcutsEnabled: enabled }),

      // Bulk operations
      updateSettings,
      resetSettings: () => updateSettings(defaultSettings),
      exportSettings: () => JSON.stringify(settings, null, 2),
      importSettings: (settingsJson: string): boolean => {
        try {
          const importedSettings = JSON.parse(settingsJson)
          updateSettings(importedSettings)
          return true
        } catch (err) {
          setError('Invalid settings format')
          return false
        }
      },
    }),
    [settings, updateSettings]
  )

  // Status object
  const status = useMemo(
    () => ({
      isLoading,
      isSaving,
      lastSaved,
      error,
    }),
    [isLoading, isSaving, lastSaved, error]
  )

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      settings,
      actions,
      status,
    }),
    [settings, actions, status]
  )

  // Validate settings on mount
  useEffect(() => {
    if (settings && !isLoading) {
      // Ensure required fields exist
      const validatedSettings = { ...defaultSettings, ...settings }
      if (JSON.stringify(validatedSettings) !== JSON.stringify(settings)) {
        updateSettings(validatedSettings)
      }
    }
  }, [settings, isLoading, updateSettings])

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  )
}

// Custom hook to consume context
export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}

// Selectors for specific settings (for performance optimization)
export const useAPISettings = () => {
  const { settings, actions } = useSettings()
  return {
    apiKey: settings.apiKey,
    temperature: settings.temperature,
    model: settings.model,
    setApiKey: actions.setApiKey,
    setTemperature: actions.setTemperature,
    setModel: actions.setModel,
  }
}

export const useUISettings = () => {
  const { settings, actions } = useSettings()
  return {
    theme: settings.theme,
    language: settings.language,
    fontSize: settings.fontSize,
    setTheme: actions.setTheme,
    setLanguage: actions.setLanguage,
    setFontSize: actions.setFontSize,
  }
}

export const useChatSettings = () => {
  const { settings, actions } = useSettings()
  return {
    selectedMode: settings.selectedMode,
    autoScroll: settings.autoScroll,
    showTimestamps: settings.showTimestamps,
    maxMessages: settings.maxMessages,
    setSelectedMode: actions.setSelectedMode,
    setAutoScroll: actions.setAutoScroll,
    setShowTimestamps: actions.setShowTimestamps,
    setMaxMessages: actions.setMaxMessages,
  }
}

export const useOptimizationSettings = () => {
  const { settings, actions } = useSettings()
  return {
    outputFormat: settings.outputFormat,
    enableAutoOptimization: settings.enableAutoOptimization,
    showOptimizationSteps: settings.showOptimizationSteps,
    setOutputFormat: actions.setOutputFormat,
    setEnableAutoOptimization: actions.setEnableAutoOptimization,
    setShowOptimizationSteps: actions.setShowOptimizationSteps,
  }
}

export const usePrivacySettings = () => {
  const { settings, actions } = useSettings()
  return {
    privacyMode: settings.privacyMode,
    saveChatHistory: settings.saveChatHistory,
    analyticsEnabled: settings.analyticsEnabled,
    setPrivacyMode: actions.setPrivacyMode,
    setSaveChatHistory: actions.setSaveChatHistory,
    setAnalyticsEnabled: actions.setAnalyticsEnabled,
  }
}

export default SettingsContext
