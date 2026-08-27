function validateLinkedInProfileUrl(input) {
  if (!input || typeof input !== "string") {
    return { valid: false, error: "INVALID_URL", message: "URL is required" };
  }

  let url;
  try {
    url = new URL(input.trim());
  } catch {
    return { valid: false, error: "INVALID_URL", message: "Malformed URL" };
  }

  if (url.protocol !== "https:") {
    return { valid: false, error: "INVALID_URL", message: "Only HTTPS URLs are accepted" };
  }

  const hostname = url.hostname.toLowerCase();
  if (hostname !== "www.linkedin.com" && hostname !== "linkedin.com") {
    return { valid: false, error: "INVALID_URL", message: "Not a LinkedIn domain" };
  }

  const pathParts = url.pathname.split("/").filter(Boolean);
  if (pathParts.length < 2 || pathParts[0] !== "in" || !pathParts[1]) {
    return { valid: false, error: "INVALID_URL", message: "Not a LinkedIn profile URL" };
  }

  const slug = pathParts[1].split("?")[0];
  const normalized = `https://www.linkedin.com/in/${slug}/`;

  return { valid: true, normalized, slug };
}

module.exports = { validateLinkedInProfileUrl };
