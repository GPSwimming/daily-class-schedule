import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const edgeSource = await readFile(new URL("../supabase/functions/swim-admin-gateway/index.ts", import.meta.url), "utf8");
const browserSource = await readFile(new URL("../dist/admin-auth.js", import.meta.url), "utf8");
let handler;
let logoutCalls = 0;
let recoveryCalls = 0;
let recoveryUrl = "";
let recoveryLimited = false;
const fetchMock = async (url, options = {}) => {
  if (url.includes("/auth/v1/recover?")) {
    recoveryCalls += 1;
    recoveryUrl = url;
    assert.equal(JSON.parse(options.body).email, "admin@gpswimming.com");
    return recoveryLimited ? Response.json({ message: "rate limit" }, { status: 429 }) : Response.json({});
  }
  if (url.includes("grant_type=password")) {
    const { email, password } = JSON.parse(options.body);
    if (password !== "test-password") return new Response("{}", { status: 400 });
    return Response.json({ access_token: email === "admin@example.com" ? "admin-token" : "other-token", expires_in: 3600 });
  }
  if (url.endsWith("/auth/v1/user")) {
    if (options.method === "PUT") return Response.json({ id: "admin-id" });
    return Response.json({ id: options.headers.Authorization === "Bearer admin-token" ? "admin-id" : "other-id" });
  }
  if (url.includes("swim_app_admin?")) {
    return Response.json(options.headers.Authorization === "Bearer admin-token" ? [{ user_id: "admin-id" }] : []);
  }
  if (url.includes("swim_app_data?")) {
    return Response.json([{ suite: { catalog: { courses: [{ name: "課程甲", ageGroup: "6 - 11", classSize: "1:1", duration: 60, fee: 100 }], locations: [] } } }]);
  }
  if (url.endsWith("/auth/v1/logout")) { logoutCalls += 1; return Response.json({}); }
  throw new Error("Unexpected URL: " + url);
};
vm.runInNewContext(edgeSource, {
  Deno: { env: { get: (name) => ({ SUPABASE_URL: "https://example.supabase.co", SUPABASE_ANON_KEY: "server-only-test-key" })[name] }, serve: (callback) => { handler = callback; } },
  fetch: fetchMock, Response, console
});
const send = (body, token) => handler(new Request("https://example.supabase.co/functions/v1/swim-admin-gateway", {
  method: "POST",
  headers: { Origin: "https://gpswimming.github.io", "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  body: JSON.stringify(body)
}));

const wrongPassword = await send({ action: "login", email: "admin@example.com", password: "wrong" });
assert.equal(wrongPassword.status, 401, "wrong password is denied");
assert.equal((await send({ action: "request-recovery", email: "invalid" })).status, 400, "invalid recovery email is rejected");
assert.equal((await send({ action: "request-recovery", email: "other@example.com" })).status, 200, "other addresses receive a non-enumerating response");
assert.equal(recoveryCalls, 0, "other addresses are never sent a recovery email");
assert.equal((await send({ action: "request-recovery", email: "admin@gpswimming.com" })).status, 200, "admin can request a password reset");
assert.equal(recoveryCalls, 1);
assert.equal(new URL(recoveryUrl).searchParams.get("redirect_to"), "https://gpswimming.github.io/daily-class-schedule/", "email link returns to the deployed login page");
recoveryLimited = true;
assert.equal((await send({ action: "request-recovery", email: "admin@gpswimming.com" })).status, 429, "mail quota error is explained");
recoveryLimited = false;
const outsider = await send({ action: "login", email: "other@example.com", password: "test-password" });
assert.equal(outsider.status, 403, "valid Auth account without admin allowlist is denied");
assert.equal((await outsider.json()).accessToken, undefined, "outsider never receives an access token");
const admin = await send({ action: "login", email: "admin@example.com", password: "test-password" });
assert.equal(admin.status, 200, "allowlisted administrator can log in");
assert.equal(admin.headers.get("Access-Control-Allow-Origin"), "https://gpswimming.github.io", "deployed site is allowed by CORS");
assert.equal((await admin.json()).accessToken, "admin-token");
assert.equal((await send({ action: "check" })).status, 401, "anonymous session cannot pass check");
assert.equal((await send({ action: "check" }, "admin-token")).status, 200, "administrator session is accepted");
assert.equal((await send({ action: "catalog" })).status, 401, "anonymous visitor cannot read catalog");
const catalogResponse = await send({ action: "catalog" }, "admin-token");
assert.equal(catalogResponse.status, 200, "administrator can read catalog");
assert.equal((await catalogResponse.json()).courses[0].name, "課程甲");
assert.equal((await send({ action: "reset-password", password: "new-secure-password" })).status, 401, "anonymous user cannot change password");
assert.equal((await send({ action: "reset-password", password: "short" }, "admin-token")).status, 400, "weak replacement password is rejected");
assert.equal((await send({ action: "reset-password", password: "new-secure-password" }, "admin-token")).status, 200, "verified admin recovery session can change password");
assert.equal((await send({ action: "logout" }, "admin-token")).status, 200, "administrator can log out");
assert.equal(logoutCalls, 1, "logout revokes the Supabase session");
assert.doesNotMatch(browserSource, /SUPABASE_ANON_KEY|SUPABASE_PUBLISHABLE_KEY|service_role|sb_secret_/, "frontend contains no API key");
assert.doesNotMatch(browserSource, /localStorage|sessionStorage/, "access token is kept only in memory");
let browserAuth;
let scrubbedUrl = "";
vm.runInNewContext(browserSource, {
  window: {
    location: { hash: "#access_token=admin-token&type=recovery", search: "", pathname: "/daily-class-schedule/" },
    history: { replaceState: (_state, _title, url) => { scrubbedUrl = url; } },
    set AdminAuth(value) { browserAuth = value; }
  },
  URLSearchParams, setTimeout, clearTimeout,
  fetch: async (_url, options) => {
    assert.equal(JSON.parse(options.body).action, "check");
    assert.equal(options.headers.Authorization, "Bearer admin-token");
    return Response.json({ ok: true });
  }
});
assert.equal(browserAuth.getRecoveryState().active, true, "recovery link opens the set-password flow");
assert.equal(scrubbedUrl, "/daily-class-schedule/", "secret link fragment is removed from browser history");
assert.equal(await browserAuth.checkRecovery(), true, "recovery token is validated before showing the form");
let expiredAuth;
let expiredUrl = "";
vm.runInNewContext(browserSource, {
  window: {
    location: { hash: "#error=access_denied&error_code=otp_expired", search: "", pathname: "/daily-class-schedule/" },
    history: { replaceState: (_state, _title, url) => { expiredUrl = url; } },
    set AdminAuth(value) { expiredAuth = value; }
  },
  URLSearchParams, setTimeout, clearTimeout,
  fetch: async () => { throw new Error("expired link must not be sent to the gateway"); }
});
assert.equal(expiredAuth.getRecoveryState().active, false, "expired links do not open the set-password form");
assert.match(expiredAuth.getRecoveryState().error, /已過期/, "expired links show a clear message");
assert.equal(expiredUrl, "/daily-class-schedule/", "invalid link details are removed from browser history");
console.log("Admin login tests passed: password, recovery link, allowlist, session and logout.");
