import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = normalize(join(__dirname, "../../.."));
const port = Number(process.env.PORT || 3200);
const backendUrl =
  process.env.OBS_BACKEND_URL || "https://footballextension-staging.up.railway.app";

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

function resolveStaticPath(pathname) {
  const requestedPath =
    pathname === "/"
      ? "/apps/obs-overlay/index.html"
      : pathname.endsWith("/")
        ? `${pathname}index.html`
        : pathname;
  const normalizedPath = normalize(join(rootDir, requestedPath));

  if (!normalizedPath.startsWith(rootDir)) {
    return null;
  }

  return normalizedPath;
}

async function proxyApiRequest(req, res, url) {
  const targetUrl = `${backendUrl}${url.pathname.replace(/^\/api/, "")}${url.search}`;
  const response = await fetch(targetUrl, {
    method: req.method,
    headers: {
      "content-type": req.headers["content-type"] || "application/json",
      "x-live-impact-user": "obs-brasileirao",
      "x-live-impact-plan": "pro"
    }
  });
  const body = await response.arrayBuffer();

  res.writeHead(response.status, {
    "content-type": response.headers.get("content-type") || "application/json"
  });
  res.end(Buffer.from(body));
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

    if (url.pathname.startsWith("/api/")) {
      await proxyApiRequest(req, res, url);
      return;
    }

    const staticPath = resolveStaticPath(url.pathname);

    if (!staticPath) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    const file = await readFile(staticPath);
    res.writeHead(200, {
      "content-type": contentTypes[extname(staticPath)] || "application/octet-stream"
    });
    res.end(file);
  } catch (error) {
    res.writeHead(error.code === "ENOENT" ? 404 : 500, {
      "content-type": "text/plain; charset=utf-8"
    });
    res.end(error.code === "ENOENT" ? "Not found" : "Server error");
  }
});

server.listen(port, () => {
  console.log(`OBS overlay: http://localhost:${port}/apps/obs-overlay/`);
  console.log(`Proxy backend: ${backendUrl}`);
});
