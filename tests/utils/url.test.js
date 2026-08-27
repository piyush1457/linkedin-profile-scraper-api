import { describe, it, expect } from "vitest";
const { validateLinkedInProfileUrl } = require("../../src/utils/url");

describe("validateLinkedInProfileUrl", () => {
  it("accepts valid profile URL", () => {
    const result = validateLinkedInProfileUrl("https://www.linkedin.com/in/johndoe/");
    expect(result.valid).toBe(true);
    expect(result.normalized).toBe("https://www.linkedin.com/in/johndoe/");
    expect(result.slug).toBe("johndoe");
  });

  it("accepts URL without www", () => {
    const result = validateLinkedInProfileUrl("https://linkedin.com/in/johndoe");
    expect(result.valid).toBe(true);
  });

  it("accepts URL with extra path segments", () => {
    const result = validateLinkedInProfileUrl("https://www.linkedin.com/in/johndoe/detail/recent-activity/");
    expect(result.valid).toBe(true);
    expect(result.slug).toBe("johndoe");
  });

  it("rejects missing URL", () => {
    expect(validateLinkedInProfileUrl(null).valid).toBe(false);
    expect(validateLinkedInProfileUrl(undefined).valid).toBe(false);
    expect(validateLinkedInProfileUrl("").valid).toBe(false);
  });

  it("rejects non-string input", () => {
    expect(validateLinkedInProfileUrl(123).valid).toBe(false);
  });

  it("rejects malformed URL", () => {
    expect(validateLinkedInProfileUrl("not-a-url").valid).toBe(false);
  });

  it("rejects HTTP URLs", () => {
    const result = validateLinkedInProfileUrl("http://www.linkedin.com/in/johndoe");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("INVALID_URL");
  });

  it("rejects non-LinkedIn domains", () => {
    expect(validateLinkedInProfileUrl("https://google.com/in/johndoe").valid).toBe(false);
    expect(validateLinkedInProfileUrl("https://www.linkedin.com.evil.com/in/johndoe").valid).toBe(false);
  });

  it("rejects company URLs", () => {
    const result = validateLinkedInProfileUrl("https://www.linkedin.com/company/google");
    expect(result.valid).toBe(false);
  });

  it("rejects job URLs", () => {
    expect(validateLinkedInProfileUrl("https://www.linkedin.com/jobs/view/123").valid).toBe(false);
  });

  it("rejects search URLs", () => {
    expect(validateLinkedInProfileUrl("https://www.linkedin.com/search/results/people/").valid).toBe(false);
  });

  it("rejects profile URL with no slug", () => {
    expect(validateLinkedInProfileUrl("https://www.linkedin.com/in/").valid).toBe(false);
  });

  it("normalizes URL consistently", () => {
    const r1 = validateLinkedInProfileUrl("https://linkedin.com/in/john");
    const r2 = validateLinkedInProfileUrl("https://www.linkedin.com/in/john?trk=public_profile");
    expect(r1.normalized).toBe(r2.normalized);
  });
});
