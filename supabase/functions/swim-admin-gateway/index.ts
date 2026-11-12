// Public entry point for password login. Every authenticated action checks
// the Supabase Auth session and a role-specific RLS-protected record.
const projectUrl = Deno.env.get("SUPABASE_URL") || "";
const apiKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";
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

function hongKongToday() {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Hong_Kong", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return values.year + "-" + values.month + "-" + values.day;
}

async function roleForToken(token) {
  const commonHeaders = { apikey: apiKey, Authorization: "Bearer " + token };
  const [user, allowlist, tutor] = await Promise.all([
    fetch(projectUrl + "/auth/v1/user", { headers: commonHeaders }),
    fetch(projectUrl + "/rest/v1/swim_app_admin?select=user_id&limit=1", { headers: commonHeaders }),
    fetch(projectUrl + "/rest/v1/swim_tutor_portal?select=email,user_id&active=eq.true&limit=1", { headers: commonHeaders })
  ]);
  if (!user.ok || !allowlist.ok) return "";
  const profile = await user.json();
  const admins = await allowlist.json();
  const tutors = tutor.ok ? await tutor.json() : [];
  if (profile.id && Array.isArray(admins) && admins.some((row) => row.user_id === profile.id)) return "admin";
  if (profile.id && Array.isArray(tutors) && tutors.some((row) => row.user_id === profile.id)) return "tutor";
  return "";
}

Deno.serve(async (request) => {
  const origin = request.headers.get("Origin") || "";
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: headers(origin) });
  if (request.method !== "POST") return reply(405, { message: "不支援此操作。" }, origin);
  if (!projectUrl || !apiKey) return reply(503, { message: "登入服務尚未完成設定。" }, origin);
  if (Number(request.headers.get("content-length")) > 1048576) return reply(413, { message: "要求過大。" }, origin);

  try {
    const raw = await request.text();
    if (raw.length > 1048576) return reply(413, { message: "要求過大。" }, origin);
    const body = JSON.parse(raw);
    if (!body || typeof body !== "object") return reply(400, { message: "要求格式錯誤。" }, origin);
    if (body.action !== "sync-tutors" && raw.length > 8192) return reply(413, { message: "要求過大。" }, origin);

    if (body.action === "request-recovery") {
      if (typeof body.email !== "string" || body.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
        return reply(400, { message: "請輸入有效電郵地址。" }, origin);
      }
      const response = await fetch(projectUrl + "/auth/v1/recover?redirect_to=" + encodeURIComponent(recoveryReturnUrl), {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: apiKey },
        body: JSON.stringify({ email: body.email.trim().toLowerCase() })
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
      const role = session.access_token ? await roleForToken(session.access_token) : "";
      if (!role) {
        return reply(403, { message: "此帳戶沒有網站使用權限。" }, origin);
      }
      return reply(200, { accessToken: session.access_token, expiresIn: session.expires_in, role }, origin);
    }

    const token = (request.headers.get("Authorization") || "").match(/^Bearer ([^\s]+)$/)?.[1];
    const role = token ? await roleForToken(token) : "";
    if (!role) return reply(401, { message: "登入已失效，請重新登入。" }, origin);
    if (body.action === "check") return reply(200, { ok: true, role }, origin);
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
    if (role === "tutor" && body.action === "tutor-portal") {
      const response = await fetch(projectUrl + "/rest/v1/swim_tutor_portal?select=email,snapshot&active=eq.true&limit=1", {
        headers: { apikey: apiKey, Authorization: "Bearer " + token }
      });
      if (!response.ok) return reply(503, { message: "暫時無法讀取導師資料。" }, origin);
      const rows = await response.json();
      if (!rows[0]) return reply(404, { message: "尚未有獲授權的導師資料。" }, origin);
      const leaveResponse = await fetch(projectUrl + "/rest/v1/swim_tutor_leave?select=id,start_date,end_date,reason,status,created_at&order=created_at.desc&limit=50", {
        headers: { apikey: apiKey, Authorization: "Bearer " + token }
      });
      if (!leaveResponse.ok) return reply(503, { message: "暫時無法讀取請假申請。" }, origin);
      const attendanceResponse = await fetch(projectUrl + "/rest/v1/swim_tutor_attendance?select=id,lesson_id,student_id,status,decision,makeup_date,applied_at&limit=500", {
        headers: { apikey: apiKey, Authorization: "Bearer " + token }
      });
      if (!attendanceResponse.ok) return reply(503, { message: "暫時無法讀取點名資料。" }, origin);
      return reply(200, { email: rows[0].email, snapshot: rows[0].snapshot, leaveRequests: await leaveResponse.json(), attendance: await attendanceResponse.json() }, origin);
    }
    if (role === "tutor" && body.action === "tutor-attendance") {
      if (typeof body.lessonId !== "string" || typeof body.studentId !== "string" ||
        body.lessonId.length > 500 || body.studentId.length > 100 || !["present", "absent"].includes(body.status)) {
        return reply(400, { message: "點名資料格式錯誤。" }, origin);
      }
      const portalResponse = await fetch(projectUrl + "/rest/v1/swim_tutor_portal?select=email,user_id,snapshot&active=eq.true&limit=1", {
        headers: { apikey: apiKey, Authorization: "Bearer " + token }
      });
      if (!portalResponse.ok) return reply(503, { message: "暫時無法核對導師帳戶。" }, origin);
      const portal = (await portalResponse.json())[0];
      const lesson = portal?.snapshot?.assignments?.find((item) => item.id === body.lessonId);
      if (!lesson || !lesson.students?.some((student) => student.id === body.studentId) || lesson.date > hongKongToday()) {
        return reply(403, { message: "此課堂尚未可點名，或學生並非獲編配班別成員。" }, origin);
      }
      const url = projectUrl + "/rest/v1/swim_tutor_attendance?lesson_id=eq." + encodeURIComponent(body.lessonId) + "&student_id=eq." + encodeURIComponent(body.studentId);
      const existingResponse = await fetch(url + "&select=id,decision,applied_at", { headers: { apikey: apiKey, Authorization: "Bearer " + token } });
      if (!existingResponse.ok) return reply(503, { message: "暫時無法核對點名紀錄。" }, origin);
      const existing = (await existingResponse.json())[0];
      if (existing?.decision || existing?.applied_at) return reply(409, { message: "管理員已處理這筆點名，不能再修改。" }, origin);
      const response = await fetch(existing ? projectUrl + "/rest/v1/swim_tutor_attendance?id=eq." + existing.id : projectUrl + "/rest/v1/swim_tutor_attendance", {
        method: existing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", Prefer: "return=representation", apikey: apiKey, Authorization: "Bearer " + token },
        body: JSON.stringify(existing ? { status: body.status } : { lesson_id: body.lessonId, student_id: body.studentId,
          tutor_email: portal.email, user_id: portal.user_id, status: body.status })
      });
      if (!response.ok) return reply(409, { message: "未能儲存點名；請更新班別後再試。" }, origin);
      return reply(200, { attendance: (await response.json())[0] }, origin);
    }
    if (role === "tutor" && body.action === "tutor-leave") {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(body.startDate || "") || !/^\d{4}-\d{2}-\d{2}$/.test(body.endDate || "") || body.endDate < body.startDate ||
        typeof body.reason !== "string" || !body.reason.trim() || body.reason.length > 500) {
        return reply(400, { message: "請檢查請假日期及原因。" }, origin);
      }
      const portal = await fetch(projectUrl + "/rest/v1/swim_tutor_portal?select=email,user_id&active=eq.true&limit=1", {
        headers: { apikey: apiKey, Authorization: "Bearer " + token }
      });
      if (!portal.ok) return reply(503, { message: "暫時無法核對導師帳戶。" }, origin);
      const row = (await portal.json())[0];
      if (!row) return reply(403, { message: "沒有導師權限。" }, origin);
      const response = await fetch(projectUrl + "/rest/v1/swim_tutor_leave", {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: apiKey, Authorization: "Bearer " + token },
        body: JSON.stringify({ user_id: row.user_id, tutor_email: row.email, start_date: body.startDate, end_date: body.endDate, reason: body.reason.trim(), status: "pending" })
      });
      if (!response.ok) return reply(400, { message: "請假申請未能送出，請稍後再試。" }, origin);
      return reply(200, { ok: true }, origin);
    }
    if (role !== "admin") return reply(403, { message: "此操作只限管理員。" }, origin);
    if (body.action === "sync-tutors") {
      if (!Array.isArray(body.items) || body.items.length > 200) return reply(400, { message: "導師資料格式錯誤。" }, origin);
      const response = await fetch(projectUrl + "/rest/v1/rpc/swim_sync_tutor_portals", {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: apiKey, Authorization: "Bearer " + token },
        body: JSON.stringify({ items: body.items })
      });
      if (!response.ok) return reply(503, { message: "導師資料未能同步，雲端資料未更新。" }, origin);
      return reply(200, { ok: true, count: await response.json() }, origin);
    }
    if (body.action === "tutor-leave-list") {
      const response = await fetch(projectUrl + "/rest/v1/swim_tutor_leave?select=id,tutor_email,start_date,end_date,reason,status,created_at&order=created_at.desc&limit=100", {
        headers: { apikey: apiKey, Authorization: "Bearer " + token }
      });
      if (!response.ok) return reply(503, { message: "暫時無法讀取導師請假資料。" }, origin);
      return reply(200, { leaveRequests: await response.json() }, origin);
    }
    if (body.action === "tutor-leave-status") {
      if (!/^[0-9a-f-]{36}$/i.test(body.id || "") || !["approved", "rejected"].includes(body.status)) return reply(400, { message: "請假狀態格式錯誤。" }, origin);
      const response = await fetch(projectUrl + "/rest/v1/swim_tutor_leave?id=eq." + body.id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", apikey: apiKey, Authorization: "Bearer " + token },
        body: JSON.stringify({ status: body.status })
      });
      if (!response.ok) return reply(503, { message: "未能更新請假狀態。" }, origin);
      return reply(200, { ok: true }, origin);
    }
    if (body.action === "attendance-list") {
      const response = await fetch(projectUrl + "/rest/v1/swim_tutor_attendance?select=id,lesson_id,student_id,tutor_email,status,decision,absence_reason,makeup_date,applied_at,created_at&applied_at=is.null&order=created_at.asc&limit=500", {
        headers: { apikey: apiKey, Authorization: "Bearer " + token }
      });
      if (!response.ok) return reply(503, { message: "暫時無法讀取點名紀錄。" }, origin);
      return reply(200, { attendance: await response.json() }, origin);
    }
    if (body.action === "attendance-decision") {
      if (!/^[0-9a-f-]{36}$/i.test(body.id || "") || !["makeup", "no_makeup"].includes(body.decision) ||
        (body.decision === "makeup" && !/^\d{4}-\d{2}-\d{2}$/.test(body.makeupDate || "")) ||
        typeof body.reason !== "string" || !body.reason.trim() || body.reason.length > 500) {
        return reply(400, { message: "請選擇有效的補堂決定及日期。" }, origin);
      }
      const response = await fetch(projectUrl + "/rest/v1/swim_tutor_attendance?id=eq." + body.id + "&status=eq.absent&applied_at=is.null", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Prefer: "return=representation", apikey: apiKey, Authorization: "Bearer " + token },
        body: JSON.stringify({ decision: body.decision, absence_reason: body.reason.trim(), makeup_date: body.decision === "makeup" ? body.makeupDate : null })
      });
      if (!response.ok) return reply(503, { message: "未能儲存管理員決定。" }, origin);
      const rows = await response.json();
      if (!rows.length) return reply(409, { message: "點名已處理或狀態已改變，請重新整理。" }, origin);
      return reply(200, { attendance: rows[0] }, origin);
    }
    if (body.action === "attendance-applied") {
      if (!/^[0-9a-f-]{36}$/i.test(body.id || "")) return reply(400, { message: "點名紀錄格式錯誤。" }, origin);
      const response = await fetch(projectUrl + "/rest/v1/swim_tutor_attendance?id=eq." + body.id + "&applied_at=is.null", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Prefer: "return=representation", apikey: apiKey, Authorization: "Bearer " + token },
        body: JSON.stringify({ applied_at: new Date().toISOString() })
      });
      if (!response.ok) return reply(503, { message: "本機已記錄，但未能標記雲端點名；請重新整理並重試，系統不會重複扣堂。" }, origin);
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
