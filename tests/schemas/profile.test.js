import { describe, it, expect } from "vitest";
const { ProfileSchema, ApiResponseSchema } = require("../../src/schemas/profile");

const baseProfile = {
  name: null, headline: null, location: null, about: null,
  profileImageUrl: null, bannerImageUrl: null,
  currentCompany: null, followers: null,
  experience: [], education: [], skills: [], certifications: [], languages: [],
};

describe("ProfileSchema", () => {
  it("accepts a complete valid profile", () => {
    const result = ProfileSchema.safeParse({
      ...baseProfile,
      name: "John Doe",
      headline: "Software Engineer",
      location: "San Francisco, CA",
      about: "About me text",
      profileImageUrl: "https://example.com/photo.jpg",
      currentCompany: "ACME",
      followers: "1,234",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a profile with all null fields", () => {
    const result = ProfileSchema.safeParse(baseProfile);
    expect(result.success).toBe(true);
  });

  it("rejects profile with missing required fields", () => {
    const result = ProfileSchema.safeParse({ name: "John" });
    expect(result.success).toBe(false);
  });

  it("validates experience items", () => {
    const result = ProfileSchema.safeParse({
      ...baseProfile,
      experience: [
        { title: "Engineer", company: "ACME", location: null, startDate: null, endDate: null, duration: null, description: null, companyUrl: null },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("validates skill items with numeric endorsements", () => {
    const result = ProfileSchema.safeParse({
      ...baseProfile,
      skills: [{ name: "JavaScript", endorsements: 10 }],
    });
    expect(result.success).toBe(true);
  });
});

describe("ApiResponseSchema", () => {
  it("accepts a successful response", () => {
    const result = ApiResponseSchema.safeParse({
      success: true,
      profile: baseProfile,
      meta: { sourceUrl: "https://www.linkedin.com/in/test/", cached: false, scrapedAt: "2024-01-01T00:00:00.000Z" },
      error: null,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a failed response with null profile", () => {
    const result = ApiResponseSchema.safeParse({
      success: false,
      profile: null,
      meta: { sourceUrl: "", cached: false, scrapedAt: null },
      error: { code: "PROFILE_NOT_FOUND", message: "Not found" },
    });
    expect(result.success).toBe(true);
  });
});
