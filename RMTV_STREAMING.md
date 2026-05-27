# RMTV YouTube Streaming MVP

This MVP streams the existing dashboard page to YouTube Live through RTMPS.

The current visual source is still:

```text
http://localhost:3200/apps/obs-overlay/
```

Even though the folder is named `obs-overlay`, the streaming path treats it as a full-screen broadcast dashboard.

## Requirements

- `pnpm dev:obs` running from the repo root.
- `ffmpeg` installed locally.
- Google Chrome installed.
- A YouTube Live stream key.
- macOS Screen Recording permission granted for the terminal app that runs the command.

## Configure

Add the stream key to `.env`:

```env
YOUTUBE_STREAM_KEY=your-youtube-stream-key
```

Optional settings:

```env
RMTV_SOURCE_URL=http://localhost:3200/apps/obs-overlay/
RMTV_CAPTURE_MODE=browser
RMTV_WIDTH=1920
RMTV_HEIGHT=1080
RMTV_FPS=30
RMTV_VIDEO_BITRATE=4500k
RMTV_AUDIO_BITRATE=128k
RMTV_DRY_RUN_SECONDS=15
RMTV_DRY_RUN_OUTPUT=/tmp/rmtv-youtube-test.mp4
RMTV_DRY_RUN_FORMAT=mp4
RMTV_VIDEO_FILTER=
RMTV_FFMPEG_INPUT=4:none
```

`RMTV_CAPTURE_MODE=browser` captures only the controlled Chrome dashboard tab.
Use `RMTV_CAPTURE_MODE=screen` only when you intentionally want to capture a
full macOS screen through AVFoundation.

`RMTV_FFMPEG_INPUT` is used only by screen mode. It is the macOS AVFoundation
capture input passed to `ffmpeg`. The default uses the screen capture device
index detected on this machine and no microphone audio.
The script generates silent stereo audio so YouTube receives a stable audio/video stream.
By default, captured screen video is scaled and padded into `RMTV_WIDTH` x
`RMTV_HEIGHT`, so a high-DPI or non-16:9 display still produces a YouTube-safe
1080p stream.

## Find The Capture Device

This section is only needed for `RMTV_CAPTURE_MODE=screen`.

Run:

```bash
pnpm stream:youtube -- --list-devices
```

If `ffmpeg` cannot list screen devices, grant Screen Recording permission to your terminal app in:

```text
System Settings > Privacy & Security > Screen Recording
```

Then restart the terminal and run the list command again.
Use the listed `Capture screen` index as `RMTV_FFMPEG_INPUT`. For example,
if the list shows `[4] Capture screen 0`, use:

```env
RMTV_FFMPEG_INPUT=4:none
```

## Dry Run

Before sending anything to YouTube, write a local FLV file:

```bash
pnpm stream:youtube -- --dry-run
```

Default output:

```text
/tmp/rmtv-youtube-test.mp4
```

Open the generated file in a video player to confirm the dashboard is being captured.
By default the dry run stops after 15 seconds. Set `RMTV_DRY_RUN_SECONDS=0`
to keep it running until you stop it manually.

## Stream To YouTube

1. Start the dashboard:

   ```bash
   pnpm dev:obs
   ```

2. In another terminal, start RTMPS streaming:

   ```bash
   pnpm stream:youtube
   ```

The script opens Chrome fullscreen on `RMTV_SOURCE_URL`, captures the screen through `ffmpeg`, encodes H.264/AAC, and publishes to:

```text
rtmps://a.rtmps.youtube.com:443/live2/<YOUTUBE_STREAM_KEY>
```

## Useful Flags

```bash
pnpm stream:youtube -- --no-chrome
```

Use this when Chrome is already open on the correct dashboard and display.

```bash
pnpm stream:youtube -- --dry-run --no-chrome
```

Use this to test capture without reopening Chrome.

## Current Limitations

- macOS-only capture for the MVP.
- Browser capture mode streams the dashboard tab only. Screen mode still captures the configured full display.
- Uses generated silent audio; microphone, music, and mixed audio are future work.
- Stream quality depends on the local display size, Chrome fullscreen state, and `RMTV_FFMPEG_INPUT`.
