import { describe, it, expect } from "vitest";
const {
  filterLinkedInCookies,
  buildCookieHeader,
  cookieHeaderToStorageState,
  getCookie,
  getCsrfToken,
  getViewerId,
  getSession,
  resetJar,
  parseSetCookie,
  isDeletionSetCookie,
  createCookieJar,
} = require("../../src/services/session");

const fixture = {
  cookies: [
    { name: "JSESSIONID", value: "ajax:1419321801343910493", domain: ".www.linkedin.com" },
    { name: "li_at", value: "AQEDAW06secret", domain: ".www.linkedin.com" },
    { name: "bcookie", value: "v=2&817", domain: ".linkedin.com" },
    { name: "lang", value: "v=2&lang=en-us", domain: ".linkedin.com" },
    { name: "IDE", value: "AHWqTUnK", domain: ".doubleclick.net" },
    { name: "MUID", value: "0C5ADE81", domain: ".bing.com" },
  ],
  origins: [
    {
      origin: "https://www.linkedin.com",
      localStorage: [
        { name: "voyager-web:badges", value: '[{"_id":"ACoAAG06vaYB_l15wHL_esggyfUIcs02EdJ4dWw","tab":"not"}]' },
      ],
    },
  ],
};

describe("session", () => {
  it("filters to first-party LinkedIn cookies only", () => {
    const names = filterLinkedInCookies(fixture).map((c) => c.name);
    expect(names).toContain("JSESSIONID");
    expect(names).toContain("li_at");
    expect(names).toContain("bcookie");
    expect(names).not.toContain("IDE");
    expect(names).not.toContain("MUID");
  });

  it("builds a cookie header from LinkedIn cookies", () => {
    const header = buildCookieHeader(fixture);
    expect(header).toContain("JSESSIONID=ajax:1419321801343910493");
    expect(header).toContain("li_at=AQEDAW06secret");
    expect(header).not.toContain("IDE");
  });

  it("extracts the CSRF token from JSESSIONID", () => {
    expect(getCsrfToken(fixture)).toBe("ajax:1419321801343910493");
  });

  it("falls back to a localStorage csrfToken when JSESSIONID is not ajax-format", () => {
    const state = {
      cookies: [{ name: "JSESSIONID", value: "other", domain: ".www.linkedin.com" }],
      origins: [
        {
          origin: "https://www.linkedin.com",
          localStorage: [{ name: "csrfToken", value: "ajax:123" }],
        },
      ],
    };
    expect(getCsrfToken(state)).toBe("ajax:123");
  });

  it("extracts the viewer identity from cached badges", () => {
    expect(getViewerId(fixture)).toBe("ACoAAG06vaYB_l15wHL_esggyfUIcs02EdJ4dWw");
  });

  it("returns a valid session when cookie + csrf are present", () => {
    const session = getSession(fixture);
    expect(session.valid).toBe(true);
    expect(session.csrfToken).toBe("ajax:1419321801343910493");
    expect(session.viewerId).toBe("ACoAAG06vaYB_l15wHL_esggyfUIcs02EdJ4dWw");
  });

  it("marks session invalid without cookies", () => {
    resetJar({ cookies: [] });
    expect(getSession({ cookies: [] }).valid).toBe(false);
    expect(getCookie({ cookies: [] }, "JSESSIONID")).toBeNull();
  });
});

describe("session cookieHeaderToStorageState", () => {
  it("parses a pasted cookie header into a storage state", () => {
    const header =
      'JSESSIONID=ajax:1178505171016281075; lang=v=2&lang=en-us; bcookie="v=2&e9df12d9"; li_at=AQEDsecret';
    const state = cookieHeaderToStorageState(header);
    expect(state.cookies.length).toBe(4);
    expect(getCookie(state, "JSESSIONID")).toBe("ajax:1178505171016281075");
    expect(getCookie(state, "li_at")).toBe("AQEDsecret");
    expect(getCookie(state, "bcookie")).toBe("v=2&e9df12d9");
    expect(getCsrfToken(state)).toBe("ajax:1178505171016281075");
    resetJar(state);
    expect(getSession(state).valid).toBe(true);
  });

  it("ignores empty segments and junk entries", () => {
    const state = cookieHeaderToStorageState("  ;; JSESSIONID=ajax:1 ; ; =bad ");
    expect(getCookie(state, "JSESSIONID")).toBe("ajax:1");
    expect(state.cookies.length).toBe(1);
  });

  it("returns an empty state for empty input", () => {
    expect(cookieHeaderToStorageState("").cookies).toEqual([]);
    expect(cookieHeaderToStorageState(null).cookies).toEqual([]);
  });
});

describe("session cookie jar", () => {
  it("detects deletion Set-Cookie attributes", () => {
    expect(
      isDeletionSetCookie('li_at=delete me; Version=1; Path=/; Max-Age=0; Secure; SameSite=None; HttpOnly')
    ).toBe(true);
    expect(
      isDeletionSetCookie('li_at="delete me"; Version=1; Path=/; Expires=Thu, 01-Jan-1970 00:00:00 GMT; Max-Age=0')
    ).toBe(true);
    expect(isDeletionSetCookie("lidc=%22b=OGST0%22; path=/; expires=Wed, 28-Aug-2026 00:00:00 GMT")).toBe(false);
  });

  it("applies rotated cookies and removes deleted ones from the jar", () => {
    const jar = createCookieJar(fixture);
    const fakeHeaders = {
      getSetCookie: () => [
        'lidc="b=NEW"; path=/; HttpOnly',
        'li_at=delete me; Path=/; Max-Age=0; Secure; HttpOnly',
      ],
    };
    jar.applySetCookieHeaders(fakeHeaders);

    expect(jar.get("lidc")).toBe('"b=NEW"');
    expect(jar.get("li_at")).toBeNull();
    expect(jar.cookieHeader()).toContain("lidc=");
    expect(jar.cookieHeader()).not.toContain("li_at=");
  });

  it("parses plain Set-Cookie pairs", () => {
    expect(parseSetCookie('lidc="b=X"; path=/')).toEqual({ name: "lidc", value: '"b=X"' });
    expect(parseSetCookie("no-equals-here")).toBeNull();
  });
});