const { getSession } = require("./session");
const { log } = require("../utils/logging");
const { randomBytes } = require("crypto");

const BASE_URL = "https://www.linkedin.com/voyager/api";

const PRELOAD_REFERER = "https://www.linkedin.com/preload/?_bprMode=vanilla";

const DECORATIONS = [
  "com.linkedin.voyager.dash.deco.identity.profile.FullProfileWithEntities-93",
  "com.linkedin.voyager.dash.deco.identity.profile.FullProfileWithEntities-91",
  "com.linkedin.voyager.dash.deco.identity.profile.FullProfileWithEntities-35",
];

const TOPCARD_QUERY_ID =
  "voyagerIdentityDashProfiles.a1a483e719b20537a256b6853cdca711";

class VoyagerError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.name = "VoyagerError";
    this.statusCode = statusCode;
  }
}

function platformHeaders(extra = {}) {
  return {
    "sec-ch-ua": '" Not;A Brand";v="99", "Google Chrome";v="151", "Chromium";v="151"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "sec-ch-prefers-color-scheme": "light",
    "x-li-lang": "en_US",
    "x-li-page-instance": `urn:li:page:d_flagship3_profile_view_base;${randomBytes(16).toString("base64")}`,
    "x-li-pem-metadata": "Voyager - Navigation=voyager-navigation",
    "x-restli-protocol-version": "2.0.0",
    "x-li-track": JSON.stringify({
      clientVersion: "1.13.46243",
      mpVersion: "1.13.46243",
      osName: "web",
      timezoneOffset: 5.5,
      timezone: "Asia/Calcutta",
      deviceFormFactor: "DESKTOP",
      mpName: "voyager-web",
      displayDensity: 1,
      displayWidth: 1280,
      displayHeight: 720,
    }),
    ...extra,
  };
}

function buildApiHeaders(session, referer) {
  return {
    accept: "application/vnd.linkedin.normalized+json+2.1",
    "accept-language": "en-US,en;q=0.9",
    cookie: session.cookieHeader,
    "csrf-token": session.csrfToken,
    referer: referer || PRELOAD_REFERER,
    "user-agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.7922.34 Safari/537.36",
    ...platformHeaders(),
  };
}

async function apiFetch(storageState, path, { method = "GET", body = null, referer = null } = {}) {
  const session = getSession(storageState);
  if (!session.valid) {
    throw new VoyagerError(401, "No valid LinkedIn session (cookies/CSRF missing)");
  }

  let url = `${BASE_URL}${path}`;
  const controller = new AbortController();
  const timeoutMs = 30000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    for (let hop = 0; hop < 6; hop++) {
      let response;
      try {
        response = await fetch(url, {
          method,
          headers: buildApiHeaders(session, referer),
          body: method !== "GET" ? body : undefined,
          signal: controller.signal,
          redirect: "manual",
        });
      } catch (err) {
        if (err.name === "AbortError") {
          throw new VoyagerError(408, `Voyager request timed out after ${timeoutMs}ms`);
        }
        const cause = err.cause ? `${err.message} (cause: ${err.cause.message || err.cause.code || err.cause})` : err.message;
        throw new VoyagerError(502, `Voyager network error: ${cause}`);
      }

      // Persist any cookies LinkedIn rotates per response (lidc, bscookie, JSESSIONID)
      const updated = session.jar.applySetCookieHeaders(response.headers);

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) throw new VoyagerError(502, "Voyager redirect without location");
        if (process.env.VOYAGER_DEBUG) {
          log.warn("Voyager redirect hop", {
            hop,
            from: url,
            to: location,
            setCookies: response.headers.getSetCookie ? response.headers.getSetCookie() : [],
          });
        }
        // A self-redirect that deletes auth cookies means the session was invalidated
        if (new URL(location, url).toString() === url && updated > 0 && !session.jar.get("li_at")) {
          throw new VoyagerError(401, "AUTHENTICATION_REQUIRED");
        }
        url = new URL(location, url).toString();
        continue;
      }

      const text = await response.text();
      let parsed = null;
      try {
        parsed = JSON.parse(text);
      } catch {
        // non-JSON response
      }
      return { status: response.status, parsed, raw: text };
    }

    throw new VoyagerError(502, "Too many redirects while reaching LinkedIn Voyager");
  } finally {
    clearTimeout(timer);
  }
}

function isChallengeBody(text) {
  return /challenge|captcha|_captcha\/util|recaptcha/i.test(text || "");
}

function assertOk(res, context) {
  if (res.status === 200) return;
  log.warn("Voyager non-200", { context, status: res.status });
  if (res.status === 401 || res.status === 403) {
    throw new VoyagerError(res.status, isChallengeBody(res.raw) ? "CHALLENGE_DETECTED" : "AUTHENTICATION_REQUIRED");
  }
  if (res.status === 404) throw new VoyagerError(404, "PROFILE_NOT_FOUND");
  if (res.status === 429) throw new VoyagerError(429, "RATE_LIMITED");
  throw new VoyagerError(res.status, "SCRAPE_FAILED");
}

function extractProfiles(included) {
  return (included || []).filter((item) => (item.$type || "").includes("identity.profile.Profile"));
}

function resolveMemberFromEntities(included, publicIdentifier, viewerId) {
  const profiles = extractProfiles(included);
  const candidate = profiles.find((p) => p.publicIdentifier === publicIdentifier);
  if (candidate) return candidate;

  const foreign = profiles.filter(
    (p) => p.firstName && (!viewerId || !String(p.entityUrn || "").includes(viewerId))
  );
  return foreign[0] || profiles[0] || null;
}

function extractFollowers(included, profileEntity) {
  const targetFollowingState =
    typeof profileEntity?.followingState === "string" ? profileEntity.followingState : null;
  const followingStates = (included || []).filter((item) =>
    (item.$type || "").includes("FollowingState")
  );
  if (followingStates.length === 0) return null;

  let entity = null;
  if (targetFollowingState) {
    entity = followingStates.find((f) => f.entityUrn === targetFollowingState) || null;
  }
  if (!entity) entity = followingStates[0];
  return entity && entity.followerCount != null ? String(entity.followerCount) : null;
}

async function resolveMemberId(storageState, publicIdentifier, referer) {
  const query = `/graphql?includeWebMetadata=true&variables=(vanityName:${encodeURIComponent(publicIdentifier)})&queryId=${TOPCARD_QUERY_ID}`;
  const res = await apiFetch(storageState, query, { referer });
  assertOk(res, "topcard");

  const bodyStr = JSON.stringify(res.parsed);
  const included = res.parsed?.included || [];
  const viewerId = getSession(storageState).viewerId;
  const profileEntity = resolveMemberFromEntities(included, publicIdentifier, viewerId);

  let memberId = null;
  if (profileEntity?.entityUrn) {
    memberId = String(profileEntity.entityUrn).split(":").pop();
  }
  if (!memberId) {
    const match = bodyStr.match(/urn:li:fsd_profile:([A-Za-z0-9_-]{10,})/);
    if (match) memberId = match[1];
  }
  if (!memberId) return null;

  const followers = extractFollowers(included, profileEntity);
  return { memberId, followers };
}

async function fetchFullProfile(storageState, memberId, referer) {
  for (const decoration of DECORATIONS) {
    try {
      const path = `/identity/dash/profiles?q=memberIdentity&memberIdentity=${memberId}&decorationId=${encodeURIComponent(decoration)}`;
      const res = await apiFetch(storageState, path, { referer });
      if (res.status === 200 && res.parsed && JSON.stringify(res.parsed).length > 1000) {
        return res.parsed;
      }
    } catch (err) {
      log.warn("Full profile fetch failed", { decoration, error: err.message });
    }
  }
  return null;
}

async function fetchSection(storageState, section, memberId, referer) {
  const urn = encodeURIComponent(`urn:li:fsd_profile:${memberId}`);
  const res = await apiFetch(
    storageState,
    `/identity/dash/${section}?q=viewee&profileUrn=${urn}&count=50`,
    { referer }
  );
  assertOk(res, section);
  return res.parsed;
}

async function fetchAllSections(storageState, memberId, referer) {
  const sections = {
    profilePositions: null,
    profileEducations: null,
    profileSkills: null,
    profileCertifications: null,
    profileLanguages: null,
  };

  const names = Object.keys(sections);
  for (let i = 0; i < names.length; i++) {
    const section = names[i];
    try {
      sections[section] = await fetchSection(storageState, section, memberId, referer);
    } catch (err) {
      log.warn("Section fetch failed", { section, error: err.message });
    }
    if (i < names.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
  }

  return sections;
}

module.exports = {
  VoyagerError,
  apiFetch,
  assertOk,
  resolveMemberId,
  fetchFullProfile,
  fetchSection,
  fetchAllSections,
  buildApiHeaders,
};