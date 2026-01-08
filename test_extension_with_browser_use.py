#!/usr/bin/env python3
"""
Test BabelPrompt Chrome Extension using browser-use

This script:
1. Launches Chrome with the BabelPrompt extension loaded
2. Navigates to gemini.google.com
3. Tests the two-pass optimization functionality
4. Records issues and results
"""

import asyncio
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from EVA's .env file
env_path = Path(__file__).parent.parent.parent / '.env'
if env_path.exists():
    load_dotenv(env_path)
    print(f"✅ Loaded environment from {env_path}")
else:
    print("⚠️  No .env file found")

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from browser_use import Agent, BrowserProfile

# Try to import available LLM providers
try:
    from browser_use.llm import ChatGoogle
    USE_GOOGLE = True
except ImportError:
    USE_GOOGLE = False

try:
    from browser_use.llm import ChatOpenAI
    USE_OPENAI = True
except ImportError:
    USE_OPENAI = False

# Configuration
EXTENSION_PATH = Path(__file__).parent.absolute()
GEMINI_URL = "https://gemini.google.com"


async def test_babel_extension():
    """Test BabelPrompt extension with browser-use"""

    # Configure browser profile to load the extension
    browser_profile = BrowserProfile(
        headless=False,  # Show browser for visual debugging
        args=[f"--load-extension={EXTENSION_PATH}"],
        # Disable headless to see extension UI
        devtools=True,  # Enable DevTools for debugging
    )

    # Initialize LLM for browser-use agent
    # Try Google first (Gemini), then fallback to OpenAI
    llm = None
    if USE_GOOGLE:
        try:
            llm = ChatGoogle(model="gemini-2.0-flash-exp")
            print("Using Google Gemini LLM")
        except Exception as e:
            print(f"Failed to initialize Google LLM: {e}")

    if not llm and USE_OPENAI:
        try:
            llm = ChatOpenAI(model="gpt-4o-mini")
            print("Using OpenAI LLM")
        except Exception as e:
            print(f"Failed to initialize OpenAI LLM: {e}")

    if not llm:
        raise RuntimeError("Failed to initialize any LLM provider")

    # Task for the agent
    task = f"""
    You are testing a Chrome extension called BabelPrompt that optimizes user prompts for AI chatbots.

    Follow these steps exactly:

    1. First, navigate to {GEMINI_URL}
    2. Wait for the page to fully load
    3. Check if the BabelPrompt extension is loaded by:
       - Looking for a floating button near the input field (it might say "BabelPrompt" or have a B icon)
       - Checking browser console for any BabelPrompt logs (press F12 and check console)
    4. Find the main input textarea on Gemini (it's a contenteditable div)
    5. Type this test prompt: "Write a Python function to reverse a string"
    6. Look for and click the BabelPrompt floating button
    7. Observe carefully what happens:
       - Does a meta-prompt get injected asking for optimization?
       - Does Gemini respond with an optimized prompt?
       - Does a second injection happen with the optimized prompt?
    8. Record everything you observe including:
       - Any floating buttons that appear
       - Any text that gets automatically injected
       - Any error messages in console
       - The timing of events

    Provide a detailed test report covering:
    ✓ Extension detection
    ✓ UI elements found
    ✓ Two-pass optimization behavior
    ✗ Any errors or failures
    - Suggestions for improvements
    """

    try:
        # Create agent with browser context
        agent = Agent(
            task=task,
            llm=llm,
            browser_profile=browser_profile,
        )

        # Run the agent
        result = await agent.run()

        print("\n" + "="*80)
        print("BABEL EXTENSION TEST RESULTS")
        print("="*80)
        print(result)
        print("="*80 + "\n")

        return result

    except Exception as e:
        print(f"\n❌ Error during testing: {e}")
        import traceback
        traceback.print_exc()
        return None


async def main():
    """Main entry point"""
    print("🧪 BabelPrompt Extension Test with browser-use")
    print("=" * 80)
    print(f"Extension path: {EXTENSION_PATH}")
    print(f"Target URL: {GEMINI_URL}")
    print("=" * 80 + "\n")

    # Check if extension exists
    if not (EXTENSION_PATH / "manifest.json").exists():
        print(f"❌ Error: manifest.json not found in {EXTENSION_PATH}")
        print("Please run this script from the babel extension directory.")
        return

    result = await test_babel_extension()

    if result:
        print("✅ Test completed")
    else:
        print("❌ Test failed")


if __name__ == "__main__":
    asyncio.run(main())
