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
    assert.match(JSON.parse(options.body).email, /@/);
    return recoveryLimited ? Response.json({ message: "rate limit" }, { status: 429 }) : Response.json({});
  }
  if (url.includes("grant_type=password")) {
    const { email, password } = JSON.parse(options.body);
    if (password !== "test-password") return new Response("{}", { status: 400 });
    return Response.json({ access_token: email === "admin@example.com" ? "admin-token" : email === "coach@example.com" ? "coach-token" : "other-token", expires_in: 3600 });
  }
  if (url.endsWith("/auth/v1/user")) {
    if (options.method === "PUT") return Response.json({ id: "admin-id" });
    return Response.json({ id: options.headers.Authorization === "Bearer admin-token" ? "admin-id" : options.headers.Authorization === "Bearer coach-token" ? "coach-id" : "other-id" });
  }
  if (url.includes("swim_app_admin?")) {
    return Response.json(options.headers.Authorization === "Bearer admin-token" ? [{ user_id: "admin-id" }] : []);
  }
  if (url.includes("swim_tutor_portal?")) {
    return Response.json(options.headers.Authorization === "Bearer coach-token" ? [{ email: "coach@example.com", user_id: "coach-id", snapshot: { profiles: [{ name: "Alex 感統" }, { name: "Alex 進階" }], summary: { classes: 2, hours: 1 }, assignments: [{ id: "lesson-1", date: "2026-11-12", students: [{ id: "student-1", name: "小明" }] }] } }] : []);
  }
  if (url.includes("swim_tutor_leave?")) return Response.json([]);
  if (url.endsWith("/rest/v1/swim_tutor_leave")) return Response.json({});
  if (url.includes("swim_tutor_attendance?")) return Response.json([]);
  if (url.endsWith("/rest/v1/swim_tutor_attendance")) return Response.json([{ id: "att-1", status: JSON.parse(options.body).status }]);
  if (url.endsWith("/rest/v1/rpc/swim_sync_tutor_portals")) return Response.json(1);
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
assert.equal(recoveryCalls, 1, "coach addresses can request a recovery email without revealing account membership");
assert.equal((await send({ action: "request-recovery", email: "admin@gpswimming.com" })).status, 200, "admin can request a password reset");
assert.equal(recoveryCalls, 2);
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
const coach = await send({ action: "login", email: "coach@example.com", password: "test-password" });
assert.equal(coach.status, 200, "linked coach can log in");
assert.equal((await coach.json()).role, "tutor");
assert.equal((await send({ action: "catalog" }, "coach-token")).status, 403, "coach cannot read admin catalog");
const portal = await send({ action: "tutor-portal" }, "coach-token");
assert.equal(portal.status, 200, "coach can read only own portal");
assert.equal((await portal.json()).snapshot.summary.hours, 1);
assert.equal((await send({ action: "tutor-attendance", lessonId: "lesson-1", studentId: "student-1", status: "present" }, "coach-token")).status, 200, "coach can mark an assigned student present");
assert.equal((await send({ action: "tutor-attendance", lessonId: "lesson-1", studentId: "someone-else", status: "present" }, "coach-token")).status, 403, "coach cannot mark an unassigned student");
assert.equal((await send({ action: "attendance-list" }, "coach-token")).status, 403, "coach cannot see administrator attendance queue");
assert.equal((await send({ action: "attendance-list" }, "admin-token")).status, 200, "admin can review attendance");
assert.equal((await send({ action: "sync-tutors", items: [] }, "coach-token")).status, 403, "coach cannot write portal snapshots");
assert.equal((await send({ action: "tutor-leave", startDate: "2026-11-20", endDate: "2026-11-21", reason: "請假" }, "coach-token")).status, 200, "coach can submit leave request");
assert.equal((await send({ action: "sync-tutors", items: [{ email: "coach@example.com", snapshot: {} }] }, "admin-token")).status, 200, "admin can sync coach snapshots");
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
