const BASE_URL = process.env.API_URL || "http://localhost:3000";

const TEST_PROFILES = [
  "https://www.linkedin.com/in/example/",
];

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    return true;
  } catch (err) {
    console.log(`  ✗ ${name}`);
    console.log(`    ${err.message}`);
    return false;
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg);
}

async function run() {
  console.log("\nLinkedIn Profile API - Test Suite\n");
  let passed = 0;
  let total = 0;

  // Health check
  total++;
  if (
    await test("Health check returns 200", async () => {
      const res = await fetch(`${BASE_URL}/health`);
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      const data = await res.json();
      assert(data.status === "ok", "Status is not ok");
    })
  )
    passed++;

  // Missing URL parameter
  total++;
  if (
    await test("Missing URL returns 400", async () => {
      const res = await fetch(`${BASE_URL}/api/profile`);
      assert(res.status === 400, `Expected 400, got ${res.status}`);
      const data = await res.json();
      assert(data.error.code === "INVALID_URL", "Wrong error code");
    })
  )
    passed++;

  // Invalid URL - not LinkedIn
  total++;
  if (
    await test("Non-LinkedIn URL returns 400", async () => {
      const res = await fetch(`${BASE_URL}/api/profile?url=https://google.com`);
      assert(res.status === 400, `Expected 400, got ${res.status}`);
    })
  )
    passed++;

  // Invalid URL - not profile
  total++;
  if (
    await test("Company URL returns 400", async () => {
      const res = await fetch(
        `${BASE_URL}/api/profile?url=https://www.linkedin.com/company/google`
      );
      assert(res.status === 400, `Expected 400, got ${res.status}`);
    })
  )
    passed++;

  // Hostname spoofing
  total++;
  if (
    await test("Spoofed hostname returns 400", async () => {
      const res = await fetch(
        `${BASE_URL}/api/profile?url=https://www.linkedin.com.evil.com/in/test`
      );
      assert(res.status === 400, `Expected 400, got ${res.status}`);
    })
  )
    passed++;

  // Valid profile URL (may succeed or fail with auth error)
  total++;
  if (
    await test("Valid profile URL returns proper schema", async () => {
      const res = await fetch(
        `${BASE_URL}/api/profile?url=${TEST_PROFILES[0]}`
      );
      const data = await res.json();
      assert("success" in data, "Missing success field");
      assert("profile" in data, "Missing profile field");
      assert("meta" in data, "Missing meta field");
      assert("error" in data, "Missing error field");
      if (data.success) {
        assert(data.profile !== null, "Profile should not be null on success");
        assert("name" in data.profile, "Missing name");
        assert("experience" in data.profile, "Missing experience");
      }
    })
  )
    passed++;

  // Response schema structure
  total++;
  if (
    await test("Error response has correct schema", async () => {
      const res = await fetch(`${BASE_URL}/api/profile`);
      const data = await res.json();
      assert(typeof data.success === "boolean", "success should be boolean");
      assert(Array.isArray(data.profile) === false, "profile should not be array");
      assert(typeof data.meta === "object", "meta should be object");
      assert(typeof data.error === "object", "error should be object");
    })
  )
    passed++;

  // Cache behavior (second request should be faster or cached)
  total++;
  if (
    await test("Cache hit on repeated request", async () => {
      const res = await fetch(
        `${BASE_URL}/api/profile?url=${TEST_PROFILES[0]}`
      );
      const data = await res.json();
      if (data.success) {
        assert(data.meta.cached === true, "Should be cached on second request");
      }
    })
  )
    passed++;

  console.log(`\nResults: ${passed}/${total} passed\n`);
  process.exit(passed === total ? 0 : 1);
}

run().catch((err) => {
  console.error("Test runner failed:", err.message);
  process.exit(1);
});
