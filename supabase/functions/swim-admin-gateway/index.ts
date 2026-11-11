// Public entry point for password login. Every authenticated action checks
// both the Supabase Auth session and the RLS-protected admin allowlist.
const projectUrl = Deno.env.get("SUPABASE_URL") || "";
const apiKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";
const administratorEmail = "admin@gpswimming.com";
const recoveryReturnUrl = "https://gpswimming.github.io/daily-class-schedule/";
const allowedOrigins = new Set([
  "https://gpswimming.github.io",
  "http://127.0.0.1:4173",
  "http://localhost:4173"
]);

function headers(origin) {
  return {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Vary": "Origin",
    ...(allowedOrigins.has(origin) ? {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "authorization, content-type"
    } : {})
  };
}

function reply(status, body, origin) {
  return new Response(JSON.stringify(body), { status, headers: headers(origin) });
}

async function isAdmin(token) {
  const commonHeaders = { apikey: apiKey, Authorization: "Bearer " + token };
  const [user, allowlist] = await Promise.all([
    fetch(projectUrl + "/auth/v1/user", { headers: commonHeaders }),
    fetch(projectUrl + "/rest/v1/swim_app_admin?select=user_id&limit=1", { headers: commonHeaders })
  ]);
  if (!user.ok || !allowlist.ok) return false;
  const profile = await user.json();
  const rows = await allowlist.json();
  return Boolean(profile.id && Array.isArray(rows) && rows.length === 1 && rows[0].user_id === profile.id);
}

Deno.serve(async (request) => {
  const origin = request.headers.get("Origin") || "";
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: headers(origin) });
  if (request.method !== "POST") return reply(405, { message: "不支援此操作。" }, origin);
  if (!projectUrl || !apiKey) return reply(503, { message: "登入服務尚未完成設定。" }, origin);
  if (Number(request.headers.get("content-length")) > 8192) return reply(413, { message: "要求過大。" }, origin);

  try {
    const body = await request.json();
    if (!body || typeof body !== "object") return reply(400, { message: "要求格式錯誤。" }, origin);

    if (body.action === "request-recovery") {
      if (typeof body.email !== "string" || body.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
        return reply(400, { message: "請輸入有效電郵地址。" }, origin);
      }
      // Keep the public response identical for every address; only the current admin may receive mail.
      if (body.email.trim().toLowerCase() !== administratorEmail) return reply(200, { ok: true }, origin);
      const response = await fetch(projectUrl + "/auth/v1/recover?redirect_to=" + encodeURIComponent(recoveryReturnUrl), {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: apiKey },
        body: JSON.stringify({ email: administratorEmail })
      });
      if (response.status === 429) return reply(429, { message: "重設郵件發送次數已達上限，請稍後再試。" }, origin);
      if (!response.ok) return reply(503, { message: "暫時無法發送重設郵件。請檢查 Supabase 發信設定後再試。" }, origin);
      return reply(200, { ok: true }, origin);
    }

    if (body.action === "login") {
      if (typeof body.email !== "string" || typeof body.password !== "string" || body.email.length > 254 || body.password.length > 1024) {
        return reply(400, { message: "請輸入有效的電郵及密碼。" }, origin);
      }
      const authResponse = await fetch(projectUrl + "/auth/v1/token?grant_type=password", {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: apiKey },
        body: JSON.stringify({ email: body.email, password: body.password })
      });
      if (!authResponse.ok) return reply(401, { message: "電郵或密碼錯誤，或帳戶尚未確認。" }, origin);
      const session = await authResponse.json();
      if (!session.access_token || !(await isAdmin(session.access_token))) {
        return reply(403, { message: "此帳戶沒有網站管理員權限。" }, origin);
      }
      return reply(200, { accessToken: session.access_token, expiresIn: session.expires_in }, origin);
    }

    const token = (request.headers.get("Authorization") || "").match(/^Bearer ([^\s]+)$/)?.[1];
    if (!token || !(await isAdmin(token))) return reply(401, { message: "登入已失效，請重新登入。" }, origin);
    if (body.action === "check") return reply(200, { ok: true }, origin);
    if (body.action === "reset-password") {
      if (typeof body.password !== "string" || body.password.length < 12 || body.password.length > 1024) {
        return reply(400, { message: "新密碼至少需要 12 個字元。" }, origin);
      }
      const response = await fetch(projectUrl + "/auth/v1/user", {
        method: "PUT",
        headers: { "Content-Type": "application/json", apikey: apiKey, Authorization: "Bearer " + token },
        body: JSON.stringify({ password: body.password })
      });
      if (!response.ok) return reply(400, { message: "無法更新密碼。請重新發送重設電郵，並使用最新連結。" }, origin);
      return reply(200, { ok: true }, origin);
    }
    if (body.action === "catalog") {
      const response = await fetch(projectUrl + "/rest/v1/swim_app_data?select=suite&limit=1", {
        headers: { apikey: apiKey, Authorization: "Bearer " + token }
      });
      if (!response.ok) return reply(503, { message: "暫時無法讀取受保護資料。" }, origin);
      const rows = await response.json();
      const catalog = rows[0]?.suite?.catalog;
      if (!Array.isArray(catalog?.courses) || !Array.isArray(catalog?.locations)) {
        return reply(503, { message: "受保護課程及地點資料尚未完成遷移。" }, origin);
      }
      return reply(200, { courses: catalog.courses, locations: catalog.locations }, origin);
    }
    if (body.action === "logout") {
      await fetch(projectUrl + "/auth/v1/logout", { method: "POST", headers: { apikey: apiKey, Authorization: "Bearer " + token } });
      return reply(200, { ok: true }, origin);
    }
    return reply(400, { message: "不支援此操作。" }, origin);
  } catch {
    return reply(503, { message: "登入服務暫時無法使用，請稍後再試。" }, origin);
  }
});
