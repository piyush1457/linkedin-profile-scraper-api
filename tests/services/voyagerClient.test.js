import { describe, it, expect } from "vitest";
const { buildApiHeaders, assertOk, VoyagerError, apiFetch } = require("../../src/services/voyagerClient");

const session = {
  cookieHeader: "JSESSIONID=ajax:1419; li_at=AQED",
  csrfToken: "ajax:1419321801343910493",
  valid: true,
};

describe("voyagerClient.buildApiHeaders", () => {
  it("includes session cookie, CSRF, and Voyager headers", () => {
    const h = buildApiHeaders(session);
    expect(h.cookie).toBe("JSESSIONID=ajax:1419; li_at=AQED");
    expect(h["csrf-token"]).toBe("ajax:1419321801343910493");
    expect(h.accept).toBe("application/vnd.linkedin.normalized+json+2.1");
    expect(h["x-restli-protocol-version"]).toBe("2.0.0");
    expect(h.referer).toBe("https://www.linkedin.com/preload/?_bprMode=vanilla");
    expect(h["x-li-page-instance"]).toMatch(/^urn:li:page:d_flagship3_profile_view_base;/);
    expect(h["sec-ch-prefers-color-scheme"]).toBe("light");
    expect(h["user-agent"]).toContain("Chrome/151");
    expect(typeof h["x-li-track"]).toBe("string");
    expect(() => JSON.parse(h["x-li-track"])).not.toThrow();
  });
});

describe("voyagerClient.assertOk", () => {
  it("passes on 200", () => {
    expect(() => assertOk({ status: 200, raw: "" }, "ctx")).not.toThrow();
  });

  it("maps 401/403 without challenge to AUTHENTICATION_REQUIRED", () => {
    try {
      assertOk({ status: 403, raw: "<html>denied</html>" }, "ctx");
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(VoyagerError);
      expect(err.message).toBe("AUTHENTICATION_REQUIRED");
    }
  });

  it("maps 403 with challenge body to CHALLENGE_DETECTED", () => {
    try {
      assertOk({ status: 403, raw: '{"data":"challenge required"}' }, "ctx");
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(VoyagerError);
      expect(err.message).toBe("CHALLENGE_DETECTED");
    }
  });

  it("maps 404 and 429 to typed errors", () => {
    try {
      assertOk({ status: 404, raw: "" }, "ctx");
    } catch (err) {
      expect(err.statusCode).toBe(404);
      expect(err.message).toBe("PROFILE_NOT_FOUND");
    }
    try {
      assertOk({ status: 429, raw: "" }, "ctx");
    } catch (err) {
      expect(err.statusCode).toBe(429);
      expect(err.message).toBe("RATE_LIMITED");
    }
  });
});

describe("voyagerClient.apiFetch", () => {
  it("throws without a valid session", async () => {
    await expect(
      apiFetch({ cookies: [] }, "/identity/dash/profiles?x=1")
    ).rejects.toMatchObject({ statusCode: 401 });
  });
});