# Reverse Engineering Notes

## Investigation Setup

- **Tool:** Browser-based network interception + plain Node HTTP client
- **Target:** LinkedIn profile pages and Voyager API for authenticated users
- **Date:** August 2026
- **Method:** Endpoint discovery via request interception, response structure analysis, direct HTTP validation

## LinkedIn 2026 Profile Page Structure

### Key Discovery 1: Major UI Restructuring

LinkedIn's 2026 profile page has undergone a **complete restructuring** from previous versions. The traditional section-based layout with `#experience`, `#education`, `#skills` IDs no longer exists.

### Key Discovery 2: Voyager API Access to Full Profile Data

Although the DOM no longer renders Experience/Education/Skills/Certifications/Languages sections, the data **is available** through LinkedIn's internal **Voyager API**, which the web app calls over authenticated `fetch` requests. These endpoints are hit **directly over HTTPS with Node's native `fetch`** — no browser is involved in extraction.

| Endpoint | Returns |
|---|---|
| `/voyager/api/graphql?...vanityName:{username}...` | Resolves username → member identity + followers |
| `/voyager/api/identity/dash/profiles?q=memberIdentity&memberIdentity={id}&decorationId=FullProfileWithEntities-93` | Full profile: name, headline, about, location, images, **positions**, **educations** |
| `/voyager/api/identity/dash/profilePositions?q=viewee&profileUrn={urn}&count=50` | Experience (positions) |
| `/voyager/api/identity/dash/profileEducations?q=viewee&profileUrn={urn}&count=50` | Education |
| `/voyager/api/identity/dash/profileSkills?q=viewee&profileUrn={urn}&count=50` | Skills |
| `/voyager/api/identity/dash/profileCertifications?q=viewee&profileUrn={urn}&count=50` | Certifications |
| `/voyager/api/identity/dash/profileLanguages?q=viewee&profileUrn={urn}&count=50` | Languages |

**Required headers (observed from LinkedIn's own web client):**

```json
{
  "accept": "application/vnd.linkedin.normalized+json+2.1",
  "accept-language": "en-US,en;q=0.9",
  "cookie": "<full LinkedIn cookie header from session>",
  "csrf-token": "ajax:...",
  "referer": "https://www.linkedin.com/preload/?_bprMode=vanilla",
  "user-agent": "Mozilla/5.0 ... Chrome/151",
  "sec-ch-ua": "\" Not;A Brand\";v=\"99\", \"Google Chrome\";v=\"151\", \"Chromium\";v=\"151\"",
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": "\"Windows\"",
  "sec-ch-prefers-color-scheme": "light",
  "x-li-lang": "en_US",
  "x-li-page-instance": "urn:li:page:d_flagship3_profile_view_base;<random base64>",
  "x-li-pem-metadata": "Voyager - Navigation=voyager-navigation",
  "x-restli-protocol-version": "2.0.0",
  "x-li-track": "{ \"clientVersion\": \"1.13.46243\", ... }"
}
```

**Auth cookie = CSRF token.** The `csrf-token` (`ajax:...` format) is identical to the `JSESSIONID` cookie's value, so it is read straight from the saved session — no browser request interception required.

**Critical anti-logout headers (empirically required).** LinkedIn's abuse layer force-logged-out any session used by a non-browser client that omitted these. Sending a **current** `x-li-track` (matching the live web client version, e.g. `1.13.46243`), a fresh random **`x-li-page-instance`** per request, the current Chrome major (151) in `user-agent`/`sec-ch-ua`, and `sec-ch-prefers-color-scheme` stopped the session invalidation entirely. Notably, the browser's own requests do **not** send `origin` or `sec-fetch-*`, so the client omits them too.

**Browserless mechanics:**
- Requests use `redirect: "manual"` so LinkedIn's session-maintenance redirects can be handled.
- A **cookie jar** applies every `Set-Cookie` from responses (LinkedIn rotates `lidc`/`bscookie` per response).
- If LinkedIn force-logs-out the session (self-redirect + `li_at=delete me` / `Max-Age=0`), the client reports `AUTHENTICATION_REQUIRED` so the app can ask for a fresh login instead of failing obscurely.

### Measurement: API vs DOM Extraction

| Metric | DOM (page source) | Voyager API |
|---|---|---|
| Experience | Not rendered | 5 positions for Satya Nadella |
| Education | Only current school | 3 full degrees |
| Skills | Not rendered | Present when profile exposes them |
| Type | Requires browser rendering | Direct HTTPS JSON |
| Latency | ~20s | ~4s |

### What Changed

| Old LinkedIn (pre-2025) | LinkedIn 2026 |
|---|---|
| H1 tag for name | H2 tag for name |
| `#experience`, `#education` section IDs | No section IDs |
| Separate Experience/Education sections | Company/Education in profile card |
| CSS classes like `.pv-text-details__left-panel` | Obfuscated hash-based classes |
| Lazy-loaded sections with scroll | Sections rendered in profile card |

### Current Page Structure

```
Main Content
├── Profile Card Section
│   ├── Name (H2)
│   ├── Headline (text below name)
│   ├── Location (text with comma pattern)
│   ├── Contact info
│   ├── Current Company (text after Contact info)
│   ├── Education/School (text with University/School/College)
│   └── Followers count
├── About Section (H2 "About")
├── Featured Section (H2 "Featured")
├── Activity Section (H2 "Activity")
├── More profiles for you
├── People you may know
└── You might like
```

### Section Detection Method

Sections are identified by their **H2 heading text**:

```javascript
const sections = Array.from(document.querySelectorAll("section"));
const aboutSection = sections.find(s => {
  const h2 = s.querySelector("h2");
  return h2 && h2.textContent.trim() === "About";
});
```

### Available Data Points

| Field | Source | Extraction Method |
|---|---|---|
| Name | H2 in profile card | First non-navigation H2 |
| Headline | Text after name | First meaningful line after name |
| Location | Text in profile card | Comma-pattern before "Contact info" |
| About | About section | Text content of About section |
| Current Company | Profile card | Text after "Contact info" |
| Education | Profile card | Text containing School/University |
| Profile Image | `img[src*='profile-displayphoto']` | First matching img with width >= 100 |
| Banner Image | `img[alt='Cover photo']` | Direct selector |
| Followers | Text matching `/[\d,]+ followers/` | Regex on page text |

### What's NOT Available via DOM

The following sections are **not rendered** in the LinkedIn 2026 profile page:

- Experience (work history)
- Skills & Endorsements
- Certifications
- Languages
- Projects
- Volunteer Experience

These sections may only be visible to the profile owner or may require additional navigation that's not available to other users.

### Automation Detection

LinkedIn uses multiple detection vectors:

1. **Browser fingerprinting** — TLS fingerprint, WebGL, Canvas
2. **Cookie validation** — Session fingerprinted to browser
3. **Request patterns** — Rate limiting automated access
4. **Security challenges** — CAPTCHA verification modal
5. **Force-logout** — Returns a self-redirect with `Set-Cookie: li_at=delete me; Max-Age=0` when it invalidates the session

### Browserless Client Profile

To keep the endpoints accepting plain HTTP requests, the client mirrors a real browser:

- Full first-party cookie header (`li_at`, `JSESSIONID`, `bcookie`, `bscookie`, `lidc`, ...)
- `csrf-token: <JSESSIONID value>`, `referer: <profile url or preload page>` (no `origin`/`sec-fetch-*`, which the real client omits)
- A current Chrome `user-agent` + `sec-ch-ua`/`sec-ch-ua-platform`/`sec-ch-prefers-color-scheme`
- Current-version `x-li-track`, a fresh random `x-li-page-instance` per request, `x-li-pem-metadata`, `x-restli-protocol-version: 2.0.0`, `accept: application/vnd.linkedin.normalized+json+2.1`
- `redirect: "manual"` + a cookie jar that absorbs every `Set-Cookie` (LinkedIn rotates `lidc`/`bscookie` on each hop)

### Authentication Flow (no browser code in the project)

The codebase contains **no browser automation** — Playwright and all browser
tooling were removed. A session is provided manually:

1. Log in to `linkedin.com` with a throwaway account in a normal browser
2. Copy the `cookie:` request header value from DevTools → Network
3. Set `LINKEDIN_COOKIE_HEADER` (env) or run `npm run cookies` to persist it to `storageState.json`
4. Cookies include: `li_at`, `JSESSIONID`, `bscookie`, etc.
5. Extraction requests reuse those cookies + the `JSESSIONID`-derived CSRF token over direct HTTPS

### Cookie Details

| Cookie | Purpose | Domain |
|---|---|---|
| `li_at` | Primary auth token | `.www.linkedin.com` |
| `JSESSIONID` | CSRF protection (doubles as `csrf-token` header) | `.www.linkedin.com` |
| `bscookie` | Browser session | `.www.linkedin.com` |
| `bcookie` | Browser identifier | `.linkedin.com` |
| `lidc` | Data center routing (rotated per response) | `.linkedin.com` |

### Limitations

1. **Session expiration** — `li_at` cookies expire/are force-invalidated; re-capture the `cookie` header and re-apply it
2. **Rate limiting** — LinkedIn blocks repeated automated access
3. **Security challenges** — CAPTCHA appears after suspicious activity
4. **Profile visibility** — Private profiles expose minimal data
5. **Endpoints change** — Undocumented API paths/decoration IDs can change without notice
6. **Section availability** — Skills/Certifications/Languages are omitted for profiles that hide them
7. **IP-based blocking** — Multiple requests from same IP may be blocked
