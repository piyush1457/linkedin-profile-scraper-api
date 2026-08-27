function extractEntities(payload) {
  return Array.isArray(payload?.included) ? payload.included : [];
}

function findByType(included, typeName) {
  return included.filter((item) => (item.$type || "").includes(typeName));
}

function getLocalized(obj, direct) {
  if (obj == null) return direct || null;
  if (typeof obj === "string") return obj;
  if (obj.en_US) return obj.en_US;
  const values = Object.values(obj);
  if (values.length && typeof values[0] === "string") return values[0];
  return direct || null;
}

function formatDate(date) {
  if (!date) return null;
  const parts = [];
  if (date.day) parts.push(String(date.day).padStart(2, "0"));
  if (date.month) parts.push(String(date.month).padStart(2, "0"));
  if (date.year) parts.push(String(date.year));
  return parts.length ? parts.join("/") : null;
}

function parseRangeStart(range) {
  if (!range) return null;
  return formatDate(range.start);
}

function parseRangeEnd(range) {
  if (!range || !range.end) return null;
  return formatDate(range.end);
}

function buildDuration(range) {
  if (!range || !range.start) return null;
  const startYear = range.start.year;
  if (!startYear) return null;
  const endYear = range.end ? range.end.year : null;
  return endYear ? `${startYear}-${endYear}` : `${startYear}-Present`;
}

function parseVectorImageUrl(profilePicture) {
  if (!profilePicture) return null;
  try {
    const ref = profilePicture.displayImageReference || profilePicture;
    const vector = ref.vectorImage || ref;
    const root = vector.rootUrl || "";
    const artifacts = vector.artifacts || [];
    if (artifacts.length > 0) {
      const largest = artifacts.reduce((a, b) => (b.width > a.width ? b : a));
      return `${root}${largest.fileIdentifyingUrlPathSegment}`;
    }
    if (root) return root;
  } catch {
    // ignore
  }
  return null;
}

function findCompanyUrl(included, companyUrn) {
  if (!companyUrn) return null;
  const company = included.find((i) => i.entityUrn === companyUrn);
  if (company && typeof company.url === "string" && company.url.startsWith("http")) {
    return company.url;
  }
  const id = companyUrn.split(":").pop();
  if (companyUrn.includes("school")) {
    return `https://www.linkedin.com/school/${id}`;
  }
  return `https://www.linkedin.com/company/${id}/`;
}

function parsePositions(included) {
  const positions = findByType(included, "identity.profile.Position");
  return positions.map((p) => ({
    title: getLocalized(p.multiLocaleTitle, p.title),
    company: getLocalized(p.multiLocaleCompanyName, p.companyName),
    location: p.locationName || getLocalized(p.multiLocaleGeoLocationName, p.geoLocationName) || null,
    startDate: parseRangeStart(p.dateRange),
    endDate: parseRangeEnd(p.dateRange),
    duration: buildDuration(p.dateRange),
    description: getLocalized(p.multiLocaleDescription, p.description),
    companyUrl: findCompanyUrl(included, p.companyUrn),
  }));
}

function parseEducations(included) {
  const educations = findByType(included, "identity.profile.Education");
  return educations.map((e) => ({
    school: getLocalized(e.multiLocaleSchoolName, e.schoolName),
    degree: getLocalized(e.multiLocaleDegreeName, e.degreeName),
    field: getLocalized(e.multiLocaleFieldOfStudy, e.fieldOfStudy),
    startDate: parseRangeStart(e.dateRange),
    endDate: parseRangeEnd(e.dateRange),
    grade: getLocalized(e.multiLocaleGrade, e.grade),
    activities: getLocalized(e.multiLocaleActivities, e.activities),
  }));
}

function parseSkills(included) {
  const skills = findByType(included, "identity.profile.Skill");
  return skills.map((s) => ({
    name: s.name || getLocalized(s.multiLocaleName, null) || null,
    endorsements: typeof s.endorsementCount === "number" ? s.endorsementCount : null,
  }));
}

function parseCertifications(included) {
  const certs = findByType(included, "identity.profile.Certification");
  return certs.map((c) => ({
    name: c.name || getLocalized(c.multiLocaleName, null) || null,
    issuer: c.authority?.name || c.companyName || c.issuingAuthority?.name || null,
    issueDate: formatDate(c.startedOn) || null,
    expiryDate: formatDate(c.completedOn) || null,
    credentialUrl: c.url || (c.licenseNumber ? `https://www.linkedin.com/profile/certifications/${c.licenseNumber}` : null),
  }));
}

function parseLanguages(included) {
  const langs = findByType(included, "identity.profile.Language");
  return langs.map((l) => ({
    language: l.name || getLocalized(l.multiLocaleName, null) || null,
    proficiency: l.proficiency || null,
  }));
}

function lookupGeoName(included, geoUrn) {
  if (!geoUrn) return null;
  const geo = included.find((i) => i.entityUrn === geoUrn);
  if (geo) {
    const name =
      geo.defaultLocalizedName ||
      getLocalized(geo.multiLocaleName, geo.name);
    if (typeof name === "string") return name;
  }
  return null;
}

function resolveCurrentCompany(positions, headline) {
  const current = positions.filter((p) => p.company && !p.endDate);
  if (!current.length) return null;
  if (!headline) return current[0].company;
  const h = headline.toLowerCase();
  for (const p of current) {
    const lower = p.company.toLowerCase();
    if (h.includes(lower)) return p.company;
  }
  for (const p of current) {
    const tokens = p.company.toLowerCase().split(/\s+/).filter((t) => t.length > 3);
    if (tokens.length && tokens.every((t) => h.includes(t))) return p.company;
  }
  return current[0].company;
}

function parseProfile(included, memberId) {
  const candidates = findByType(included, "identity.profile.Profile").filter(
    (i) => i.firstName
  );
  let entity = null;
  if (memberId) {
    const targetUrn = `urn:li:fsd_profile:${memberId}`;
    entity = candidates.find((i) => i.entityUrn === targetUrn) || null;
  }
  if (!entity) entity = candidates[0] || null;
  if (!entity) return null;

  const follows = findByType(included, "FollowingState")[0] || null;
  const positions = parsePositions(included);
  const educations = parseEducations(included);
  const headline = getLocalized(entity.multiLocaleHeadline, entity.headline);

  const location =
    lookupGeoName(included, entity.geoLocation?.geoUrn) ||
    (entity.location?.countryCode ? entity.location.countryCode : null);

  const name =
    entity.firstName && entity.multiLocaleLastName?.en_US
      ? `${entity.firstName} ${entity.multiLocaleLastName.en_US}`
      : entity.firstName || null;

  return {
    name,
    headline,
    location,
    about: getLocalized(entity.multiLocaleSummary, entity.summary),
    profileImageUrl: parseVectorImageUrl(entity.profilePicture),
    bannerImageUrl: parseVectorImageUrl(entity.backgroundPicture),
    currentCompany: resolveCurrentCompany(positions, headline),
    followers: follows && follows.followerCount != null ? String(follows.followerCount) : null,
    experience: positions,
    education: educations,
    skills: parseSkills(included),
    certifications: parseCertifications(included),
    languages: parseLanguages(included),
  };
}

function parseSectionPayload(payload) {
  const included = extractEntities(payload);
  return { included, normalized: null };
}

function normalizeSections(payloads) {
  const result = {
    experience: [],
    education: [],
    skills: [],
    certifications: [],
    languages: [],
  };

  const mapping = {
    profilePositions: "experience",
    profileEducations: "education",
    profileSkills: "skills",
    profileCertifications: "certifications",
    profileLanguages: "languages",
  };

  for (const [key, target] of Object.entries(mapping)) {
    const payload = payloads[key];
    if (!payload) continue;
    const included = extractEntities(payload);
    if (target === "experience") result.experience = parsePositions(included);
    else if (target === "education") result.education = parseEducations(included);
    else if (target === "skills") result.skills = parseSkills(included);
    else if (target === "certifications") result.certifications = parseCertifications(included);
    else if (target === "languages") result.languages = parseLanguages(included);
  }

  return result;
}

module.exports = {
  extractEntities,
  parseProfile,
  normalizeSections,
  getLocalized,
};