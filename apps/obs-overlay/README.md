# OBS Overlay App

This app is the scaffold for the OBS-oriented frontend client.

## Ownership

- Primary owner: frontend
- Main responsibilities:
  - scene-friendly overlay layouts
  - broadcast-safe typography and spacing
  - frontend presentation only

## Current status

- scaffold only
- no runtime implementation yet

## Intended backend access rule

- Consume backend routes through:
  - [packages/sdk-football](/Users/viniciusscorsatto/Desktop/AI%20Projects/Football%20Extension/packages/sdk-football)
- Do not import code from:
  - [apps/api](/Users/viniciusscorsatto/Desktop/AI%20Projects/Football%20Extension/apps/api)

## Goal

Use the same backend intelligence platform as the extension while keeping OBS-specific rendering concerns in this app.

That means:
- backend owns football meaning
- this app owns screen presentation
