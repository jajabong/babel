// Background service worker for BabelPrompt v4.0
// Handles Side Panel and extension lifecycle

;(function() {
  'use strict'

  console.log('BabelPrompt: Background service worker loading...')

  // Check if chrome API is available
  if (typeof chrome === 'undefined') {
    console.error('BabelPrompt: chrome API not available')
    return
  }

  // Set up Side Panel to open automatically when clicking extension icon
  chrome.runtime.onInstalled.addListener(async () => {
    console.log('BabelPrompt: Extension installed')

    // Configure side panel to open on icon click
    if (chrome.sidePanel?.setPanelBehavior) {
      try {
        await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
        console.log('BabelPrompt: Side panel configured to open on icon click')
      } catch (error) {
        console.error('BabelPrompt: Failed to set panel behavior:', error)
      }
    }
  })

  // Fallback: Handle icon click manually (for older Chrome versions)
  if (chrome.action?.onClicked) {
    chrome.action.onClicked.addListener(async (tab) => {
      console.log('BabelPrompt: Icon clicked')

      try {
        // Open Side Panel for the current window
        if (chrome.sidePanel?.open) {
          await chrome.sidePanel.open({ windowId: tab.windowId })
          console.log('BabelPrompt: Side panel opened')
        }
      } catch (error) {
        console.error('BabelPrompt: Failed to open side panel:', error)
      }
    })
  }

  // Handle messages from content scripts and side panel
  if (chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      const messageType = message?.type || 'undefined'
      console.log('BabelPrompt: Received message:', messageType)

      // Handle PING/PONG for testing
      if (messageType === 'PING') {
        sendResponse({ success: true, pong: true })
        return true
      }

      // Handle TEST_CONNECTION
      if (messageType === 'TEST_CONNECTION') {
        sendResponse({
          success: true,
          message: 'BabelPrompt v4.0 is working!'
        })
        return true
      }

      // Handle OPEN_SIDEBAR (manual trigger)
      if (messageType === 'OPEN_SIDEBAR') {
        chrome.sidePanel.open().then(() => {
          sendResponse({ success: true })
        }).catch(err => {
          sendResponse({ success: false, error: err.message })
        })
        return true
      }

      // Default response
      sendResponse({
        success: false,
        error: 'Unknown message type: ' + messageType
      })

      return false
    })
  }

  console.log('BabelPrompt: Background service worker initialized')
})()
