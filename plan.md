# LinkedIn Profile API — Final 9+/10 Implementation Plan

> **Goal:** Build, test, document, and publicly deploy a reliable LinkedIn Profile API within a 3-day / ~18–20 hour challenge window.
>
> **Strategy:** Keep scope small, make the reverse-engineering evidence concrete, prioritize a working deployed API, and only add stretch features after the core submission is production-ready.

---

# 1. Challenge Objective

Build a publicly hosted HTTPS API that:

1. Accepts a LinkedIn profile URL.
2. Authenticates using a dedicated LinkedIn session where required.
3. Extracts profile information available to the account.
4. Returns that information using an application-owned JSON schema.
5. Handles missing sections and expected failure states gracefully.
6. Uses caching, rate limiting, concurrency limits, and timeouts.
7. Keeps credentials and session state out of the repository.
8. Includes focused automated tests.
9. Includes strong documentation of the reverse-engineering process and technical decisions.

## Required profile fields

- Name
- Headline
- Location
- About
- Experience
- Education
- Skills
- Certifications
- Languages
- Profile image(s), when available

Additional sections are optional.

---

# 2. Timebox

Target:

**3 days / approximately 18–20 focused hours**

The objective is not to build the largest scraper possible.

The objective is to submit the strongest reliable implementation possible within the time limit.

## Priority order

```text
Working API
    >
Deployment
    >
Reverse-engineering evidence
    >
Core error handling
    >
Security
    >
Testing
    >
README/API documentation
    >
Optional improvements
    >
Frontend
```

### Non-negotiable rule

Do not cut:

- deployment,
- credential security,
- core error handling,
- URL validation,
- required profile fields,
- or meaningful tests

in order to add optional profile sections or UI features.

---

# 3. Definition of Done

The project is ready for submission when:

- [ ] Valid `linkedin.com/in/...` URLs are accepted.
- [ ] Invalid URLs are rejected.
- [ ] Required profile fields are returned where available.
- [ ] Missing sections do not crash the entire response.
- [ ] Data is normalized into an application-owned schema.
- [ ] Authentication/session state works.
- [ ] Expired/invalid authentication is detected.
- [ ] Login-wall/challenge states are detected where practical.
- [ ] Profile-not-found behavior is classified where practical.
- [ ] Requests have timeouts.
- [ ] Concurrent scrapes are bounded.
- [ ] API requests are rate-limited.
- [ ] Successful responses are cached.
- [ ] No credentials/session cookies are committed.
- [ ] Focused automated tests pass.
- [ ] `/health` works.
- [ ] Public HTTPS deployment works.
- [ ] Live end-to-end tests have been performed.
- [ ] README explains setup, API, architecture, reverse engineering, security, deployment, and limitations.
- [ ] Repository contains no accidental secrets or generated session state.

---

# 4. Technology Stack

## Backend

- Node.js
- Express
- Playwright

## Validation

- Zod or equivalent schema validation

## Testing

- Vitest or Jest

## Deployment

- Render or Railway

## Cache

- In-memory TTL cache

Do not introduce Redis unless it is genuinely necessary.

## Why this stack?

It is intentionally small.

Node.js + Express provides the HTTP service, while Playwright provides authenticated browser automation and browser-context isolation. This avoids introducing unnecessary infrastructure for a single-instance hiring challenge.

---

# 5. Phase 1 — Reverse Engineer LinkedIn Before Building the Scraper

## Timebox

**Maximum: 3 hours**

Do not spend the entire challenge reverse engineering.

The purpose is to collect enough evidence to make an informed architectural decision.

## 5.1 Use a dedicated account

- [ ] Use a dedicated/throwaway LinkedIn account.
- [ ] Do not use the main personal account.
- [ ] Do not commit credentials.
- [ ] Do not commit cookies.
- [ ] Do not commit `storageState.json`.

## 5.2 Manual investigation

Use a real browser.

Open:

```text
DevTools
  ↓
Network
  ↓
Fetch/XHR
```

Inspect:

- Initial profile navigation.
- `/voyager/api/...` requests.
- Requests triggered by scrolling.
- Requests triggered by expanding sections.
- Request methods.
- Relevant non-secret headers.
- Response structures.
- Which responses contain profile information.
- Authentication requirements.
- Lazy-loaded sections.
- Pagination behavior.
- Login-wall behavior.
- Challenge/CAPTCHA behavior.
- Profile-not-found behavior.

Do not attempt to bypass CAPTCHA or other security challenges. Detect them and report the state.

## 5.3 What must come out of the investigation

The output is **not** merely:

> "I inspected the Network tab."

Produce concrete findings.

For example:

| Observation | Finding | Decision |
|---|---|---|
| Initial profile request | Contains X | Use / ignore |
| Experience loading | Data appears in Y | Use network response / DOM |
| Lazy-loaded section | Triggered after scroll | Browser extraction required |
| Authentication | Session required | Use Playwright storage state |
| Missing section | Section absent | Return empty array |

The actual contents must reflect what was genuinely observed.

## 5.4 Reverse-engineering notes

Create:

```text
docs/reverse-engineering.md
```

Recommended structure:

```text
# Reverse Engineering Notes

## Investigation Setup

## Initial Profile Navigation

## Observed Voyager Requests

## Authentication Behavior

## Lazy Loading

## Data Available From Network Responses

## Data Available From Rendered DOM

## Extraction Decision

## Limitations
```

Never include:

- passwords,
- `li_at`,
- session cookies,
- access tokens,
- complete storage state,
- other authentication secrets.

---

# 6. Phase 1 Decision — Choose the Extraction Strategy

Do not assume the answer before investigation.

Use this decision tree:

```text
Reverse engineering
       ↓
Do authenticated network responses
reliably contain required data?
       │
   ┌───┴────┐
  YES       NO
   │         │
   ↓         ↓
Network   Does rendered browser
strategy  state reliably expose it?
             │
         ┌───┴────┐
        YES       NO
         │         │
         ↓         ↓
       DOM      Hybrid/fallback
```

More explicitly:

### Option A — Network/API extraction

Use when observed authenticated responses reliably contain the required information.

### Option B — Playwright DOM extraction

Use when required information is more reliably available in the rendered page.

### Option C — Hybrid

Use structured network responses where useful and browser-rendered extraction where necessary.

### Important decision rule

If still undecided at the end of the 3-hour investigation:

> **Choose the simplest working approach supported by the evidence.**

Do not claim that DOM scraping is inherently more robust.

The README must explain the final choice.

---

# 7. Phase 2 — Repository Structure

Target:

```text
linkedin-profile-api/
│
├── src/
│   ├── app.js
│   ├── server.js
│   │
│   ├── routes/
│   │   ├── profile.js
│   │   └── health.js
│   │
│   ├── services/
│   │   ├── linkedin.js
│   │   ├── browser.js
│   │   ├── profileService.js
│   │   └── cache.js
│   │
│   ├── parsers/
│   │   ├── profile.js
│   │   ├── experience.js
│   │   ├── education.js
│   │   ├── skills.js
│   │   ├── certifications.js
│   │   ├── languages.js
│   │   └── additionalSections.js
│   │
│   ├── middleware/
│   │   ├── rateLimit.js
│   │   ├── timeout.js
│   │   └── errorHandler.js
│   │
│   ├── schemas/
│   │   └── profile.js
│   │
│   └── utils/
│       ├── url.js
│       └── logging.js
│
├── scripts/
│   ├── login.js
│   └── test-api.js
│
├── tests/
│   ├── parsers/
│   ├── routes/
│   ├── services/
│   └── utils/
│
├── docs/
│   └── reverse-engineering.md
│
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

Keep the structure modular but avoid unnecessary abstractions.

---

# 8. Phase 3 — Define the API Contract Early

Define the schema before implementing all parsers.

## Endpoint

```http
GET /api/profile?url=<linkedin-profile-url>
```

## Health

```http
GET /health
```

## Suggested response

```json
{
  "success": true,
  "profile": {
    "name": null,
    "headline": null,
    "location": null,
    "about": null,
    "profileImageUrl": null,
    "experience": [],
    "education": [],
    "skills": [],
    "certifications": [],
    "languages": []
  },
  "meta": {
    "sourceUrl": "",
    "cached": false,
    "scrapedAt": ""
  }
}
```

Additional sections may be added if they are reliable and inexpensive.

Do not make optional profile fields a reason to delay the core implementation.

---

# 9. Phase 4 — Authentication and Session State

## 9.1 Local login script

Create:

```text
scripts/login.js
```

Flow:

```text
Run login script
    ↓
Open browser
    ↓
User logs into LinkedIn manually
    ↓
Complete 2FA manually if required
    ↓
Save Playwright storage state
```

The generated file must be ignored by Git.

## 9.2 Deployment secret

Use:

```text
PLAYWRIGHT_STORAGE_STATE
```

The secret contains serialized Playwright storage state.

The server should:

```text
startup
  ↓
read PLAYWRIGHT_STORAGE_STATE
  ↓
parse JSON
  ↓
validate expected structure
  ↓
initialize browser
```

If parsing/configuration fails, fail clearly with a server configuration error.

Do not allow malformed authentication configuration to become a mysterious scraping failure.

## 9.3 Session expiration

Detect when the authenticated state is no longer usable.

Expected classification:

```text
AUTHENTICATION_REQUIRED
```

Do not return:

```text
success: true
```

with empty profile data when authentication has actually failed.

README must explain how to regenerate the session.

---

# 10. Phase 5 — Browser Lifecycle

Do not launch a browser process for every request.

Use:

```text
Server startup
    ↓
Launch browser
    ↓
Load authentication state
    ↓
Request arrives
    ↓
Create isolated browser context
    ↓
Navigate
    ↓
Extract
    ↓
Close context
```

Requirements:

- [ ] Reuse browser process.
- [ ] New context per request.
- [ ] Close context after request.
- [ ] Configure navigation timeout.
- [ ] Configure extraction timeout.
- [ ] Configure overall request timeout.
- [ ] Handle browser crash.
- [ ] Graceful shutdown.

This is a core architecture decision and should be explained briefly in the README.

---

# 11. Phase 6 — URL Validation

Only accept LinkedIn profile URLs.

Accept:

```text
https://www.linkedin.com/in/example/
https://linkedin.com/in/example/
```

Reject:

```text
https://linkedin.com/company/example
https://linkedin.com/jobs/...
https://linkedin.com/search/...
https://google.com/?url=linkedin.com/in/example
https://linkedin.com.evil.com/in/example
```

Requirements:

- [ ] Parse using the platform URL parser.
- [ ] Validate hostname exactly.
- [ ] Validate `/in/` path.
- [ ] Normalize URL.
- [ ] Use normalized URL as cache key.

This is also a security boundary.

---

# 12. Phase 7 — Extraction and Parsing

Implement only the required sections first:

```text
parseProfile()
parseExperience()
parseEducation()
parseSkills()
parseCertifications()
parseLanguages()
```

Each parser must tolerate:

- missing section,
- empty section,
- missing fields,
- minor structural variation,
- unexpected text.

One section failing must not automatically destroy the entire profile response.

## Example

If certifications cannot be extracted:

```json
{
  "certifications": []
}
```

rather than crashing the request.

If the entire scrape failed because authentication was lost, return an error instead.

These two situations must not be conflated.

---

# 13. Phase 8 — Normalize Into an Application-Owned Schema

Never expose raw LinkedIn internal structures as your public API contract.

Pipeline:

```text
LinkedIn
   ↓
Network / DOM extraction
   ↓
Section parser
   ↓
Normalization
   ↓
Application schema
   ↓
Schema validation
   ↓
API response
```

Example experience item:

```json
{
  "title": null,
  "company": null,
  "location": null,
  "startDate": null,
  "endDate": null,
  "duration": null,
  "description": null,
  "companyUrl": null
}
```

This gives the API a stable contract even if LinkedIn's internal structures change.

---

# 14. Phase 9 — Authentication, Challenge, and Profile-State Detection

Prioritize correct failure classification over extracting optional fields.

Minimum states:

```text
INVALID_URL
AUTHENTICATION_REQUIRED
PROFILE_NOT_FOUND
RATE_LIMITED
SCRAPE_FAILED
```

Where practical, additionally distinguish:

```text
CHALLENGE_DETECTED
PRIVATE_PROFILE
LINKEDIN_UNAVAILABLE
NAVIGATION_TIMEOUT
```

Do not bypass CAPTCHA or security challenges.

If a challenge is detected, stop extraction and return a clear error.

## Suggested HTTP mapping

| State | HTTP |
|---|---:|
| Invalid URL | 400 |
| Authentication required | 401 |
| Private/restricted access | 403 |
| Profile not found | 404 |
| Rate limited | 429 |
| Upstream/network failure | 502 |
| Unexpected server error | 500 |

The exact mapping can be adjusted based on observed behavior, but errors must be consistent and documented.

---

# 15. Phase 10 — Caching

Use an in-memory TTL cache.

Flow:

```text
Request
   ↓
Normalize URL
   ↓
Cache lookup
   ├── HIT → return cached result
   └── MISS
          ↓
        scrape
          ↓
        validate
          ↓
        cache
          ↓
        return
```

Starting configuration:

```text
CACHE_TTL_SECONDS=10800
```

Requirements:

- [ ] Cache successful profile responses.
- [ ] Configurable TTL.
- [ ] Normalize URL before cache lookup.
- [ ] Avoid long-lived caching of authentication/challenge failures.

## Optional: request coalescing

If time allows, prevent simultaneous identical cache misses:

```text
Request A ─┐
Request B ─┼─→ same profile currently scraping
Request C ─┘

        ↓

one scrape
        ↓
all requests receive result
```

This is a stretch improvement, not a core requirement.

---

# 16. Phase 11 — Rate Limiting and Scrape Concurrency

Implement two separate protections.

## API rate limit

Initial target:

```text
10 requests / minute / IP
```

Tune if required during testing.

## Scrape concurrency

Initial target:

```text
Maximum concurrent scrapes: 2
```

Flow:

```text
Incoming requests
       ↓
Rate limiter
       ↓
Cache
       ↓
Concurrency limiter
       ↓
Playwright
```

Also implement:

- request timeout,
- navigation timeout,
- extraction timeout,
- clear 429 response.

Do not allow unlimited browser contexts to run simultaneously.

---

# 17. Phase 12 — Logging

Add basic structured logs.

Useful fields:

```text
requestId
profileUrl
cacheHit
duration
status
errorCode
```

Example:

```text
requestId=abc123
cacheHit=false
duration=2841ms
status=success
```

Never log:

- passwords,
- cookies,
- `li_at`,
- storage state,
- authentication headers,
- unnecessary sensitive profile information.

---

# 18. Phase 13 — Focused Automated Tests

Target:

**10–12 high-value tests**

The goal is coverage of the failure-prone boundaries, not a large test count.

## URL validation

1. [ ] Valid profile URL.
2. [ ] Missing URL.
3. [ ] Malformed URL.
4. [ ] Non-profile LinkedIn URL.
5. [ ] Hostname spoofing such as `linkedin.com.evil.com`.

## Parser/schema

6. [ ] Complete profile parses correctly.
7. [ ] Missing section returns empty/null appropriately.
8. [ ] Partially populated section does not crash.
9. [ ] Final response satisfies the application schema.

## Service behavior

10. [ ] Authentication failure is classified correctly.
11. [ ] Cache hit avoids a second scrape.
12. [ ] Rate limit returns 429 when exceeded.

If time allows, add explicit challenge/timeout tests.

Most tests should mock the scraper/network layer rather than repeatedly hitting LinkedIn.

---

# 19. Phase 14 — Early Deployment Smoke Test

This is mandatory and should happen **before Day 3**.

Do not wait until the finished scraper is ready to discover that the deployment environment cannot launch Playwright correctly.

## End of Day 1 target

Deploy a minimal version containing:

```text
Node server
    ↓
/health
    ↓
Playwright startup
```

Verify:

- [ ] Deployment succeeds.
- [ ] HTTPS works.
- [ ] Node process starts.
- [ ] Playwright can launch.
- [ ] `/health` returns 200.
- [ ] Environment secrets can be configured.

This is a smoke test, not the final deployment.

It removes a major late-stage risk.

---

# 20. Phase 15 — Final Deployment

Once extraction and tests are working:

```text
GitHub
   ↓
Render/Railway
   ↓
Environment secrets
   ↓
Node.js server
   ↓
Playwright
   ↓
LinkedIn
```

Verify:

- [ ] Production build starts.
- [ ] Playwright starts.
- [ ] Authentication state loads.
- [ ] `/health` works.
- [ ] Valid profile request works.
- [ ] Invalid URL returns expected error.
- [ ] Authentication failure is classified.
- [ ] Cache works.
- [ ] Rate limit works.
- [ ] HTTPS endpoint is publicly reachable.

---

# 21. Phase 16 — Live End-to-End Testing

Test the actual deployed API, not just localhost.

## Valid profile

Expected:

```text
HTTP 200
success: true
valid schema
```

## Invalid URL

Expected:

```text
HTTP 400
```

## Nonexistent/unavailable profile

Expected the most accurate supported error classification.

## Authentication failure

Expected:

```text
HTTP 401
AUTHENTICATION_REQUIRED
```

## Repeated request

```text
First request → scrape
Second request → cache hit
```

## Rate limit

```text
Excess requests → HTTP 429
```

Record basic observations such as:

- response time,
- cache behavior,
- which fields are consistently available,
- which sections are unreliable.

---

# 22. Phase 17 — README

README is a deliverable, not an afterthought.

Recommended structure:

```text
# LinkedIn Profile API

## Live Demo

## Overview

## Features

## Architecture

## Reverse Engineering

## Extraction Strategy

## Project Structure

## API Documentation

## Response Schema

## Error Codes

## Local Setup

## Authentication Setup

## Running Tests

## Deployment

## Security

## Known Limitations

## Technical Tradeoffs

## Future Improvements
```

## README must answer

### What does it do?

One concise paragraph.

### How do I call it?

Give a working API example.

### How did you reverse engineer LinkedIn?

Summarize actual observations from `docs/reverse-engineering.md`.

### Why this extraction strategy?

Explain the evidence-based decision between network responses, DOM extraction, or hybrid.

### Why Playwright?

Explain authenticated browser state, rendering, lazy-loaded sections, and browser context isolation.

### Why this schema?

Explain why the public contract is normalized instead of exposing internal LinkedIn structures.

### What happens when the session expires?

Explain regeneration.

### What happens when LinkedIn shows a challenge?

Explain detection and failure behavior.

### How are secrets protected?

Explain environment/deployment secrets and `.gitignore`.

---

# 23. Phase 18 — Security Audit

Before submission:

```text
git status
git diff
repository search
```

Check for:

- [ ] `.env` absent.
- [ ] `storageState.json` absent.
- [ ] Cookies absent.
- [ ] `li_at` absent.
- [ ] Passwords absent.
- [ ] Tokens absent.
- [ ] Auth headers absent.
- [ ] Secrets absent from README/docs.
- [ ] Sensitive values absent from logs.

`.gitignore` should cover at minimum:

```text
.env
.env.*
storageState.json
playwright/.auth/
node_modules/
```

Adjust based on actual generated files.

---

# 24. Phase 19 — Known Limitations

README should explicitly document:

- LinkedIn UI changes can break DOM extraction.
- Undocumented internal APIs can change.
- Authenticated sessions can expire.
- CAPTCHA/challenge pages can prevent extraction.
- 2FA may require manual intervention.
- Private/restricted profiles may not expose required information.
- Some sections may be absent.
- Account permissions can affect visibility.
- Profile information changes over time.
- Process-local cache is not shared across multiple instances.
- Horizontal scaling would require shared cache/concurrency coordination.
- Automated access may result in LinkedIn restrictions.
- The implementation does not guarantee compliance with LinkedIn's Terms of Service.

Do not present limitations as hidden problems.

Explain how the service handles them.

---

# 25. Phase 20 — Optional Improvements

Only attempt these after the core submission is complete.

Priority:

```text
1. Better challenge detection
2. Better parser resilience
3. Request coalescing
4. Additional profile sections
5. Postman collection
6. Small frontend
```

Optional profile sections:

- Projects
- Volunteering
- Honors
- Publications
- Awards
- Courses
- Interests

Do not sacrifice core reliability for these.

---

# 26. Optional API Test Script

Create:

```text
scripts/test-api.js
```

It should test the deployed API and print:

```text
✓ Health check
✓ Profile endpoint
✓ Response schema
✓ Required fields
✓ Error handling
✓ Cache behavior
```

A Postman collection can be used instead if that is faster.

You do not need both.

---

# 27. Three-Day Execution Schedule

# Day 1 — Investigation + Foundation

### Block 1 — Reverse engineering

**Maximum 3 hours**

- [ ] Dedicated account.
- [ ] DevTools Network inspection.
- [ ] Voyager investigation.
- [ ] Authentication investigation.
- [ ] Lazy-loading investigation.
- [ ] Capture concrete findings.

### Block 2 — Documentation

- [ ] `docs/reverse-engineering.md`
- [ ] Record evidence and decisions.

### Block 3 — Architecture

- [ ] Choose network / DOM / hybrid strategy.
- [ ] Define schema.
- [ ] Create repository.
- [ ] Scaffold Express.
- [ ] Add URL validation.
- [ ] Add environment configuration.

### Block 4 — Authentication

- [ ] Create login script.
- [ ] Generate storage state.
- [ ] Verify authenticated browser context locally.

### Block 5 — Deployment smoke test

- [ ] Deploy minimal server.
- [ ] Verify HTTPS.
- [ ] Verify `/health`.
- [ ] Verify Playwright can launch remotely.

**End-of-Day-1 milestone:**

```text
Reverse engineering complete
+
Architecture chosen
+
Schema defined
+
Authenticated browser works
+
Production environment proven
```

---

# Day 2 — Core Implementation

### Block 1 — Browser lifecycle

- [ ] Browser singleton/process.
- [ ] Context per request.
- [ ] Timeouts.
- [ ] Shutdown handling.

### Block 2 — Extraction

- [ ] Profile parser.
- [ ] Experience parser.
- [ ] Education parser.
- [ ] Skills parser.
- [ ] Certifications parser.
- [ ] Languages parser.

### Block 3 — Normalization

- [ ] Normalize data.
- [ ] Validate schema.
- [ ] Handle missing fields.

### Block 4 — Error handling

- [ ] Authentication state.
- [ ] Profile state.
- [ ] Challenge detection if practical.
- [ ] Timeouts.
- [ ] Upstream failures.

### Block 5 — API

- [ ] `/api/profile`
- [ ] `/health`
- [ ] Error responses.

### Block 6 — Reliability

- [ ] Cache.
- [ ] Rate limiting.
- [ ] Concurrency limit.
- [ ] Logging.

**End-of-Day-2 milestone:**

```text
Local API works
+
Required fields extracted
+
Failures classified
+
Cache/rate limits work
```

---

# Day 3 — Validation + Submission

### Block 1 — Tests

- [ ] 10–12 focused tests.
- [ ] URL validation.
- [ ] Parser behavior.
- [ ] Schema validation.
- [ ] Auth failure.
- [ ] Cache.
- [ ] Rate limit.

### Block 2 — Production

- [ ] Configure deployment secrets.
- [ ] Deploy final version.
- [ ] Verify Playwright.
- [ ] Verify `/health`.

### Block 3 — Live E2E

- [ ] Valid profile.
- [ ] Invalid URL.
- [ ] Error cases.
- [ ] Cache.
- [ ] Rate limit.
- [ ] Measure response behavior.

### Block 4 — README

- [ ] API documentation.
- [ ] Setup.
- [ ] Reverse-engineering summary.
- [ ] Architecture.
- [ ] Technical decisions.
- [ ] Security.
- [ ] Limitations.

### Block 5 — Repository audit

- [ ] Remove debugging code.
- [ ] Check Git status.
- [ ] Search for secrets.
- [ ] Check `.gitignore`.
- [ ] Verify production URL.
- [ ] Verify repository is public.
- [ ] Verify README examples work.

### Block 6 — Optional polish

Only if everything above is complete:

- [ ] Postman collection or test script.
- [ ] Better logs.
- [ ] Request coalescing.
- [ ] Extra profile fields.
- [ ] Tiny frontend.

---

# 28. Final Repository Structure

```text
linkedin-profile-api/
│
├── src/
│   ├── app.js
│   ├── server.js
│   │
│   ├── routes/
│   │   ├── profile.js
│   │   └── health.js
│   │
│   ├── services/
│   │   ├── linkedin.js
│   │   ├── browser.js
│   │   ├── profileService.js
│   │   └── cache.js
│   │
│   ├── parsers/
│   │   ├── profile.js
│   │   ├── experience.js
│   │   ├── education.js
│   │   ├── skills.js
│   │   ├── certifications.js
│   │   ├── languages.js
│   │   └── additionalSections.js
│   │
│   ├── middleware/
│   │   ├── rateLimit.js
│   │   ├── timeout.js
│   │   └── errorHandler.js
│   │
│   ├── schemas/
│   │   └── profile.js
│   │
│   └── utils/
│       ├── url.js
│       └── logging.js
│
├── scripts/
│   ├── login.js
│   └── test-api.js
│
├── tests/
│   ├── parsers/
│   ├── routes/
│   ├── services/
│   └── utils/
│
├── docs/
│   └── reverse-engineering.md
│
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

# 29. Final Submission Checklist

## API

- [ ] Public HTTPS endpoint.
- [ ] `GET /api/profile`.
- [ ] `GET /health`.
- [ ] Valid URL handling.
- [ ] Structured response.
- [ ] Required fields.

## Reverse engineering

- [ ] Actual Network inspection performed.
- [ ] Voyager behavior documented.
- [ ] Authentication behavior documented.
- [ ] Lazy loading documented.
- [ ] Extraction decision justified.
- [ ] No secrets in documentation.

## Reliability

- [ ] Browser process reused.
- [ ] Context isolation.
- [ ] Timeouts.
- [ ] Error classification.
- [ ] Cache.
- [ ] Rate limit.
- [ ] Concurrency limit.

## Security

- [ ] No credentials in Git.
- [ ] No cookies in Git.
- [ ] No storage state in Git.
- [ ] Secrets configured through deployment environment.
- [ ] Sensitive values not logged.
- [ ] URL validation.

## Testing

- [ ] 10–12 focused tests.
- [ ] Parser tests.
- [ ] URL tests.
- [ ] Schema test.
- [ ] Authentication failure test.
- [ ] Cache test.
- [ ] Rate-limit test.

## Deployment

- [ ] Early deployment smoke test completed.
- [ ] Final production deployment works.
- [ ] HTTPS works.
- [ ] Playwright works remotely.
- [ ] Authentication state loads.
- [ ] Live API tested.

## Documentation

- [ ] Setup.
- [ ] API usage.
- [ ] Response schema.
- [ ] Error codes.
- [ ] Reverse engineering.
- [ ] Architecture.
- [ ] Technical tradeoffs.
- [ ] Security.
- [ ] Deployment.
- [ ] Limitations.

---

# 30. What Not to Build

Do not spend challenge time on:

- Kubernetes.
- Microservices.
- PostgreSQL.
- Redis without a real need.
- Complex job queues.
- API authentication.
- Automatic LinkedIn account creation.
- Multiple scraping accounts.
- Complex frontend.
- Large-scale scraping infrastructure.
- Dozens of optional profile sections.
- Elaborate observability systems.

The evaluator is more likely to reward:

```text
Correct
+
Reliable
+
Tested
+
Deployed
+
Well documented
```

than:

```text
Complex
+
Over-engineered
+
Incomplete
```

---

# 31. Target Architecture

```text
                    Client
                      │
                      ▼
             GET /api/profile
                      │
                      ▼
                URL Validator
                      │
                      ▼
                 Rate Limiter
                      │
                      ▼
                    Cache
                 /         \
              HIT           MISS
               │              │
               │        Concurrency Limit
               │              │
               │              ▼
               │       Authenticated Browser
               │              │
               │       ┌──────┴──────┐
               │       ▼             ▼
               │   Network/API      DOM
               │       │             │
               │       └──────┬──────┘
               │              ▼
               │       Section Parsers
               │              │
               │              ▼
               │        Normalization
               │              │
               │              ▼
               │        Schema Validation
               │              │
               └──────────────┤
                              ▼
                         JSON Response
```

The actual network/DOM branches depend on the reverse-engineering findings.

---

# 32. Final Quality Target

The intended submission quality is approximately:

| Area | Target |
|---|---:|
| Reverse engineering | 9.5/10 |
| API implementation | 9/10 |
| Architecture | 9/10 |
| Reliability | 9/10 |
| Security | 9/10 |
| Testing | 9/10 |
| Documentation | 9.5–10/10 |
| Deployment | 9/10 |
| **Overall target** | **9.2–9.4/10** |

The score target comes from execution quality, not feature count.

---

# 33. Core Principle

The project should tell a coherent engineering story:

```text
I investigated how LinkedIn loads profile data
                    ↓
I used those findings to choose an extraction strategy
                    ↓
I isolated browser/session state
                    ↓
I normalized unstable source data into a stable API
                    ↓
I handled predictable failure states explicitly
                    ↓
I protected the service with caching/rate limits/timeouts
                    ↓
I tested the important boundaries
                    ↓
I deployed it publicly
                    ↓
I documented the tradeoffs and limitations
```

That is the standard this plan is designed to achieve.

**Scope is frozen after this point unless a change directly improves reliability or fixes a blocker.**
