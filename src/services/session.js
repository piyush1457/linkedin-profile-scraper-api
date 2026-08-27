const LINKEDIN_DOMAIN = "linkedin.com";

function filterLinkedInCookies(storageState) {
  const cookies = Array.isArray(storageState?.cookies) ? storageState.cookies : [];
  return cookies.filter((c) => {
    const domain = String(c.domain || "").toLowerCase();
    return domain === LINKEDIN_DOMAIN || domain.endsWith(`.${LINKEDIN_DOMAIN}`);
  });
}

function buildCookieHeader(storageState) {
  const cookies = filterLinkedInCookies(storageState);
  if (!cookies.length) return null;
  return cookies.map((c) => `${c.name}=${c.value}`).join("; ");
}

function cookieHeaderToStorageState(cookieHeader) {
  const cookies = [];
  for (const part of String(cookieHeader || "").split(";")) {
    const segment = part.trim();
    if (!segment) continue;
    const eq = segment.indexOf("=");
    if (eq <= 0) continue;
    const name = segment.slice(0, eq).trim();
    let value = segment.slice(eq + 1).trim();
    if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    if (!name) continue;
    cookies.push({
      name,
      value,
      domain: ".linkedin.com",
      path: "/",
      expires: -1,
      httpOnly: false,
      secure: false,
      sameSite: "None",
    });
  }
  return { cookies, origins: [] };
}

function getCookie(storageState, name) {
  const cookies = Array.isArray(storageState?.cookies) ? storageState.cookies : [];
  const cookie = cookies.find((c) => c.name === name);
  return cookie ? cookie.value : null;
}

function getCsrfToken(storageState) {
  const jsession = getCookie(storageState, "JSESSIONID");
  if (jsession && jsession.startsWith("ajax:")) return jsession;
  const origins = Array.isArray(storageState?.origins) ? storageState.origins : [];
  for (const origin of origins) {
    const entry = (origin.localStorage || []).find((e) => e.name === "csrfToken");
    if (entry && typeof entry.value === "string" && entry.value.startsWith("ajax:")) {
      return entry.value;
    }
  }
  return jsession || null;
}

function getViewerId(storageState) {
  const origins = Array.isArray(storageState?.origins) ? storageState.origins : [];
  for (const origin of origins) {
    if (!String(origin.origin).includes("linkedin.com")) continue;
    const badges = (origin.localStorage || []).find((e) => e.name === "voyager-web:badges");
    if (!badges || typeof badges.value !== "string") continue;
    try {
      const parsed = JSON.parse(badges.value);
      if (Array.isArray(parsed) && parsed[0]?._id) return parsed[0]._id;
    } catch {
      // ignore malformed badge data
    }
  }
  return null;
}

function parseSetCookie(str) {
  if (typeof str !== "string") return null;
  const first = str.split(";")[0];
  const eq = first.indexOf("=");
  if (eq < 0) return null;
  return { name: first.slice(0, eq).trim(), value: first.slice(eq + 1).trim() };
}

function isDeletionSetCookie(str) {
  if (typeof str !== "string") return false;
  const lower = str.toLowerCase();
  const first = str.split(";")[0];
  const eq = first.indexOf("=");
  if (eq < 0) return false;
  const value = first.slice(eq + 1).trim().toLowerCase().replace(/^"|"$/g, "");
  return value === "delete me" || value === "" || /max-age=0/.test(lower) || /expires=.*1970/.test(lower);
}

function createCookieJar(storageState) {
  const map = new Map();
  for (const c of filterLinkedInCookies(storageState)) map.set(c.name, c.value);

  return {
    get size() {
      return map.size;
    },
    cookieHeader() {
      return [...map.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
    },
    get(name) {
      return map.get(name) || null;
    },
    applySetCookieHeaders(headers) {
      let arr = [];
      if (headers && typeof headers.getSetCookie === "function") {
        arr = headers.getSetCookie();
      }
      for (const sc of arr) {
        const cookie = parseSetCookie(sc);
        if (!cookie) continue;
        if (isDeletionSetCookie(sc)) {
          map.delete(cookie.name);
        } else {
          map.set(cookie.name, cookie.value);
        }
      }
      return arr.length;
    },
  };
}

let activeJar = null;

function resetJar(storageState) {
  activeJar = createCookieJar(storageState);
  return activeJar;
}

function getSession(storageState) {
  if (!activeJar) activeJar = createCookieJar(storageState);

  const storedCsrf = getCsrfToken(storageState);
  const liveJsession = activeJar.get("JSESSIONID");
  const csrfToken =
    liveJsession && String(liveJsession).startsWith("ajax:") ? liveJsession : storedCsrf;

  return {
    jar: activeJar,
    cookieHeader: activeJar.cookieHeader(),
    csrfToken,
    viewerId: getViewerId(storageState),
    valid: Boolean(activeJar.size && csrfToken),
  };
}

module.exports = {
  filterLinkedInCookies,
  buildCookieHeader,
  cookieHeaderToStorageState,
  getCookie,
  getCsrfToken,
  getViewerId,
  parseSetCookie,
  isDeletionSetCookie,
  createCookieJar,
  resetJar,
  getSession,
};