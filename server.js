const http = require("http");
const fs = require("fs");
const path = require("path");
const { Readable } = require("stream");

const PORT = process.env.PORT || 3000;
const OPHIM_BASE_URL = "https://ophim1.com";
const BUILD_DIR = path.join(__dirname, "build");
const streamTokens = new Map();
const movieCache = new Map();
const downloadJobs = new Map();
const MOVIE_CACHE_TTL_MS = 5 * 60 * 1000;
const DOWNLOAD_JOB_TTL_MS = 60 * 60 * 1000;
const STREAM_TOKEN_TTL_MS = 6 * 60 * 60 * 1000;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(payload));
}

function createStreamProxyUrl(url) {
  const token = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  streamTokens.set(token, {
    url,
    expiresAt: Date.now() + STREAM_TOKEN_TTL_MS,
  });
  return `/api/stream?t=${encodeURIComponent(token)}`;
}

function resolveStreamToken(token) {
  const entry = streamTokens.get(token);
  if (!entry || entry.expiresAt < Date.now()) {
    streamTokens.delete(token);
    return null;
  }
  return entry.url;
}

function parseMasterPlaylist(m3u8Content, baseUrl) {
  const lines = m3u8Content.split("\n");
  const variants = [];
  let currentStreamInfo = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("#EXT-X-STREAM-INF:")) {
      const bandwidthMatch = trimmed.match(/BANDWIDTH=(\d+)/);
      const resolutionMatch = trimmed.match(/RESOLUTION=(\d+x\d+)/);
      currentStreamInfo = {
        bandwidth: bandwidthMatch ? parseInt(bandwidthMatch[1], 10) : 0,
        resolution: resolutionMatch ? resolutionMatch[1] : null,
      };
    } else if (!trimmed.startsWith("#") && currentStreamInfo) {
      const url = getAbsoluteUrl(trimmed, baseUrl);
      const height = currentStreamInfo.resolution
        ? parseInt(currentStreamInfo.resolution.split("x")[1], 10)
        : 0;
      const quality = height > 0 ? `${height}p` : null;
      variants.push({
        url,
        bandwidth: currentStreamInfo.bandwidth,
        resolution: currentStreamInfo.resolution,
        height,
        quality,
      });
      currentStreamInfo = null;
    }
  }

  return variants;
}

function getAbsoluteUrl(value, baseUrl) {
  return new URL(value, baseUrl).toString();
}

function sanitizeMovieItem(item) {
  return {
    ...item,
    episodes: (item.episodes || []).map((server) => ({
      ...server,
      server_data: (server.server_data || []).map((episode) => {
        const { link_m3u8, link_embed, ...safeEpisode } = episode;
        return safeEpisode;
      }),
    })),
  };
}

async function fetchMovie(id) {
  const cacheKey = encodeURIComponent(id);
  const cached = movieCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  movieCache.delete(cacheKey);
  const response = await fetch(`${OPHIM_BASE_URL}/v1/api/phim/${cacheKey}`);
  if (!response.ok) {
    throw new Error(`Upstream movie request failed: ${response.status}`);
  }

  const data = await response.json();
  movieCache.set(cacheKey, {
    data,
    expiresAt: Date.now() + MOVIE_CACHE_TTL_MS,
  });
  return data;
}

async function getEpisode(id, episodeName, episodeGroupIndex) {
  const data = await fetchMovie(id);
  const serverGroups = data?.data?.item?.episodes || [];
  const hasGroupIndex = episodeGroupIndex !== null && episodeGroupIndex !== "";
  const groupIndex = Number(episodeGroupIndex);
  const server =
    hasGroupIndex && Number.isInteger(groupIndex)
      ? serverGroups[groupIndex]
      : null;
  const episodes = server
    ? server.server_data || []
    : serverGroups.flatMap((group) => group.server_data || []);
  return episodes.find(
    (episode) => episode.name === episodeName || episode.slug === episodeName,
  );
}

function getDirectEpisodeLink(item, epSlug) {
  const serverGroups = item?.episodes || [];
  for (const server of serverGroups) {
    const found = (server.server_data || []).find(
      (e) => e.slug === epSlug || e.name === epSlug,
    );
    if (found?.link_m3u8) return found;
  }
  return null;
}

function selectQualityVariant(variants, requestedQuality) {
  if (!variants.length) return null;

  if (requestedQuality) {
    const requestedHeight = parseInt(requestedQuality.replace("p", ""), 10);
    const exact = variants.find((v) => v.height === requestedHeight);
    if (exact) return exact;
  }

  return variants.reduce((a, b) => (a.bandwidth > b.bandwidth ? a : b));
}

async function resolveDownloadInput(slug, ep, requestedQuality) {
  let data;
  try {
    data = await fetchMovie(slug);
  } catch {
    const error = new Error("Movie not found");
    error.statusCode = 404;
    throw error;
  }

  const item = data?.data?.item;
  if (!item) {
    const error = new Error("Movie data not found");
    error.statusCode = 404;
    throw error;
  }

  const episode = getDirectEpisodeLink(item, ep);
  if (!episode?.link_m3u8) {
    const error = new Error("Episode stream not found");
    error.statusCode = 404;
    throw error;
  }

  let masterResp;
  try {
    masterResp = await fetch(episode.link_m3u8);
  } catch {
    const error = new Error("Failed to fetch playlist");
    error.statusCode = 502;
    throw error;
  }

  const masterText = await masterResp.text();
  let inputUrl;

  if (masterText.includes("#EXT-X-STREAM-INF")) {
    const variants = parseMasterPlaylist(masterText, episode.link_m3u8);
    if (!variants.length) {
      const error = new Error("No variants found in playlist");
      error.statusCode = 502;
      throw error;
    }
    inputUrl = selectQualityVariant(variants, requestedQuality).url;
  } else {
    inputUrl = episode.link_m3u8;
  }

  const movieTitle = (item.title || item.name || slug)
    .replace(/[<>:"/\\|?*]/g, "_")
    .replace(/\s+/g, "-");
  const qualityLabel = requestedQuality || "hd";

  return {
    inputUrl,
    filename: `${movieTitle}-${ep}-${qualityLabel}.mp4`,
  };
}

function getCompatibleFfmpegArgs(inputUrl, outputPath) {
  return [
    "-y",
    "-nostdin",
    "-user_agent",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "-i",
    inputUrl,
    "-map",
    "0:v:0",
    "-map",
    "0:a:0?",
    "-c:v",
    "libx264",
    "-preset",
    "ultrafast",
    "-crf",
    "23",
    "-pix_fmt",
    "yuv420p",
    "-profile:v",
    "main",
    "-level",
    "4.1",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-movflags",
    "+faststart",
    outputPath,
  ];
}

function resolveFfmpegPath(ffmpegPath = require("@ffmpeg-installer/ffmpeg").path) {
  return ffmpegPath.replace(
    `${path.sep}app.asar${path.sep}`,
    `${path.sep}app.asar.unpacked${path.sep}`,
  );
}

function rewritePlaylist(body, playlistUrl) {
  return body
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return line;
      return createStreamProxyUrl(getAbsoluteUrl(trimmed, playlistUrl));
    })
    .join("\n");
}

async function handleMovieDetail(req, res, id) {
  let data;
  try {
    data = await fetchMovie(id);
  } catch (error) {
    sendJson(res, 404, { message: "Movie not found" });
    return;
  }
  if (data?.data?.item) {
    data = {
      ...data,
      data: {
        ...data.data,
        item: sanitizeMovieItem(data.data.item),
      },
    };
  }
  sendJson(res, 200, data);
}

async function handleEpisode(req, res, id, requestUrl) {
  const episodeName = requestUrl.searchParams.get("name");
  const episodeGroupIndex = requestUrl.searchParams.get("group");
  if (!episodeName) {
    sendJson(res, 400, { message: "Missing episode name" });
    return;
  }

  const episode = await getEpisode(id, episodeName, episodeGroupIndex);
  if (!episode?.link_m3u8) {
    sendJson(res, 404, { message: "Episode stream not found" });
    return;
  }

  sendJson(res, 200, {
    name: episode.name,
    slug: episode.slug,
    playlistUrl: createStreamProxyUrl(episode.link_m3u8),
  });
}

async function handleStream(req, res, requestUrl) {
  const token = requestUrl.searchParams.get("t");
  if (!token) {
    sendJson(res, 400, { message: "Missing stream token" });
    return;
  }

  const targetUrl = resolveStreamToken(token);
  if (!targetUrl) {
    sendJson(res, 403, { message: "Invalid or expired stream token" });
    return;
  }
  const upstream = await fetch(targetUrl, {
    headers: { "User-Agent": req.headers["user-agent"] || "Mozilla/5.0" },
  });

  if (!upstream.ok) {
    res.writeHead(upstream.status);
    res.end();
    return;
  }

  const contentType =
    upstream.headers.get("content-type") || "application/octet-stream";
  const isPlaylist =
    contentType.includes("mpegurl") || targetUrl.includes(".m3u8");

  if (isPlaylist) {
    const body = await upstream.text();
    res.writeHead(200, {
      "Content-Type": "application/vnd.apple.mpegurl; charset=utf-8",
      "Cache-Control": "no-store",
    });
    res.end(rewritePlaylist(body, targetUrl));
    return;
  }

  res.writeHead(200, {
    "Content-Type": contentType,
    "Cache-Control": "public, max-age=86400",
  });
  if (!upstream.body) {
    res.end();
    return;
  }

  const upstreamStream = Readable.fromWeb(upstream.body);

  upstreamStream.on("error", () => {
    if (!res.headersSent) {
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Upstream stream error" }));
      return;
    }

    res.destroy();
  });

  res.on("close", () => {
    upstreamStream.destroy();
  });

  upstreamStream.pipe(res);
}

async function handleDownloadStart(req, res, requestUrl) {
  cleanupExpiredDownloadJobs();

  const slug = requestUrl.searchParams.get("slug");
  const ep = requestUrl.searchParams.get("ep");
  const requestedQuality = requestUrl.searchParams.get("quality") || "";

  if (!slug || !ep) {
    sendJson(res, 400, { message: "Missing slug or ep parameter" });
    return;
  }

  let input;
  try {
    input = await resolveDownloadInput(slug, ep, requestedQuality);
  } catch (error) {
    sendJson(res, error.statusCode || 500, { message: error.message });
    return;
  }

  const os = require("os");
  const { spawn } = require("child_process");
  const ffmpegPath = resolveFfmpegPath();
  const jobId = createDownloadJobId();
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ophim-dl-"));
  const outputPath = path.join(tmpDir, "download.mp4");
  const job = {
    id: jobId,
    status: "processing",
    progress: 0,
    duration: 0,
    currentTime: 0,
    message: "Đang chuẩn bị chuyển mã...",
    filename: input.filename,
    outputPath,
    tmpDir,
    stderr: "",
    createdAt: Date.now(),
    ffmpeg: null,
  };
  downloadJobs.set(jobId, job);

  const ffmpeg = spawn(
    ffmpegPath,
    getCompatibleFfmpegArgs(input.inputUrl, outputPath),
  );
  job.ffmpeg = ffmpeg;
  job.message = "Đang chuyển mã sang MP4 tương thích...";

  ffmpeg.stderr.on("data", (chunk) => {
    const text = chunk.toString();
    job.stderr += text;
    if (job.stderr.length > 12000) job.stderr = job.stderr.slice(-12000);

    const durationMatch = job.stderr.match(
      /Duration:\s*(\d+:\d{2}:\d{2}(?:\.\d+)?)/,
    );
    if (durationMatch) job.duration = parseFfmpegTime(durationMatch[1]);

    const timeMatches = [...text.matchAll(/time=(\d+:\d{2}:\d{2}(?:\.\d+)?)/g)];
    const latestTime = timeMatches.at(-1)?.[1];
    if (latestTime) {
      job.currentTime = parseFfmpegTime(latestTime);
      if (job.duration > 0) {
        job.progress = Math.min(
          99,
          Math.max(1, Math.floor((job.currentTime / job.duration) * 100)),
        );
      }
    }
  });

  ffmpeg.on("error", () => {
    job.status = "error";
    job.message = "Không thể khởi động ffmpeg";
    job.progress = 0;
  });

  ffmpeg.on("exit", (code) => {
    job.ffmpeg = null;
    if (code !== 0) {
      job.status = "error";
      job.message = `ffmpeg exited with code ${code}`;
      job.progress = 0;
      return;
    }

    try {
      const stat = fs.statSync(outputPath);
      job.size = stat.size;
      job.status = "ready";
      job.progress = 100;
      job.message = "File MP4 đã sẵn sàng";
      job.readyAt = Date.now();
    } catch {
      job.status = "error";
      job.message = "File output không tồn tại";
      job.progress = 0;
    }
  });

  sendJson(res, 202, {
    jobId,
    status: job.status,
    progress: job.progress,
    message: job.message,
  });
}

function handleDownloadStatus(req, res, requestUrl) {
  cleanupExpiredDownloadJobs();

  const jobId = requestUrl.searchParams.get("id");
  const job = jobId ? downloadJobs.get(jobId) : null;
  if (!job) {
    sendJson(res, 404, { message: "Download job not found" });
    return;
  }

  sendJson(res, 200, {
    jobId: job.id,
    status: job.status,
    progress: job.progress,
    message: job.message,
    filename: job.filename,
    size: job.size || 0,
    detail:
      job.status === "error"
        ? job.stderr.trim().split("\n").slice(-8).join("\n")
        : undefined,
  });
}

function handleDownloadFile(req, res, requestUrl) {
  const jobId = requestUrl.searchParams.get("id");
  const job = jobId ? downloadJobs.get(jobId) : null;

  if (!job) {
    sendJson(res, 404, { message: "Download job not found" });
    return;
  }

  if (job.status !== "ready") {
    sendJson(res, 409, {
      message: "Download job is not ready",
      status: job.status,
      progress: job.progress,
    });
    return;
  }

  const stat = fs.statSync(job.outputPath);
  res.writeHead(200, {
    "Content-Type": "video/mp4",
    "Content-Disposition": `attachment; filename="${encodeURIComponent(job.filename)}"`,
    "Content-Length": stat.size,
    "Accept-Ranges": "bytes",
    "Cache-Control": "no-store",
    "X-OPhim-Download-Mode": "ffmpeg-job-compatible-v5",
  });

  const fileStream = fs.createReadStream(job.outputPath);
  fileStream.on("error", () => {
    res.destroy();
    cleanupDownloadJob(jobId);
  });
  fileStream.on("close", () => cleanupDownloadJob(jobId));
  res.on("close", () => fileStream.destroy());
  fileStream.pipe(res);
}

async function handleDownload(req, res, requestUrl) {
  const slug = requestUrl.searchParams.get("slug");
  const ep = requestUrl.searchParams.get("ep");
  const requestedQuality = requestUrl.searchParams.get("quality") || "";

  if (!slug || !ep) {
    sendJson(res, 400, { message: "Missing slug or ep parameter" });
    return;
  }

  let data;
  try {
    data = await fetchMovie(slug);
  } catch {
    sendJson(res, 404, { message: "Movie not found" });
    return;
  }

  const item = data?.data?.item;
  if (!item) {
    sendJson(res, 404, { message: "Movie data not found" });
    return;
  }

  const episode = getDirectEpisodeLink(item, ep);
  if (!episode?.link_m3u8) {
    sendJson(res, 404, { message: "Episode stream not found" });
    return;
  }

  // Parse master playlist for quality selection
  let masterResp;
  try {
    masterResp = await fetch(episode.link_m3u8);
  } catch {
    sendJson(res, 502, { message: "Failed to fetch playlist" });
    return;
  }
  const masterText = await masterResp.text();

  let inputUrl;
  if (masterText.includes("#EXT-X-STREAM-INF")) {
    const variants = parseMasterPlaylist(masterText, episode.link_m3u8);
    if (!variants.length) {
      sendJson(res, 502, { message: "No variants found in playlist" });
      return;
    }
    const variant = selectQualityVariant(variants, requestedQuality);
    inputUrl = variant.url;
  } else {
    inputUrl = episode.link_m3u8;
  }

  const movieTitle = (item.title || item.name || slug)
    .replace(/[<>:"/\\|?*]/g, "_")
    .replace(/\s+/g, "-");
  const qualityLabel = requestedQuality || "hd";
  const filename = `${movieTitle}-${ep}-${qualityLabel}.mp4`;

  const ffmpegPath = resolveFfmpegPath();
  const { spawn } = require("child_process");
  const os = require("os");
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ophim-dl-"));
  const outputPath = path.join(tmpDir, "download.mp4");

  const args = [
    "-y",
    "-nostdin",
    "-user_agent",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "-i",
    inputUrl,
    "-map",
    "0:v:0",
    "-map",
    "0:a:0?",
    "-c:v",
    "libx264",
    "-preset",
    "ultrafast",
    "-crf",
    "23",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-movflags",
    "+faststart",
    outputPath,
  ];

  const ffmpeg = spawn(ffmpegPath, args);

  let ffmpegFailed = false;
  let clientClosed = false;
  let stderr = "";

  const cleanup = () => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  };

  const streamDownloadFile = () => {
    const stat = fs.statSync(outputPath);
    res.writeHead(200, {
      "Content-Type": "video/mp4",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      "Content-Length": stat.size,
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-store",
      "X-OPhim-Download-Mode": "ffmpeg-compatible-v4",
    });

    const fileStream = fs.createReadStream(outputPath);
    fileStream.on("error", () => {
      res.destroy();
      cleanup();
    });
    fileStream.on("close", cleanup);
    res.on("close", () => {
      fileStream.destroy();
    });
    fileStream.pipe(res);
  };

  const sendFfmpegError = (message) => {
    const detail = stderr.trim().split("\n").slice(-8).join("\n");
    console.error(message, detail);

    cleanup();

    if (!res.headersSent) {
      sendJson(res, 500, {
        message,
        detail,
      });
      return;
    }

    res.destroy();
  };

  ffmpeg.on("error", () => {
    ffmpegFailed = true;
    sendFfmpegError("ffmpeg failed to start");
  });

  ffmpeg.on("exit", (code) => {
    if (clientClosed) return;

    if (code !== 0 && !ffmpegFailed) {
      ffmpegFailed = true;
      sendFfmpegError(`ffmpeg exited with code ${code}`);
      return;
    }

    if (!ffmpegFailed) {
      streamDownloadFile();
    }
  });

  res.on("close", () => {
    clientClosed = !res.writableEnded;
    if (clientClosed) {
      ffmpeg.kill("SIGTERM");
      cleanup();
    }
  });

  ffmpeg.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
    if (stderr.length > 8000) stderr = stderr.slice(-8000);
  });
}

function createDownloadJobId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function parseFfmpegTime(value) {
  const match = value.match(/(?:(\d+):)?(\d{2}):(\d{2}(?:\.\d+)?)/);
  if (!match) return 0;

  const hours = match[1] ? Number(match[1]) : 0;
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  return hours * 3600 + minutes * 60 + seconds;
}

function cleanupDownloadJob(jobId) {
  const job = downloadJobs.get(jobId);
  if (!job) return;

  if (job.ffmpeg && job.status === "processing") {
    job.ffmpeg.kill("SIGTERM");
  }

  try {
    fs.rmSync(job.tmpDir, { recursive: true, force: true });
  } catch {}

  downloadJobs.delete(jobId);
}

function handleDownloadCancel(req, res, requestUrl) {
  const jobId = requestUrl.searchParams.get("id");
  if (!jobId || !downloadJobs.has(jobId)) {
    sendJson(res, 404, { message: "Download job not found" });
    return;
  }

  cleanupDownloadJob(jobId);
  sendJson(res, 200, { message: "Download cancelled" });
}

function cleanupExpiredDownloadJobs() {
  const now = Date.now();
  for (const [jobId, job] of downloadJobs) {
    if (now - job.createdAt > DOWNLOAD_JOB_TTL_MS) {
      cleanupDownloadJob(jobId);
    }
  }
}

function serveStatic(req, res, buildDir = BUILD_DIR) {
  const requestedPath = req.url.split("?")[0];
  const safePath = path.normalize(requestedPath).replace(/^([/\\])+/, "");
  let filePath = path.join(buildDir, safePath);

  if (
    !filePath.startsWith(buildDir) ||
    !fs.existsSync(filePath) ||
    fs.statSync(filePath).isDirectory()
  ) {
    filePath = path.join(buildDir, "index.html");
  }

  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end("Build folder not found. Run npm run build first.");
    return;
  }

  const ext = path.extname(filePath);
  res.writeHead(200, {
    "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
  });
  fs.createReadStream(filePath).pipe(res);
}

function createRequestHandler({ buildDir = BUILD_DIR } = {}) {
  return async function requestHandler(req, res) {
    try {
      const requestUrl = new URL(req.url, `http://${req.headers.host}`);
      const movieDetailMatch = requestUrl.pathname.match(
        /^\/api\/phim\/([^/]+)$/,
      );
      const episodeMatch = requestUrl.pathname.match(
        /^\/api\/phim\/([^/]+)\/episode$/,
      );

      if (movieDetailMatch) {
        await handleMovieDetail(req, res, movieDetailMatch[1]);
        return;
      }

      if (episodeMatch) {
        await handleEpisode(req, res, episodeMatch[1], requestUrl);
        return;
      }

      if (requestUrl.pathname === "/api/stream") {
        await handleStream(req, res, requestUrl);
        return;
      }

      if (requestUrl.pathname === "/api/download/start") {
        await handleDownloadStart(req, res, requestUrl);
        return;
      }

      if (requestUrl.pathname === "/api/download/status") {
        handleDownloadStatus(req, res, requestUrl);
        return;
      }

      if (requestUrl.pathname === "/api/download/cancel") {
        handleDownloadCancel(req, res, requestUrl);
        return;
      }

      if (requestUrl.pathname === "/api/download/file") {
        handleDownloadFile(req, res, requestUrl);
        return;
      }

      if (requestUrl.pathname === "/api/download") {
        await handleDownload(req, res, requestUrl);
        return;
      }

      serveStatic(req, res, buildDir);
    } catch (error) {
      console.error(error);
      sendJson(res, 500, { message: "Internal server error" });
    }
  };
}

function createAppServer(options = {}) {
  return http.createServer(createRequestHandler(options));
}

function startAppServer({ buildDir = BUILD_DIR, port = PORT } = {}) {
  const server = createAppServer({ buildDir });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => {
      server.off("error", reject);
      const address = server.address();
      const actualPort = typeof address === "object" && address ? address.port : port;
      resolve({
        port: actualPort,
        url: `http://127.0.0.1:${actualPort}`,
        close: () => new Promise((closeResolve, closeReject) => {
          server.close((error) => (error ? closeReject(error) : closeResolve()));
        }),
      });
    });
  });
}

if (require.main === module) {
  startAppServer({ port: PORT })
    .then((server) => {
      console.log(`Server listening on ${server.url}`);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = {
  createAppServer,
  createRequestHandler,
  resolveFfmpegPath,
  startAppServer,
};
