const fs = require("fs");
const path = require("path");
const { cookieHeaderToStorageState } = require("../src/services/session");

const STORAGE_PATH = path.join(__dirname, "..", "storageState.json");

const USAGE = `
Usage (no browser involved - paste a LinkedIn Cookie header):

  node scripts/apply-cookies.js                      reads LINKEDIN_COOKIE_HEADER env var
  node scripts/apply-cookies.js "<cookie header>"    pastes the header directly

Examples:
  $env:LINKEDIN_COOKIE_HEADER='JSESSIONID=ajax:...; li_at=AQED...; bcookie="v=2&..."'
  node scripts/apply-cookies.js
  node scripts/apply-cookies.js "JSESSIONID=ajax:...; li_at=AQED...; lang=v=2&lang=en-us"

To obtain the cookies: log in to linkedin.com in your own browser, open DevTools
(Network tab), copy the full "cookie:" request header value, and paste it here.
`;

function main() {
  const arg = process.argv[2];
  const cookieHeader = arg || process.env.LINKEDIN_COOKIE_HEADER;

  if (!cookieHeader || !cookieHeader.trim()) {
    console.error(USAGE);
    process.exit(2);
  }

  const state = cookieHeaderToStorageState(cookieHeader);
  if (!state.cookies.length) {
    console.error("ERROR: no cookies parsed. Provide a non-empty cookie header.");
    process.exit(1);
  }

  const names = state.cookies.map((c) => c.name);
  if (!names.includes("li_at") || !names.includes("JSESSIONID")) {
    console.error("WARNING: li_at and/or JSESSIONID missing - session may not authenticate.");
  }

  fs.writeFileSync(STORAGE_PATH, JSON.stringify(state, null, 2));
  console.log(`Saved ${state.cookies.length} cookies -> ${STORAGE_PATH}`);
  console.log("The server auto-loads storageState.json on each request.");
}

main();