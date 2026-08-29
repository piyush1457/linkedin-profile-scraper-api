const { log } = require("../src/utils/logging");

function parseArgs(argv) {
  const opts = {
    url: process.env.KEEPALIVE_URL || "http://localhost:3000/health",
    intervalSec: parseInt(process.env.KEEPALIVE_INTERVAL_SEC, 10) || 600,
    timeoutMs: parseInt(process.env.KEEPALIVE_TIMEOUT_MS, 10) || 90000,
    once: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--url") opts.url = argv[++i];
    else if (a === "--interval") opts.intervalSec = parseInt(argv[++i], 10) || 600;
    else if (a === "--timeout") opts.timeoutMs = parseInt(argv[++i], 10) || 90000;
    else if (a === "--once") opts.once = true;
    else if (a === "--help") {
      console.log(`Usage: node scripts/keepalive.js [--url <health-url>] [--interval <seconds>] [--timeout <ms>] [--once]

Pings a URL on a schedule to keep a free cloud instance awake
(Render spins down free instances after ~15 min of no traffic).

Defaults:
  --url       ${opts.url}   (env KEEPALIVE_URL)
  --interval  600 seconds   (env KEEPALIVE_INTERVAL_SEC)
  --timeout   90000 ms      (env KEEPALIVE_TIMEOUT_MS, tolerates cold starts)
  --once      ping a single time and exit

Use the app's /health endpoint - it never touches LinkedIn.
`);
      process.exit(0);
    }
  }

  if (!/^https?:\/\//.test(opts.url)) {
    log.error("Invalid url", { url: opts.url });
    process.exit(1);
  }
  return opts;
}

async function ping(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();
  try {
    const res = await fetch(url, { signal: controller.signal, redirect: "follow" });
    const duration = Date.now() - started;
    log.info("Keepalive ping", { status: res.status, durationMs: duration, url });
    return res.status;
  } catch (err) {
    const duration = Date.now() - started;
    const reason =
      err && err.name === "AbortError"
        ? `timed out after ${timeoutMs}ms (instance may be cold-starting)`
        : err && err.message
          ? err.message
          : String(err);
    log.warn("Keepalive ping failed", { reason, durationMs: duration, url });
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  console.log(`Keepalive started: pinging ${opts.url} every ${opts.intervalSec}s (timeout ${opts.timeoutMs}ms)`);

  do {
    await ping(opts.url, opts.timeoutMs);
    if (opts.once) break;
    await new Promise((resolve) => setTimeout(resolve, opts.intervalSec * 1000));
  } while (true);

  if (opts.once) process.exit(0);
}

process.on("SIGINT", () => {
  log.info("Keepalive stopped (SIGINT)");
  process.exit(0);
});

main().catch((err) => {
  log.error("Keepalive failed", { error: err.message });
  process.exit(1);
});