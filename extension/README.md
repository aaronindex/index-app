# INDEX Quick Capture (Alpha)

Chrome extension skeleton for sending selected text to the INDEX capture page. Alpha / unpacked install only.

## Behavior

1. User selects text on any page and clicks the extension icon.
2. Extension reads selection, page URL, and title from the active tab.
3. If selection is empty or whitespace, nothing happens.
4. A new tab opens to your INDEX site at `/capture/quick`.
5. After the tab loads, the extension injects a script that sends the payload via `window.postMessage` (same origin) with a short retry so the capture page has time to mount.

## Pre-built zips (dev / prod)

Run `./extension/build-zips.sh` from the repo root to create:

- `extension/extension-dev.zip` — configured for `https://index-dev-rho.vercel.app`
- `extension/extension-prod.zip` — configured for `https://indexapp.co`

To install: unzip the desired zip, then in Chrome go to `chrome://extensions` → Developer mode → Load unpacked → select the extracted folder.

## Setup (manual / custom URL)

1. **Set your INDEX site URL**  
   Edit `background.js` and replace `YOUR_DOMAIN` in:
   ```js
   const SITE_URL = 'https://YOUR_DOMAIN';
   ```
   Use your actual INDEX host (e.g. `index-dev-rho.vercel.app`) with no trailing slash.

2. **Load unpacked**
   - Open `chrome://extensions`
   - Turn on **Developer mode**
   - Click **Load unpacked**
   - Select the `extension/` folder (this directory)

3. **Pin the extension** (optional)  
   Click the puzzle icon in the toolbar and pin "INDEX Quick Capture (Alpha)" so the icon stays visible.

## Permissions

- **activeTab** — access to the current tab when the user clicks the icon (selection, URL, title).
- **scripting** — run a small script in the current tab to read selection and in the capture tab to send the payload.
- **host_permissions** — must include your INDEX site origin so the extension can inject the payload into the capture tab. The default manifest includes `index-dev-rho.vercel.app` and `indexapp.co`. If your INDEX URL is different, add it to `host_permissions` in `manifest.json` (e.g. `"https://your-index-domain.com/*"`).

No network, storage, or notifications. No auth or tokens; the capture page uses cookies.

## What you should see

After selecting text and clicking the extension, the new tab should show the **quick capture** page (`/capture/quick`) with a **"Captured text"** box containing a preview of your selection (first 300 characters) and the **Save** button enabled. If you see "No content received yet" and Save stays disabled, the payload did not reach the page—check that `SITE_URL` in `background.js` matches your INDEX URL and that your INDEX origin is listed in `host_permissions`.

## Icons (optional)

The manifest does not include icons. To add them later, place 16×16, 32×32, 48×48, and 128×128 PNGs in this folder and add an `"icons"` key to `manifest.json`.

## Constraints

- No payload is sent via URL query params.
- No network calls from the extension.
- Empty selection: extension does nothing (no tab open, no notification).
