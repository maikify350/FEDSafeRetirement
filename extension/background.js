/**
 * Act! CRM Copilot — Background Service Worker
 * Handles cross-origin API calls to the Act! proxy server
 * and manages credential storage.
 */

// ─── Message Handler ─────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

    switch (msg.type) {

        // ── API proxy call ───────────────────────────────
        case 'api_call': {
            const { method, path, headers, body } = msg;
            // All API calls route through the deployed Vercel endpoint — never localhost.
            const base = 'https://fedsafe-retirement.vercel.app';
            const url = `${base}${path}`;
            const opts = {
                method: method || 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    ...headers,
                },
            };
            if (body && !['GET', 'HEAD'].includes(method)) {
                opts.body = JSON.stringify(body);
            }

            fetch(url, opts)
                .then(async r => {
                    const text = await r.text();
                    // Try JSON — if the response is HTML (auth redirect, 404 page, etc.)
                    // return the status and a body preview so callers can diagnose the issue.
                    try {
                        const data = JSON.parse(text);
                        return { status: r.status, ok: r.ok, data };
                    } catch {
                        return {
                            ok: false,
                            status: r.status,
                            error: `Non-JSON response (HTTP ${r.status}): ${text.substring(0, 120)}`,
                        };
                    }
                })
                .then(result => sendResponse(result))
                .catch(err => sendResponse({ ok: false, status: 0, error: err.message }));

            return true; // async sendResponse
        }

        default:
            sendResponse({ error: 'Unknown message type: ' + msg.type });
    }
});

// ─── Extension Install / Update ──────────────────────────
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        console.log('[Act! Copilot] Extension installed');
    } else if (details.reason === 'update') {
        console.log('[Act! Copilot] Extension updated to', chrome.runtime.getManifest().version);
    }
});
