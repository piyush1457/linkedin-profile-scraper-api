import { describe, it, expect, afterAll } from "vitest";
const http = require("http");
const app = require("../../src/app");

function listen() {
  return new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(0, () => resolve(server));
  });
}

function get(server, path) {
  return new Promise((resolve, reject) => {
    const req = http.get({ host: "127.0.0.1", port: server.address().port, path }, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => resolve({ status: res.statusCode, type: res.headers["content-type"] || "", body }));
    });
    req.on("error", reject);
  });
}

describe("app routes", () => {
  let server;

  afterAll(() => server && server.close());

  it("serves the demo page at /", async () => {
    server = server || (await listen());
    const res = await get(server, "/");
    expect(res.status).toBe(200);
    expect(res.type).toContain("text/html");
    expect(res.body).toContain("LinkedIn Profile API");
  });

  it("returns health status at /health", async () => {
    server = server || (await listen());
    const res = await get(server, "/health");
    expect(res.status).toBe(200);
    expect(JSON.parse(res.body).status).toBe("ok");
  });

  it("rejects /api/profile without a url", async () => {
    server = server || (await listen());
    const res = await get(server, "/api/profile");
    expect(res.status).toBe(400);
    expect(JSON.parse(res.body).error.code).toBe("INVALID_URL");
  });

  it("rejects /api/profile with an invalid url", async () => {
    server = server || (await listen());
    const res = await get(server, "/api/profile?url=not-a-profile");
    expect(res.status).toBe(400);
    expect(JSON.parse(res.body).error.code).toBe("INVALID_URL");
  });
});