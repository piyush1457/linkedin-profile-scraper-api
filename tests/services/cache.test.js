import { describe, it, expect } from "vitest";
const { Cache } = require("../../src/services/cache");

describe("Cache", () => {
  it("stores and retrieves values", () => {
    const cache = new Cache(60);
    cache.set("key1", { data: "hello" });
    expect(cache.get("key1")).toEqual({ data: "hello" });
  });

  it("returns null for missing keys", () => {
    const cache = new Cache(60);
    expect(cache.get("nonexistent")).toBeNull();
  });

  it("expires entries after TTL", () => {
    const cache = new Cache(0.01); // 10ms
    cache.set("key1", "value1");
    return new Promise((resolve) => {
      setTimeout(() => {
        expect(cache.get("key1")).toBeNull();
        resolve();
      }, 50);
    });
  });

  it("has() checks existence without returning value", () => {
    const cache = new Cache(60);
    cache.set("a", 1);
    expect(cache.has("a")).toBe(true);
    expect(cache.has("b")).toBe(false);
  });

  it("overwrites existing keys", () => {
    const cache = new Cache(60);
    cache.set("k", "v1");
    cache.set("k", "v2");
    expect(cache.get("k")).toBe("v2");
  });
});
