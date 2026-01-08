#!/usr/bin/env python3
"""
Manual Test Script for BabelPrompt Chrome Extension

This script provides a guided manual test for the extension without requiring browser-use.
It uses Playwright to launch Chrome with the extension and provides testing instructions.
"""

import asyncio
import subprocess
import sys
from pathlib import Path


def print_section(title: str):
    """Print a formatted section header"""
    print("\n" + "=" * 80)
    print(f"  {title}")
    print("=" * 80 + "\n")


def print_step(step_num: int, instruction: str):
    """Print a formatted test step"""
    print(f"Step {step_num}: {instruction}")


async def main():
    """Main entry point for manual testing"""

    EXTENSION_PATH = Path(__file__).parent.absolute()
    GEMINI_URL = "https://gemini.google.com"

    print_section("🧪 BabelPrompt Extension Manual Test")

    print(f"Extension Path: {EXTENSION_PATH}")
    print(f"Target URL: {GEMINI_URL}")

    # Check if extension exists
    if not (EXTENSION_PATH / "manifest.json").exists():
        print("❌ Error: manifest.json not found")
        return

    print_section("📋 Test Instructions")

    print("This script will launch Chrome with the BabelPrompt extension loaded.")
    print("Follow the steps below to test the extension:\n")

    print("Preparation:")
    print("1. Chrome will launch with the extension pre-loaded")
    print("2. Navigate to Gemini when prompted")
    print("3. Open Chrome DevTools (F12) to see extension logs")
    print("4. Look for the BabelPrompt floating button near input fields\n")

    print_section("🚀 Launching Chrome with Extension")

    # Chrome launch command with extension
    chrome_cmd = [
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        f"--load-extension={EXTENSION_PATH}",
        GEMINI_URL,
        "--auto-open-devtools-for-tabs"
    ]

    print(f"Running: {' '.join(chrome_cmd)}\n")

    try:
        # Launch Chrome
        process = subprocess.Popen(chrome_cmd)

        print_section("✅ Chrome Launched")

        print("Chrome should now be open with:")
        print("  ✓ BabelPrompt extension loaded")
        print("  ✓ DevTools panel open")
        print(f"  ✓ Navigated to {GEMINI_URL}")
        print("\n")

        print_section("📝 Manual Test Steps")

        print_step(1, "Check Console Logs")
        print("  - In DevTools Console tab, look for: 'BabelPrompt content script initialized'")
        print("  - If you see this, the extension is loaded correctly\n")

        print_step(2, "Locate Input Field")
        print("  - Find the main textarea on Gemini (contenteditable div)")
        print("  - Look for a blue highlight around the input field")
        print("  - This indicates BabelPrompt has detected the input\n")

        print_step(3, "Find Floating Button")
        print("  - Look for a floating button near the input field")
        print("  - It should have 'BabelPrompt' text or a 'B' icon\n")

        print_step(4, "Type Test Prompt")
        print('  - Type in the input: "Write a Python function to reverse a string"')
        print("  - The input field should still be highlighted\n")

        print_step(5, "Click BabelPrompt Button")
        print("  - Click the floating BabelPrompt button")
        print("  - Observe what happens next\n")

        print_section("🔍 Expected Behavior")

        print("When you click the BabelPrompt button:")
        print("  1. A meta-prompt should be injected into the input")
        print("  2. The meta-prompt asks the LLM to optimize the original prompt")
        print("  3. Gemini should respond with an optimized version")
        print("  4. The extension should extract the optimized prompt")
        print("  5. The extension should inject the optimized prompt (2nd pass)")
        print("  6. Gemini should respond to the optimized prompt\n")

        print_section("📊 Test Results Checklist")

        checklist = [
            ("Extension loaded", "[ ]"),
            ("Console logs visible", "[ ]"),
            ("Input field highlighted", "[ ]"),
            ("Floating button visible", "[ ]"),
            ("Button clickable", "[ ]"),
            ("Meta-prompt injected", "[ ]"),
            ("LLM responded to meta-prompt", "[ ]"),
            ("Optimized prompt extracted", "[ ]"),
            ("Second injection happened", "[ ]"),
            ("Final LLM response received", "[ ]"),
        ]

        for item, status in checklist:
            print(f"  {status} {item}")

        print("\n")

        print_section("🐛 Report Issues")

        print("If you encounter issues, note:")
        print("  - Which step failed")
        print("  - Error messages in Console")
        print("  - Screenshots of the issue")
        print("  - What you expected vs what happened\n")

        print_section("⌨️ Press Enter to Close Chrome")

        print("Once you've completed testing, press Enter to close Chrome...")
        input()

        # Terminate Chrome
        process.terminate()
        print("\n✅ Chrome closed. Test complete!")

    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
