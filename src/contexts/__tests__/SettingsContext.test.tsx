import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import {
  SettingsProvider,
  useSettings,
  useAPISettings,
  useChatSettings,
} from '../SettingsContext'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn(key => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value
    }),
    removeItem: vi.fn(key => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Test component that uses the hook
const TestComponent = () => {
  const { settings, actions, status } = useSettings()
  const apiSettings = useAPISettings()
  const chatSettings = useChatSettings()

  return (
    <div>
      {/* Settings display */}
      <div data-testid='api-key'>{settings.apiKey || 'empty'}</div>
      <div data-testid='temperature'>{settings.temperature}</div>
      <div data-testid='model'>{settings.model}</div>
      <div data-testid='theme'>{settings.theme}</div>
      <div data-testid='selected-mode'>{settings.selectedMode}</div>
      <div data-testid='auto-scroll'>{settings.autoScroll.toString()}</div>
      <div data-testid='output-format'>{settings.outputFormat}</div>
      <div data-testid='privacy-mode'>{settings.privacyMode.toString()}</div>

      {/* API Settings display */}
      <div data-testid='api-settings-temperature'>
        {apiSettings.temperature}
      </div>

      {/* Chat Settings display */}
      <div data-testid='chat-settings-selected-mode'>
        {chatSettings.selectedMode}
      </div>

      {/* Status display */}
      <div data-testid='is-loading'>{status.isLoading.toString()}</div>
      <div data-testid='is-saving'>{status.isSaving.toString()}</div>
      <div data-testid='error'>{status.error || 'no-error'}</div>

      {/* Action buttons */}
      <button
        onClick={() => actions.setApiKey('test-api-key')}
        data-testid='set-api-key'
      >
        Set API Key
      </button>

      <button
        onClick={() => actions.setTemperature(0.8)}
        data-testid='set-temperature'
      >
        Set Temperature
      </button>

      <button onClick={() => actions.setModel('gpt-4')} data-testid='set-model'>
        Set Model
      </button>

      <button onClick={() => actions.setTheme('light')} data-testid='set-theme'>
        Set Theme
      </button>

      <button
        onClick={() => actions.setSelectedMode('CODING')}
        data-testid='set-selected-mode'
      >
        Set Mode
      </button>

      <button
        onClick={() => actions.setAutoScroll(false)}
        data-testid='set-auto-scroll'
      >
        Set Auto Scroll
      </button>

      <button
        onClick={() => actions.setOutputFormat('json')}
        data-testid='set-output-format'
      >
        Set Output Format
      </button>

      <button
        onClick={() => actions.setPrivacyMode(false)}
        data-testid='set-privacy-mode'
      >
        Set Privacy Mode
      </button>

      <button onClick={actions.resetSettings} data-testid='reset-settings'>
        Reset Settings
      </button>

      <button
        onClick={() => {
          const exported = actions.exportSettings()
          navigator.clipboard.writeText(exported)
        }}
        data-testid='export-settings'
      >
        Export Settings
      </button>

      <button
        onClick={() => {
          const imported = JSON.stringify({ apiKey: 'imported-key' })
          actions.importSettings(imported)
        }}
        data-testid='import-settings'
      >
        Import Settings
      </button>
    </div>
  )
}

const renderWithProvider = (component: React.ReactElement) => {
  return render(<SettingsProvider>{component}</SettingsProvider>)
}

describe('SettingsContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
  })

  describe('SettingsProvider', () => {
    it('provides initial default values', async () => {
      renderWithProvider(<TestComponent />)

      await waitFor(() => {
        expect(screen.getByTestId('is-loading')).toHaveTextContent('false')
      })

      // Check default values
      expect(screen.getByTestId('api-key')).toHaveTextContent(
        process.env.API_KEY || 'empty'
      )
      expect(screen.getByTestId('temperature')).toHaveTextContent('0.7')
      expect(screen.getByTestId('model')).toHaveTextContent('gemini-2.5-flash')
      expect(screen.getByTestId('theme')).toHaveTextContent('dark')
      expect(screen.getByTestId('selected-mode')).toHaveTextContent('GENERAL')
      expect(screen.getByTestId('auto-scroll')).toHaveTextContent('true')
      expect(screen.getByTestId('output-format')).toHaveTextContent('markdown')
      expect(screen.getByTestId('privacy-mode')).toHaveTextContent('true')
    })

    it('throws error when useSettings is used outside provider', () => {
      expect(() => {
        render(<TestComponent />)
      }).toThrow('useSettings must be used within a SettingsProvider')
    })

    it('loads settings from localStorage', async () => {
      // Set localStorage mock data
      const mockSettings = {
        apiKey: 'stored-key',
        temperature: 0.9,
        model: 'stored-model',
        theme: 'light',
        selectedMode: 'CODING',
        autoScroll: false,
        outputFormat: 'json',
        privacyMode: false,
      }
      localStorageMock.setItem(
        'babelprompt-settings',
        JSON.stringify(mockSettings)
      )

      renderWithProvider(<TestComponent />)

      await waitFor(() => {
        expect(screen.getByTestId('is-loading')).toHaveTextContent('false')
      })

      expect(screen.getByTestId('api-key')).toHaveTextContent('stored-key')
      expect(screen.getByTestId('temperature')).toHaveTextContent('0.9')
      expect(screen.getByTestId('model')).toHaveTextContent('stored-model')
      expect(screen.getByTestId('theme')).toHaveTextContent('light')
      expect(screen.getByTestId('selected-mode')).toHaveTextContent('CODING')
      expect(screen.getByTestId('auto-scroll')).toHaveTextContent('false')
      expect(screen.getByTestId('output-format')).toHaveTextContent('json')
      expect(screen.getByTestId('privacy-mode')).toHaveTextContent('false')
    })
  })

  describe('Settings Management', () => {
    it('updates API key correctly', async () => {
      renderWithProvider(<TestComponent />)

      await waitFor(() => {
        expect(screen.getByTestId('is-loading')).toHaveTextContent('false')
      })

      const setApiKeyButton = screen.getByTestId('set-api-key')

      await act(async () => {
        fireEvent.click(setApiKeyButton)
      })

      expect(screen.getByTestId('api-key')).toHaveTextContent('test-api-key')
    })

    it('updates temperature correctly', async () => {
      renderWithProvider(<TestComponent />)

      await waitFor(() => {
        expect(screen.getByTestId('is-loading')).toHaveTextContent('false')
      })

      const setTemperatureButton = screen.getByTestId('set-temperature')

      expect(screen.getByTestId('temperature')).toHaveTextContent('0.7')

      await act(async () => {
        fireEvent.click(setTemperatureButton)
      })

      expect(screen.getByTestId('temperature')).toHaveTextContent('0.8')
      expect(screen.getByTestId('api-settings-temperature')).toHaveTextContent(
        '0.8'
      )
    })

    it('updates model correctly', async () => {
      renderWithProvider(<TestComponent />)

      await waitFor(() => {
        expect(screen.getByTestId('is-loading')).toHaveTextContent('false')
      })

      const setModelButton = screen.getByTestId('set-model')

      await act(async () => {
        fireEvent.click(setModelButton)
      })

      expect(screen.getByTestId('model')).toHaveTextContent('gpt-4')
    })

    it('updates theme correctly', async () => {
      renderWithProvider(<TestComponent />)

      await waitFor(() => {
        expect(screen.getByTestId('is-loading')).toHaveTextContent('false')
      })

      const setThemeButton = screen.getByTestId('set-theme')

      expect(screen.getByTestId('theme')).toHaveTextContent('dark')

      await act(async () => {
        fireEvent.click(setThemeButton)
      })

      expect(screen.getByTestId('theme')).toHaveTextContent('light')
    })

    it('updates selected mode correctly', async () => {
      renderWithProvider(<TestComponent />)

      await waitFor(() => {
        expect(screen.getByTestId('is-loading')).toHaveTextContent('false')
      })

      const setSelectedModeButton = screen.getByTestId('set-selected-mode')

      expect(screen.getByTestId('selected-mode')).toHaveTextContent('GENERAL')

      await act(async () => {
        fireEvent.click(setSelectedModeButton)
      })

      expect(screen.getByTestId('selected-mode')).toHaveTextContent('CODING')
      expect(
        screen.getByTestId('chat-settings-selected-mode')
      ).toHaveTextContent('CODING')
    })

    it('updates boolean settings correctly', async () => {
      renderWithProvider(<TestComponent />)

      await waitFor(() => {
        expect(screen.getByTestId('is-loading')).toHaveTextContent('false')
      })

      // Test auto scroll
      expect(screen.getByTestId('auto-scroll')).toHaveTextContent('true')
      await act(async () => {
        fireEvent.click(screen.getByTestId('set-auto-scroll'))
      })
      expect(screen.getByTestId('auto-scroll')).toHaveTextContent('false')

      // Test privacy mode
      expect(screen.getByTestId('privacy-mode')).toHaveTextContent('true')
      await act(async () => {
        fireEvent.click(screen.getByTestId('set-privacy-mode'))
      })
      expect(screen.getByTestId('privacy-mode')).toHaveTextContent('false')
    })

    it('updates output format correctly', async () => {
      renderWithProvider(<TestComponent />)

      await waitFor(() => {
        expect(screen.getByTestId('is-loading')).toHaveTextContent('false')
      })

      const setOutputFormatButton = screen.getByTestId('set-output-format')

      expect(screen.getByTestId('output-format')).toHaveTextContent('markdown')

      await act(async () => {
        fireEvent.click(setOutputFormatButton)
      })

      expect(screen.getByTestId('output-format')).toHaveTextContent('json')
    })
  })

  describe('Settings Operations', () => {
    it('resets settings to default values', async () => {
      renderWithProvider(<TestComponent />)

      await waitFor(() => {
        expect(screen.getByTestId('is-loading')).toHaveTextContent('false')
      })

      // Change some values first
      await act(async () => {
        fireEvent.click(screen.getByTestId('set-api-key'))
        fireEvent.click(screen.getByTestId('set-temperature'))
        fireEvent.click(screen.getByTestId('set-theme'))
      })

      // Verify changes
      expect(screen.getByTestId('api-key')).toHaveTextContent('test-api-key')
      expect(screen.getByTestId('temperature')).toHaveTextContent('0.8')
      expect(screen.getByTestId('theme')).toHaveTextContent('light')

      // Reset and verify defaults
      await act(async () => {
        fireEvent.click(screen.getByTestId('reset-settings'))
      })

      expect(screen.getByTestId('api-key')).toHaveTextContent(
        process.env.API_KEY || 'empty'
      )
      expect(screen.getByTestId('temperature')).toHaveTextContent('0.7')
      expect(screen.getByTestId('theme')).toHaveTextContent('dark')
    })

    it('exports settings correctly', async () => {
      renderWithProvider(<TestComponent />)

      await waitFor(() => {
        expect(screen.getByTestId('is-loading')).toHaveTextContent('false')
      })

      const exportButton = screen.getByTestId('export-settings')

      // Test export function exists
      expect(exportButton).toBeInTheDocument()
    })

    it('imports settings correctly', async () => {
      renderWithProvider(<TestComponent />)

      await waitFor(() => {
        expect(screen.getByTestId('is-loading')).toHaveTextContent('false')
      })

      const importButton = screen.getByTestId('import-settings')

      // Test import function exists
      expect(importButton).toBeInTheDocument()
    })
  })

  describe('Specialized Hooks', () => {
    it('useAPISettings provides API-specific settings', async () => {
      renderWithProvider(<TestComponent />)

      await waitFor(() => {
        expect(
          screen.getByTestId('api-settings-temperature')
        ).toHaveTextContent('0.7')
      })
    })

    it('useChatSettings provides chat-specific settings', async () => {
      renderWithProvider(<TestComponent />)

      await waitFor(() => {
        expect(
          screen.getByTestId('chat-settings-selected-mode')
        ).toHaveTextContent('GENERAL')
      })
    })
  })

  describe('Performance Optimizations', () => {
    it('provides stable action references', async () => {
      let renderCount = 0

      const TestStableComponent = () => {
        renderCount++
        const { actions } = useSettings()

        return (
          <div>
            <div data-testid='render-count'>{renderCount}</div>
            <button
              onClick={() => actions.setTheme('light')}
              data-testid='change-theme'
            >
              Change Theme
            </button>
          </div>
        )
      }

      renderWithProvider(<TestStableComponent />)

      const initialCount = parseInt(
        screen.getByTestId('render-count').textContent || '0'
      )

      // Actions should be stable references
      await act(async () => {
        fireEvent.click(screen.getByTestId('change-theme'))
      })

      // Should not cause unnecessary re-renders
      expect(
        parseInt(screen.getByTestId('render-count').textContent || '0')
      ).toBe(initialCount + 1)
    })

    it('handles localStorage operations', async () => {
      renderWithProvider(<TestComponent />)

      await waitFor(() => {
        expect(screen.getByTestId('is-loading')).toHaveTextContent('false')
      })

      // Trigger a setting change
      await act(async () => {
        fireEvent.click(screen.getByTestId('set-temperature'))
      })

      // Should update the temperature value
      expect(screen.getByTestId('temperature')).toHaveTextContent('0.8')
    })
  })
})
