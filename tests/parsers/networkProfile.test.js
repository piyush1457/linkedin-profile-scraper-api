import { describe, it, expect } from "vitest";
const { parseProfile, normalizeSections } = require("../../src/parsers/networkProfile");
const { fullProfileFixture, skillsFixture, languagesFixture } = require("../fixtures/voyager");

describe("networkProfile.parseProfile", () => {
  it("parses basic info, experience, education from FullProfileWithEntities payload", () => {
    const profile = parseProfile(fullProfileFixture.included);

    expect(profile.name).toBe("Satya Nadella");
    expect(profile.headline).toBe("Chairman and CEO at Microsoft");
    expect(profile.about).toBe("As chairman and CEO of Microsoft.");
    expect(profile.location).toBe("Redmond, Washington, United States");
    expect(profile.profileImageUrl).toBe(
      "https://media.licdn.com/dms/image/C5603AQ/test/profile-displayphoto-shrink_400_400/photo.jpg"
    );
    expect(profile.bannerImageUrl).toContain("banner.jpg");
  });

  it("sorts experience with dates and company URLs", () => {
    const profile = parseProfile(fullProfileFixture.included);
    expect(profile.experience).toHaveLength(2);

    const ceo = profile.experience[0];
    expect(ceo.title).toBe("Chairman and CEO");
    expect(ceo.company).toBe("Microsoft");
    expect(ceo.location).toBe("Greater Seattle Area");
    expect(ceo.startDate).toBe("02/2014");
    expect(ceo.endDate).toBeNull();
    expect(ceo.duration).toBe("2014-Present");
    expect(ceo.companyUrl).toBe("https://www.linkedin.com/company/microsoft/");

    const chairman = profile.experience[1];
    expect(chairman.startDate).toBe("2021");
    expect(chairman.endDate).toBe("2023");
    expect(chairman.duration).toBe("2021-2023");
  });

  it("sets currentCompany to the position matching the headline", () => {
    const profile = parseProfile(fullProfileFixture.included);
    expect(profile.currentCompany).toBe("Microsoft");
  });

  it("resolves currentCompany when multiple roles are ongoing", () => {
    const { fullProfileFixture } = require("../fixtures/voyager");
    const profile = parseProfile([
      ...fullProfileFixture.included,
      {
        entityUrn: "urn:li:fsd_profilePosition:(test,1)",
        $type: "com.linkedin.voyager.dash.identity.profile.Position",
        title: "Member Board Of Trustees",
        companyName: "University of Chicago",
        multiLocaleCompanyName: { en_US: "University of Chicago" },
        dateRange: {
          start: { year: 2018, $type: "com.linkedin.common.Date" },
          $type: "com.linkedin.common.DateRange",
        },
      },
    ]);
    expect(profile.currentCompany).toBe("Microsoft");
  });

  it("parses education entities", () => {
    const profile = parseProfile(fullProfileFixture.included);
    expect(profile.education).toHaveLength(1);
    expect(profile.education[0].school).toBe("Manipal Institute of Technology, Manipal");
    expect(profile.education[0].degree).toBe("Bachelor's Degree");
    expect(profile.education[0].field).toBe("Electrical Engineering");
  });

  it("returns null when no profile entity present", () => {
    expect(parseProfile([])).toBeNull();
  });

  it("picks the profile entity matching memberId when others are present", () => {
    const included = [
      ...fullProfileFixture.included,
      {
        entityUrn: "urn:li:fsd_profile:OTHER_MEMBER",
        $type: "com.linkedin.voyager.dash.identity.profile.Profile",
        firstName: "Jay",
        multiLocaleLastName: { en_US: "Kamat" },
        headline: "ECE MASc student at University of Toronto",
      },
    ];
    const memberId = "OTHER_MEMBER";
    const profile = parseProfile(included, memberId);
    expect(profile.name).toBe("Jay Kamat");
  });

  it("falls back to first profile entity when memberId has no match", () => {
    const profile = parseProfile(fullProfileFixture.included, "NO_SUCH_MEMBER");
    expect(profile.name).toBe("Satya Nadella");
  });
});

describe("networkProfile.normalizeSections", () => {
  it("parses skills with endorsement counts", () => {
    const result = normalizeSections({ profileSkills: skillsFixture });
    expect(result.skills).toHaveLength(1);
    expect(result.skills[0].name).toBe("JavaScript");
    expect(result.skills[0].endorsements).toBe(42);
  });

  it("parses languages with proficiency", () => {
    const result = normalizeSections({ profileLanguages: languagesFixture });
    expect(result.languages).toHaveLength(1);
    expect(result.languages[0].language).toBe("English");
    expect(result.languages[0].proficiency).toBe("NATIVE_OR_BILINGUAL");
  });

  it("returns empty arrays for missing payloads", () => {
    const result = normalizeSections({});
    expect(result.experience).toEqual([]);
    expect(result.education).toEqual([]);
    expect(result.skills).toEqual([]);
    expect(result.certifications).toEqual([]);
    expect(result.languages).toEqual([]);
  });
});