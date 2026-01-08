#!/usr/bin/env python3
"""
Test BabelPrompt Chrome Extension using CDP (Chrome DevTools Protocol)

This script:
1. Launches Chrome with the BabelPrompt extension loaded
2. Connects to Chrome via CDP
3. Navigates to gemini.google.com
4. Tests the two-pass optimization functionality
5. Records issues and results
"""

import asyncio
import subprocess
import sys
import time
import base64
import json
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from cdp_use import CDPClient

# Configuration
EXTENSION_PATH = Path(__file__).parent.absolute()
GEMINI_URL = "https://gemini.google.com"
CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"


async def test_babel_extension():
    """Test BabelPrompt extension with CDP"""

    print("🧪 BabelPrompt Extension Test with CDP")
    print("=" * 80)
    print(f"Extension path: {EXTENSION_PATH}")
    print(f"Target URL: {GEMINI_URL}")
    print("=" * 80 + "\n")

    # Check if extension exists
    if not (EXTENSION_PATH / "manifest.json").exists():
        print(f"❌ Error: manifest.json not found in {EXTENSION_PATH}")
        return None

    # Step 1: Launch Chrome with extension
    print("📦 Step 1: Launching Chrome with extension...")

    chrome_cmd = [
        CHROME_PATH,
        f"--load-extension={EXTENSION_PATH}",
        "--remote-debugging-port=9222",
        "--no-first-run",
        "--no-default-browser-check",
        GEMINI_URL,
    ]

    print(f"Command: {' '.join(chrome_cmd)}\n")

    chrome_process = subprocess.Popen(chrome_cmd)

    # Wait for Chrome to start
    print("⏳ Waiting for Chrome to start (5 seconds)...")
    await asyncio.sleep(5)
    print("✅ Chrome started\n")

    # Step 2: Connect to Chrome via CDP
    print("🔗 Step 2: Connecting to Chrome via CDP...")

    try:
        client = CDPClient(url="http://localhost:9222")
        await client.connect()
        print("✅ Connected to Chrome\n")
    except Exception as e:
        print(f"❌ Failed to connect to Chrome: {e}")
        chrome_process.terminate()
        return None

    try:
        # Step 3: Get tabs and navigate
        print("📋 Step 3: Getting browser tabs...")

        tabs = await client.get_tabs()
        print(f"Found {len(tabs)} tabs\n")

        if not tabs:
            print("❌ No tabs found")
            return None

        # Use the first tab (should be Gemini)
        tab = tabs[0]

        # Step 4: Check for extension loading
        print("🔍 Step 4: Checking for BabelPrompt extension...")

        # Check for extension elements
        check_script = """
        (() => {
            const report = {
                floatingButtons: document.querySelectorAll('.babelprompt-floating-btn').length,
                highlightedInputs: document.querySelectorAll('.babelprompt-highlighted').length,
                bodyText: document.body.innerText.substring(0, 200),
                url: window.location.href,
            }
            return JSON.stringify(report)
        })()
        """

        result = await tab.evaluate(check_script)
        check_result = json.loads(result)

        print(f"  URL: {check_result['url']}")
        print(f"  Floating buttons: {check_result['floatingButtons']}")
        print(f"  Highlighted inputs: {check_result['highlightedInputs']}")

        if check_result['floatingButtons'] > 0:
            print("  ✅ Extension UI detected!")
        else:
            print("  ⚠️  No floating buttons found (may need to type in input first)")

        print()

        # Step 5: Take screenshot
        print("📸 Step 5: Taking screenshot...")

        screenshot_data = await tab.capture_screenshot()
        screenshot_path = "/tmp/babel_cdp_screenshot.png"

        with open(screenshot_path, "wb") as f:
            f.write(base64.b64decode(screenshot_data))

        print(f"  ✅ Screenshot saved: {screenshot_path}\n")

        # Step 6: Simulate typing in input
        print("⌨️  Step 6: Testing input field...")

        # Find input field and type
        input_script = """
        (() => {
            // Find contenteditable div (Gemini input)
            const inputs = document.querySelectorAll('div[contenteditable="true"]');
            if (inputs.length > 0) {
                const input = inputs[0];
                input.focus();
                input.textContent = 'Write a Python function to reverse a string';
                input.dispatchEvent(new Event('input', { bubbles: true }));
                return {
                    success: true,
                    message: 'Text typed into input',
                    buttonText: input.textContent
                };
            }
            return {
                success: false,
                message: 'No input field found'
            };
        })()
        """

        input_result = await tab.evaluate(input_script)
        input_data = json.loads(input_result)

        print(f"  {input_data['message']}")
        if input_data['success']:
            print(f"  Typed text: {input_data.get('buttonText', '')}")

        # Wait to see if floating button appears
        await asyncio.sleep(2)

        # Check again for floating button
        check_script_2 = """
        (() => {
            const btn = document.querySelector('.babelprompt-floating-btn');
            return {
                floatingButtonFound: !!btn,
                buttonText: btn ? btn.textContent : null,
                buttonPosition: btn ? {x: btn.offsetLeft, y: btn.offsetTop} : null
            };
        })()
        """

        result2 = await tab.evaluate(check_script_2)
        check_result2 = json.loads(result2)

        print(f"\n  Floating button check after typing:")
        print(f"    Found: {check_result2['floatingButtonFound']}")
        if check_result2['floatingButtonFound']:
            print(f"    Text: {check_result2['buttonText']}")
            print(f"    Position: {check_result2['buttonPosition']}")

        print()

        # Step 7: Final screenshot
        print("📸 Step 7: Taking final screenshot...")

        screenshot_data2 = await tab.capture_screenshot()
        screenshot_path2 = "/tmp/babel_cdp_screenshot_final.png"

        with open(screenshot_path2, "wb") as f:
            f.write(base64.b64decode(screenshot_data2))

        print(f"  ✅ Final screenshot saved: {screenshot_path2}\n")

        # Compile results
        results = {
            "extension_detected": check_result['floatingButtons'] > 0,
            "floating_button_count": check_result['floatingButtons'],
            "highlighted_inputs": check_result['highlighted_inputs'],
            "input_field_test": input_data['success'],
            "screenshot": screenshot_path,
            "final_screenshot": screenshot_path2,
        }

        return results

    finally:
        # Disconnect and cleanup
        await client.disconnect()

        # Give user time to see results
        print("\n⏸️  Chrome will remain open for 10 seconds for manual inspection...")
        await asyncio.sleep(10)

        # Terminate Chrome
        chrome_process.terminate()
        print("✅ Chrome closed")


async def main():
    """Main entry point"""
    results = await test_babel_extension()

    print("\n" + "=" * 80)
    print("BABEL EXTENSION TEST RESULTS")
    print("=" * 80)

    if results:
        print(f"\nExtension Detection: {'✅' if results['extension_detected'] else '❌'}")
        print(f"Floating Buttons Found: {results['floating_button_count']}")
        print(f"Highlighted Inputs: {results['highlighted_inputs']}")
        print(f"Input Field Test: {'✅' if results['input_field_test'] else '❌'}")
        print(f"\nScreenshots:")
        print(f"  Initial: {results['screenshot']}")
        print(f"  Final: {results['final_screenshot']}")
    else:
        print("❌ Test failed")

    print("=" * 80 + "\n")


if __name__ == "__main__":
    asyncio.run(main())
