const config = require("../src/config");
const voyager = require("../src/services/voyagerClient");
const { parseProfile, normalizeSections, extractEntities } = require("../src/parsers/networkProfile");
const { log } = require("../src/utils/logging");

async function main() {
  const url = process.argv[2] || "satyanadella";
  const storageState = config.storageState;
  if (!storageState) {
    log.error("No session configured. Set LINKEDIN_COOKIE_HEADER or provide storageState.json (see npm run cookies).");
    process.exit(1);
  }

  console.log("== BROWSERLESS DIRECT TEST ==");
  const start = Date.now();

  const resolved = await voyager.resolveMemberId(storageState, url);
  if (!resolved) {
    log.error("Failed to resolve memberId");
    process.exit(1);
  }
  console.log(`memberId: ${resolved.memberId}`);
  console.log(`followers (from topcard): ${resolved.followers}`);

  const fullProfile = await voyager.fetchFullProfile(storageState, resolved.memberId);
  if (!fullProfile) {
    log.error("Full profile fetch failed");
    process.exit(1);
  }
  console.log(`fullProfile bytes: ${JSON.stringify(fullProfile).length}`);

  const sections = await voyager.fetchAllSections(storageState, resolved.memberId);
  const profile = parseProfile(extractEntities(fullProfile), resolved.memberId);
  const sectionData = normalizeSections(sections);

  if (sectionData.experience.length) profile.experience = sectionData.experience;
  if (sectionData.education.length) profile.education = sectionData.education;
  profile.skills = sectionData.skills;
  profile.certifications = sectionData.certifications;
  profile.languages = sectionData.languages;
  if (!profile.followers && resolved.followers) profile.followers = resolved.followers;

  console.log("");
  console.log(`name: ${profile.name}`);
  console.log(`headline: ${profile.headline}`);
  console.log(`location: ${profile.location}`);
  console.log(`currentCompany: ${profile.currentCompany}`);
  console.log(`followers: ${profile.followers}`);
  console.log(`about: ${(profile.about || "").slice(0, 80)}`);
  console.log(`experience: ${profile.experience.length}`);
  for (const e of profile.experience) console.log(`  ${e.title} @ ${e.company} | ${e.duration}`);
  console.log(`education: ${profile.education.length}`);
  for (const e of profile.education) console.log(`  ${e.degree || ""} ${e.field || ""} @ ${e.school}`);
  console.log(`skills: ${profile.skills.length} | certifications: ${profile.certifications.length} | languages: ${profile.languages.length}`);

  console.log(`\nDone in ${Date.now() - start}ms (no browser launched)`);
}

main().catch((err) => {
  console.error("Direct test failed:", err.message);
  process.exit(1);
});