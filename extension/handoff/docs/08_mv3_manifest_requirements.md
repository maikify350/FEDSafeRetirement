# 08 — Manifest V3 Requirements

## Manifest V3 Baseline

Use:

```json
{
  "manifest_version": 3
}
```

## Required Manifest Fields

```json
{
  "manifest_version": 3,
  "name": "ACT Copilot Beta",
  "description": "Licensed ACT.com productivity assistant for approved VentureSoft customers.",
  "version": "0.1.0",
  "icons": {
    "16": "icons/icon16.png",
    "32": "icons/icon32.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

## Recommended Components

```text
service_worker
content_scripts
popup or side panel UI
options page
icons
local storage for non-secret install id/cache
```

## Permission Guidance

Start minimal:

```json
{
  "permissions": [
    "storage",
    "activeTab"
  ],
  "host_permissions": [
    "https://*.act.com/*",
    "https://api.mustautomate.ai/*"
  ]
}
```

Add only when justified:

```text
scripting
sidePanel
identity
tabs
notifications
alarms
```

## Content Security

Avoid:

```text
eval
new Function
remote script tags
inline scripts
remote WASM
libraries that dynamically load remote JS
```

## Config From Backend

Backend config is allowed if treated as data:

```json
{
  "features": {
    "copilot_drawer": true,
    "templates": true
  },
  "ui": {
    "button_label": "ACT Copilot"
  }
}
```

Do not treat backend config as executable logic.

## Domain Matching

Use specific content script matches:

```json
"content_scripts": [
  {
    "matches": ["https://*.act.com/*"],
    "js": ["content-scripts/act-detector.js"],
    "run_at": "document_idle"
  }
]
```

## Store Upload Packaging

The ZIP must have `manifest.json` at root.

Claude should create a build script that emits:

```text
/dist/chrome-extension-upload.zip
```

with no source maps, `.env`, tests, node_modules, git files, or secrets.
