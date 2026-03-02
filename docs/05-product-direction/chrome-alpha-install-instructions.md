Build Chrome extension skeleton for INDEX Quick Capture (Alpha / unpacked).

Requirements:
- No auth in extension.
- On user action (toolbar icon click), read current selection text from active tab.
- Open INDEX capture page: `https://<SITE_URL>/capture/quick`
- Hand off payload (selected text + optional page url/title) to that page WITHOUT using URL query params.
- Minimal permissions: activeTab + scripting (+ storage optional).

Implementation notes:
- Use chrome.scripting.executeScript to return:
  - selectionText = window.getSelection()?.toString() || ''
  - pageUrl = location.href
  - pageTitle = document.title
- If selectionText is empty, show a small notification/alert (or open capture page with a message “No selection”).
- After opening the capture page tab, send payload to it:
  - either via chrome.tabs.sendMessage with a content script in the capture-page tab,
  - or via chrome.runtime messaging + a lightweight content script that relays via window.postMessage.
- Keep it simple and deterministic. No background network calls.

Deliver:
- manifest.json (MV3)
- service worker (background) file
- any minimal scripts needed for message relay
- clear instructions for “Load unpacked”