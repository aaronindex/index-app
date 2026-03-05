// INDEX Quick Capture (Alpha) — MV3 service worker
// Set your INDEX site URL for alpha (no trailing slash).
const SITE_URL = 'https://YOUR_DOMAIN';

const CAPTURE_PATH = '/capture/quick';
const CAPTURE_URL = `${SITE_URL}${CAPTURE_PATH}`;

const SEND_RETRIES = 15;
const SEND_DELAY_MS = 400;
const LISTENER_TIMEOUT_MS = 2 * 60 * 1000;

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab?.id) return;

  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      const selectionText = (window.getSelection()?.toString() || '').trim();
      const pageUrl = location.href;
      const pageTitle = document.title;
      return { selectionText, pageUrl, pageTitle };
    },
  }).catch(() => [{ result: null }]);

  if (!result?.selectionText) {
    return;
  }

  const payload = {
    text: result.selectionText,
    url: result.pageUrl,
    title: result.pageTitle,
  };

  const newTab = await chrome.tabs.create({ url: CAPTURE_URL, active: true });
  if (!newTab?.id) return;

  const timeoutId = setTimeout(() => {
    chrome.tabs.onUpdated.removeListener(listener);
  }, LISTENER_TIMEOUT_MS);

  const listener = async (tabId, changeInfo) => {
    if (tabId !== newTab.id || changeInfo.status !== 'complete') return;
    const t = await chrome.tabs.get(tabId).catch(() => null);
    if (!t?.url || !t.url.startsWith(CAPTURE_URL)) return;

    clearTimeout(timeoutId);
    chrome.tabs.onUpdated.removeListener(listener);

    chrome.scripting.executeScript({
      target: { tabId: newTab.id },
      func: (text, url, title, retries, delayMs) => {
        const data = { text, url, title };
        let count = 0;
        function send() {
          if (count >= retries) return;
          window.postMessage(data, window.location.origin);
          count += 1;
          if (count < retries) setTimeout(send, delayMs);
        }
        send();
      },
      args: [
        payload.text,
        payload.url ?? undefined,
        payload.title ?? undefined,
        SEND_RETRIES,
        SEND_DELAY_MS,
      ],
    }).catch(() => {});
  };

  chrome.tabs.onUpdated.addListener(listener);
});
