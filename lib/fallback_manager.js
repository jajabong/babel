/**
 * BabelPrompt Fallback Manager
 * Orchestrates the Three-Layer Fallback mechanism:
 * 1. Cloud/API (Premium)
 * 2. Browser/Web (Zero Cost)
 * 3. Local/On-Device (Privacy/Offline)
 */
class FallbackManager {
    constructor(promptEngine) {
        this.promptEngine = promptEngine;
    }

    /**
     * Main optimization method. Tries layers in order.
     * @param {string} userPrompt - User's raw input.
     * @param {string} mode - Selected mode.
     * @returns {Promise<{text: string, source: string}>} Optimized prompt and the source layer.
     */
    async optimize(userPrompt, mode) {
        const metaPrompt = this.promptEngine.getMetaPrompt(userPrompt, mode);
        let lastError = null;

        // Layer 1: API
        try {
            console.log('Attempting Layer 1: API...');
            const result = await this._tryLayer1(metaPrompt);
            return { text: result, source: 'API' };
        } catch (error) {
            console.warn('Layer 1 failed:', error);
            lastError = error;
        }

        // Layer 2: Web (Active Tab)
        try {
            console.log('Attempting Layer 2: Web...');
            const result = await this._tryLayer2(metaPrompt);
            return { text: result, source: 'Web' };
        } catch (error) {
            console.warn('Layer 2 failed:', error);
            lastError = error;
        }

        // Layer 3: Local (Chrome Built-in AI)
        try {
            console.log('Attempting Layer 3: Local...');
            const result = await this._tryLayer3(metaPrompt);
            return { text: result, source: 'Local' };
        } catch (error) {
            console.warn('Layer 3 failed:', error);
            lastError = error;
        }

        throw new Error(`All layers failed. Last error: ${lastError ? lastError.message : 'Unknown'}`);
    }

    /**
     * Layer 1: Call configured API (e.g., ZhipuAI/Anthropic/OpenAI)
     */
    async _tryLayer1(metaPrompt) {
        const config = await chrome.storage.sync.get(['zhipuApiKey', 'zhipuApiModel']);
        const apiKey = config.zhipuApiKey;
        const model = config.zhipuApiModel || 'claude-3-sonnet-20240229'; // Default or Zhipu model

        if (!apiKey) {
            throw new Error('API Key not configured');
        }

        // Using ZhipuAI/Anthropic proxy as per existing implementation
        // Note: In a real v4.0, this should be more generic. Keeping Zhipu for compatibility.
        const response = await fetch('https://open.bigmodel.cn/api/anthropic/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: model,
                max_tokens: 1000,
                temperature: 0.7,
                messages: [{ role: 'user', content: metaPrompt }]
            })
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data.content[0].text.trim();
    }

    /**
     * Layer 2: Use the active tab's LLM session via Content Script
     */
    async _tryLayer2(metaPrompt) {
        // 1. Get active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab || !tab.id) {
            throw new Error('No active tab found');
        }

        // 2. Check if tab is a supported LLM site (simple check)
        // In a full implementation, we'd check URL against a list.
        // For now, we assume the user is on a compatible page if they are using this layer.

        // 3. Send message to Content Script to perform "Ghost Typing" and get response
        return new Promise((resolve, reject) => {
            chrome.tabs.sendMessage(tab.id, {
                type: 'EXECUTE_GHOST_PROMPT',
                prompt: metaPrompt
            }, (response) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else if (response && response.success) {
                    resolve(response.result);
                } else {
                    reject(new Error(response ? response.error : 'Unknown Web Layer error'));
                }
            });
        });
    }

    /**
     * Layer 3: Chrome Built-in AI (window.ai)
     */
    async _tryLayer3(metaPrompt) {
        if (!window.ai) {
            throw new Error('Chrome Built-in AI not available (window.ai is undefined)');
        }

        try {
            const canCreate = await window.ai.canCreateTextSession();
            if (canCreate === 'no') {
                throw new Error('Chrome Built-in AI cannot create text session');
            }

            const session = await window.ai.createTextSession();
            const result = await session.prompt(metaPrompt);
            session.destroy();
            return result;
        } catch (e) {
            throw new Error(`Chrome Built-in AI error: ${e.message}`);
        }
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FallbackManager;
} else {
    window.FallbackManager = FallbackManager;
}
