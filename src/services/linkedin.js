const voyager = require("./voyagerClient");
const { parseProfile, normalizeSections, extractEntities } = require("../parsers/networkProfile");
const { log } = require("../utils/logging");

function getPublicIdentifier(profileUrl) {
  const match = profileUrl.match(/linkedin\.com\/in\/([^/?#]+)/);
  return match ? match[1] : null;
}

function mapVoyagerError(err) {
  if (err instanceof voyager.VoyagerError) {
    const message = err.message;
    if (message === "CHALLENGE_DETECTED") return "CHALLENGE";
    if (message === "PROFILE_NOT_FOUND") return "NOT_FOUND";
    if (message === "RATE_LIMITED") return "RATE_LIMITED";
    if (
      (err.statusCode === 401 || err.statusCode === 403) &&
      message === "AUTHENTICATION_REQUIRED"
    ) {
      return "LOGIN_WALL";
    }
    return "SCRAPE_FAILED";
  }
  return "SCRAPE_FAILED";
}

async function scrapeProfile(profileUrl, storageState) {
  const publicIdentifier = getPublicIdentifier(profileUrl);
  if (!publicIdentifier) {
    return { state: "NOT_FOUND", profile: null };
  }

  let resolved;
  try {
    resolved = await voyager.resolveMemberId(storageState, publicIdentifier, profileUrl);
  } catch (err) {
    log.warn("MemberId resolution failed", { publicIdentifier, error: err.message });
    return { state: mapVoyagerError(err), profile: null };
  }

  if (!resolved) {
    log.warn("MemberId resolution returned no identity", { publicIdentifier });
    return { state: "NOT_FOUND", profile: null };
  }

  const { memberId, followers } = resolved;
  log.info("Voyager: resolved memberId", { memberId: memberId.slice(0, 8) + "...", publicIdentifier });

  const fullProfile = await voyager.fetchFullProfile(storageState, memberId, profileUrl);
  if (!fullProfile) {
    log.warn("Voyager: full profile fetch failed", { memberId: memberId.slice(0, 8) });
    return { state: "SCRAPE_FAILED", profile: null };
  }

  const sections = await voyager.fetchAllSections(storageState, memberId, profileUrl);

  const networkProfile = parseProfile(extractEntities(fullProfile), memberId);
  if (!networkProfile) {
    log.warn("Voyager: no profile entity found in response");
    return { state: "NOT_FOUND", profile: null };
  }

  const sectionData = normalizeSections(sections);
  if (sectionData.experience.length) networkProfile.experience = sectionData.experience;
  if (sectionData.education.length) networkProfile.education = sectionData.education;
  networkProfile.skills = sectionData.skills;
  networkProfile.certifications = sectionData.certifications;
  networkProfile.languages = sectionData.languages;

  if (!networkProfile.followers && followers) networkProfile.followers = followers;

  log.info("Extraction complete", {
    mode: "voyager",
    fields: {
      name: !!networkProfile.name,
      headline: !!networkProfile.headline,
      location: !!networkProfile.location,
      about: !!networkProfile.about,
      experience: networkProfile.experience.length,
      education: networkProfile.education.length,
      skills: networkProfile.skills.length,
      certifications: networkProfile.certifications.length,
      languages: networkProfile.languages.length,
      followers: networkProfile.followers,
    },
  });

  return { state: "OK", profile: networkProfile };
}

module.exports = { scrapeProfile, getPublicIdentifier };