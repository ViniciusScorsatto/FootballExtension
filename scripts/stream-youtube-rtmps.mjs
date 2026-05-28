import { spawn } from "node:child_process";
import crypto from "node:crypto";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import net from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import dotenv from "dotenv";

for (const envFile of [".env", ".env.local"]) {
  if (existsSync(envFile)) {
    dotenv.config({ path: envFile, override: false });
  }
}

const args = new Set(process.argv.slice(2).filter((arg) => arg !== "--"));
const dryRun = args.has("--dry-run");
const noChrome = args.has("--no-chrome");
const listDevices = args.has("--list-devices");

const sourceUrl =
  process.env.RMTV_SOURCE_URL || "http://localhost:3200/apps/obs-overlay/";
const captureMode = process.env.RMTV_CAPTURE_MODE || "browser";
const width = Number(process.env.RMTV_WIDTH || 1920);
const height = Number(process.env.RMTV_HEIGHT || 1080);
const fps = Number(process.env.RMTV_FPS || 30);
const videoBitrate = process.env.RMTV_VIDEO_BITRATE || "4500k";
const audioBitrate = process.env.RMTV_AUDIO_BITRATE || "128k";
const dryRunSeconds = Number(process.env.RMTV_DRY_RUN_SECONDS || 15);
const videoFilter =
  process.env.RMTV_VIDEO_FILTER ||
  [
    `scale=${width}:${height}:force_original_aspect_ratio=decrease`,
    `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`,
    `fps=${fps}`,
    "format=yuv420p"
  ].join(",");
const chromePath =
  process.env.RMTV_CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const chromeDebugPort = Number(process.env.RMTV_CHROME_DEBUG_PORT || 0);
const ffmpegPath = process.env.RMTV_FFMPEG_PATH || "ffmpeg";
const ffmpegInput = process.env.RMTV_FFMPEG_INPUT || "4:none";
const dryRunOutput = process.env.RMTV_DRY_RUN_OUTPUT || "/tmp/rmtv-youtube-test.mp4";
const dryRunFormat = process.env.RMTV_DRY_RUN_FORMAT || "mp4";
const outputUrl = dryRun
  ? dryRunOutput
  : `rtmps://a.rtmps.youtube.com:443/live2/${process.env.YOUTUBE_STREAM_KEY || ""}`;

function run(command, commandArgs, options = {}) {
  return spawn(command, commandArgs, {
    stdio: "inherit",
    ...options
  });
}

function spawnForBrowserInput(command, commandArgs) {
  return spawn(command, commandArgs, {
    stdio: ["pipe", "inherit", "inherit"]
  });
}

function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForJson(url, { timeoutMs = 10000 } = {}) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);

      if (response.ok) {
        return response.json();
      }
    } catch {
      // Chrome may still be starting.
    }

    await wait(200);
  }

  throw new Error(`Timed out waiting for ${url}`);
}

async function waitForPageTarget(port, { timeoutMs = 10000 } = {}) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const targets = await waitForJson(`http://127.0.0.1:${port}/json/list`, {
      timeoutMs: 1000
    });
    const pages = targets.filter((entry) => entry.type === "page");
    const sourceTarget = pages.find((entry) => entry.url === sourceUrl);
    const appTarget = pages.find((entry) => entry.url?.startsWith("http"));
    const target = sourceTarget || appTarget || pages[0];

    if (target?.webSocketDebuggerUrl) {
      return target;
    }

    await wait(200);
  }

  throw new Error("Could not find a Chrome DevTools page target.");
}

function openControlledChrome(port, userDataDir) {
  if (!existsSync(chromePath)) {
    throw new Error(`Chrome not found at ${chromePath}`);
  }

  return run(chromePath, [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    `--window-size=${width},${height}`,
    "--force-device-scale-factor=1",
    "--hide-scrollbars",
    "--autoplay-policy=no-user-gesture-required",
    "--no-first-run",
    "--no-default-browser-check",
    `--app=${sourceUrl}`
  ], {
    detached: true
  });
}

function buildCommonOutputArgs() {
  const outputArgs = [];

  if (dryRun && dryRunSeconds > 0) {
    outputArgs.push("-t", String(dryRunSeconds));
  }

  outputArgs.push(
    "-c:v",
    "libx264",
    "-vf",
    videoFilter,
    "-preset",
    "veryfast",
    "-tune",
    "zerolatency",
    "-pix_fmt",
    "yuv420p",
    "-r",
    String(fps),
    "-g",
    String(fps * 2),
    "-b:v",
    videoBitrate,
    "-maxrate",
    videoBitrate,
    "-bufsize",
    `${Number.parseInt(videoBitrate, 10) * 2}k`,
    "-c:a",
    "aac",
    "-b:a",
    audioBitrate,
    "-ar",
    "44100"
  );

  if (dryRun) {
    outputArgs.push("-f", dryRunFormat);

    if (dryRunFormat === "mp4") {
      outputArgs.push("-movflags", "+faststart");
    }
  } else {
    outputArgs.push("-f", "flv");
  }

  outputArgs.push(outputUrl);

  return outputArgs;
}

function buildScreenFfmpegArgs() {
  if (process.platform !== "darwin") {
    throw new Error("The screen capture mode currently supports macOS avfoundation only.");
  }

  return [
    "-hide_banner",
    "-loglevel",
    "info",
    "-y",
    "-f",
    "avfoundation",
    "-framerate",
    String(fps),
    "-i",
    ffmpegInput,
    "-f",
    "lavfi",
    "-i",
    "anullsrc=channel_layout=stereo:sample_rate=44100",
    "-shortest",
    ...buildCommonOutputArgs()
  ];
}

function buildBrowserFfmpegArgs() {
  return [
    "-hide_banner",
    "-loglevel",
    "info",
    "-y",
    "-f",
    "image2pipe",
    "-framerate",
    String(fps),
    "-vcodec",
    "mjpeg",
    "-i",
    "pipe:0",
    "-f",
    "lavfi",
    "-i",
    "anullsrc=channel_layout=stereo:sample_rate=44100",
    "-shortest",
    ...buildCommonOutputArgs()
  ];
}

function encodeWebSocketFrame(payload) {
  const data = Buffer.from(payload);
  const mask = crypto.randomBytes(4);
  const header = [];

  header.push(0x81);

  if (data.length < 126) {
    header.push(0x80 | data.length);
  } else if (data.length < 65536) {
    header.push(0x80 | 126, (data.length >> 8) & 0xff, data.length & 0xff);
  } else {
    header.push(0x80 | 127, 0, 0, 0, 0);
    header.push(
      (data.length >> 24) & 0xff,
      (data.length >> 16) & 0xff,
      (data.length >> 8) & 0xff,
      data.length & 0xff
    );
  }

  const output = Buffer.concat([Buffer.from(header), mask, data]);

  for (let index = 0; index < data.length; index += 1) {
    output[header.length + 4 + index] = data[index] ^ mask[index % 4];
  }

  return output;
}

class DevToolsWebSocket {
  constructor(webSocketUrl) {
    this.url = new URL(webSocketUrl);
    this.socket = null;
    this.buffer = Buffer.alloc(0);
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
    this.fragment = "";
  }

  connect() {
    return new Promise((resolve, reject) => {
      const key = crypto.randomBytes(16).toString("base64");
      const socket = net.createConnection({
        host: this.url.hostname,
        port: Number(this.url.port)
      });

      this.socket = socket;

      socket.once("error", reject);
      socket.once("connect", () => {
        socket.write(
          [
            `GET ${this.url.pathname}${this.url.search} HTTP/1.1`,
            `Host: ${this.url.host}`,
            "Upgrade: websocket",
            "Connection: Upgrade",
            `Sec-WebSocket-Key: ${key}`,
            "Sec-WebSocket-Version: 13",
            "\r\n"
          ].join("\r\n")
        );
      });

      socket.once("data", (chunk) => {
        const headerEnd = chunk.indexOf("\r\n\r\n");
        const header = chunk.slice(0, headerEnd).toString("utf8");

        if (!header.includes("101")) {
          reject(new Error(`Chrome DevTools WebSocket handshake failed: ${header}`));
          socket.destroy();
          return;
        }

        socket.off("error", reject);
        socket.on("data", (data) => this.handleData(data));
        socket.on("error", (error) => this.rejectAll(error));
        socket.on("close", () => this.rejectAll(new Error("Chrome DevTools WebSocket closed")));

        if (headerEnd + 4 < chunk.length) {
          this.handleData(chunk.slice(headerEnd + 4));
        }

        resolve();
      });
    });
  }

  send(method, params = {}) {
    const id = this.nextId;
    this.nextId += 1;

    const payload = JSON.stringify({ id, method, params });

    this.socket.write(encodeWebSocketFrame(payload));

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
  }

  on(method, listener) {
    this.listeners.set(method, listener);
  }

  close() {
    this.socket?.destroy();
  }

  rejectAll(error) {
    for (const pending of this.pending.values()) {
      pending.reject(error);
    }

    this.pending.clear();
  }

  handleData(data) {
    this.buffer = Buffer.concat([this.buffer, data]);

    while (this.buffer.length >= 2) {
      const firstByte = this.buffer[0];
      const secondByte = this.buffer[1];
      const opcode = firstByte & 0x0f;
      const fin = (firstByte & 0x80) !== 0;
      const masked = (secondByte & 0x80) !== 0;
      let length = secondByte & 0x7f;
      let offset = 2;

      if (length === 126) {
        if (this.buffer.length < offset + 2) {
          return;
        }

        length = this.buffer.readUInt16BE(offset);
        offset += 2;
      } else if (length === 127) {
        if (this.buffer.length < offset + 8) {
          return;
        }

        const high = this.buffer.readUInt32BE(offset);
        const low = this.buffer.readUInt32BE(offset + 4);
        length = high * 2 ** 32 + low;
        offset += 8;
      }

      const mask = masked ? this.buffer.slice(offset, offset + 4) : null;

      if (masked) {
        offset += 4;
      }

      if (this.buffer.length < offset + length) {
        return;
      }

      const payload = Buffer.from(this.buffer.slice(offset, offset + length));
      this.buffer = this.buffer.slice(offset + length);

      if (mask) {
        for (let index = 0; index < payload.length; index += 1) {
          payload[index] ^= mask[index % 4];
        }
      }

      if (opcode === 0x8) {
        this.close();
        return;
      }

      if (opcode === 0x9) {
        continue;
      }

      if (opcode === 0x1 || opcode === 0x0) {
        this.fragment += payload.toString("utf8");

        if (fin) {
          this.handleMessage(this.fragment);
          this.fragment = "";
        }
      }
    }
  }

  handleMessage(raw) {
    const message = JSON.parse(raw);

    if (message.id && this.pending.has(message.id)) {
      const pending = this.pending.get(message.id);
      this.pending.delete(message.id);

      if (message.error) {
        pending.reject(new Error(message.error.message || "Chrome DevTools command failed"));
      } else {
        pending.resolve(message.result);
      }

      return;
    }

    const listener = this.listeners.get(message.method);

    if (listener) {
      listener(message.params || {});
    }
  }
}

function printConfig() {
  console.log("RMTV YouTube streamer");
  console.log(`Source: ${sourceUrl}`);
  console.log(`Capture mode: ${captureMode}`);
  console.log(`Video: ${width}x${height} ${fps}fps ${videoBitrate}`);

  if (captureMode === "screen") {
    console.log(`Input: ${ffmpegInput}`);
  }

  console.log(`Filter: ${videoFilter}`);
  console.log(`Mode: ${dryRun ? `dry-run -> ${outputUrl}` : "YouTube RTMPS"}`);

  if (dryRun && dryRunSeconds > 0) {
    console.log(`Dry run will stop automatically after ${dryRunSeconds}s.`);
  }
}

async function streamBrowserTab() {
  const port = chromeDebugPort || await findFreePort();
  const userDataDir = mkdtempSync(join(tmpdir(), "rmtv-chrome-"));
  const chrome = noChrome ? null : openControlledChrome(port, userDataDir);
  const ffmpeg = spawnForBrowserInput(ffmpegPath, buildBrowserFfmpegArgs());
  let ffmpegExited = false;
  let client = null;

  function cleanup() {
    client?.close();

    if (!ffmpegExited) {
      ffmpeg.kill("SIGINT");
    }

    chrome?.kill("SIGTERM");
    rmSync(userDataDir, { recursive: true, force: true });
  }

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  ffmpeg.stdin.on("error", (error) => {
    if (error.code !== "EPIPE") {
      throw error;
    }
  });

  ffmpeg.on("exit", (code) => {
    ffmpegExited = true;
    cleanup();
    process.exit(code ?? 0);
  });

  const target = await waitForPageTarget(port);
  client = new DevToolsWebSocket(target.webSocketDebuggerUrl);
  await client.connect();
  await client.send("Page.enable");
  await client.send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: false
  });
  await client.send("Page.navigate", { url: sourceUrl });
  await client.send("Page.bringToFront");
  await wait(500);

  client.on("Page.screencastFrame", ({ data, sessionId }) => {
    if (!ffmpegExited && !ffmpeg.stdin.destroyed) {
      ffmpeg.stdin.write(Buffer.from(data, "base64"));
    }

    client.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
  });

  await client.send("Page.startScreencast", {
    format: "jpeg",
    quality: 90,
    maxWidth: width,
    maxHeight: height,
    everyNthFrame: 1
  });
}

function streamScreen() {
  const ffmpeg = run(ffmpegPath, buildScreenFfmpegArgs());
  let ffmpegExited = false;

  function stopFfmpeg() {
    if (ffmpegExited) {
      return;
    }

    ffmpeg.kill("SIGINT");
    setTimeout(() => {
      if (!ffmpegExited) {
        ffmpeg.kill("SIGKILL");
      }
    }, 5000).unref();
  }

  process.on("SIGINT", stopFfmpeg);
  process.on("SIGTERM", stopFfmpeg);

  ffmpeg.on("exit", (code) => {
    ffmpegExited = true;
    process.exit(code ?? 0);
  });
}

if (listDevices) {
  const ffmpeg = run(ffmpegPath, ["-hide_banner", "-f", "avfoundation", "-list_devices", "true", "-i", ""]);
  ffmpeg.on("exit", (code) => {
    // ffmpeg exits non-zero after listing AVFoundation devices because no real
    // input is opened. Treat the list operation itself as successful.
    process.exit(code === null ? 1 : 0);
  });
} else {
  if (!dryRun && !process.env.YOUTUBE_STREAM_KEY) {
    console.error("Missing YOUTUBE_STREAM_KEY. Add it to .env or export it before streaming.");
    process.exit(1);
  }

  printConfig();

  if (captureMode === "screen") {
    streamScreen();
  } else if (captureMode === "browser") {
    streamBrowserTab().catch((error) => {
      console.error(error.message);
      process.exit(1);
    });
  } else {
    console.error(`Unsupported RMTV_CAPTURE_MODE: ${captureMode}`);
    process.exit(1);
  }
}
