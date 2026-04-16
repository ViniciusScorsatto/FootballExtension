# Extension App

This app is the Chrome extension frontend for Live Match Impact.

## Ownership

- Primary owner: frontend
- Main responsibilities:
  - popup UX
  - overlay rendering
  - side panel rendering
  - extension-local state and interactions
  - scenario preview UI

## Key paths

- [manifest.json](/Users/viniciusscorsatto/Desktop/AI%20Projects/Football%20Extension/apps/extension/manifest.json)
- [popup.js](/Users/viniciusscorsatto/Desktop/AI%20Projects/Football%20Extension/apps/extension/popup.js)
- [content.js](/Users/viniciusscorsatto/Desktop/AI%20Projects/Football%20Extension/apps/extension/content.js)
- [sidepanel.js](/Users/viniciusscorsatto/Desktop/AI%20Projects/Football%20Extension/apps/extension/sidepanel.js)
- [sdk-football.js](/Users/viniciusscorsatto/Desktop/AI%20Projects/Football%20Extension/apps/extension/sdk-football.js)

## Loading the extension

1. Open `chrome://extensions`
2. Enable Developer Mode
3. Choose **Load unpacked**
4. Select [apps/extension](/Users/viniciusscorsatto/Desktop/AI%20Projects/Football%20Extension/apps/extension)

## Backend access rule

- This app should consume backend routes through the shared SDK only:
  - [packages/sdk-football](/Users/viniciusscorsatto/Desktop/AI%20Projects/Football%20Extension/packages/sdk-football)
- Do not add direct imports from [apps/api](/Users/viniciusscorsatto/Desktop/AI%20Projects/Football%20Extension/apps/api).

## SDK sync

The extension uses a copied browser bundle here:

- [sdk-football.js](/Users/viniciusscorsatto/Desktop/AI%20Projects/Football%20Extension/apps/extension/sdk-football.js)

Source of truth:

- [packages/sdk-football/src/browser.js](/Users/viniciusscorsatto/Desktop/AI%20Projects/Football%20Extension/packages/sdk-football/src/browser.js)

From the repo root:

```bash
npm run sync:extension-sdk
npm run check:extension-sdk
```

## Coordination notes

- Frontend owns presentation and interaction changes here.
- If a UI change needs new backend data, request a contract change instead of reaching into backend internals.
