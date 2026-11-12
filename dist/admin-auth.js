(() => {
  "use strict";

  // This public URL identifies the project, but contains no API key or credential.
  const endpoint = "https://qflrsblacjukooikvfyx.supabase.co/functions/v1/swim-admin-gateway";
  let accessToken = "";
  let expiresAt = 0;
  let role = "";
  let expiryTimer;
  let onExpired = () => {};
  let recoveryToken = "";
  let recoveryError = "";

  if (window.location?.hash || window.location?.search) {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const query = new URLSearchParams(window.location.search.slice(1));
    const type = hash.get("type") || query.get("type");
    if ((type === "recovery" || type === "invite") && hash.get("access_token")) {
      recoveryToken = hash.get("access_token");
    } else if (hash.has("error") || query.has("error")) {
      recoveryError = "密碼設定連結無效或已過期，請重新申請並開啟最新的電郵連結。";
    }
    if (recoveryToken || recoveryError) window.history?.replaceState(null, "", window.location.pathname);
  }

  function clearSession() {
    accessToken = "";
    expiresAt = 0;
    role = "";
    clearTimeout(expiryTimer);
  }

  async function request(action, payload = {}, token = "") {
    const response = await fetch(endpoint, {
      method: "POST",
      mode: "cors",
      cache: "no-store",
      referrerPolicy: "no-referrer",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: "Bearer " + token } : {})
      },
      body: JSON.stringify({ action, ...payload })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || "登入服務暫時無法使用，請稍後再試。");
    return result;
  }

  async function signIn(email, password) {
    clearSession();
    const result = await request("login", { email, password });
    if (!result.accessToken || !Number.isFinite(result.expiresIn) || ![undefined, "admin", "tutor"].includes(result.role)) throw new Error("登入服務回應無效，請稍後再試。");
    accessToken = result.accessToken;
    role = result.role || "admin";
    expiresAt = Date.now() + result.expiresIn * 1000;
    expiryTimer = setTimeout(() => {
      clearSession();
      onExpired();
    }, Math.max(0, expiresAt - Date.now() - 5000));
    return role;
  }

  async function check() {
    if (!accessToken || Date.now() >= expiresAt - 5000) {
      clearSession();
      return false;
    }
    try {
      const result = await request("check", {}, accessToken);
      if ((result.role || "admin") !== role) throw new Error("登入權限已變更。");
      return true;
    } catch {
      clearSession();
      return false;
    }
  }

  async function signOut() {
    const token = accessToken;
    clearSession();
    if (token) await request("logout", {}, token).catch(() => {});
  }

  async function getCatalog() {
    if (!accessToken) throw new Error("請先登入管理員帳戶。");
    return request("catalog", {}, accessToken);
  }

  async function getTutorPortal() {
    if (role !== "tutor") throw new Error("請先登入導師帳戶。");
    return request("tutor-portal", {}, accessToken);
  }

  async function requestTutorLeave(startDate, endDate, reason) {
    if (role !== "tutor") throw new Error("請先登入導師帳戶。");
    return request("tutor-leave", { startDate, endDate, reason }, accessToken);
  }

  async function markTutorAttendance(lessonId, studentId, status) {
    if (role !== "tutor") throw new Error("請先登入導師帳戶。");
    return request("tutor-attendance", { lessonId, studentId, status }, accessToken);
  }

  async function syncTutors(items) {
    if (role !== "admin") throw new Error("請先登入管理員帳戶。");
    return request("sync-tutors", { items }, accessToken);
  }

  async function getTutorLeaveRequests() {
    if (role !== "admin") throw new Error("請先登入管理員帳戶。");
    return request("tutor-leave-list", {}, accessToken);
  }

  async function updateTutorLeave(id, status) {
    if (role !== "admin") throw new Error("請先登入管理員帳戶。");
    return request("tutor-leave-status", { id, status }, accessToken);
  }

  async function getAttendance() {
    if (role !== "admin") throw new Error("請先登入管理員帳戶。");
    return request("attendance-list", {}, accessToken);
  }

  async function decideAttendance(id, decision, makeupDate, reason) {
    if (role !== "admin") throw new Error("請先登入管理員帳戶。");
    return request("attendance-decision", { id, decision, makeupDate, reason }, accessToken);
  }

  async function markAttendanceApplied(id) {
    if (role !== "admin") throw new Error("請先登入管理員帳戶。");
    return request("attendance-applied", { id }, accessToken);
  }

  async function resetPassword(password) {
    if (!recoveryToken) throw new Error("重設連結已失效，請重新發送電郵。");
    if (password.length < 12) throw new Error("新密碼至少需要 12 個字元。");
    await request("reset-password", { password }, recoveryToken);
    recoveryToken = "";
  }

  async function checkRecovery() {
    if (!recoveryToken) return false;
    try {
      await request("check", {}, recoveryToken);
      return true;
    } catch {
      recoveryToken = "";
      recoveryError = "密碼設定連結無效或已過期，請重新申請並開啟最新的電郵連結。";
      return false;
    }
  }

  async function requestReset(email) {
    return request("request-recovery", { email: email.trim() });
  }

  window.AdminAuth = {
    signIn,
    check,
    signOut,
    getCatalog,
    getTutorPortal,
    requestTutorLeave,
    markTutorAttendance,
    syncTutors,
    getTutorLeaveRequests,
    updateTutorLeave,
    getAttendance,
    decideAttendance,
    markAttendanceApplied,
    getRole() { return role; },
    resetPassword,
    checkRecovery,
    requestReset,
    getRecoveryState() { return { active: Boolean(recoveryToken), error: recoveryError }; },
    setOnExpired(callback) { onExpired = callback; }
  };
})();
