import { describe, it, expect, beforeEach, afterEach } from "vitest";
const { getCookie } = require("../src/services/session");

const ENV_KEYS = [
  "LINKEDIN_COOKIE_HEADER",
  "LINKEDIN_STORAGE_STATE",
  "LINKEDIN_STORAGE_STATE_FILE",
  "PLAYWRIGHT_STORAGE_STATE",
  "PLAYWRIGHT_STORAGE_STATE_FILE",
];

const savedEnv = {};

describe("config session precedence", () => {
  beforeEach(() => {
    for (const k of ENV_KEYS) savedEnv[k] = process.env[k];
  });

  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (savedEnv[k] === undefined) delete process.env[k];
      else process.env[k] = savedEnv[k];
    }
  });

  function loadConfig() {
    for (const key of Object.keys(require.cache)) {
      if (key.replace(/\\/g, "/").endsWith("/src/config.js")) {
        delete require.cache[key];
      }
    }
    return require("../src/config");
  }

  it("prefers LINKEDIN_COOKIE_HEADER over LINKEDIN_STORAGE_STATE", () => {
    process.env.LINKEDIN_COOKIE_HEADER = "JSESSIONID=ajax:111; li_at=AQEDfromenv";
    process.env.LINKEDIN_STORAGE_STATE = JSON.stringify({
      cookies: [{ name: "JSESSIONID", value: "ajax:999", domain: ".linkedin.com" }],
    });
    for (const k of ["LINKEDIN_STORAGE_STATE_FILE", "PLAYWRIGHT_STORAGE_STATE", "PLAYWRIGHT_STORAGE_STATE_FILE"]) {
      delete process.env[k];
    }
    expect(getCookie(loadConfig().storageState, "JSESSIONID")).toBe("ajax:111");
    expect(getCookie(loadConfig().storageState, "li_at")).toBe("AQEDfromenv");
  });

  it("falls back to LINKEDIN_STORAGE_STATE when no cookie header is set", () => {
    delete process.env.LINKEDIN_COOKIE_HEADER;
    process.env.LINKEDIN_STORAGE_STATE = JSON.stringify({
      cookies: [{ name: "JSESSIONID", value: "ajax:999", domain: ".linkedin.com" }],
    });
    for (const k of ["LINKEDIN_STORAGE_STATE_FILE", "PLAYWRIGHT_STORAGE_STATE", "PLAYWRIGHT_STORAGE_STATE_FILE"]) {
      delete process.env[k];
    }
    expect(getCookie(loadConfig().storageState, "JSESSIONID")).toBe("ajax:999");
  });

  it("falls back to storageState.json when no env vars are set", () => {
    for (const k of ENV_KEYS) delete process.env[k];
    const fs = require("fs");
    const path = require("path");
    const file = path.join(__dirname, "..", "storageState.json");
    if (fs.existsSync(file)) {
      expect(loadConfig().storageState).not.toBeNull();
    } else {
      expect(loadConfig().storageState).toBeNull();
    }
  });
});