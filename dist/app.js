(() => {
  "use strict";

  const LEGACY_KEY = "swim-class-balance.v1";
  const SUITE_KEY = "swim-class-suite.v2";
  const OTHER_POOL_OPTION = "other-pool";
  const LOW_DEFAULT = 2;
  const WEEKDAYS = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
  const FEATURES = [
    { id: "schedule", icon: "🗓️", title: "時間表/編排課堂", description: "日・週・月課堂", accent: "var(--blue-soft)" },
    { id: "courses", icon: "🎟️", title: "課程設定", description: "課程・年齡・人數", accent: "#f5e6d2" },
    { id: "people", icon: "👤", title: "個人資訊", description: "學生資料・導師資料・學業狀態", accent: "var(--blue-soft)" },
    { id: "rooms", icon: "🚪", title: "泳班地點", description: "泳池・地點・集合位置", accent: "#f2ded4" },
    { id: "payments", icon: "💰", title: "付款", description: "付款・收據・月結", accent: "var(--yellow-soft)" },
    { id: "manual", icon: "📖", title: "數位手冊", description: "功課・筆記・相片", accent: "var(--purple-soft)" },
    { id: "accounts", icon: "🧑‍🏫", title: "帳戶管理", description: "導師資料・時薪與人工", accent: "var(--pink-soft)" },
    { id: "products", icon: "📦", title: "產品管理", description: "上架課程・定價與產品圖片", accent: "#e1e7ea" },
    { id: "announcements", icon: "📣", title: "公告欄", description: "活動・課程・停課通告", accent: "#f9edca" },
    { id: "settings", icon: "⚙️", title: "設定", description: "帳戶類別等設定", accent: "#e1e5e7" },
    { id: "contact", icon: "✉️", title: "聯絡我們", description: "有任何查詢，歡迎聯絡我們", accent: "var(--green-soft)" },
    { id: "help", icon: "❓", title: "說明中心", description: "開台流程與常見問題", accent: "#dceafd" }
  ];

  const moduleMeta = Object.fromEntries(FEATURES.map((item) => [item.id, item]));
  const todayYmd = () => formatYmd(startOfToday());
  const makeId = () => Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  const hadPoolLocationsAtStartup = (() => {
    try { return Array.isArray(JSON.parse(localStorage.getItem(SUITE_KEY))?.poolLocations); }
    catch { return false; }
  })();

  const state = {
    students: loadStudents(),
    suite: loadSuite(),
    currentModule: null,
    scheduleMode: "week",
    scheduleDisplay: "calendar",
    scheduleZoom: 50,
    scheduleDate: todayYmd(),
    quickLesson: null,
    bookingDraft: null,
    timePicker: null,
    peopleTab: "students",
    peopleFilter: "all",
    peopleSearch: "",
    peopleLayout: "cards",
    peopleMenuOpen: false,
    selectedStudentId: null,
    studentFormPhoto: "",
    pendingStudentImport: null,
    pendingCourseImport: null,
    courseSelection: { name: "", ageGroup: "", classSize: "" },
    pendingLocationImport: null,
    locationSelection: { pool: "", place: "" },
    locationMenuOpen: false,
    locationManagePool: "",
    manualFilter: "all",
    messageStudentId: null,
    messageType: "lesson",
    formHandler: null,
    loggedIn: false,
    role: "",
    tutorPortal: null,
    tutorSyncStatus: "",
    tutorLeaveRequests: [],
    tutorAttendance: []
  };
  let suppressTimelineClickUntil = 0;
  let tutorDuplicateConfirmations = { email: "", phone: "" };

  for (const student of state.students) {
    const match = String(student.studentNumber || "").match(/^([KA]\d{2})(\d{4})$/);
    if (match) state.suite.studentNumberCounters[match[1]] = Math.max(Number(state.suite.studentNumberCounters[match[1]]) || 0, Number(match[2]));
  }
  clearLegacyRooms();
  clearIncompleteCourses();

  const elements = {
    homeView: document.querySelector("#home-view"),
    moduleView: document.querySelector("#module-view"),
    loggedOutView: document.querySelector("#logged-out-view"),
    adminLoginForm: document.querySelector("#admin-login-form"),
    adminLoginError: document.querySelector("#admin-login-error"),
    adminLoginSubmit: document.querySelector("#admin-login-submit"),
    adminResetForm: document.querySelector("#admin-reset-form"),
    adminResetError: document.querySelector("#admin-reset-error"),
    adminResetSubmit: document.querySelector("#admin-reset-submit"),
    pageLabel: document.querySelector("#page-label"),
    brandName: document.querySelector("#brand-name"),
    coachName: document.querySelector("#coach-name"),
    profileAvatar: document.querySelector("#profile-avatar"),
    featureGrid: document.querySelector("#feature-grid"),
    moduleKicker: document.querySelector("#module-kicker"),
    moduleTitle: document.querySelector("#module-title"),
    moduleDescription: document.querySelector("#module-description"),
    moduleHeading: document.querySelector(".module-heading"),
    moduleActions: document.querySelector("#module-actions"),
    moduleContent: document.querySelector("#module-content"),
    bottomNav: document.querySelector(".bottom-nav"),
    themeToggle: document.querySelector("#theme-toggle"),
    logoutButton: document.querySelector("#logout-button"),
    peopleTopActions: document.querySelector("#people-top-actions"),
    peopleMoreButton: document.querySelector("#people-more-button"),
    locationTopActions: document.querySelector("#location-top-actions"),
    locationMoreButton: document.querySelector("#location-more-button"),
    formDialog: document.querySelector("#form-dialog"),
    dynamicForm: document.querySelector("#dynamic-form"),
    formKicker: document.querySelector("#form-kicker"),
    formTitle: document.querySelector("#form-title"),
    formFields: document.querySelector("#form-fields"),
    formSubmit: document.querySelector("#form-submit"),
    formError: document.querySelector("#form-error"),
    messageDialog: document.querySelector("#message-dialog"),
    messageTitle: document.querySelector("#message-title"),
    messageText: document.querySelector("#message-text"),
    receiptDialog: document.querySelector("#receipt-dialog"),
    receiptContent: document.querySelector("#receipt-content"),
    scheduleHoursDialog: document.querySelector("#schedule-hours-dialog"),
    scheduleHoursForm: document.querySelector("#schedule-hours-form"),
    quickLessonDialog: document.querySelector("#quick-lesson-dialog"),
    bookingDialog: document.querySelector("#booking-dialog"),
    timePickerDialog: document.querySelector("#lesson-time-dialog"),
    tutorDialog: document.querySelector("#tutor-dialog"),
    tutorForm: document.querySelector("#tutor-form"),
    studentImportDialog: document.querySelector("#student-import-dialog"),
    studentImportFile: document.querySelector("#student-import-file"),
    studentImportConfirm: document.querySelector("#student-import-confirm"),
    courseImportDialog: document.querySelector("#course-import-dialog"),
    courseImportFile: document.querySelector("#course-import-file"),
    courseImportConfirm: document.querySelector("#course-import-confirm"),
    locationImportDialog: document.querySelector("#location-import-dialog"),
    locationImportFile: document.querySelector("#location-import-file"),
    locationImportConfirm: document.querySelector("#location-import-confirm"),
    locationManageDialog: document.querySelector("#location-manage-dialog"),
    importData: document.querySelector("#import-data"),
    toast: document.querySelector("#toast")
  };

  function defaultSuite() {
    return {
      settings: {
        brandName: "Genius Pro Swimming",
        coachName: "教練",
        accountType: "個人教練",
        lowBalance: LOW_DEFAULT,
        contactEmail: "",
        contactPhone: "",
        theme: "light"
      },
      courses: [],
      hiddenReferenceCourses: [],
      rooms: [],
      poolLocations: [],
      bookingOptions: { onlineBooking: true, preventOverlap: true, bufferMinutes: 10, openHour: 7, closeHour: 22 },
      lessonBookings: [],
      payments: [],
      studentNumberCounters: {},
      manualItems: [],
      accounts: [],
      products: [],
      announcements: []
    };
  }

  function loadSuite() {
    const fallback = defaultSuite();
    try {
      const saved = JSON.parse(localStorage.getItem(SUITE_KEY));
      if (!saved || typeof saved !== "object") return fallback;
      return {
        settings: { ...fallback.settings, ...(saved.settings || {}) },
        courses: Array.isArray(saved.courses) ? saved.courses : fallback.courses,
        hiddenReferenceCourses: Array.isArray(saved.hiddenReferenceCourses) ? saved.hiddenReferenceCourses : [],
        rooms: Array.isArray(saved.rooms) ? saved.rooms : fallback.rooms,
        poolLocations: Array.isArray(saved.poolLocations) ? saved.poolLocations : fallback.poolLocations,
        bookingOptions: {
          ...fallback.bookingOptions,
          ...(saved.bookingOptions || {}),
          openHour: clampWhole(saved.bookingOptions && saved.bookingOptions.openHour, 0, 22, fallback.bookingOptions.openHour),
          closeHour: clampWhole(saved.bookingOptions && saved.bookingOptions.closeHour, 1, 23, fallback.bookingOptions.closeHour)
        },
        lessonBookings: Array.isArray(saved.lessonBookings) ? saved.lessonBookings : [],
        payments: Array.isArray(saved.payments) ? saved.payments : [],
        studentNumberCounters: saved.studentNumberCounters && typeof saved.studentNumberCounters === "object" ? saved.studentNumberCounters : {},
        manualItems: Array.isArray(saved.manualItems) ? saved.manualItems : [],
        accounts: Array.isArray(saved.accounts) ? saved.accounts : [],
        products: Array.isArray(saved.products) ? saved.products : [],
        announcements: Array.isArray(saved.announcements) ? saved.announcements : []
      };
    } catch {
      return fallback;
    }
  }

  function loadStudents() {
    try {
      const saved = JSON.parse(localStorage.getItem(LEGACY_KEY));
      if (!Array.isArray(saved)) return [];
      return saved.filter((item) => item && typeof item.name === "string").map((item) => ({
        id: String(item.id || makeId()),
        name: item.name.trim().slice(0, 60),
        weekday: normalizeWeekday(item.weekday),
        time: validTime(item.time) ? item.time : "18:00",
        nextTime: validTime(item.nextTime) ? item.nextTime : validTime(item.time) ? item.time : "18:00",
        prepaid: clampWhole(item.prepaid, 0, 999, 8),
        remaining: clampWhole(item.remaining, 0, 999, 0),
        nextDate: validDate(item.nextDate) ? item.nextDate : item.enrollmentStatus ? "" : formatYmd(nextDateForWeekday(normalizeWeekday(item.weekday))),
        bookingManaged: Boolean(item.bookingManaged),
        bookingFallbackDate: validDate(item.bookingFallbackDate) ? item.bookingFallbackDate : "",
        bookingFallbackTime: validTime(item.bookingFallbackTime) ? item.bookingFallbackTime : "",
        courseId: item.courseId || "",
        roomId: item.roomId || "",
        roomName: item.roomName || "",
        tutorId: item.tutorId || "",
        status: item.status || "active",
        ageGroup: String(item.ageGroup || ""),
        gender: String(item.gender || ""),
        recordDate: validDate(item.recordDate) ? item.recordDate : "",
        enrollmentStatus: item.enrollmentStatus === "pending" ? "pending" : item.enrollmentStatus === "paid" ? "paid" : "legacy",
        studentNumber: String(item.studentNumber || ""),
        enrollmentYear: item.enrollmentYear != null && item.enrollmentYear !== "" && Number.isInteger(Number(item.enrollmentYear)) ? Number(item.enrollmentYear) :
          /^[KA]\d{2}\d{4}$/.test(String(item.studentNumber || "")) ? 2000 + Number(String(item.studentNumber).slice(1, 3)) : null,
        birthDate: validDate(item.birthDate) ? item.birthDate : "",
        birthMonth: String(item.birthMonth || ""),
        birthYear: String(item.birthYear || ""),
        guardianName: String(item.guardianName || ""),
        whatsapp: String(item.whatsapp || ""),
        email: String(item.email || ""),
        homeMtr: String(item.homeMtr || ""),
        schoolMtr: String(item.schoolMtr || ""),
        workMtr: String(item.workMtr || ""),
        photo: typeof item.photo === "string" && /^data:image\/(png|jpeg|webp|gif);base64,/.test(item.photo) ? item.photo : "",
        enrollments: Array.isArray(item.enrollments) ? item.enrollments.slice(0, 4) : [],
        history: Array.isArray(item.history) ? item.history.slice(0, 100) : [],
        createdAt: item.createdAt || new Date().toISOString()
      }));
    } catch {
      return [];
    }
  }

  function saveAll() {
    localStorage.setItem(LEGACY_KEY, JSON.stringify(state.students));
    localStorage.setItem(SUITE_KEY, JSON.stringify(state.suite));
    if (state.loggedIn && state.role === "admin") state.tutorSyncStatus = "本機資料已變更，請重新同步導師工作台。";
  }

  function clearLegacyRooms() {
    const rooms = Array.isArray(state.suite.rooms) ? state.suite.rooms : [];
    if (!rooms.length) { state.suite.rooms = []; return; }
    const roomNames = new Map(rooms.map((room) => [room.id, room.name]));
    const keepRecordedName = (record, idKey, nameKey) => {
      if (record && !record[nameKey] && roomNames.has(record[idKey])) record[nameKey] = roomNames.get(record[idKey]);
    };
    state.students.forEach((student) => {
      keepRecordedName(student, "roomId", "roomName");
      (student.history || []).forEach((record) => {
        keepRecordedName(record, "roomId", "roomName");
        keepRecordedName(record, "newRoomId", "newRoomName");
      });
    });
    (state.suite.lessonBookings || []).forEach((booking) => keepRecordedName(booking, "roomId", "roomName"));
    state.suite.rooms = [];
    saveAll();
  }

  function clearIncompleteCourses() {
    const courses = Array.isArray(state.suite.courses) ? state.suite.courses : [];
    const obsolete = courses.filter((course) => !String(course.ageGroup || "").trim() || !String(course.classSize || "").trim());
    if (!obsolete.length) return;
    const byId = new Map(obsolete.map((course) => [course.id, course]));
    state.students.forEach((student) => {
      if (byId.has(student.courseId)) student.courseId = "";
      (student.enrollments || []).forEach((row) => {
        const course = byId.get(row.courseId);
        if (!course) return;
        if (!row.courseName) row.courseName = course.name;
        if (!Number(row.duration)) row.duration = Number(course.duration) || 60;
        if (!Number(row.originalFee)) row.originalFee = Number(course.fee) || 0;
        row.courseId = "";
      });
      (student.history || []).forEach((record) => {
        const course = byId.get(record.courseId);
        if (!course) return;
        if (!record.courseName) record.courseName = course.name;
        if (record.type === "completed" && !Number(record.durationMinutes)) record.durationMinutes = Number(course.duration) || 60;
        record.courseId = "";
      });
    });
    (state.suite.accounts || []).forEach((account) => {
      if (Array.isArray(account.courseIds)) account.courseIds = account.courseIds.filter((id) => !byId.has(id));
    });
    (state.suite.products || []).forEach((product) => {
      if (byId.has(product.courseId)) product.courseId = "";
    });
    state.suite.courses = courses.filter((course) => !obsolete.includes(course));
    saveAll();
  }

  function clampWhole(value, min, max, fallback) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.min(max, Math.max(min, Math.round(number)));
  }

  function normalizeWeekday(value) {
    const number = Number(value);
    return Number.isInteger(number) && number >= 0 && number <= 6 ? number : 1;
  }

  function validDate(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) && !Number.isNaN(parseDate(value).getTime());
  }

  function validTime(value) {
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value || ""));
  }

  function startOfToday() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  function parseDate(value) {
    const parts = String(value).split("-").map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function formatYmd(date) {
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
  }

  function addDays(date, days) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }

  function nextDateForWeekday(weekday) {
    const today = startOfToday();
    return addDays(today, (weekday - today.getDay() + 7) % 7);
  }

  function nextRecurringAfter(dateString, weekday) {
    let candidate = addDays(parseDate(dateString), 1);
    if (candidate < startOfToday()) candidate = startOfToday();
    return formatYmd(addDays(candidate, (weekday - candidate.getDay() + 7) % 7));
  }

  function dateDistance(dateString) {
    return Math.round((parseDate(dateString) - startOfToday()) / 86400000);
  }

  function formatLongDate(value) {
    return new Intl.DateTimeFormat("zh-HK", { month: "long", day: "numeric", weekday: "long" }).format(parseDate(value));
  }

  function formatShortDate(value) {
    return new Intl.DateTimeFormat("zh-HK", { month: "numeric", day: "numeric" }).format(parseDate(value));
  }

  function formatMoney(value, maximumFractionDigits = 0) {
    return new Intl.NumberFormat("zh-HK", { style: "currency", currency: "HKD", minimumFractionDigits: 0, maximumFractionDigits }).format(Number(value) || 0);
  }

  function formatTime(value) {
    if (!validTime(value)) return value || "";
    const parts = value.split(":").map(Number);
    const period = parts[0] < 12 ? "上午" : parts[0] < 18 ? "下午" : "晚上";
    return period + (parts[0] % 12 || 12) + ":" + String(parts[1]).padStart(2, "0");
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function findById(collection, id) {
    return collection.find((item) => item.id === id);
  }

  function lowBalance() {
    return clampWhole(state.suite.settings.lowBalance, 0, 50, LOW_DEFAULT);
  }

  function renderShell() {
    const settings = state.suite.settings;
    document.documentElement.dataset.theme = settings.theme === "dark" ? "dark" : "light";
    elements.themeToggle.textContent = settings.theme === "dark" ? "☀" : "☾";
    elements.brandName.textContent = settings.brandName || "泳堂管家";
    elements.coachName.textContent = settings.coachName || "教練";
    elements.profileAvatar.textContent = [...(settings.brandName || "G")][0].toUpperCase();
    elements.featureGrid.innerHTML = FEATURES.map(featureCardHtml).join("");
    if (!state.loggedIn) showLoggedOut();
    else if (state.role === "tutor") renderTutorPortal();
    else if (state.currentModule) renderModule();
    else showHome();
  }

  function featureCardHtml(item) {
    return '<button class="feature-card" type="button" data-module="' + item.id + '" style="--card-accent:' + item.accent + '">' +
      '<span class="feature-icon" aria-hidden="true">' + item.icon + '</span>' +
      '<strong>' + escapeHtml(item.title) + '</strong><small>' + escapeHtml(item.description) + '</small></button>';
  }

  function showHome() {
    if (state.role === "tutor") return renderTutorPortal();
    document.body.classList.remove("auth-logged-out");
    state.currentModule = null;
    document.body.dataset.module = "";
    elements.peopleTopActions.hidden = true;
    elements.peopleMoreButton.hidden = true;
    elements.locationTopActions.hidden = true;
    elements.locationMoreButton.hidden = true;
    elements.themeToggle.hidden = false;
    elements.logoutButton.hidden = false;
    elements.homeView.hidden = false;
    elements.moduleView.hidden = true;
    elements.loggedOutView.hidden = true;
    elements.bottomNav.hidden = false;
    elements.pageLabel.textContent = "主頁";
    setActiveNav(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showLoggedOut() {
    state.role = "";
    state.tutorPortal = null;
    document.body.classList.add("auth-logged-out");
    document.body.dataset.module = "";
    document.body.classList.remove("nav-expanded");
    document.body.classList.remove("modal-open");
    document.querySelectorAll("dialog[open]").forEach((dialog) => dialog.close());
    elements.moduleContent.innerHTML = "";
    elements.peopleTopActions.hidden = true;
    elements.peopleMoreButton.hidden = true;
    elements.locationTopActions.hidden = true;
    elements.locationMoreButton.hidden = true;
    elements.themeToggle.hidden = true;
    elements.logoutButton.hidden = true;
    elements.homeView.hidden = true;
    elements.moduleView.hidden = true;
    elements.loggedOutView.hidden = false;
    elements.bottomNav.hidden = true;
    elements.pageLabel.textContent = "泳堂管家";
  }

  function renderTutorPortal() {
    const portal = state.tutorPortal || {};
    const snapshot = portal.snapshot || {};
    const profiles = Array.isArray(snapshot.profiles) ? snapshot.profiles : [];
    const assignments = Array.isArray(snapshot.assignments) ? snapshot.assignments : [];
    const leaveRequests = Array.isArray(portal.leaveRequests) ? portal.leaveRequests : [];
    document.body.classList.remove("auth-logged-out");
    document.body.dataset.module = "tutor-portal";
    elements.homeView.hidden = true;
    elements.loggedOutView.hidden = true;
    elements.moduleView.hidden = false;
    elements.bottomNav.hidden = true;
    elements.peopleTopActions.hidden = true;
    elements.peopleMoreButton.hidden = true;
    elements.locationTopActions.hidden = true;
    elements.locationMoreButton.hidden = true;
    elements.themeToggle.hidden = false;
    elements.logoutButton.hidden = false;
    elements.pageLabel.textContent = "導師工作台";
    elements.moduleKicker.textContent = "導師帳戶";
    elements.moduleTitle.textContent = "我的班別";
    elements.moduleDescription.textContent = "同一登入電郵下的所有導師身分會顯示在這裏。";
    elements.moduleActions.innerHTML = '<button class="button button-secondary" type="button" data-action="tutor-refresh">更新資料</button>';
    elements.moduleContent.innerHTML = '<section class="panel"><div class="panel-heading"><div><h2>' + escapeHtml(portal.email || "導師") + '</h2><p>' + profiles.length + ' 個導師身分 · 本月 ' + (Number(snapshot.summary?.classes) || 0) + ' 班 · 去重工時 ' + formatHours(Number(snapshot.summary?.hours) || 0) + ' 小時</p></div></div><p class="helper-text">共享帳戶薪金待管理員確認計法；同時段只計一次實際工時。</p><div class="shared-tutor-grid">' + profiles.map((profile) => '<article class="shared-tutor-card"><h3>' + escapeHtml(profile.name) + '</h3><p>' + escapeHtml((profile.courses || []).join("、") || "未指定課程") + '</p><strong>本月 ' + (Number(profile.classes) || 0) + ' 班</strong></article>').join('') + '</div></section>' +
      '<section class="panel"><div class="panel-heading"><div><h2>已編配課堂與點名</h2><p>只顯示獲編配學生姓名。導師只標記出席或缺席；缺席是否補堂由管理員決定。</p></div></div>' + (assignments.length ? '<div class="list-stack">' + assignments.map(tutorAssignmentHtml).join('') + '</div>' : '<p class="helper-text">暫未有已同步的課堂。</p>') + '</section>' +
      '<section class="panel"><div class="panel-heading"><div><h2>請假申請</h2><p>提交後由管理員處理。</p></div></div><form id="tutor-leave-form" class="tutor-leave-form"><label class="field"><span>開始日期</span><input name="startDate" type="date" required></label><label class="field"><span>結束日期</span><input name="endDate" type="date" required></label><label class="field tutor-leave-reason"><span>原因</span><textarea name="reason" maxlength="500" required></textarea></label><button class="button button-primary" type="submit">提交請假申請</button><p id="tutor-leave-error" class="form-error" role="alert"></p></form>' + (leaveRequests.length ? '<div class="list-stack tutor-leave-history">' + leaveRequests.map((item) => '<article class="list-row"><div class="row-main"><strong>' + escapeHtml(item.start_date + ' 至 ' + item.end_date) + '</strong><span>' + escapeHtml(item.reason) + '</span><span>' + escapeHtml(tutorLeaveStatus(item.status)) + '</span></div></article>').join('') + '</div>' : '<p class="helper-text">暫未有請假申請。</p>') + '</section>';
  }

  function tutorAssignmentHtml(item) {
    const recorded = Array.isArray(state.tutorPortal?.attendance) ? state.tutorPortal.attendance : [];
    const students = Array.isArray(item.students) ? item.students : [];
    return '<article class="tutor-assignment"><div><strong>' + escapeHtml(item.date + ' ' + item.start + '–' + item.end) + '</strong><p>' + escapeHtml([item.courseName, item.ageGroup, item.classSize, (item.tutors || []).join("、"), item.location || "未指定地點"].filter(Boolean).join(" · ")) + '</p></div>' +
      (students.length ? '<div class="tutor-roll">' + students.map((student) => {
        const mark = recorded.find((row) => row.lesson_id === item.id && row.student_id === student.id);
        const locked = Boolean(mark?.decision || mark?.applied_at);
        return '<div class="tutor-roll-row"><strong>' + escapeHtml(student.name) + '</strong><span>' + (mark ? escapeHtml(mark.status === "present" ? "已標記出席" : "已標記缺席，待管理員決定") : "未點名") + '</span><div class="row-actions"><button class="mini-button" type="button" data-action="tutor-attendance" data-lesson-id="' + escapeHtml(item.id) + '" data-student-id="' + escapeHtml(student.id) + '" data-value="present" ' + (item.date > todayYmd() || locked ? 'disabled' : '') + '>出席</button><button class="mini-button" type="button" data-action="tutor-attendance" data-lesson-id="' + escapeHtml(item.id) + '" data-student-id="' + escapeHtml(student.id) + '" data-value="absent" ' + (item.date > todayYmd() || locked ? 'disabled' : '') + '>缺席</button></div></div>';
      }).join('') + '</div>' : '<p class="helper-text">這班暫未編配學生。</p>') + '</article>';
  }

  function tutorLeaveStatus(status) {
    return status === "approved" ? "已批准" : status === "rejected" ? "不獲批准" : "待處理";
  }

  function openModule(id) {
    if (!state.loggedIn || state.role !== "admin") return;
    document.body.classList.remove("auth-logged-out");
    if (!moduleMeta[id]) return;
    state.currentModule = id;
    elements.homeView.hidden = true;
    elements.loggedOutView.hidden = true;
    elements.moduleView.hidden = false;
    elements.bottomNav.hidden = false;
    renderModule();
    if (id === "accounts") { refreshTutorLeaveRequests(); refreshTutorAttendance(); }
    setActiveNav(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function refreshTutorLeaveRequests() {
    if (state.role !== "admin") return;
    try {
      const result = await window.AdminAuth.getTutorLeaveRequests();
      state.tutorLeaveRequests = Array.isArray(result.leaveRequests) ? result.leaveRequests : [];
      if (state.currentModule === "accounts") renderModule();
    } catch { /* The administrator can still use local accounts while the tutor service is unavailable. */ }
  }

  async function refreshTutorAttendance() {
    if (state.role !== "admin") return;
    try {
      const result = await window.AdminAuth.getAttendance();
      state.tutorAttendance = Array.isArray(result.attendance) ? result.attendance : [];
      if (state.currentModule === "accounts") renderModule();
    } catch { /* Keep local records usable when the cloud service is unavailable. */ }
  }

  function setActiveNav(id) {
    document.querySelectorAll(".bottom-nav button").forEach((button) => {
      const isHome = !id && button.dataset.action === "go-home";
      button.classList.toggle("is-active", isHome || button.dataset.module === id);
    });
  }

  function renderModule() {
    const meta = moduleMeta[state.currentModule];
    if (!meta) return showHome();
    elements.pageLabel.textContent = meta.title;
    elements.moduleKicker.textContent = meta.id === "rooms" ? "泳池・地點・集合位置" : meta.description;
    elements.moduleTitle.textContent = meta.title;
    elements.moduleDescription.textContent = moduleDescription(meta.id);
    document.body.dataset.module = meta.id;
    elements.peopleTopActions.hidden = meta.id !== "people";
    elements.peopleMoreButton.hidden = meta.id !== "people";
    elements.locationTopActions.hidden = meta.id !== "rooms";
    elements.locationMoreButton.hidden = meta.id !== "rooms";
    elements.themeToggle.hidden = true;
    elements.logoutButton.hidden = true;
    elements.peopleMoreButton.setAttribute("aria-expanded", String(meta.id === "people" && state.peopleMenuOpen));
    elements.locationMoreButton.setAttribute("aria-expanded", String(meta.id === "rooms" && state.locationMenuOpen));
    elements.moduleHeading.hidden = meta.id === "schedule";
    elements.moduleActions.innerHTML = moduleActionHtml(meta.id);
    const renderers = {
      schedule: renderSchedule,
      courses: renderCourses,
      people: renderPeople,
      rooms: renderRooms,
      payments: renderPayments,
      manual: renderManual,
      accounts: renderAccounts,
      products: renderProducts,
      announcements: renderAnnouncements,
      settings: renderSettings,
      contact: renderContact,
      help: renderHelp
    };
    elements.moduleContent.innerHTML = renderers[meta.id]();
  }

  function moduleDescription(id) {
    const descriptions = {
      schedule: "查看日、週、月安排，完成、取消或更改下一堂。",
      courses: "按課程名稱、年齡組別及課程人數，查看完整課程時間與每位學生的課堂費用。",
      people: "集中管理學生及導師資料、堂數與負責安排。",
      rooms: "排程的課堂泳池篩選，預約泳班時的地點選項，以及新增學生資料時學生偏好的泳班地點選項，均會使用此清單。舊有地點已從可選清單移除，現有泳班及預約記錄的地點名稱仍會保留。",
      payments: "記錄收款、自動增加堂數、查看收據與每月合計。",
      manual: "保存學生功課、課堂筆記與相片。",
      accounts: "管理家長及導師的本機帳戶目錄，不儲存密碼。",
      products: "建立可上架的課程產品、售價及產品圖片。",
      announcements: "發布活動、課程消息及停課通告。",
      settings: "設定品牌、帳戶類別、提醒門檻及資料備份。",
      contact: "集中顯示聯絡方式並準備查詢訊息。",
      help: "查看完整開台流程及常見問題。"
    };
    return descriptions[id] || "";
  }

  function moduleActionHtml(id) {
    const actions = {
      schedule: ["add-lesson", "＋ 編排課堂"],
      courses: ["add-course", "＋ 新增課程"],
      payments: ["add-payment", "＋ 記錄收款"],
      manual: ["add-manual", "＋ 新增紀錄"],
      accounts: ["add-tutor", "＋ 新增導師"],
      products: ["add-product", "＋ 新增產品"],
      announcements: ["add-announcement", "＋ 新增公告"]
    };
    if (!actions[id]) return "";
    return '<button class="button button-primary" type="button" data-action="' + actions[id][0] + '">' + actions[id][1] + "</button>";
  }

  function statsHtml(items) {
    return '<div class="stats-grid">' + items.map((item) =>
      '<article class="stat-card"><span>' + escapeHtml(item.label) + '</span><strong>' + escapeHtml(item.value) +
      (item.unit ? '<em>' + escapeHtml(item.unit) + "</em>" : "") + "</strong></article>"
    ).join("") + "</div>";
  }

  function renderSchedule() {
    const mode = state.scheduleMode;
    const selected = parseDate(state.scheduleDate || todayYmd());
    const rangeLabel = mode === "month" ? selected.getFullYear() + "年" + (selected.getMonth() + 1) + "月" :
      mode === "week" ? calendarShortDate(mondayOf(selected)) + " – " + calendarShortDate(addDays(mondayOf(selected), 6)) :
      calendarShortDate(selected) + " · " + WEEKDAYS[selected.getDay()];
    const modes = [["day", "▣ 日"], ["week", "▣ 週"], ["month", "▦ 月"]];
    const isList = state.scheduleDisplay === "list";
    const listIcon = '<svg class="schedule-view-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="1" stroke="currentColor" stroke-width="1.5"/><path d="M3 9.33h18M3 14.67h18M9 4v16" stroke="currentColor" stroke-width="1.4"/><path d="M5.2 6h1.6v1.6H5.2zM5.2 11.2h1.6v1.6H5.2zM5.2 16.4h1.6V18H5.2z" fill="currentColor"/></svg>';
    const calendarIcon = '<svg class="schedule-view-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="1.5" stroke="currentColor" stroke-width="1.7"/><path d="M7.5 3v4M16.5 3v4M3 9h18" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M6.2 11.5h2.3v2.3H6.2zM10.9 11.5h2.3v2.3h-2.3zM15.6 11.5h2.3v2.3h-2.3zM6.2 16h2.3v2.3H6.2zM10.9 16h2.3v2.3h-2.3zM15.6 16h2.3v2.3h-2.3z" fill="currentColor"/></svg>';
    const calendar = isList ? scheduleListHtml(selected, mode) : mode === "month" ? monthGridHtml(selected) : timelineGridHtml(selected, mode);
    const selectedLessons = lessonsForDate(state.scheduleDate);
    const openText = String(state.suite.bookingOptions.openHour).padStart(2, "0") + ":00 – " + String(state.suite.bookingOptions.closeHour).padStart(2, "0") + ":00";
    return '<section class="schedule-view">' +
      '<div class="schedule-toolbar"><div class="segmented schedule-modes">' + modes.map(([value, label]) =>
        '<button type="button" data-action="schedule-mode" data-value="' + value + '" class="' + (mode === value ? "is-active" : "") + '">' + label + "</button>").join("") +
      '</div><button class="schedule-icon-button' + (isList ? ' is-active' : '') + '" type="button" data-action="schedule-display" aria-label="' + (isList ? '顯示日曆' : '顯示課堂列表') + '" title="' + (isList ? '日曆檢視' : '列表檢視') + '" aria-pressed="' + isList + '">' + (isList ? calendarIcon : listIcon) + '</button>' +
      '<button class="schedule-icon-button" type="button" data-action="schedule-hours" aria-label="設定中心開放時間" title="中心開放時間">⚙</button></div>' +
      '<div class="schedule-navigation"><button type="button" class="schedule-nav-arrow" data-action="schedule-shift" data-delta="-1" aria-label="上一個">‹</button>' +
      '<strong>' + escapeHtml(rangeLabel) + '</strong><button type="button" class="schedule-nav-arrow" data-action="schedule-shift" data-delta="1" aria-label="下一個">›</button>' +
      '<label class="schedule-date-picker" title="選擇日期">▦<input id="schedule-date" type="date" value="' + escapeHtml(state.scheduleDate) + '" aria-label="選擇日期"></label>' +
      '<button type="button" class="schedule-add-button" data-action="add-lesson" aria-label="編排課堂">＋</button></div>' +
      calendar +
      (isList ? '' : '<section class="schedule-agenda"><div class="schedule-agenda-heading"><div><h2>' + escapeHtml(formatYmd(selected) + " · " + WEEKDAYS[selected.getDay()]) + '</h2><p>中心開放 ' + escapeHtml(openText) + '</p></div><span>' + selectedLessons.length + ' 堂</span></div>' +
      scheduleRowsHtml(selectedLessons) + '</section>') + '</section>';
  }

  function calendarShortDate(date) {
    return String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
  }

  function mondayOf(date) {
    return addDays(date, -((date.getDay() + 6) % 7));
  }

  function lessonsForDate(dateString) {
    const legacy = state.students.filter((student) => !student.bookingManaged && student.nextDate === dateString && student.status !== "inactive" && student.enrollmentStatus !== "pending")
      .map((student) => ({ kind: "legacy", student, time: student.nextTime || student.time }));
    const booked = state.suite.lessonBookings.filter((booking) => booking.date === dateString)
      .map((booking) => ({ kind: "booking", booking, time: booking.start }));
    return legacy.concat(booked).sort((a, b) => a.time.localeCompare(b.time));
  }

  function scheduleListHtml(selected, mode) {
    const first = mode === "week" ? mondayOf(selected) : mode === "month" ? new Date(selected.getFullYear(), selected.getMonth(), 1) : selected;
    const last = mode === "week" ? addDays(first, 6) : mode === "month" ? new Date(selected.getFullYear(), selected.getMonth() + 1, 0) : selected;
    const groups = [];
    for (let date = first; date <= last; date = addDays(date, 1)) {
      const lessons = lessonsForDate(formatYmd(date));
      if (lessons.length || mode === "day") groups.push({ date, lessons });
    }
    if (!groups.length) return '<section class="schedule-agenda schedule-list-empty"><div class="schedule-empty"><span aria-hidden="true">▦</span><strong>這段時間沒有課堂</strong><p>按「＋」編排課堂</p></div></section>';
    return '<div class="schedule-date-groups">' + groups.map(({ date, lessons }) =>
      '<section class="schedule-agenda"><div class="schedule-agenda-heading"><div><h2>' + escapeHtml(formatYmd(date) + " · " + WEEKDAYS[date.getDay()]) + '</h2><p>中心開放 ' + String(state.suite.bookingOptions.openHour).padStart(2, "0") + ':00 – ' + String(state.suite.bookingOptions.closeHour).padStart(2, "0") + ':00</p></div><span>' + lessons.length + ' 堂</span></div>' +
      scheduleRowsHtml(lessons) + '</section>').join('') + '</div>';
  }

  function timelineLayout(entries) {
    const sorted = entries.map((entry) => {
      const start = timeMinutes(entry.time || "00:00");
      const duration = entry.booking ? timeMinutes(entry.booking.end) - start : Number(courseForStudent(entry.student)?.duration) || 60;
      return { entry, start, end: start + Math.max(30, duration), lane: 0, lanes: 1 };
    }).sort((a, b) => a.start - b.start || a.end - b.end);
    let cluster = [], clusterEnd = -1, laneEnds = [];
    const finish = () => { for (const item of cluster) item.lanes = laneEnds.length; cluster = []; laneEnds = []; };
    for (const item of sorted) {
      if (cluster.length && item.start >= clusterEnd) { finish(); clusterEnd = -1; }
      let lane = laneEnds.findIndex((end) => end <= item.start);
      if (lane < 0) lane = laneEnds.length;
      laneEnds[lane] = item.end;
      item.lane = lane;
      cluster.push(item);
      clusterEnd = Math.max(clusterEnd, item.end);
    }
    if (cluster.length) finish();
    return sorted;
  }

  function timelineGridHtml(selected, mode) {
    const options = state.suite.bookingOptions;
    const days = mode === "day" ? [selected] : Array.from({ length: 7 }, (_, index) => addDays(mondayOf(selected), index));
    const visibleBookings = days.flatMap((date) => state.suite.lessonBookings.filter((booking) => booking.date === formatYmd(date)));
    const openHour = Math.min(clampWhole(options.openHour, 0, 22, 7), ...visibleBookings.map((booking) => Math.floor(timeMinutes(booking.start) / 60)));
    const closeHour = Math.max(clampWhole(options.closeHour, openHour + 1, 24, 22), ...visibleBookings.map((booking) => Math.ceil(timeMinutes(booking.end) / 60)));
    const totalHours = closeHour - openHour;
    const hourHeight = timelineHourHeight(state.scheduleZoom);
    const slotMinutes = timelineSlotMinutes(state.scheduleZoom);
    const dayHeaders = days.map((date) => {
      const ymd = formatYmd(date);
      return '<button class="timeline-day-heading' + (ymd === todayYmd() ? " is-today" : "") + '" type="button" data-action="schedule-select-date" data-date="' + ymd + '"><span>' + WEEKDAYS[date.getDay()].replace("星期", "週") +
        '</span><strong>' + date.getDate() + '</strong></button>';
    }).join("");
    const totalSlots = totalHours * 60 / slotMinutes;
    const axis = Array.from({ length: totalSlots + 1 }, (_, index) => {
      const minutes = openHour * 60 + index * slotMinutes;
      const minute = minutes % 60;
      return '<span class="timeline-hour' + (minute ? ' is-minor' : ' is-major') + (minute === 30 ? ' is-half' : '') + (index === 0 ? ' is-start' : index === totalSlots ? ' is-end' : '') + '" style="top:' + (index / totalSlots * 100) + '%">' + String(Math.floor(minutes / 60)).padStart(2, "0") + ':' + String(minute).padStart(2, "0") + '</span>';
    }).join("");
    const columns = days.map((date) => {
      const ymd = formatYmd(date);
      const events = timelineLayout(lessonsForDate(ymd)).map(({ entry, lane, lanes }) => {
        const student = entry.student;
        const booking = entry.booking;
        const time = entry.time || "00:00";
        const [hour, minute] = time.split(":").map(Number);
        const course = student ? courseForStudent(student) : null;
        const duration = Math.max(0.5, (booking ? timeMinutes(booking.end) - timeMinutes(booking.start) : course && Number(course.duration) || 60) / 60);
        const offset = hour + minute / 60 - openHour;
        if (offset + duration <= 0 || offset >= totalHours) return "";
        const top = Math.max(0, offset) / totalHours * 100;
        const height = Math.min(duration, totalHours - Math.max(0, offset)) / totalHours * 100;
        const title = booking ? booking.studentIds.map((id) => findById(state.students, id)?.name).filter(Boolean).join("、") : student.name;
        const tutorNames = booking ? booking.tutorIds.map((id) => findById(state.suite.accounts, id)?.name).filter(Boolean).join("、") : findById(state.suite.accounts, student.tutorId)?.name || "";
        return '<button type="button" class="timeline-event timeline-lane-' + (lane % 5) + '" style="top:' + top + '%;height:' + height + '%;left:calc(' + lane + ' * 100% / ' + lanes + ' + 2px);width:calc(100% / ' + lanes + ' - 4px)" data-action="' + (booking ? 'edit-booking' : 'reschedule') + '" data-id="' + escapeHtml(booking ? booking.id : student.id) + '" title="' + escapeHtml(title + ' · ' + tutorNames + ' · ' + (booking?.courseName || course?.name || '') + ' · ' + time) + '"><strong>' + escapeHtml(title || booking?.courseName || "課堂") + '</strong><span>' + escapeHtml(time) + '</span></button>';
      }).join("");
      return '<div class="timeline-day-column' + (ymd === todayYmd() ? " is-today" : "") + '" data-date="' + ymd + '">' + events + '</div>';
    }).join("");
    return '<div class="timeline-card" data-open-hour="' + openHour + '" data-total-hours="' + totalHours + '" style="--hour-height:' + hourHeight + 'px;--slot-height:' + (hourHeight * slotMinutes / 60) + 'px"><div class="timeline-head" style="grid-template-columns:var(--axis-width) repeat(' + days.length + ',minmax(0,1fr))"><div class="timeline-corner"></div>' + dayHeaders + '</div><div class="timeline-body" style="height:' + (totalHours * hourHeight) + 'px"><div class="timeline-axis">' + axis + '</div><div class="timeline-columns" style="grid-template-columns:repeat(' + days.length + ',minmax(0,1fr))">' + columns + '</div></div><div class="schedule-zoom" aria-label="時間格縮放"><button type="button" data-action="schedule-zoom" data-delta="-10" aria-label="縮小時間格"' + (state.scheduleZoom <= 50 ? ' disabled' : '') + '>−</button><span>' + state.scheduleZoom + '%</span><button type="button" data-action="schedule-zoom" data-delta="10" aria-label="放大時間格"' + (state.scheduleZoom >= 200 ? ' disabled' : '') + '>＋</button></div></div>';
  }

  function timelineHourHeight(zoom) { return Math.round((40 + (zoom - 50) * 0.72) * 10) / 10; }
  function timelineSlotMinutes(zoom) { return zoom <= 70 ? 60 : zoom <= 120 ? 30 : 15; }

  function monthGridHtml(selected) {
    const first = new Date(selected.getFullYear(), selected.getMonth(), 1);
    const start = addDays(first, -((first.getDay() + 6) % 7));
    const headings = ["一", "二", "三", "四", "五", "六", "日"].map((label) => '<span class="month-weekday">' + label + '</span>').join("");
    const cells = Array.from({ length: 42 }, (_, index) => {
      const date = addDays(start, index);
      const ymd = formatYmd(date);
      const count = lessonsForDate(ymd).length;
      const classes = [date.getMonth() !== selected.getMonth() ? "is-muted" : "", ymd === todayYmd() ? "is-today" : "", ymd === state.scheduleDate ? "is-selected" : ""].filter(Boolean).join(" ");
      return '<button type="button" class="month-cell ' + classes + '" data-action="schedule-select-date" data-date="' + ymd + '"><span>' + date.getDate() + '</span>' +
        (count ? '<small>' + '<i class="month-dot"></i>'.repeat(Math.min(count, 4)) + (count > 4 ? '<em>+' + (count - 4) + '</em>' : "") + '</small>' : "") + '</button>';
    }).join("");
    return '<div class="month-calendar"><div class="month-weekdays">' + headings + '</div><div class="month-grid">' + cells + '</div></div>';
  }

  function scheduleRowsHtml(students) {
    if (!students.length) return '<div class="schedule-empty"><span aria-hidden="true">▦</span><strong>這一天沒有課堂</strong><p>按「＋」編排課堂</p></div>';
    return '<div class="schedule-lesson-list">' + students.map((entry) => {
      if (entry.kind === "booking") {
        const booking = entry.booking;
        const names = booking.studentIds.map((id) => findById(state.students, id)?.name).filter(Boolean).join("、");
        const tutors = booking.tutorIds.map((id) => findById(state.suite.accounts, id)?.name).filter(Boolean).join("、");
        const pool = locationNameForId(booking.roomId, booking.roomName);
        return '<article class="schedule-lesson-card"><div class="schedule-lesson-time"><strong>' + escapeHtml(booking.start) + '</strong><span>' + escapeHtml(booking.end) + '</span><small>' + (timeMinutes(booking.end) - timeMinutes(booking.start)) + '分鐘</small></div><div class="schedule-lesson-main"><strong>' + escapeHtml(names || "未指定學生") + '</strong><span>' + escapeHtml((tutors ? '♟ ' + tutors + '　' : '') + (pool ? '⌖ ' + pool + '　' : '') + booking.courseName) + '</span><small class="schedule-lesson-status">● 預約課堂</small></div><div class="row-actions"><button class="mini-button" type="button" data-action="complete-booking" data-id="' + booking.id + '">完成</button><button class="mini-button" type="button" data-action="edit-booking" data-id="' + booking.id + '">改期</button><button class="mini-button danger" type="button" data-action="cancel-booking" data-id="' + booking.id + '">取消</button><button class="mini-button" type="button" data-action="booking-message" data-id="' + booking.id + '">提醒</button></div></article>';
      }
      const student = entry.student;
      const room = findById(state.suite.rooms, student.roomId);
      const roomName = room ? room.name : student.roomName;
      const tutor = findById(state.suite.accounts, student.tutorId);
      const course = courseForStudent(student);
      const time = student.nextTime || student.time;
      const end = validTime(time) ? addMinutes(time, course && Number(course.duration) || 60) : "";
      return '<article class="schedule-lesson-card"><div class="schedule-lesson-time"><strong>' + escapeHtml(time) + '</strong><span>' + escapeHtml(end) + '</span><small>' + (course && course.duration || 60) + '分鐘</small></div><div class="schedule-lesson-main"><strong>' +
        escapeHtml(student.name) + '</strong><span>' + (tutor ? '♟ ' + escapeHtml(tutor.name) + '　' : '') + (roomName ? '⌖ ' + escapeHtml(roomName) + '　' : '') + (course ? escapeHtml(course.name) : '一般課堂') + '</span><small class="schedule-lesson-status">● 正常課堂 · 尚餘 ' + student.remaining + ' 堂</small></div><div class="row-actions">' +
        '<button class="mini-button" type="button" data-action="complete-lesson" data-id="' + student.id + '">完成</button>' +
        '<button class="mini-button" type="button" data-action="reschedule" data-id="' + student.id + '">改期</button>' +
        '<button class="mini-button danger" type="button" data-action="cancel-lesson" data-id="' + student.id + '">取消</button>' +
        '<button class="mini-button" type="button" data-action="prepare-message" data-id="' + student.id + '" data-type="lesson">提醒</button></div></article>';
    }).join("") + '</div>';
  }

  function addMinutes(value, minutes) {
    const [hour, minute] = value.split(":").map(Number);
    const total = (hour * 60 + minute + minutes) % (24 * 60);
    return String(Math.floor(total / 60)).padStart(2, "0") + ":" + String(total % 60).padStart(2, "0");
  }

  function openScheduleHours() {
    const options = state.suite.bookingOptions;
    const selectOptions = (selected) => Array.from({ length: 24 }, (_, hour) => '<option value="' + hour + '" ' + (Number(selected) === hour ? "selected" : "") + '>' + String(hour).padStart(2, "0") + '</option>').join("");
    document.querySelector("#schedule-open-hour").innerHTML = selectOptions(options.openHour);
    document.querySelector("#schedule-close-hour").innerHTML = selectOptions(options.closeHour);
    document.querySelector("#schedule-hours-error").textContent = "";
    elements.scheduleHoursDialog.showModal();
    document.body.classList.add("modal-open");
  }

  function renderCourses() {
    const courses = displayCourses();
    const selection = state.courseSelection;
    const nameRows = courses;
    const ageRows = selection.name ? courses.filter((item) => sameCourseValue(item.name, selection.name)) : courses;
    const sizeRows = selection.ageGroup ? ageRows.filter((item) => sameCourseValue(item.ageGroup, selection.ageGroup)) : ageRows;
    const chosen = selection.name && selection.ageGroup && selection.classSize ? courses.find((item) =>
      sameCourseValue(item.name, selection.name) && sameCourseValue(item.ageGroup, selection.ageGroup) && sameCourseValue(item.classSize, selection.classSize)) : null;
    const summary = [
      ["課程名稱", selection.name || "請選擇"],
      ["年齡組別", selection.ageGroup || "請選擇"],
      ["課程人數", selection.classSize || "請選擇"],
      ["課程時間 (分鐘)", chosen ? chosen.duration + " 分鐘" : "—"],
      ["課堂費用", chosen ? formatMoney(chosen.fee, 2) + "／堂／位" : "—"]
    ];
    return '<section class="course-page"><div class="course-intro"><div><h2>課程組合</h2><p>依次選擇課程名稱、年齡組別及課程人數；每個組合對應一個完整的課堂時間和每位學生收費。</p></div><button class="button button-secondary" type="button" data-action="import-courses">↧ 匯入／更新課程</button></div>' +
      '<p class="course-source-note">顯示 <a href="' + escapeHtml(window.SwimCourseImport.SOURCE_URL) + '" target="_blank" rel="noopener noreferrer">Google 課程表</a>的 52 組參考資料；尚未匯入的組合只作預覽，不會改動本機課程或現有學生資料。</p>' +
      courseChipSection("name", "課程名稱", "選擇泳班課程", uniqueCourseValues(nameRows, "name"), selection.name) +
      courseChipSection("ageGroup", "年齡組別", "6-11 代表 6 歲至未滿 12 歲", uniqueCourseValues(ageRows, "ageGroup"), selection.ageGroup) +
      courseChipSection("classSize", "課程人數", "按課程及年齡顯示可選授課方式", uniqueCourseValues(sizeRows, "classSize"), selection.classSize) +
      '<section class="course-summary"><div class="course-summary-heading"><h2>所選課程組合</h2><p>三項均選定後，自動顯示對應時間及每位學生價錢。</p></div><div class="course-summary-grid">' + summary.map(([label, value]) =>
        '<article class="course-summary-card"><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(value) + '</strong></article>').join("") + '</div>' +
      (chosen ? '<div class="course-record-actions"><span class="badge ' + (chosen.reference ? 'neutral' : chosen.active === false ? 'neutral' : '') + '">' + (chosen.reference ? '試算表參考 · 尚未匯入' : chosen.active === false ? '已停用' : '已儲存') + '</span>' +
        (chosen.reference ? '<button class="mini-button" type="button" data-action="save-reference-course" data-id="' + escapeHtml(chosen.id) + '">＋ 加入這組課程</button>' :
          '<button class="mini-button" type="button" data-action="toggle-course" data-id="' + escapeHtml(chosen.id) + '">' + (chosen.active === false ? '啟用' : '停用') + '</button><button class="mini-button" type="button" data-action="edit-course" data-id="' + escapeHtml(chosen.id) + '">✎ 編輯整組</button><button class="mini-button danger" type="button" data-action="delete-course" data-id="' + escapeHtml(chosen.id) + '">▤ 刪除整組</button>') + '</div>' : '<p class="course-selection-help">請由上方三個區塊選擇一組課程；更改或刪除會作用於完整五項資料。</p>') + '</section>' +
      '</section>';
  }

  function sameCourseValue(a, b) {
    return String(a || "").trim().replace(/\s*[-–—]\s*/g, "-").toLocaleLowerCase() === String(b || "").trim().replace(/\s*[-–—]\s*/g, "-").toLocaleLowerCase();
  }

  function uniqueCourseValues(courses, field) {
    return courses.reduce((values, item) => {
      if (item[field] && !values.some((value) => sameCourseValue(value, item[field]))) values.push(item[field]);
      return values;
    }, []);
  }

  function displayCourses() {
    const saved = state.suite.courses.filter((item) => item.ageGroup && item.classSize);
    const present = new Set(saved.map(window.SwimCourseImport.key));
    const hidden = new Set(state.suite.hiddenReferenceCourses || []);
    const references = window.SwimCourseImport.referenceRows.map((row, index) => ({ ...row, id: "reference-" + index, active: true, reference: true }))
      .filter((row) => !present.has(window.SwimCourseImport.key(row)) && !hidden.has(window.SwimCourseImport.key(row)));
    return saved.concat(references);
  }

  function studentCoursesForAge(ageGroup) {
    const available = displayCourses().filter((item) => item.active !== false);
    const exact = available.filter((item) => sameCourseValue(item.ageGroup, ageGroup));
    if (!sameCourseValue(ageGroup, "2.5 - 5")) return exact;
    const agesFourToFive = available.filter((item) => sameCourseValue(item.ageGroup, "4 - 5"));
    return exact.concat(agesFourToFive.filter((item) => !exact.some((row) =>
      sameCourseValue(row.name, item.name) && sameCourseValue(row.classSize, item.classSize))));
  }

  function tutorCourseForId(id) {
    const saved = findById(state.suite.courses, id);
    if (saved) return saved;
    const match = /^reference-(\d+)$/.exec(String(id || ""));
    const reference = match && window.SwimCourseImport.referenceRows[Number(match[1])];
    return reference ? { ...reference, id } : null;
  }

  function tutorCourseNames(account) {
    return uniqueCourseValues((account.courseIds || []).map(tutorCourseForId).filter(Boolean), "name");
  }

  function studentAgeGroups() {
    const preferred = ["2.5 - 5", "6 - 11", "12 - 17", "18 - 29", "30 - 39", "40 - 49", "50 - 59", "60 - 69"];
    const fromSettings = uniqueCourseValues(displayCourses(), "ageGroup");
    return preferred.filter((age) => fromSettings.some((value) => sameCourseValue(value, age)))
      .concat(fromSettings.filter((age) => !sameCourseValue(age, "4 - 5") && !preferred.some((value) => sameCourseValue(value, age))));
  }

  function isMinorAge(ageGroup) {
    const lower = Number(String(ageGroup || "").trim().match(/^\d+(?:\.\d+)?/)?.[0]);
    return Number.isFinite(lower) && lower < 18;
  }

  function fiscalYear(dateValue) {
    if (!validDate(dateValue)) return fiscalYear(todayYmd());
    const [year, month] = dateValue.split("-").map(Number);
    return month >= 4 ? year : year - 1;
  }

  const STUDENT_DATE_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  function studentRecordDateYmd(value, allowIso = false) {
    const text = String(value || "").trim();
    const match = text.match(/^(\d{2})-([A-Za-z]{3})-(\d{4})$/);
    const iso = allowIso ? text.match(/^(\d{4})-(\d{2})-(\d{2})$/) : null;
    if (!match && !iso) return "";
    const year = Number(match ? match[3] : iso[1]);
    const month = match ? STUDENT_DATE_MONTHS.findIndex((name) => name.toLowerCase() === match[2].toLowerCase()) + 1 : Number(iso[2]);
    const day = Number(match ? match[1] : iso[3]);
    if (year < 1900 || month < 1 || month > 12 || day < 1 || day > 31) return "";
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() + 1 !== month || date.getDate() !== day) return "";
    return [year, String(month).padStart(2, "0"), String(day).padStart(2, "0")].join("-");
  }

  function formatStudentRecordDate(value) {
    const ymd = studentRecordDateYmd(value, true);
    if (!ymd) return "";
    const [year, month, day] = ymd.split("-");
    return day + "-" + STUDENT_DATE_MONTHS[Number(month) - 1] + "-" + year;
  }

  function nextStudentNumber(year, ageGroup) {
    const prefix = isMinorAge(ageGroup) ? "K" : "A";
    const key = prefix + String(year).slice(-2);
    const used = state.students.reduce((max, student) => {
      const match = String(student.studentNumber || "").match(/^([KA]\d{2})(\d{4})$/);
      return match && match[1] === key ? Math.max(max, Number(match[2])) : max;
    }, 0);
    const next = Math.max(used, Number(state.suite.studentNumberCounters[key]) || 0) + 1;
    if (next > 9999) throw new Error(year + " 年度的 " + (prefix === "K" ? "未成年" : "成年") + "學生編號已用完。");
    return { key, sequence: next, value: key + String(next).padStart(4, "0") };
  }

  function courseForStudent(student) {
    const saved = findById(state.suite.courses, student.courseId);
    if (saved) return saved;
    const enrollment = (student.enrollments || [])[0];
    if (!enrollment) return null;
    return displayCourses().find((row) => sameCourseValue(row.name, enrollment.courseName) &&
      sameCourseValue(row.ageGroup, enrollment.ageGroup) && sameCourseValue(row.classSize, enrollment.classSize)) ||
      { name: enrollment.courseName, duration: enrollment.duration, fee: enrollment.originalFee };
  }

  function courseChipSection(field, title, hint, values, selected) {
    const icon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m2 9 10-5 10 5-10 5L2 9Zm4 3v5c3.8 2.7 8.2 2.7 12 0v-5M22 9v7"/></svg>';
    return '<section class="course-chip-panel"><div class="course-chip-heading"><span class="course-chip-icon">' + icon + '</span><div><h2>' + title + '</h2><p>' + hint + '</p></div></div><div class="course-chip-list">' + (values.length ? values.map((value) =>
      '<button class="course-chip' + (sameCourseValue(value, selected) ? ' is-selected' : '') + '" type="button" data-action="select-course-' + field + '" data-value="' + escapeHtml(value) + '" aria-pressed="' + sameCourseValue(value, selected) + '">' + escapeHtml(value) + '</button>').join('') : '<span class="course-empty-options">未有可選項目</span>') + '</div></section>';
  }

  function renderPeople() {
    const tutors = state.suite.accounts.filter((item) => item.role === "tutor");
    const low = state.students.filter((student) => student.enrollmentStatus !== "pending" && student.remaining <= lowBalance()).length;
    const unassigned = state.students.filter((student) => student.enrollmentStatus !== "pending" && !validDate(student.nextDate)).length;
    const pending = state.students.filter((student) => student.enrollmentStatus === "pending").length;
    const metrics = [
      ["all", "學生總數", state.students.length, "blue"],
      ["unassigned", "未排課", unassigned, "yellow"],
      ["low", "需繳費", low, "pink"],
      ["pending", "待確認學員", pending, "purple"],
      ["tutors", "導師總數", tutors.length, "sand"]
    ];
    return '<section class="people-page"><div class="people-mobile-menu"' + (state.peopleMenuOpen ? '' : ' hidden') + '>' +
      peopleActionHtml("add-course", "新增課程") + peopleActionHtml("import-students", "匯入") +
      peopleActionHtml("add-student", "新增學生", true) + peopleActionHtml("add-tutor", "新增導師") + '</div>' +
      '<div class="people-metrics">' + metrics.map(([filter, label, value, color]) =>
        '<button type="button" class="people-metric ' + color + (state.peopleFilter === filter ? ' is-active' : '') + '" data-action="people-filter" data-value="' + filter + '" aria-pressed="' + (state.peopleFilter === filter) + '">' + peopleMetricIconHtml(filter) + '<small>' + label + '</small><strong>' + value + '</strong>' + (state.peopleFilter === filter ? '<span class="people-metric-dismiss" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m7 7 10 10M17 7 7 17"/></svg></span>' : '') + '</button>').join('') + '</div>' +
      '<div class="people-tools"><label class="people-search"><span aria-hidden="true">⌕</span><input id="people-search" type="search" placeholder="' + (state.peopleTab === "tutors" ? '搜尋導師' : '搜尋學生') + '" value="' + escapeHtml(state.peopleSearch) + '" aria-label="搜尋個人資訊"></label>' +
      '<button class="people-round-button' + (state.peopleTab === "tutors" ? ' is-active' : '') + '" type="button" data-action="people-tab" data-value="' + (state.peopleTab === "tutors" ? 'students' : 'tutors') + '">♟ <span>' + (state.peopleTab === "tutors" ? '學員' : '導師') + '</span></button>' +
      (state.peopleTab === "students" ? '<button class="people-round-button people-table-toggle' + (state.peopleLayout === "table" ? ' is-active' : '') + '" type="button" data-action="people-layout">▦ <span>' + (state.peopleLayout === "table" ? '卡片' : '表格') + '</span></button>' : '') + '</div>' +
      '<div id="people-results">' + peopleResultsHtml() + '</div><p class="people-footnote">導師檔案先保存在此瀏覽器。要讓導師登入查看班別，須在 Supabase 建立帳戶並於「帳戶管理」同步導師資料。</p></section>';
  }

  function peopleActionIconHtml(action) {
    const paths = {
      "add-course": '<path d="M5 4h9.5A2.5 2.5 0 0 1 17 6.5V18H7a2 2 0 0 0-2 2V4Zm0 16a2 2 0 0 1 2-2h7.5M19.5 12.5v7m-3.5-3.5h7"/>',
      "import-students": '<path d="M6 3h8l4 4v14H6V3Zm8 0v5h4M12 10v7m-3-3 3 3 3-3"/>',
      "add-student": '<path d="M12 5v14M5 12h14"/>',
      "add-tutor": '<path d="M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-6 9c.45-4 2.45-6 6-6 1.45 0 2.65.33 3.58 1M18.5 12.5v7m-3.5-3.5h7"/>'
    };
    return '<svg class="people-action-icon" viewBox="0 0 24 24" aria-hidden="true">' + (paths[action] || "") + '</svg>';
  }

  function peopleMetricIconHtml(filter) {
    const paths = {
      all: '<path d="M8.5 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7-1a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM2.5 19c.35-3.5 2.35-5.25 6-5.25s5.65 1.75 6 5.25m-.5-6.25c3.5 0 5.5 1.75 5.75 5.25"/>',
      unassigned: '<path d="M5 4v3m10-3v3M3 9h14M4 6h12a2 2 0 0 1 2 2v5.2M8.5 13.5h.01M12 13.5h.01M8.5 17h.01M17.5 14.5v4l2.5 1.5M17.5 22a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11Z"/>',
      low: '<path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v5m0 3.5h.01"/>',
      pending: '<path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-8 9c.4-4 3-6 8-6 1.8 0 3.3.3 4.5 1M19 15v6m-3-3h6"/>',
      tutors: '<path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-14v5h3m4.5 4.5h4m-2-2v4"/>'
    };
    return '<svg class="people-metric-icon" viewBox="0 0 24 24" aria-hidden="true">' + (paths[filter] || "") + '</svg>';
  }

  function peopleActionHtml(action, label, primary = false) {
    return '<button type="button" class="people-action' + (primary ? ' is-primary' : '') + '" data-action="' + action + '">' + peopleActionIconHtml(action) + label + '</button>';
  }

  function peopleResultsHtml() {
    const search = state.peopleSearch.trim().toLocaleLowerCase();
    if (state.peopleTab === "tutors" || state.peopleFilter === "tutors") {
      const tutors = state.suite.accounts.filter((item) => item.role === "tutor" && (!search || [item.name, item.email, item.phone].some((value) => String(value || "").toLocaleLowerCase().includes(search))));
      return tutorListHtml(tutors);
    }
    const students = state.students.filter((student) => {
      if (state.peopleFilter === "pending" && student.enrollmentStatus !== "pending") return false;
      if (state.peopleFilter === "low" && (student.enrollmentStatus === "pending" || student.remaining > lowBalance())) return false;
      if (state.peopleFilter === "unassigned" && (student.enrollmentStatus === "pending" || validDate(student.nextDate))) return false;
      const course = courseForStudent(student);
      return !search || [student.name, student.whatsapp, student.ageGroup, student.roomName, course && course.name].some((value) => String(value || "").toLocaleLowerCase().includes(search));
    }).sort((a, b) => a.name.localeCompare(b.name, "zh-Hant"));
    if (!students.length) return emptyHtml("👤", "沒有符合條件的學生", "可以調整搜尋或篩選條件。");
    if (state.peopleFilter === "pending") return '<div class="pending-student-list">' + students.map(pendingStudentHtml).join("") + '</div>';
    if (state.peopleLayout === "table") return studentTableHtml(students);
    const selected = students.find((student) => student.id === state.selectedStudentId) || students[0];
    return '<div class="people-directory"><div class="people-name-list" aria-label="學生名單">' + students.map((student) =>
      '<button type="button" class="people-name-item' + (student.id === selected.id ? ' is-selected' : '') + '" data-action="people-select-student" data-id="' + escapeHtml(student.id) + '">' + studentAvatarHtml(student) + '<span><strong>' + escapeHtml(student.name) + '</strong><small>' + escapeHtml((courseForStudent(student) || {}).name || (student.enrollmentStatus === "pending" ? "待確認，未付款" : "未指定課程")) + '</small></span></button>').join('') + '</div><div class="people-selected-detail">' + studentDetailHtml(selected) + '</div></div>' +
      '<div class="people-mobile-cards">' + students.map(studentMobileCardHtml).join('') + '</div>';
  }

  function studentAvatarHtml(student) {
    return '<span class="people-avatar">' + (student.photo ? '<img src="' + escapeHtml(student.photo) + '" alt="" />' : escapeHtml([...student.name][0] || "?")) + '</span>';
  }

  function pendingStudentHtml(student) {
    const id = escapeHtml(student.id);
    return '<article class="people-mobile-card pending-student-card"><div class="people-person-head">' + studentAvatarHtml(student) + '<div><h2>' + escapeHtml(student.name) + '</h2><p>' + escapeHtml(student.whatsapp || "未有 WhatsApp 號碼") + '</p></div></div>' +
      '<dl class="people-facts"><div><dt>年齡組別</dt><dd>' + escapeHtml(student.ageGroup || "未設定") + '</dd></div><div><dt>課堂地點</dt><dd>' + escapeHtml(locationNameForId(student.roomId, student.roomName) || "未設定") + '</dd></div></dl>' +
      '<div class="people-student-actions"><button class="mini-button" type="button" data-action="edit-student" data-id="' + id + '">修改學生資訊</button><button class="mini-button danger" type="button" data-action="delete-student" data-id="' + id + '">刪除</button></div></article>';
  }

  function studentStatusHtml(student) {
    if (student.enrollmentStatus === "pending") return '<span class="people-status is-pending">待確認，未付款</span>';
    const low = student.remaining <= lowBalance();
    return '<span class="people-status' + (low ? ' needs-payment' : '') + '"><span aria-hidden="true">' + (low ? '!' : '✓') + '</span>' + (student.enrollmentStatus === "paid" ? "已付款 · " : "") + (low ? '需續費' : '尚餘 ' + student.remaining + ' 堂') + '</span>';
  }

  function studentActionsHtml(student) {
    const id = escapeHtml(student.id);
    if (student.enrollmentStatus === "pending") return '<div class="people-student-actions"><button class="mini-button" type="button" data-action="edit-student" data-id="' + id + '">修改學生資訊</button><button class="mini-button danger" type="button" data-action="delete-student" data-id="' + id + '">刪除</button></div>';
    const low = student.remaining <= lowBalance();
    return '<div class="people-student-actions"><button class="mini-button" type="button" data-action="edit-student" data-id="' + id + '">編輯資料</button>' +
      '<button class="mini-button" type="button" data-action="complete-lesson" data-id="' + id + '">完成一堂</button>' +
      '<button class="mini-button" type="button" data-action="prepare-message" data-id="' + id + '" data-type="' + (low ? 'payment' : 'lesson') + '">準備提醒</button>' +
      '<button class="mini-button danger" type="button" data-action="delete-student" data-id="' + id + '">刪除</button></div>';
  }

  function studentDetailHtml(student) {
    const course = courseForStudent(student);
    const tutor = findById(state.suite.accounts, student.tutorId);
    return '<article class="people-detail-card"><div class="people-person-head">' + studentAvatarHtml(student) + '<div><h2>' + escapeHtml(student.name) + '</h2><p>' + escapeHtml(course ? course.name : student.enrollmentStatus === "pending" ? "待確認，未付款" : "未指定課程") + '</p></div><button class="people-edit-button" type="button" data-action="edit-student" data-id="' + escapeHtml(student.id) + '" aria-label="編輯 ' + escapeHtml(student.name) + '">✎</button></div>' + studentStatusHtml(student) + '</article>' +
      '<article class="people-detail-card"><h3>基本資料</h3><dl class="people-facts"><div><dt>學生狀態</dt><dd>' + escapeHtml(student.enrollmentStatus === "pending" ? "待確認，未付款" : student.enrollmentStatus === "paid" ? "已付款" : "舊資料") + '</dd></div><div><dt>學生編號</dt><dd>' + escapeHtml(student.studentNumber || "未編配") + '</dd></div><div><dt>年齡組別</dt><dd>' + escapeHtml(student.ageGroup || "未設定") + '</dd></div><div><dt>WhatsApp</dt><dd>' + escapeHtml(student.whatsapp || "未設定") + '</dd></div><div><dt>課堂地點</dt><dd>' + escapeHtml(locationNameForId(student.roomId, student.roomName) || "未設定") + '</dd></div><div><dt>課程</dt><dd>' + escapeHtml(course ? course.name : "未指定") + '</dd></div><div><dt>負責導師</dt><dd>' + escapeHtml(tutor ? tutor.name : "未指定") + '</dd></div>' + (student.enrollmentStatus === "pending" ? '' : '<div><dt>下一堂</dt><dd>' + escapeHtml(student.nextDate ? student.nextDate + " " + (student.nextTime || student.time) : "未編排") + '</dd></div><div><dt>剩餘堂數</dt><dd>' + student.remaining + ' 堂</dd></div>') + '</dl>' + studentActionsHtml(student) + '</article>';
  }

  function studentMobileCardHtml(student) {
    const course = courseForStudent(student);
    return '<article class="people-mobile-card"><div class="people-person-head">' + studentAvatarHtml(student) + '<div><h2>' + escapeHtml(student.name) + '</h2><p>' + escapeHtml(course ? course.name : "未指定課程") + '</p><small>' + escapeHtml(student.enrollmentStatus === "pending" ? [student.whatsapp, student.ageGroup, locationNameForId(student.roomId, student.roomName)].filter(Boolean).join(" · ") : student.nextDate ? student.nextDate + " · " + (student.nextTime || student.time) : "未編排課堂") + '</small></div><button class="people-edit-button" type="button" data-action="edit-student" data-id="' + escapeHtml(student.id) + '" aria-label="編輯 ' + escapeHtml(student.name) + '">✎</button></div>' + studentStatusHtml(student) + '<details class="people-card-more"><summary>' + (student.enrollmentStatus === "pending" ? "跟進操作" : "課堂操作") + '</summary>' + studentActionsHtml(student) + '</details></article>';
  }

  function studentTableHtml(students) {
    return '<div class="people-table-wrap"><table class="people-table"><thead><tr><th>學生</th><th>課程</th><th>負責導師</th><th>下一堂</th><th>剩餘堂數</th><th>操作</th></tr></thead><tbody>' + students.map((student) => {
      const course = courseForStudent(student);
      const tutor = findById(state.suite.accounts, student.tutorId);
      return '<tr><td>' + escapeHtml(student.name) + '</td><td>' + escapeHtml(course ? course.name : "—") + '</td><td>' + escapeHtml(tutor ? tutor.name : "—") + '</td><td>' + escapeHtml(student.enrollmentStatus === "pending" ? "待確認" : student.nextDate ? student.nextDate + " " + (student.nextTime || student.time) : "未編排") + '</td><td>' + student.remaining + '</td><td><button type="button" class="mini-button" data-action="edit-student" data-id="' + escapeHtml(student.id) + '">編輯</button></td></tr>';
    }).join('') + '</tbody></table></div>';
  }

  function studentGridHtml() {
    if (!state.students.length) return emptyHtml("👤", "未有學生資料", "新增學生後便可以排課、收款及準備提醒。");
    return '<div class="student-grid">' + [...state.students].sort((a, b) => a.name.localeCompare(b.name, "zh-Hant")).map((student) => {
      const course = courseForStudent(student);
      const low = student.enrollmentStatus !== "pending" && student.remaining <= lowBalance();
      const progress = Math.max(0, Math.min(100, student.remaining / Math.max(student.prepaid, 1) * 100));
      return '<article class="student-card ' + (low ? "is-low" : "") + '"><div class="student-head"><div class="student-name"><div class="avatar-small">' +
        escapeHtml([...student.name].slice(0, 2).join("")) + '</div><div><h3>' + escapeHtml(student.name) + '</h3><p>' +
        escapeHtml(course ? course.name : "未指定課程") + "</p></div></div><span class=\"badge " + (low ? "warning" : "") + '">' + (low ? "需續費" : "正常") +
        '</span></div><div class="balance-row"><span>剩餘堂數</span><strong>' + student.remaining + ' 堂</strong></div><div class="progress"><span style="width:' +
        progress + '%"></span></div><div class="card-actions"><button class="mini-button" type="button" data-action="edit-student" data-id="' + student.id +
        '">編輯資料</button><button class="mini-button" type="button" data-action="complete-lesson" data-id="' + student.id +
        '">完成一堂</button><button class="mini-button" type="button" data-action="prepare-message" data-id="' + student.id + '" data-type="' + (low ? "payment" : "lesson") +
        '">準備提醒</button><button class="mini-button danger" type="button" data-action="delete-student" data-id="' + student.id + '">刪除</button></div></article>';
    }).join("") + "</div>";
  }

  function tutorListHtml(tutors) {
    if (!tutors.length) return emptyHtml("🧑‍🏫", "未有導師資料", "新增導師帳戶後可指派給學生。");
    return '<div class="people-tutor-list">' + tutors.map((item) => {
      const courseNames = tutorCourseNames(item);
      const payroll = tutorMonthlyPayroll(item);
      const shared = sharedTutorAccounts().some((group) => group.tutors.some((tutor) => tutor.id === item.id));
      const month = shared ? sharedTutorMonth([item]) : null;
      return '<article class="people-mobile-card"><div class="people-person-head"><span class="people-avatar">' + escapeHtml([...item.name][0] || "?") + '</span><div><h2>' + escapeHtml(item.name) + '</h2><p>' + escapeHtml(item.phone || item.email || "未有聯絡資料") + '</p><small>' + escapeHtml(courseNames.join("、") || "未指定課程") + '</small></div><button class="people-edit-button" type="button" data-action="edit-account" data-id="' + escapeHtml(item.id) + '" aria-label="編輯導師 ' + escapeHtml(item.name) + '">✎</button></div><span class="people-status">登入需同步</span>' +
        '<div class="tutor-payroll"><span>本月 ' + (shared ? month.classes : payroll.lessons) + ' 堂 · ' + formatHours(shared ? month.hours : payroll.hours) + ' 小時</span><strong>' + (shared ? '共享薪金待確認' : '預計人工 ' + formatMoney(payroll.amount)) + '</strong></div></article>';
    }).join('') + '</div>';
  }

  function tutorMonthlyPayroll(tutor, month = todayYmd().slice(0, 7)) {
    const { classes, hours } = sharedTutorMonth([tutor], month);
    return { lessons: classes, hours, amount: hours * (Number(tutor.hourlyRate) || 0) };
  }

  function sharedTutorAccounts() {
    const groups = new Map();
    for (const tutor of state.suite.accounts.filter((item) => item.role === "tutor")) {
      const email = String(tutor.email || "").trim().toLowerCase();
      if (!email) continue;
      if (!groups.has(email)) groups.set(email, []);
      groups.get(email).push(tutor);
    }
    return [...groups].filter(([, tutors]) => tutors.length > 1).map(([email, tutors]) => ({ email, tutors }));
  }

  function sharedTutorMonth(tutors, month = todayYmd().slice(0, 7)) {
    const tutorIds = new Set(tutors.map((tutor) => tutor.id));
    const classes = new Set();
    const intervals = new Map();
    const classesByTutor = new Map(tutors.map((tutor) => [tutor.id, new Set()]));
    for (const student of state.students) {
      for (const record of student.history || []) {
        if (record.type !== "completed" || !String(record.lessonDate || "").startsWith(month)) continue;
        const assignedIds = Array.isArray(record.tutorIds) ? record.tutorIds : [record.tutorId || student.tutorId || ""];
        const matchedIds = assignedIds.filter((id) => tutorIds.has(id));
        if (!matchedIds.length) continue;
        const course = findById(state.suite.courses, record.courseId || student.courseId);
        const start = validTime(record.lessonTime) ? record.lessonTime : validTime(student.time) ? student.time : "";
        const duration = Number(record.durationMinutes) || Number(course?.duration) || 60;
        const classKey = record.bookingId || [record.lessonDate, start, duration, record.courseId || student.courseId || "", record.roomId || student.roomId || "", [...assignedIds].sort().join(",")].join("|");
        classes.add(classKey);
        matchedIds.forEach((id) => classesByTutor.get(id).add(classKey));
        if (!start) continue;
        const date = record.lessonDate;
        if (!intervals.has(date)) intervals.set(date, new Map());
        intervals.get(date).set(classKey, [timeMinutes(start), timeMinutes(start) + duration]);
      }
    }
    let minutes = 0;
    for (const day of intervals.values()) {
      const ordered = [...day.values()].sort((a, b) => a[0] - b[0]);
      let end = -1;
      for (const [start, stop] of ordered) {
        minutes += Math.max(0, stop - Math.max(start, end));
        end = Math.max(end, stop);
      }
    }
    return { classes: classes.size, hours: minutes / 60, classesByTutor };
  }

  function buildTutorSnapshots() {
    const groups = new Map();
    for (const tutor of state.suite.accounts.filter((item) => item.role === "tutor")) {
      const email = String(tutor.email || "").trim().toLowerCase();
      if (!email) continue;
      if (!groups.has(email)) groups.set(email, []);
      groups.get(email).push(tutor);
    }
    const today = todayYmd();
    return [...groups].map(([email, tutors]) => {
      const tutorIds = new Set(tutors.map((tutor) => tutor.id));
      const tutorNames = new Map(tutors.map((tutor) => [tutor.id, tutor.name]));
      const month = sharedTutorMonth(tutors);
      const assignments = new Map();
      for (const booking of state.suite.lessonBookings) {
        if (booking.date < today) continue;
        const assigned = (booking.tutorIds || []).filter((id) => tutorIds.has(id));
        if (!assigned.length) continue;
        assignments.set(booking.id, { id: booking.id, date: booking.date, start: booking.start, end: booking.end,
          courseName: booking.courseName || "一般課堂", ageGroup: booking.ageGroup || "", classSize: booking.classSize || "",
          location: locationNameForId(booking.roomId, booking.roomName), tutors: assigned.map((id) => tutorNames.get(id)),
          students: (booking.studentIds || []).map((id) => findById(state.students, id)).filter(Boolean).map((student) => ({ id: student.id, name: student.name })) });
      }
      for (const student of state.students) {
        if (student.bookingManaged || !tutorIds.has(student.tutorId) || !student.nextDate || student.nextDate < today) continue;
        const course = courseForStudent(student);
        const start = student.nextTime || student.time;
        const end = minutesText(timeMinutes(start) + (Number(course?.duration) || 60));
        const location = locationNameForId(student.roomId, student.roomName);
        const key = [student.nextDate, start, end, course?.name || "", course?.ageGroup || "", course?.classSize || "", location, student.tutorId].join("|");
        const existing = assignments.get(key);
        if (existing) existing.students.push({ id: student.id, name: student.name });
        else assignments.set(key, { id: "rec:" + key, date: student.nextDate, start, end, courseName: course?.name || "一般課堂",
          ageGroup: course?.ageGroup || "", classSize: course?.classSize || "", location,
          tutors: [tutorNames.get(student.tutorId)], students: [{ id: student.id, name: student.name }] });
      }
      return { email, snapshot: {
        month: today.slice(0, 7), summary: { classes: month.classes, hours: month.hours },
        profiles: tutors.map((tutor) => ({ id: tutor.id, name: tutor.name, courses: tutorCourseNames(tutor), classes: month.classesByTutor.get(tutor.id).size })),
        assignments: [...assignments.values()].sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start)).slice(0, 100)
      } };
    });
  }

  function formatHours(value) {
    return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
  }

  function locationNameForId(id, fallbackName) {
    const room = id ? findById(state.suite.rooms, id) : null;
    if (room) return room.name;
    const pool = state.suite.poolLocations.find((item) => poolOptionId(item.pool) === id);
    return pool ? pool.pool : String(fallbackName || "");
  }

  function poolOptionId(name) {
    return "pool:" + encodeURIComponent(String(name || "").trim().toLocaleLowerCase());
  }

  function uniquePoolValues(items, field) {
    return items.reduce((values, item) => {
      const value = String(item[field] || "").trim();
      if (value && !values.some((other) => other.toLocaleLowerCase() === value.toLocaleLowerCase())) values.push(value);
      return values;
    }, []);
  }

  function locationSelectOptions() {
    return uniquePoolValues(state.suite.poolLocations, "pool").map((name) => ({ value: poolOptionId(name), label: name }));
  }

  function renderRooms() {
    const records = state.suite.poolLocations;
    const pools = uniquePoolValues(records, "pool");
    const selection = state.locationSelection;
    const places = uniquePoolValues(selection.pool ? records.filter((item) => item.pool === selection.pool) : records, "place");
    const chosen = selection.pool && selection.place ? records.find((item) => item.pool === selection.pool && item.place === selection.place) : null;
    return '<section class="course-page location-page"><div class="location-mobile-menu"' + (state.locationMenuOpen ? '' : ' hidden') + '><button type="button" data-action="add-pool">＋ 新增泳池</button><button type="button" data-action="import-locations">↧ 匯入</button><button type="button" data-action="manage-locations">✎ 更新／刪除</button></div>' +
      '<p class="course-source-note">內附 <a href="' + escapeHtml(window.SwimLocationImport.SOURCE_URL) + '" target="_blank" rel="noopener noreferrer">Google 泳班地點表</a>的 17 組首批資料作為初始清單。匯入新表格前可先預覽新增及更新內容。</p>' +
      '<section class="course-chip-panel"><div class="course-chip-heading"><span class="course-chip-icon">' + locationPanelIcon() + '</span><div><h2>課堂泳池</h2><p>選擇泳班使用的泳池</p></div></div><div class="course-chip-list location-pool-list">' +
      (pools.length ? pools.map((name, index) => '<div class="location-pool-option"><span class="location-pool-dot location-pool-dot-' + (index % 4) + '" aria-hidden="true"></span><button class="course-chip' + (selection.pool === name ? ' is-selected' : '') + '" type="button" data-action="select-location-pool" data-value="' + escapeHtml(name) + '" aria-pressed="' + (selection.pool === name) + '">' + escapeHtml(name) + '</button><button class="location-pool-manage" type="button" data-action="manage-pool" data-value="' + escapeHtml(name) + '" aria-label="管理 ' + escapeHtml(name) + ' 的地點組合" title="管理／刪除地點組合">' + trashIconHtml() + '</button></div>').join('') : '<span class="course-empty-options">尚未有課堂泳池。按右上角「新增泳池」或「匯入」。</span>') + '</div></section>' +
      locationChipSection('泳池地點', '按課堂泳池顯示可選地點', places, selection.place, 'select-location-place') +
      '<section class="course-summary location-summary"><div class="course-summary-heading"><h2>所選泳班地點</h2><p>選定課堂泳池及泳池地點後，自動顯示該組的集合資訊。</p></div><div class="location-summary-grid">' +
      locationSummaryCard('課堂泳池', selection.pool || '請選擇', '') + locationSummaryCard('泳池地點', selection.place || '請選擇', '') +
      locationSummaryCard('集合位置', chosen ? chosen.meetingPoint : '—', 'location-summary-wide') +
      locationSummaryCard('泳池清潔日', chosen ? chosen.cleaningDay : '—', '') + locationSummaryCard('年度維修時間', chosen ? chosen.maintenanceTime : '—', '') + '</div>' +
      (chosen ? '<div class="course-record-actions"><button class="mini-button" type="button" data-action="edit-pool-location" data-id="' + escapeHtml(chosen.id) + '">✎ 編輯這組</button><button class="mini-button danger" type="button" data-action="delete-pool-location" data-id="' + escapeHtml(chosen.id) + '">▤ 刪除這組</button></div>' : '<p class="course-selection-help">只會編輯或刪除選定的「課堂泳池＋泳池地點」組合，其他地點不受影響。</p>') + '</section>' +
      '</section>';
  }

  function locationPanelIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 21V7h10v14M8 10h1m3 0h1m-5 4h1m3 0h1m5 7V3h3v18M3 21h19"/></svg>';
  }

  function trashIconHtml() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v6m4-6v6"/></svg>';
  }

  function locationChipSection(title, hint, values, selected, action) {
    return '<section class="course-chip-panel"><div class="course-chip-heading"><span class="course-chip-icon">' + locationPanelIcon() + '</span><div><h2>' + title + '</h2><p>' + hint + '</p></div></div><div class="course-chip-list">' + (values.length ? values.map((value) => '<button class="course-chip' + (selected === value ? ' is-selected' : '') + '" type="button" data-action="' + action + '" data-value="' + escapeHtml(value) + '" aria-pressed="' + (selected === value) + '">' + escapeHtml(value) + '</button>').join('') : '<span class="course-empty-options">未有可選地點</span>') + '</div></section>';
  }

  function locationSummaryCard(label, value, extraClass) {
    return '<article class="course-summary-card ' + extraClass + '"><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(value) + '</strong></article>';
  }

  function renderPayments() {
    const month = todayYmd().slice(0, 7);
    const monthPayments = state.suite.payments.filter((item) => item.date.startsWith(month));
    const total = monthPayments.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const outstanding = state.students.filter((item) => item.enrollmentStatus !== "pending" && item.remaining <= lowBalance());
    return statsHtml([
      { label: "本月收入", value: formatMoney(total) },
      { label: "本月收款", value: monthPayments.length, unit: "筆" },
      { label: "需要續費", value: outstanding.length, unit: "位" },
      { label: "已售堂數", value: monthPayments.reduce((sum, item) => sum + Number(item.lessons || 0), 0), unit: "堂" }
    ]) + '<div class="setting-grid"><section class="panel"><div class="panel-heading"><div><h2>續費跟進</h2><p>剩餘 ' + lowBalance() + ' 堂或以下</p></div></div>' +
      (outstanding.length ? '<div class="list-stack">' + outstanding.map((student) =>
        '<article class="list-row"><div class="row-icon">💰</div><div class="row-main"><strong>' + escapeHtml(student.name) + '</strong><span>尚餘 ' + student.remaining +
        ' 堂</span></div><div class="row-actions"><button class="mini-button" type="button" data-action="payment-for-student" data-id="' + student.id +
        '">收款</button><button class="mini-button" type="button" data-action="prepare-message" data-id="' + student.id + '" data-type="payment">提醒</button></div></article>'
      ).join("") + "</div>" : emptyHtml("✓", "暫時毋須跟進", "所有學生堂數充足。")) + '</section><section class="panel"><div class="panel-heading"><div><h2>收款及收據</h2><p>最近 20 筆紀錄</p></div></div>' +
      paymentHistoryHtml() + "</section></div>";
  }

  function paymentHistoryHtml() {
    if (!state.suite.payments.length) return emptyHtml("🧾", "未有收款紀錄", "按「記錄收款」建立第一張收據。");
    return '<div class="list-stack">' + [...state.suite.payments].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20).map((payment) => {
      const student = findById(state.students, payment.studentId);
      return '<article class="list-row"><div class="row-icon">🧾</div><div class="row-main"><strong>' + escapeHtml(student ? student.name : payment.studentName || "已刪除學生") +
        '</strong><span>' + escapeHtml(payment.date) + " · " + payment.lessons + " 堂 · " + escapeHtml(payment.method) + " · " + escapeHtml(payment.receiptNo) +
        '</span></div><strong>' + formatMoney(payment.amount) + '</strong><div class="row-actions"><button class="mini-button" type="button" data-action="view-receipt" data-id="' +
        payment.id + '">收據</button></div></article>';
    }).join("") + "</div>";
  }

  function renderManual() {
    const filter = state.manualFilter;
    const items = filter === "all" ? state.suite.manualItems : state.suite.manualItems.filter((item) => item.type === filter);
    return '<section class="panel"><div class="toolbar"><div class="segmented">' +
      [["all", "全部"], ["homework", "功課"], ["note", "筆記"], ["photo", "相片"]].map((item) =>
        '<button type="button" data-action="manual-filter" data-value="' + item[0] + '" class="' + (filter === item[0] ? "is-active" : "") + '">' + item[1] + "</button>"
      ).join("") + '</div><span class="badge neutral">' + items.length + " 項</span></div>" +
      (items.length ? '<div class="record-grid">' + [...items].sort((a, b) => b.date.localeCompare(a.date)).map((item) => {
        const student = findById(state.students, item.studentId);
        const media = item.image ? '<img class="manual-photo" src="' + item.image + '" alt="紀錄相片">' : '<div class="placeholder-photo">' + ({ homework: "📝", note: "📒", photo: "📷" })[item.type] + "</div>";
        return '<article class="record-card">' + media + '<div class="card-top" style="margin-top:10px"><span class="badge">' + ({ homework: "功課", note: "筆記", photo: "相片" })[item.type] +
          '</span><small>' + escapeHtml(item.date) + '</small></div><h3>' + escapeHtml(item.title) + '</h3><p>' + escapeHtml(student ? student.name : "所有學生") + " · " +
          escapeHtml(item.content) + '</p><div class="card-actions"><button class="mini-button" type="button" data-action="edit-manual" data-id="' + item.id +
          '">編輯</button><button class="mini-button danger" type="button" data-action="delete-manual" data-id="' + item.id + '">刪除</button></div></article>';
      }).join("") + "</div>" : emptyHtml("📖", "未有數位手冊紀錄", "新增功課、課堂筆記或相片。")) + "</section>";
  }

  function renderAccounts() {
    const tutors = state.suite.accounts.filter((item) => item.role === "tutor");
    const shared = sharedTutorAccounts();
    const sharedIds = new Set(shared.flatMap((group) => group.tutors.map((tutor) => tutor.id)));
    const payrolls = tutors.map((tutor) => ({ tutor, ...tutorMonthlyPayroll(tutor) }));
    const accountMonths = [...shared.map((group) => sharedTutorMonth(group.tutors)), ...tutors.filter((tutor) => !sharedIds.has(tutor.id)).map((tutor) => sharedTutorMonth([tutor]))];
    const totalHours = accountMonths.reduce((sum, item) => sum + item.hours, 0);
    const totalLessons = accountMonths.reduce((sum, item) => sum + item.classes, 0);
    const totalPayroll = payrolls.filter(({ tutor }) => !sharedIds.has(tutor.id)).reduce((sum, item) => sum + item.amount, 0);
    const preservedParents = state.suite.accounts.filter((item) => item.role === "parent").length;
    return statsHtml([
      { label: "導師總數", value: tutors.length, unit: "位" },
      { label: "本月完成課堂", value: totalLessons, unit: "堂" },
      { label: "本月授課時數", value: formatHours(totalHours), unit: "小時" },
      { label: shared.length ? "共享帳戶薪金" : "本月預計人工", value: shared.length ? "待確認" : formatMoney(totalPayroll) }
    ]) + '<section class="panel"><div class="panel-heading"><div><h2>導師雲端工作台</h2><p>只同步導師身分、班別、工時，以及獲編配學生的姓名；不包含電話或收款紀錄。</p></div><button class="button button-secondary" type="button" data-action="sync-tutor-portals">同步導師資料</button></div><p class="helper-text" role="status">' + escapeHtml(state.tutorSyncStatus || "導師資料以此瀏覽器為準。每次更改導師或課堂後，按「同步導師資料」，導師登入後才能看到最新內容。") + '</p></section>' + renderAdminAttendance() + (state.tutorLeaveRequests.length ? '<section class="panel"><div class="panel-heading"><div><h2>導師請假申請</h2></div></div><div class="list-stack">' + state.tutorLeaveRequests.map((item) => '<article class="list-row"><div class="row-main"><strong>' + escapeHtml(item.tutor_email + ' · ' + item.start_date + ' 至 ' + item.end_date) + '</strong><span>' + escapeHtml(item.reason) + '</span><span>' + escapeHtml(tutorLeaveStatus(item.status)) + '</span></div>' + (item.status === 'pending' ? '<div class="row-actions"><button class="mini-button" type="button" data-action="tutor-leave-status" data-id="' + escapeHtml(item.id) + '" data-value="approved">批准</button><button class="mini-button danger" type="button" data-action="tutor-leave-status" data-id="' + escapeHtml(item.id) + '" data-value="rejected">拒絕</button></div>' : '') + '</article>').join('') + '</div></section>' : '') + (shared.length ? '<section class="panel"><div class="panel-heading"><div><h2>共享登入電郵彙總</h2><p>同一電郵下的導師身分分開編班；本月工時計算會扣除同時段重疊。</p></div></div><div class="shared-tutor-grid">' + shared.map(({ email, tutors }) => {
      const summary = sharedTutorMonth(tutors);
      const courses = [...new Set(tutors.flatMap(tutorCourseNames))];
      return '<article class="shared-tutor-card"><h3>' + escapeHtml(email) + '</h3><p>' + tutors.length + ' 個導師身分 · ' + courses.length + ' 類可負責課程</p><div class="shared-tutor-metrics"><strong>本月 ' + summary.classes + ' 班</strong><strong>去重工時 ' + formatHours(summary.hours) + ' 小時</strong><span>共享帳戶薪金待確認</span></div><ul>' + tutors.map((tutor) => '<li><b>' + escapeHtml(tutor.name) + '</b><span>' + escapeHtml(tutorCourseNames(tutor).join("、") || "未指定課程") + ' · 本月 ' + summary.classesByTutor.get(tutor.id).size + ' 班</span></li>').join('') + '</ul></article>';
    }).join('') + '</div></section>' : '') + '<section class="panel"><div class="panel-heading"><div><h2>導師資料及人工</h2><p>本月人工＝教練時薪 × 本月已完成游泳班時數；共享帳戶需另行確認薪酬規則</p></div></div>' +
      (payrolls.length ? '<div class="list-stack">' + payrolls.map(({ tutor, lessons, hours, amount }) => {
        const courseNames = tutorCourseNames(tutor);
        const isShared = sharedIds.has(tutor.id);
        const month = isShared ? sharedTutorMonth([tutor]) : null;
        return '<article class="list-row tutor-account-row"><div class="row-icon">🧑‍🏫</div><div class="row-main"><strong>' + escapeHtml(tutor.name) + '</strong><span>' +
          escapeHtml(courseNames.join("、") || "未指定課程") + ' · 時薪 ' + formatMoney(tutor.hourlyRate || 0) + '</span><span>本月 ' + (isShared ? month.classes : lessons) + ' 堂 · ' + formatHours(isShared ? month.hours : hours) +
          ' 小時 · ' + (isShared ? '共享薪金待確認' : '預計人工 ' + formatMoney(amount)) + '</span></div><div class="row-actions"><button class="mini-button" type="button" data-action="edit-account" data-id="' + tutor.id +
          '">編輯</button><button class="mini-button danger" type="button" data-action="delete-account" data-id="' + tutor.id + '">刪除</button></div></article>';
      }).join("") + "</div>" : emptyHtml("🧑‍🏫", "未有導師", "按「新增導師」建立第一位導師。")) +
      (preservedParents ? '<p class="helper-text accounts-preserved-note">已有 ' + preservedParents + ' 個家長帳戶資料獲保留，但不會出現在新增導師表單。</p>' : '') + "</section>";
  }

  function attendanceLessonDetails(item) {
    const booking = findById(state.suite.lessonBookings, item.lesson_id);
    if (booking) return { booking, date: booking.date, start: booking.start, courseName: booking.courseName || "一般課堂" };
    if (item.lesson_id.startsWith("rec:")) {
      const [date, start, , courseName] = item.lesson_id.slice(4).split("|");
      return { booking: null, date, start, courseName };
    }
    return null;
  }

  function renderAdminAttendance() {
    return '<section class="panel"><div class="panel-heading"><div><h2>導師點名待處理</h2><p>導師只記錄出席或缺席。管理員決定缺席原因及補堂方式，再套用至本機學生紀錄。</p></div><button class="button button-secondary" type="button" data-action="refresh-attendance">更新點名</button></div>' +
      (state.tutorAttendance.length ? '<div class="list-stack">' + state.tutorAttendance.map((item) => {
        const student = findById(state.students, item.student_id);
        const lesson = attendanceLessonDetails(item);
        const ready = Boolean(student && lesson);
        return '<article class="attendance-review"><div><strong>' + escapeHtml(student?.name || "學生已不在本機資料") + '</strong><p>' + escapeHtml((lesson?.date || "課堂已不在本機資料") + ' ' + (lesson?.start || "") + ' · ' + (lesson?.courseName || "") + ' · ' + item.tutor_email) + '</p><p>' + escapeHtml(item.status === "present" ? "導師標記：出席" : "導師標記：缺席") + (item.decision ? ' · 管理員決定：' + escapeHtml(item.decision === "makeup" ? "補堂 " + item.makeup_date : "不補堂") : " · 待管理員決定") + '</p></div>' +
          (item.status === "absent" && !item.decision ? '<div class="attendance-decision"><input name="reason" type="text" maxlength="500" placeholder="缺席原因（管理員填寫）" aria-label="缺席原因"><input name="makeupDate" type="date" value="' + escapeHtml(lesson?.date ? formatYmd(addDays(parseDate(lesson.date), 7)) : "") + '" aria-label="補堂日期"><div class="row-actions"><button class="mini-button" type="button" data-action="attendance-decision" data-id="' + escapeHtml(item.id) + '" data-value="makeup">指定日期補堂</button><button class="mini-button" type="button" data-action="attendance-next-week" data-id="' + escapeHtml(item.id) + '">順延下一星期</button><button class="mini-button danger" type="button" data-action="attendance-decision" data-id="' + escapeHtml(item.id) + '" data-value="no_makeup">缺席不補堂</button></div></div>' : '') +
          (item.status === "present" || item.decision ? '<button class="mini-button" type="button" data-action="attendance-apply" data-id="' + escapeHtml(item.id) + '" ' + (ready ? '' : 'disabled') + '>套用到學生紀錄</button>' : '') + (!ready ? '<p class="form-error">本機找不到對應學生或課堂，請先核對資料。</p>' : '') + '</article>';
      }).join('') + '</div>' : '<p class="helper-text">暫未有待處理的點名。</p>') + '</section>';
  }

  async function applyAttendanceRecord(item) {
    const student = findById(state.students, item.student_id);
    if (!student) throw new Error("本機找不到學生，請先核對資料。");
    if (student.history?.some((entry) => entry.attendanceId === item.id)) {
      await window.AdminAuth.markAttendanceApplied(item.id);
      await refreshTutorAttendance();
      return;
    }
    const lesson = attendanceLessonDetails(item);
    if (!lesson || (item.status === "absent" && !item.decision)) throw new Error("本機課堂未能核對，或缺席尚待管理員決定。");
    if (lesson.booking && !lesson.booking.studentIds.includes(student.id)) throw new Error("學生已不在這筆課堂預約，請先核對。");
    if (!lesson.booking && (student.bookingManaged || student.nextDate !== lesson.date)) throw new Error("學生下一堂日期已更改，請先核對。");
    if (item.decision === "makeup" && (!validDate(item.makeup_date) || item.makeup_date <= lesson.date)) throw new Error("補堂日期須晚於原課堂日期。");
    const deduct = item.status === "present" || item.decision === "no_makeup";
    if (deduct && student.remaining <= 0) throw new Error("學生堂數已用完，請先記錄收款。");
    const originalStudent = JSON.parse(JSON.stringify(student));
    const originalBookings = JSON.parse(JSON.stringify(state.suite.lessonBookings));
    try {
      const booking = lesson.booking;
      const entry = { id: makeId(), attendanceId: item.id, type: deduct ? "completed" : "rescheduled",
        attendanceStatus: item.status, absenceDecision: item.decision || "", absenceReason: item.absence_reason || "",
        lessonDate: lesson.date, lessonTime: lesson.start, tutorId: booking?.tutorIds?.[0] || student.tutorId || "",
        tutorIds: booking?.tutorIds || (student.tutorId ? [student.tutorId] : []), courseId: student.courseId || "",
        durationMinutes: booking ? timeMinutes(booking.end) - timeMinutes(booking.start) : Number(courseForStudent(student)?.duration) || 60,
        roomId: booking?.roomId || student.roomId || "", roomName: booking?.roomName || student.roomName || "",
        bookingId: booking?.id || "", makeupDate: item.makeup_date || "", createdAt: new Date().toISOString() };
      if (deduct) student.remaining -= 1;
      student.history.unshift(entry);
      student.history = student.history.slice(0, 100);
      if (booking) {
        state.suite.lessonBookings = state.suite.lessonBookings.map((row) => row.id === booking.id ?
          { ...row, studentIds: row.studentIds.filter((id) => id !== student.id) } : row).filter((row) => row.studentIds.length);
        if (item.decision === "makeup") state.suite.lessonBookings.push({ ...booking, id: makeId(), date: item.makeup_date, studentIds: [student.id] });
        syncBookingStudent(student.id);
      } else {
        student.nextDate = item.decision === "makeup" ? item.makeup_date : nextRecurringAfter(lesson.date, student.weekday);
        student.nextTime = item.decision === "makeup" ? lesson.start : student.time;
      }
      saveAll();
    } catch (error) {
      Object.keys(student).forEach((key) => { if (!(key in originalStudent)) delete student[key]; });
      Object.assign(student, originalStudent);
      state.suite.lessonBookings = originalBookings;
      try { saveAll(); } catch { /* The original in-memory record remains available for export. */ }
      throw error;
    }
    await window.AdminAuth.markAttendanceApplied(item.id);
    await refreshTutorAttendance();
    showToast(item.status === "present" ? "已記錄出席並扣一堂" : item.decision === "makeup" ? "已安排補堂，暫不扣堂" : "已記錄缺席不補堂並扣一堂");
  }

  function renderProducts() {
    const live = state.suite.products.filter((item) => item.status === "live").length;
    return statsHtml([
      { label: "產品總數", value: state.suite.products.length, unit: "個" },
      { label: "已上架", value: live, unit: "個" },
      { label: "草稿", value: state.suite.products.length - live, unit: "個" },
      { label: "平均售價", value: formatMoney(average(state.suite.products.map((item) => item.price))) }
    ]) + '<section class="panel"><div class="panel-heading"><div><h2>課程產品</h2><p>定價、產品圖片及上架狀態</p></div></div>' +
      (state.suite.products.length ? '<div class="product-grid">' + state.suite.products.map((product) => {
        const course = findById(state.suite.courses, product.courseId);
        return '<article class="product-card">' + (product.image ? '<img class="product-photo" src="' + product.image + '" alt="產品圖片">' : '<div class="placeholder-photo">📦</div>') +
          '<div class="card-top" style="margin-top:10px"><span class="badge ' + (product.status === "live" ? "" : "neutral") + '">' + (product.status === "live" ? "已上架" : "草稿") +
          '</span><strong>' + formatMoney(product.price) + '</strong></div><h3>' + escapeHtml(product.name) + '</h3><p>' + escapeHtml(course ? course.name : "未連結課程") +
          " · " + product.lessons + ' 堂</p><div class="card-actions"><button class="mini-button" type="button" data-action="toggle-product" data-id="' + product.id + '">' +
          (product.status === "live" ? "下架" : "上架") + '</button><button class="mini-button" type="button" data-action="edit-product" data-id="' + product.id +
          '">編輯</button><button class="mini-button danger" type="button" data-action="delete-product" data-id="' + product.id + '">刪除</button></div></article>';
      }).join("") + "</div>" : emptyHtml("📦", "未有產品", "建立第一個可上架課程產品。")) + "</section>";
  }

  function renderAnnouncements() {
    const active = state.suite.announcements.filter((item) => item.status === "active");
    return statsHtml([
      { label: "公告總數", value: state.suite.announcements.length, unit: "則" },
      { label: "現正顯示", value: active.length, unit: "則" },
      { label: "停課通告", value: state.suite.announcements.filter((item) => item.type === "closure").length, unit: "則" },
      { label: "活動消息", value: state.suite.announcements.filter((item) => item.type === "event").length, unit: "則" }
    ]) + '<section class="panel"><div class="panel-heading"><div><h2>公告清單</h2><p>活動、課程消息與停課安排</p></div></div>' +
      (state.suite.announcements.length ? '<div class="list-stack">' + [...state.suite.announcements].sort((a, b) => b.date.localeCompare(a.date)).map((notice) =>
        '<article class="list-row notice-card"><div class="row-main"><div class="card-top"><strong>' + escapeHtml(notice.title) + '</strong><span class="badge ' +
        (notice.status === "active" ? "" : "neutral") + '">' + (notice.status === "active" ? "顯示中" : "草稿") + '</span></div><span>' +
        announcementType(notice.type) + " · " + escapeHtml(notice.date) + " · " + escapeHtml(notice.audience) + '</span><span>' + escapeHtml(notice.content) +
        '</span></div><div class="row-actions"><button class="mini-button" type="button" data-action="toggle-announcement" data-id="' + notice.id + '">' +
        (notice.status === "active" ? "隱藏" : "發布") + '</button><button class="mini-button" type="button" data-action="edit-announcement" data-id="' + notice.id +
        '">編輯</button><button class="mini-button danger" type="button" data-action="delete-announcement" data-id="' + notice.id + '">刪除</button></div></article>'
      ).join("") + "</div>" : emptyHtml("📣", "未有公告", "新增活動、課程或停課通告。")) + "</section>";
  }

  function renderSettings() {
    const settings = state.suite.settings;
    return '<form id="settings-form" class="setting-grid"><section class="setting-card"><h3>品牌及帳戶</h3><div class="inline-form">' +
      fieldInline("品牌名稱", "brandName", "text", settings.brandName, true) + fieldInline("教練稱呼", "coachName", "text", settings.coachName, true) +
      '<label class="field field-wide"><span>帳戶類別</span><select name="accountType">' +
      ["個人教練", "游泳學校", "會所／泳會"].map((value) => '<option ' + (value === settings.accountType ? "selected" : "") + '>' + value + "</option>").join("") +
      '</select></label></div></section><section class="setting-card"><h3>提醒及顯示</h3><div class="inline-form">' +
      fieldInline("低堂數提醒門檻", "lowBalance", "number", settings.lowBalance, true, 'min="0" max="50"') +
      '<label class="field"><span>顯示模式</span><select name="theme"><option value="light" ' + (settings.theme === "light" ? "selected" : "") +
      '>淺色</option><option value="dark" ' + (settings.theme === "dark" ? "selected" : "") + '>深色</option></select></label></div></section>' +
      '<section class="setting-card"><h3>聯絡資料</h3><div class="inline-form">' + fieldInline("聯絡電郵", "contactEmail", "email", settings.contactEmail) +
      fieldInline("聯絡電話", "contactPhone", "tel", settings.contactPhone) + '</div><p class="helper-text">只輸入願意展示在聯絡頁的資料。</p></section>' +
      '<section class="setting-card"><h3>資料管理</h3><p class="helper-text" style="margin-bottom:12px">資料目前只儲存在此瀏覽器。定期匯出備份可以避免清除瀏覽資料後遺失。</p>' +
      '<div class="card-actions"><button class="button button-secondary" type="button" data-action="export-data">匯出備份</button><button class="button button-secondary" type="button" data-action="import-data">匯入備份</button>' +
      '<button class="button button-danger" type="button" data-action="reset-data">重設全部資料</button></div></section><div class="field-wide"><button class="button button-primary" type="submit">儲存設定</button></div></form>';
  }

  function renderContact() {
    const settings = state.suite.settings;
    return '<div class="setting-grid"><section class="panel contact-card"><div class="contact-icon">✉️</div><h2>歡迎聯絡我們</h2><p class="helper-text">有任何操作或課程管理查詢，可使用以下已設定的聯絡方式。</p>' +
      '<div class="list-stack" style="margin-top:16px"><div class="list-row"><div class="row-icon">＠</div><div class="row-main"><strong>電郵</strong><span>' +
      escapeHtml(settings.contactEmail || "尚未在設定加入") + '</span></div></div><div class="list-row"><div class="row-icon">☎</div><div class="row-main"><strong>電話</strong><span>' +
      escapeHtml(settings.contactPhone || "尚未在設定加入") + '</span></div></div></div></section><section class="panel"><div class="panel-heading"><div><h2>準備查詢訊息</h2><p>複製後自行透過慣用渠道發送</p></div></div>' +
      '<label class="field"><span>訊息</span><textarea id="contact-message">你好，我想查詢泳堂管家的使用方法：</textarea></label><div class="card-actions"><button class="button button-primary" type="button" data-action="copy-contact">複製訊息</button>' +
      (settings.contactEmail ? '<a class="button button-secondary" href="mailto:' + encodeURIComponent(settings.contactEmail) + '">開啟電郵</a>' : "") + '</div></section></div>';
  }

  function renderHelp() {
    const faqs = [
      ["學生資料會上載到雲端嗎？", "Version 1 的資料只儲存在目前瀏覽器，不會自動上載。轉換裝置前請在設定匯出備份。"],
      ["如何扣減一堂？", "到時間表或個人資訊，按學生的「完成一堂」。系統會扣減堂數並移到下一個固定上課日。"],
      ["取消課堂會扣堂嗎？", "不會。取消本堂會留下紀錄，再把下一堂移到下一個固定上課日。"],
      ["如何提醒續費？", "當堂數達到設定門檻，付款頁會列出學生。按「提醒」即可產生訊息，檢查後再自行發送。"],
      ["帳戶管理是否真正建立登入？", "目前是本機帳戶目錄，不儲存密碼或提供跨裝置登入。正式多用戶登入需要日後加入安全後端。"],
      ["相片儲存有甚麼限制？", "相片會轉成瀏覽器本機資料，每張限制 1MB，以免本機儲存空間過快用完。"]
    ];
    return '<section class="panel"><div class="panel-heading"><div><h2>完整開台流程</h2><p>建議按次序完成</p></div></div><div class="list-stack">' +
      ["完成品牌及帳戶設定", "建立課程與級別", "新增泳班地點", "新增導師、課程及教練時薪", "建立學生及指派課程、導師", "記錄首次收款及預繳堂數", "編排下一堂日期、時間與泳班地點", "日常完成課堂、改期、發提醒及記筆記"].map((text, index) =>
        '<div class="list-row"><div class="row-icon">' + (index + 1) + '</div><div class="row-main"><strong>' + escapeHtml(text) + '</strong></div></div>'
      ).join("") + '</div></section><section class="panel"><div class="panel-heading"><div><h2>常見問題</h2><p>Version 1 功能說明</p></div></div><div class="faq-list">' +
      faqs.map((item) => '<details><summary>' + escapeHtml(item[0]) + '</summary><p>' + escapeHtml(item[1]) + "</p></details>").join("") + "</div></section>";
  }

  function average(values) {
    const clean = values.map(Number).filter(Number.isFinite);
    return clean.length ? Math.round(clean.reduce((sum, value) => sum + value, 0) / clean.length) : 0;
  }

  function announcementType(type) {
    return ({ event: "活動", course: "課程消息", closure: "停課通告" })[type] || "一般";
  }

  function emptyHtml(icon, title, text) {
    return '<div class="empty-state"><span aria-hidden="true">' + icon + "</span><strong>" + escapeHtml(title) + "</strong><p>" + escapeHtml(text) + "</p></div>";
  }

  function fieldInline(label, name, type, value, required, attrs) {
    return '<label class="field"><span>' + escapeHtml(label) + (required ? " <b>*</b>" : "") + '</span><input name="' + name + '" type="' + type + '" value="' +
      escapeHtml(value) + '" ' + (required ? "required " : "") + (attrs || "") + '></label>';
  }

  function openForm(config) {
    elements.formDialog.classList.remove("student-dialog");
    elements.formFields.classList.remove("student-form-fields");
    state.formHandler = config.onSubmit;
    elements.formKicker.textContent = config.kicker || "資料管理";
    elements.formTitle.textContent = config.title;
    elements.formSubmit.textContent = config.submitLabel || "儲存";
    elements.formError.textContent = "";
    elements.formFields.innerHTML = config.fields.map(formFieldHtml).join("");
    elements.formDialog.showModal();
    document.body.classList.add("modal-open");
    const first = elements.formFields.querySelector("input:not([type=hidden]), select, textarea");
    if (first) requestAnimationFrame(() => first.focus());
  }

  function formFieldHtml(field) {
    if (field.type === "hidden") return '<input type="hidden" name="' + field.name + '" value="' + escapeHtml(field.value || "") + '">';
    const classes = "field " + (field.wide ? "field-wide" : "");
    const label = '<span>' + escapeHtml(field.label) + (field.required ? " <b>*</b>" : "") + "</span>";
    const attrs = (field.required ? " required" : "") + (field.min != null ? ' min="' + field.min + '"' : "") + (field.max != null ? ' max="' + field.max + '"' : "") +
      (field.step ? ' step="' + field.step + '"' : "") + (field.accept ? ' accept="' + field.accept + '"' : "");
    if (field.type === "select") {
      return '<label class="' + classes + '">' + label + '<select name="' + field.name + '"' + attrs + '>' +
        (field.options || []).map((option) => {
          const normalized = typeof option === "string" ? { value: option, label: option } : option;
          return '<option value="' + escapeHtml(normalized.value) + '" ' + (String(normalized.value) === String(field.value || "") ? "selected" : "") + '>' +
            escapeHtml(normalized.label) + "</option>";
        }).join("") + "</select></label>";
    }
    if (field.type === "textarea") return '<label class="' + classes + '">' + label + '<textarea name="' + field.name + '"' + attrs + '>' + escapeHtml(field.value || "") + "</textarea></label>";
    return '<label class="' + classes + '">' + label + '<input name="' + field.name + '" type="' + field.type + '" value="' + escapeHtml(field.value || "") + '"' + attrs + '>' +
      (field.help ? '<small class="helper-text">' + escapeHtml(field.help) + "</small>" : "") + "</label>";
  }

  function studentFloatingField(name, label, value = "", options = {}) {
    const type = options.type || "text";
    const attrs = (options.required ? " required" : "") + (options.readonly ? " readonly" : "") +
      (options.min != null ? ' min="' + options.min + '"' : "") + (options.max != null ? ' max="' + options.max + '"' : "") +
      (options.maxlength ? ' maxlength="' + options.maxlength + '"' : "") + (options.inputmode ? ' inputmode="' + options.inputmode + '"' : "");
    return '<label class="student-floating' + (value ? ' is-filled' : '') + (type === "date" || type === "time" ? ' student-has-native-date' : '') + (options.placeholder && !options.floatHintOnFocus ? ' student-has-hint' : '') + (options.wide ? ' student-wide' : '') + '"><input name="' + name + '" type="' + type + '" value="' + escapeHtml(value) + '" placeholder="' + escapeHtml(options.placeholder || " ") + '"' + attrs + '><span>' + escapeHtml(label) + (options.required && options.requiredMarker !== false ? ' <b>*</b>' : '') + '</span></label>';
  }

  function studentRecordDateFieldHtml(value) {
    return '<div class="student-record-date"><label for="student-record-date-text">今日日期</label><div class="student-record-date-control">' +
      '<input id="student-record-date-text" name="recordDate" type="text" value="' + escapeHtml(formatStudentRecordDate(value)) + '" placeholder="DD-MMM-YYYY" autocomplete="off" spellcheck="false" required aria-describedby="student-record-date-error">' +
      '<label class="student-record-date-calendar" title="開啟日曆選擇今日日期"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 2v4M17 2v4M4 9h16M5 5h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z"/><path d="M9 13h6v5H9z"/></svg><input id="student-record-date-picker" type="date" value="' + escapeHtml(value) + '" aria-label="開啟日曆選擇今日日期"></label></div><small id="student-record-date-error" class="student-record-date-error" aria-live="polite"></small></div>';
  }

  function studentChoices(name, values, selected, required = false, disabled = () => false) {
    return '<div class="student-choice-list">' + values.map((value) => '<label class="student-choice"><input type="radio" name="' + name + '" value="' + escapeHtml(value) + '"' + (value === selected ? ' checked' : '') + (required ? ' required' : '') + (disabled(value) ? ' disabled' : '') + '><span>' + escapeHtml(value) + '</span></label>').join('') + '</div>';
  }

  function studentDropdownArrowHtml() {
    return '<i class="student-dropdown-arrow" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg></i>';
  }

  function studentBirthSelectField(name, label, selected, options) {
    return '<label class="student-floating student-select student-birth-select' + (selected ? ' is-filled' : '') + '"><select name="' + name + '"><option value="" hidden></option><option value="">不提供</option>' +
      options.map((item) => '<option value="' + escapeHtml(item.value) + '"' + (String(item.value) === String(selected) ? ' selected' : '') + '>' + escapeHtml(item.label) + '</option>').join('') + '</select>' + studentDropdownArrowHtml() + '<span>' + label + '</span></label>';
  }

  function studentLocationPickerHtml(selected, options) {
    const choices = [{ value: "", label: "不設課堂地點" }].concat(options.filter((item) => item.value !== OTHER_POOL_OPTION), { value: OTHER_POOL_OPTION, label: "其他" });
    const current = selected ? choices.find((item) => item.value === selected) : null;
    return '<div class="student-floating student-location-field' + (current ? ' is-filled' : '') + '"><details id="student-location-picker"><summary aria-labelledby="student-location-floating student-location-label"><span id="student-location-label">' + escapeHtml(current ? current.label : "") + '</span>' + studentDropdownArrowHtml() + '</summary><div class="student-location-options">' +
      choices.map((item) => '<label><input type="radio" name="roomId" value="' + escapeHtml(item.value) + '"' + (item.value === selected ? ' checked' : '') + '><span>' + escapeHtml(item.label) + '</span></label>').join('') +
      '</div></details><span id="student-location-floating">課堂地點</span></div>';
  }

  function updateStudentOtherPoolField(form) {
    const selected = form.querySelector('input[name="roomId"]:checked')?.value;
    const field = form.querySelector("#student-other-pool-field");
    const input = form.elements.otherPoolName;
    const show = selected === OTHER_POOL_OPTION;
    field.hidden = !show;
    input.disabled = !show;
    input.required = show;
  }

  function studentFormHtml(student) {
    const item = student || {};
    const recordDate = item.recordDate || (item.createdAt ? String(item.createdAt).slice(0, 10) : todayYmd());
    const age = item.ageGroup || "";
    const ageOptions = studentAgeGroups();
    if (age && !ageOptions.some((value) => sameCourseValue(value, age))) ageOptions.push(age);
    const legacy = item.enrollmentStatus === "legacy";
    const paid = item.enrollmentStatus === "paid" || item.enrollmentStatus === "legacy";
    const birthDate = validDate(item.birthDate) ? item.birthDate : "";
    const birthMonth = item.birthMonth ? String(Number(item.birthMonth)) : (birthDate ? String(Number(birthDate.slice(5, 7))) : "");
    const birthYear = item.birthYear || (birthDate ? birthDate.slice(0, 4) : "");
    const latestBirthYear = Math.max(new Date().getFullYear(), Number(recordDate.slice(0, 4)) || 0, Number(birthYear) || 0);
    const birthYears = Array.from({ length: latestBirthYear - 1899 }, (_, index) => ({ value: String(latestBirthYear - index), label: String(latestBirthYear - index) }));
    const roomOptions = locationSelectOptions().filter((option) => option.value.startsWith("pool:"));
    if (item.roomId && item.roomId !== OTHER_POOL_OPTION && !roomOptions.some((option) => option.value === item.roomId)) roomOptions.push({ value: item.roomId, label: item.roomName || "舊有地點" });
    return '<input type="hidden" name="id" value="' + escapeHtml(item.id || "") + '">' +
      '<div class="student-photo-row"><span class="student-photo-preview" id="student-photo-preview">' + (item.photo ? '<img src="' + escapeHtml(item.photo) + '" alt="學生相片預覽">' : '<span aria-hidden="true">👤</span>') + '</span><label class="student-photo-upload"><input id="student-photo-file" class="sr-only" type="file" accept="image/png,image/jpeg,image/webp,image/gif">▣ 上載相片</label><small>PNG、JPG、WebP 或 GIF，最多 1MB</small></div>' +
      studentFloatingField("name", "學生姓名(必填)", item.name || "", { required: true, requiredMarker: false, wide: true, maxlength: 60 }) +
      '<fieldset class="student-choice-group student-segmented student-age-group student-wide"><legend>年齡組別 <b>*</b></legend>' + studentChoices("ageGroup", ageOptions, age, !legacy, (value) => Boolean(item.studentNumber) && isMinorAge(value) !== isMinorAge(age)) + '</fieldset>' +
      '<div class="student-birth-fields student-wide" id="student-birth-fields"' + (isMinorAge(age) ? '' : ' hidden') + '>' +
      studentBirthSelectField("birthMonth", "出生月份", birthMonth, Array.from({ length: 12 }, (_, index) => ({ value: String(index + 1), label: (index + 1) + " 月" }))) +
      studentBirthSelectField("birthYear", "出生年份", birthYear, birthYears) +
      '<div class="student-floating student-age-output"><output id="student-age-preview" aria-live="polite"></output><span>學生年齡</span></div></div>' +
      '<div class="student-demographics student-wide"><fieldset class="student-choice-group student-segmented student-gender"><legend>性別 <b>*</b></legend>' + studentChoices("gender", ["男", "女"], item.gender || "", !legacy) + '</fieldset>' +
      '<fieldset class="student-choice-group student-segmented student-status"><legend>學生狀態</legend>' + studentChoices("enrollmentStatus", ["待確認，未付款", "已付款"], paid ? "已付款" : "待確認，未付款", true, (value) => Boolean(item.studentNumber) && value === "待確認，未付款") + '</fieldset>' +
      studentRecordDateFieldHtml(recordDate) + '</div>' +
      '<div class="student-number-section student-wide"><div class="student-number-panel student-number-year"><h3>學生加入年份</h3><div id="student-year-choices"></div><p id="student-number-hint"></p></div>' +
      '<div class="student-number-panel student-number-result"><h3>學生編號</h3><strong id="student-number-preview" aria-live="polite"></strong></div></div>' +
      '<section class="student-enrollments student-wide"><div class="student-section-heading"><div><h3>報讀課程</h3><p>每位學生最多可新增四個課堂。</p></div><button class="mini-button" type="button" data-action="student-add-course" id="student-add-course">新增</button></div><div id="student-course-list"></div></section>' +
      studentFloatingField("guardianName", isMinorAge(age) ? "監護人" : "緊急聯絡人", item.guardianName || "") +
      studentFloatingField("whatsapp", "聯絡號碼 (WhatsApp)", item.whatsapp || "", { required: !legacy, type: "tel", inputmode: "tel", maxlength: 30 }) +
      studentFloatingField("homeMtr", "居住地點", item.homeMtr || "", { placeholder: "請填寫鄰近港鐵站", floatHintOnFocus: true }) +
      '<div id="student-school-field"' + (isMinorAge(age) ? '' : ' hidden') + '>' + studentFloatingField("schoolMtr", "學校地點", item.schoolMtr || "", { placeholder: "請填寫鄰近港鐵站", floatHintOnFocus: true }) + '</div>' +
      '<div id="student-work-field"' + (age && !isMinorAge(age) ? '' : ' hidden') + '>' + studentFloatingField("workMtr", "工作地點", item.workMtr || "", { placeholder: "請填寫鄰近港鐵站" }) + '</div>' +
      '<div class="student-location-stack">' + studentLocationPickerHtml(item.roomId || "", roomOptions) +
      '<div class="student-other-pool-field" id="student-other-pool-field"' + (item.roomId === OTHER_POOL_OPTION ? '' : ' hidden') + '>' + studentFloatingField("otherPoolName", "其他泳池 (請註明)", item.roomId === OTHER_POOL_OPTION ? item.roomName || "" : "", { maxlength: 120 }) + '</div></div>' +
      '<label class="field student-wide"><span>電郵（稍後登入用）</span><input name="email" type="email" autocomplete="email" placeholder="name@example.com" value="' + escapeHtml(item.email || "") + '"></label>' +
      '<label class="field student-wide"><span>密碼（接駁 Supabase 後設定）</span><input type="password" autocomplete="new-password" placeholder="目前未啟用" disabled><small class="helper-text">現時不會建立登入帳戶或儲存密碼。</small></label>';
  }

  function studentEnrollmentDrafts(form) {
    return [...form.querySelectorAll(".student-course-card")].map((card) => ({
      id: card.dataset.enrollmentId || "",
      courseName: card.querySelector("[data-course-name]").value,
      classSize: card.querySelector("[data-course-size]").value,
      ageGroup: card.dataset.ageGroup || "",
      firstDate: card.querySelector("[data-course-date]").value,
      discount: card.querySelector("[data-course-discount]").value,
      originalFee: Number(card.querySelector('input[readonly][type="number"]').value) || 0,
      duration: Number(card.dataset.duration) || 60
    }));
  }

  function studentEnrollmentHtml(row, index, ageGroup) {
    const courses = studentCoursesForAge(ageGroup);
    const names = uniqueCourseValues(courses, "name");
    if (row.courseName && !names.some((value) => sameCourseValue(value, row.courseName))) names.push(row.courseName);
    const sizes = uniqueCourseValues(courses.filter((item) => sameCourseValue(item.name, row.courseName)), "classSize");
    if (row.classSize && sameCourseValue(row.ageGroup, ageGroup) && !sizes.some((value) => sameCourseValue(value, row.classSize))) sizes.push(row.classSize);
    const selected = courses.find((item) => sameCourseValue(item.name, row.courseName) && sameCourseValue(item.classSize, row.classSize));
    const fee = selected ? Number(selected.fee) || 0 : sameCourseValue(row.ageGroup, ageGroup) ? Number(row.originalFee) || 0 : 0;
    const hasFee = Boolean(selected || (row.courseName && row.classSize && sameCourseValue(row.ageGroup, ageGroup)));
    const discount = Number(row.discount) || 0;
    const dateLabel = validDate(row.firstDate) ? row.firstDate.split("-").reverse().join("/") : "";
    return '<article class="student-course-card" data-course-index="' + index + '" data-enrollment-id="' + escapeHtml(row.id || "") + '" data-age-group="' + escapeHtml(ageGroup) + '" data-duration="' + (selected ? Number(selected.duration) || 60 : Number(row.duration) || 60) + '"><div class="student-section-heading"><h4>課堂 ' + (index + 1) + '</h4><button class="mini-button danger" type="button" data-action="student-remove-course" data-index="' + index + '">移除</button></div><div class="student-course-grid">' +
      '<label class="student-floating student-select' + (row.courseName ? ' is-filled' : '') + '"><select data-course-name required><option value="" hidden></option>' + names.map((value) => '<option value="' + escapeHtml(value) + '"' + (sameCourseValue(value, row.courseName) ? ' selected' : '') + '>' + escapeHtml(value) + '</option>').join('') + '</select>' + studentDropdownArrowHtml() + '<span>課程名稱</span></label>' +
      '<label class="student-floating student-select' + (row.classSize ? ' is-filled' : '') + '"><select data-course-size required><option value="" hidden></option>' + sizes.map((value) => '<option value="' + escapeHtml(value) + '"' + (sameCourseValue(value, row.classSize) ? ' selected' : '') + '>' + escapeHtml(value) + '</option>').join('') + '</select>' + studentDropdownArrowHtml() + '<span>課程人數</span></label>' +
      '<div class="student-floating student-date-field' + (dateLabel ? ' is-filled' : '') + '"><input class="student-date-display" type="text" value="' + escapeHtml(dateLabel) + '" placeholder="DD/MM/YYYY" readonly aria-label="首堂日期 DD/MM/YYYY"><label class="student-date-calendar" title="開啟日曆選擇首堂日期"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 2v4M17 2v4M4 9h16M5 5h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z"/><path d="M9 13h6v5H9z"/></svg><input data-course-date type="date" value="' + escapeHtml(row.firstDate || "") + '" aria-label="選擇首堂日期"></label><span>首堂日期</span></div>' +
      '<label class="student-floating' + (hasFee ? ' is-filled' : '') + '"><input type="number" value="' + (hasFee ? fee : '') + '" readonly><span>課堂原價 (HK$)</span></label>' +
      '<label class="student-floating' + (row.discount !== "" && row.discount != null ? ' is-filled' : '') + '"><input data-course-discount type="number" min="0" max="' + fee + '" step="0.01" inputmode="decimal" value="' + escapeHtml(row.discount == null ? "" : row.discount) + '" placeholder="折扣優惠"><span>折扣優惠</span></label>' +
      '<div class="student-net-fee">每堂費用 <strong>' + escapeHtml(formatMoney(Math.max(0, fee - discount), 2)) + '</strong></div></div>' +
      (selected && !sameCourseValue(selected.ageGroup, ageGroup) ? '<p class="student-course-age-note">課堂時間及原價按課程設定「' + escapeHtml(selected.ageGroup) + '」組合計算。</p>' : '') + '</article>';
  }

  function renderStudentEnrollments(form, rows) {
    const age = form.elements.ageGroup.value;
    document.querySelector("#student-course-list").innerHTML = rows.slice(0, 4).map((row, index) => studentEnrollmentHtml(row, index, age)).join("");
    document.querySelector("#student-add-course").disabled = rows.length >= 4;
  }

  function renderStudentYears(form, selectedYear) {
    const existing = findById(state.students, form.elements.id.value);
    const year = fiscalYear(studentRecordDateYmd(form.elements.recordDate.value) || todayYmd());
    const holder = document.querySelector("#student-year-choices");
    if (existing && existing.studentNumber) {
      holder.innerHTML = '<span class="student-number-locked">' + escapeHtml(String(existing.enrollmentYear || selectedYear)) + ' 年度 · 編號已鎖定</span>';
      return;
    }
    const main = [year, year - 1, year - 2, year - 3];
    if (existing && Number(selectedYear) && !main.includes(Number(selectedYear))) main.push(Number(selectedYear));
    holder.innerHTML = studentChoices("enrollmentYear", main.map(String), String(selectedYear), true);
  }

  function updateStudentAge(form) {
    const result = document.querySelector("#student-age-preview");
    const monthText = form.elements.birthMonth.value.trim();
    const yearText = form.elements.birthYear.value.trim();
    const recordDate = studentRecordDateYmd(form.elements.recordDate.value);
    let label = "";
    if (recordDate && /^\d{1,2}$/.test(monthText) && /^\d{4}$/.test(yearText)) {
      const month = Number(monthText);
      const year = Number(yearText);
      const elapsed = (Number(recordDate.slice(0, 4)) - year) * 12 + Number(recordDate.slice(5, 7)) - month;
      if (month >= 1 && month <= 12 && year >= 1900 && elapsed >= 0) label = Math.floor(elapsed / 12) + " 歲 " + (elapsed % 12) + " 個月";
    }
    result.textContent = label;
    result.parentElement.classList.toggle("is-filled", Boolean(label));
  }

  function updateStudentForm(form, ageChanged = false) {
    const age = form.elements.ageGroup.value;
    const minor = isMinorAge(age);
    document.querySelector("#student-birth-fields").hidden = !minor;
    form.elements.birthMonth.disabled = !minor;
    form.elements.birthYear.disabled = !minor;
    updateStudentAge(form);
    document.querySelector("#student-school-field").hidden = !minor;
    document.querySelector("#student-work-field").hidden = !age || minor;
    const contactLabel = form.elements.guardianName.closest(".student-floating").querySelector("span");
    contactLabel.textContent = minor ? "監護人" : "緊急聯絡人";
    form.elements.guardianName.placeholder = " ";
    if (ageChanged) renderStudentEnrollments(form, studentEnrollmentDrafts(form).filter((row) =>
      !row.courseName || studentCoursesForAge(age).some((course) => sameCourseValue(course.name, row.courseName))));
    else document.querySelector("#student-add-course").disabled = studentEnrollmentDrafts(form).length >= 4;
    const existing = findById(state.students, form.elements.id.value);
    const paid = form.elements.enrollmentStatus.value === "已付款";
    const recordDate = studentRecordDateYmd(form.elements.recordDate.value);
    const year = Number(form.querySelector('input[name="enrollmentYear"]:checked')?.value) || fiscalYear(recordDate || todayYmd());
    document.querySelector("#student-number-hint").textContent = existing?.enrollmentStatus === "legacy" && !existing.studentNumber ? "舊學生資料可繼續編輯；補齊年齡、性別及 WhatsApp 後，儲存為已付款會自動補編號。" : paid ? "付款確認後，儲存時依年度和年齡自動編號。已編號學生不可取消或轉換成年／未成年類別。" : "待確認學員暫不編配學生編號。";
    let preview = "";
    try { preview = existing && existing.studentNumber ? existing.studentNumber : !recordDate ? "請先修正今日日期" : paid && age ? nextStudentNumber(year, age).value : ""; }
    catch (error) { preview = error.message; }
    document.querySelector("#student-number-preview").textContent = preview;
  }

  function validateStudentRecordDate(form, showError = false, normalize = false) {
    const input = form.elements.recordDate;
    const ymd = studentRecordDateYmd(input.value);
    const message = ymd ? "" : input.value.trim() ? "日期格式錯誤，請使用 DD-MMM-YYYY，例如 03-Dec-2026。" : "請輸入今日日期，格式為 DD-MMM-YYYY。";
    input.setCustomValidity(message);
    document.querySelector("#student-record-date-error").textContent = showError ? message : "";
    input.closest(".student-record-date").classList.toggle("is-invalid", Boolean(showError && message));
    if (ymd) {
      if (normalize) input.value = formatStudentRecordDate(ymd);
      document.querySelector("#student-record-date-picker").value = ymd;
      if (form.dataset.recordDateYmd !== ymd) {
        form.dataset.recordDateYmd = ymd;
        renderStudentYears(form, fiscalYear(ymd));
      }
    }
    updateStudentForm(form);
    return ymd;
  }

  function openStudentForm(student) {
    const item = student || null;
    openForm({ kicker: "個人資訊", title: student ? "修改學生資訊" : "新增學生", fields: [], onSubmit: (data, form) => saveStudentProfile(data, form) });
    elements.formDialog.classList.add("student-dialog");
    elements.formFields.classList.add("student-form-fields");
    elements.formFields.innerHTML = studentFormHtml(item);
    state.studentFormPhoto = item ? item.photo || "" : "";
    const form = elements.dynamicForm;
    form.dataset.recordDateYmd = studentRecordDateYmd(form.elements.recordDate.value);
    renderStudentYears(form, item && item.enrollmentYear || fiscalYear(form.dataset.recordDateYmd || todayYmd()));
    renderStudentEnrollments(form, item && item.enrollments || []);
    updateStudentForm(form);
    updateStudentOtherPoolField(form);
    if (student) requestAnimationFrame(() => form.elements.name.focus());
  }

  function saveStudentProfile(data, form) {
    const existing = data.id ? findById(state.students, data.id) : null;
    const name = String(data.name || "").trim();
    const recordDate = studentRecordDateYmd(data.recordDate, true);
    if (!recordDate) throw new Error("日期格式錯誤，請使用 DD-MMM-YYYY，例如 03-Dec-2026。");
    const ageGroup = String(data.ageGroup || "");
    const whatsapp = String(data.whatsapp || "").trim();
    const complete = Boolean(ageGroup && data.gender && whatsapp);
    const legacyIncomplete = existing?.enrollmentStatus === "legacy" && data.enrollmentStatus === "已付款" && !complete;
    if (!name || (!complete && !legacyIncomplete)) throw new Error("請填妥學生姓名、年齡組別、性別及 WhatsApp 號碼。");
    if (existing && existing.studentNumber && isMinorAge(existing.ageGroup) !== isMinorAge(ageGroup)) throw new Error("已編號學生不可轉換成年／未成年類別。");
    const paid = data.enrollmentStatus === "已付款" && !legacyIncomplete;
    if (existing && existing.studentNumber && !paid) throw new Error("已編配的學生編號不可取消；請維持「已付款」狀態。");
    if (existing && !paid && !legacyIncomplete && existing.enrollmentStatus !== "pending" &&
      (existing.remaining > 0 || state.suite.payments.some((payment) => payment.studentId === existing.id)))
      throw new Error("這位學生已有堂數或收款紀錄，不能改為待確認學員。");
    const year = existing && existing.studentNumber ? existing.enrollmentYear : Number(data.enrollmentYear) || fiscalYear(recordDate);
    const rows = studentEnrollmentDrafts(form);
    if (rows.length > 4) throw new Error("每位學生最多可新增四個課堂。");
    const enrollments = rows.map((row) => {
      const course = studentCoursesForAge(ageGroup).find((item) => sameCourseValue(item.name, row.courseName) && sameCourseValue(item.classSize, row.classSize));
      const snapshot = !course && existing?.enrollments?.find((item) => item.id === row.id && sameCourseValue(item.ageGroup, ageGroup) && sameCourseValue(item.courseName, row.courseName) && sameCourseValue(item.classSize, row.classSize));
      if (!course && !snapshot) throw new Error("請為每個課堂選擇課程名稱和人數，並確認課程設定中有對應組合。");
      const fee = Number(course ? course.fee : snapshot.originalFee);
      const discount = row.discount === "" ? 0 : Number(row.discount);
      if (!Number.isFinite(discount) || discount < 0 || discount > fee) throw new Error("折扣優惠不可超過課堂原價。");
      return { id: row.id || makeId(), courseId: course ? course.reference ? "" : course.id : snapshot.courseId || "", courseName: course ? course.name : snapshot.courseName, ageGroup,
        pricingAgeGroup: course ? course.ageGroup : snapshot.pricingAgeGroup || ageGroup,
        classSize: course ? course.classSize : snapshot.classSize, firstDate: validDate(row.firstDate) ? row.firstDate : "",
        duration: Number(course ? course.duration : snapshot.duration) || 60, originalFee: fee, discount,
        netFee: Math.round((fee - discount) * 100) / 100 };
    });
    const first = enrollments[0];
    const assigned = paid && !(existing && existing.studentNumber) ? nextStudentNumber(year, ageGroup) : null;
    const dateValue = validDate(data.nextDate) ? data.nextDate : (!existing || existing.enrollmentStatus === "pending") && first && first.firstDate && paid ? first.firstDate : existing?.nextDate || "";
    const roomId = data.roomId || "";
    const otherPoolName = roomId === OTHER_POOL_OPTION ? String(data.otherPoolName || "").trim() : "";
    if (roomId === OTHER_POOL_OPTION && !otherPoolName) throw new Error("請註明其他泳池名稱。");
    const payload = { id: existing ? existing.id : makeId(), name, ageGroup, gender: data.gender, recordDate,
      enrollmentStatus: legacyIncomplete ? "legacy" : paid ? "paid" : "pending", studentNumber: existing?.studentNumber || assigned?.value || "", enrollmentYear: year,
      birthDate: isMinorAge(ageGroup) && existing && validDate(existing.birthDate) &&
        String(Number(existing.birthDate.slice(5, 7))) === String(data.birthMonth || "") && existing.birthDate.slice(0, 4) === String(data.birthYear || "") ? existing.birthDate : "",
      birthMonth: isMinorAge(ageGroup) ? String(data.birthMonth || "") : "", birthYear: isMinorAge(ageGroup) ? String(data.birthYear || "") : "",
      guardianName: String(data.guardianName || "").trim(), whatsapp, email: String(data.email || "").trim(), homeMtr: String(data.homeMtr || "").trim(),
      schoolMtr: isMinorAge(ageGroup) ? String(data.schoolMtr || "").trim() : "", workMtr: isMinorAge(ageGroup) ? "" : String(data.workMtr || "").trim(),
      photo: state.studentFormPhoto, enrollments, courseId: first ? first.courseId : existing?.courseId || "",
      tutorId: existing?.tutorId || "", weekday: existing?.weekday ?? 1, time: existing?.time || "18:00",
      nextTime: existing?.nextTime || existing?.time || "18:00", prepaid: existing?.prepaid ?? 0,
      remaining: existing?.remaining ?? 0, nextDate: existing?.bookingManaged ? existing.nextDate : paid || legacyIncomplete ? dateValue : "", roomId,
      roomName: roomId === OTHER_POOL_OPTION ? otherPoolName : locationNameForId(roomId, existing && existing.roomId === roomId ? existing.roomName : ""),
      bookingManaged: existing?.bookingManaged || false, bookingFallbackDate: existing?.bookingFallbackDate || "",
      bookingFallbackTime: existing?.bookingFallbackTime || "",
      status: existing?.status || "active", history: existing?.history || [], createdAt: existing?.createdAt || new Date().toISOString() };
    const before = existing ? { ...existing } : null;
    const oldCounter = assigned ? state.suite.studentNumberCounters[assigned.key] : undefined;
    if (assigned) state.suite.studentNumberCounters[assigned.key] = assigned.sequence;
    if (existing) Object.assign(existing, payload);
    else state.students.push(payload);
    try { commit(existing ? "學生資料已更新" : "學生已新增"); }
    catch (error) {
      if (existing) Object.assign(existing, before);
      else state.students = state.students.filter((item) => item.id !== payload.id);
      if (assigned) {
        if (oldCounter == null) delete state.suite.studentNumberCounters[assigned.key];
        else state.suite.studentNumberCounters[assigned.key] = oldCounter;
      }
      throw new Error("未能儲存學生資料；請檢查瀏覽器儲存空間。" + (error.message || ""));
    }
  }

  function openCourseForm(course) {
    openForm({
      kicker: "課程設定",
      title: course ? "編輯課程" : "新增課程",
      fields: [
        { name: "id", type: "hidden", value: course ? course.id : "" },
        { name: "name", label: "課程名稱", type: "text", value: course ? course.name : "", required: true, wide: true },
        { name: "ageGroup", label: "年齡組別", type: "text", value: course ? course.ageGroup || "" : "", required: true, help: "例如 6-11：6 歲至未滿 12 歲。" },
        { name: "classSize", label: "課程人數", type: "text", value: course ? course.classSize || "" : "", required: true, help: "例如 1:1、1:2 或小組。" },
        { name: "duration", label: "課堂時間（分鐘）", type: "number", value: course ? course.duration : 60, min: 15, max: 240, required: true },
        { name: "fee", label: "原價（HK$，每位學生）", type: "number", value: course ? course.fee : 350, min: 0, max: 99999, step: "0.01", required: true }
      ],
      onSubmit: (data) => {
        const payload = { name: String(data.name).trim(), ageGroup: String(data.ageGroup).trim(), classSize: String(data.classSize).trim(), duration: Number(data.duration), fee: Number(data.fee) };
        if (!/^\d+(?:\.\d+)?\s*[-–—]\s*\d+(?:\.\d+)?$/.test(payload.ageGroup)) throw new Error("年齡組別請用「6-11」格式。");
        if (!Number.isInteger(payload.duration) || payload.duration < 15 || payload.duration > 240 || !Number.isFinite(payload.fee) || payload.fee < 0 || payload.fee > 99999) throw new Error("請檢查課堂時間及原價。");
        const existing = data.id ? findById(state.suite.courses, data.id) : null;
        const recordKey = window.SwimCourseImport.key(payload);
        if (state.suite.courses.some((item) => item.id !== data.id && item.ageGroup && item.classSize && window.SwimCourseImport.key(item) === recordKey)) throw new Error("這個課程名稱、年齡組別及課程人數組合已存在。");
        if (existing) {
          const oldKey = window.SwimCourseImport.key(existing);
          if (oldKey !== recordKey && window.SwimCourseImport.referenceRows.some((item) => window.SwimCourseImport.key(item) === oldKey) && !state.suite.hiddenReferenceCourses.includes(oldKey)) state.suite.hiddenReferenceCourses.push(oldKey);
          Object.assign(existing, payload);
        } else state.suite.courses.push({ id: makeId(), ...payload, active: true });
        state.courseSelection = { name: payload.name, ageGroup: payload.ageGroup, classSize: payload.classSize };
        commit(existing ? "整組課程已更新" : "整組課程已新增");
      }
    });
  }

  function courseLabel(course) {
    return course.name + "｜" + (course.ageGroup && course.classSize ? course.ageGroup + "｜" + course.classSize : course.level || "待補資料");
  }

  function openCourseImport() {
    state.pendingCourseImport = null;
    elements.courseImportFile.value = "";
    elements.courseImportConfirm.disabled = true;
    document.querySelector("#course-import-preview").innerHTML = "";
    document.querySelector("#course-import-error").textContent = "";
    elements.courseImportDialog.showModal();
    document.body.classList.add("modal-open");
  }

  function previewCourseImport(records) {
    const preview = document.querySelector("#course-import-preview");
    const errorNode = document.querySelector("#course-import-error");
    errorNode.textContent = "";
    try {
      const plan = window.SwimCourseImport.plan(records, state.suite.courses);
      state.pendingCourseImport = plan;
      elements.courseImportConfirm.disabled = !plan.add && !plan.update;
      preview.innerHTML = '<p class="preview-good">共 ' + records.length + ' 組：新增 ' + plan.add + '、更新 ' + plan.update + '、未變更 ' + plan.same + '。</p>' +
        '<p>只更新相同組合的課堂時間與每位學生原價；不刪除未列出的課程，不改變現有課程編號或學生連結。</p>' +
        '<ul>' + plan.changes.slice(0, 6).map((item) => '<li>' + escapeHtml(item.record.name + ' · ' + item.record.ageGroup + ' · ' + item.record.classSize + ' · ' + item.record.duration + ' 分鐘 · ' + formatMoney(item.record.fee, 2)) + '</li>').join('') + '</ul>';
    } catch (error) {
      state.pendingCourseImport = null;
      elements.courseImportConfirm.disabled = true;
      preview.innerHTML = "";
      errorNode.textContent = error.message || "無法預覽課程表。";
    }
  }

  async function previewCourseFile(file) {
    const errorNode = document.querySelector("#course-import-error");
    try { previewCourseImport(await window.SwimCourseImport.parse(file)); }
    catch (error) {
      state.pendingCourseImport = null;
      elements.courseImportConfirm.disabled = true;
      document.querySelector("#course-import-preview").innerHTML = "";
      errorNode.textContent = error.message || "無法讀取課程表。";
    }
  }

  function applyCourseImport() {
    const plan = state.pendingCourseImport;
    if (!plan || (!plan.add && !plan.update)) return;
    const previous = state.suite.courses;
    const previousHidden = state.suite.hiddenReferenceCourses;
    const next = previous.map((item) => ({ ...item }));
    for (const change of plan.changes) {
      if (change.type === "add") next.push({ id: makeId(), ...change.record, active: true });
      if (change.type === "update") Object.assign(next.find((item) => item.id === change.id), change.record);
    }
    state.suite.courses = next;
    const imported = new Set(plan.changes.map((item) => window.SwimCourseImport.key(item.record)));
    state.suite.hiddenReferenceCourses = previousHidden.filter((item) => !imported.has(item));
    try { saveAll(); }
    catch {
      state.suite.courses = previous;
      state.suite.hiddenReferenceCourses = previousHidden;
      document.querySelector("#course-import-error").textContent = "瀏覽器儲存空間不足；未有匯入或更新課程。請先備份現有資料。";
      return;
    }
    state.pendingCourseImport = null;
    elements.courseImportDialog.close();
    document.body.classList.remove("modal-open");
    renderModule();
    showToast("課程已新增 " + plan.add + " 組、更新 " + plan.update + " 組");
  }

  function downloadCourseTemplate() {
    const blob = new Blob([window.SwimCourseImport.toCsv()], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "泳堂管家-課程匯入範本.csv";
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  function saveReferenceCourse(id) {
    const index = Number(String(id).replace("reference-", ""));
    const record = window.SwimCourseImport.referenceRows[index];
    if (!String(id).startsWith("reference-") || !record) return;
    if (state.suite.courses.some((item) => item.ageGroup && item.classSize && window.SwimCourseImport.key(item) === window.SwimCourseImport.key(record))) return showToast("這組課程已在本機清單內");
    if (!window.confirm("將「" + courseLabel(record) + "」加入本機課程？現有課程不會被覆蓋。")) return;
    state.suite.courses.push({ id: makeId(), ...record, active: true });
    commit("整組課程已加入");
  }

  function deleteCourse(id) {
    const course = findById(state.suite.courses, id);
    if (!course) return;
    const linked = state.students.some((student) => student.courseId === id || (student.history || []).some((record) => record.courseId === id)) ||
      state.suite.accounts.some((account) => (account.courseIds || []).includes(id)) || state.suite.products.some((product) => product.courseId === id);
    if (linked) return showToast("這組課程仍連結學生、導師、產品或課堂紀錄；請先解除連結。");
    if (!window.confirm("確定刪除「" + courseLabel(course) + "」的完整五項設定？此操作不能復原，其他組合不會受影響。")) return;
    const key = window.SwimCourseImport.key(course);
    if (window.SwimCourseImport.referenceRows.some((item) => window.SwimCourseImport.key(item) === key) && !state.suite.hiddenReferenceCourses.includes(key)) state.suite.hiddenReferenceCourses.push(key);
    state.suite.courses = state.suite.courses.filter((item) => item.id !== id);
    state.courseSelection = { name: "", ageGroup: "", classSize: "" };
    commit("整組課程已刪除");
  }

  function openRoomForm(room) {
    openForm({
      kicker: "泳班地點",
      title: room ? "編輯泳班地點" : "新增泳班地點",
      fields: [
        { name: "id", type: "hidden", value: room ? room.id : "" },
        { name: "name", label: "名稱", type: "text", value: room ? room.name : "", required: true, wide: true },
        { name: "location", label: "地點", type: "text", value: room ? room.location : "", required: true },
        { name: "capacity", label: "容量", type: "number", value: room ? room.capacity : 6, min: 1, max: 999, required: true },
        { name: "active", label: "狀態", type: "select", value: room ? String(room.active) : "true", options: [{ value: "true", label: "可預約" }, { value: "false", label: "停用" }] }
      ],
      onSubmit: (data) => upsertCollection("rooms", data, {
        name: String(data.name).trim(), location: String(data.location).trim(), capacity: Number(data.capacity), active: data.active === "true"
      }, "泳班地點")
    });
  }

  function openPoolForm(record) {
    state.locationMenuOpen = false;
    if (elements.locationManageDialog.open) elements.locationManageDialog.close();
    if (state.currentModule === "rooms") renderModule();
    openForm({
      kicker: "泳班地點",
      title: record ? "編輯泳池地點" : "新增泳池",
      fields: [
        { name: "id", type: "hidden", value: record ? record.id : "" },
        { name: "pool", label: "課堂泳池", type: "text", value: record ? record.pool : "", required: true, wide: true },
        { name: "place", label: "泳池地點", type: "text", value: record ? record.place : "", required: true },
        { name: "meetingPoint", label: "集合位置", type: "textarea", value: record ? record.meetingPoint : "", required: true, wide: true },
        { name: "cleaningDay", label: "泳池清潔日", type: "text", value: record ? record.cleaningDay : "", required: true },
        { name: "maintenanceTime", label: "年度維修時間", type: "text", value: record ? record.maintenanceTime : "", required: true }
      ],
      onSubmit: (data) => {
        const payload = Object.fromEntries(["pool", "place", "meetingPoint", "cleaningDay", "maintenanceTime"].map((field) => [field, String(data[field] || "").trim()]));
        if (Object.values(payload).some((value) => !value)) throw new Error("請填妥五個欄位。");
        if (payload.pool.length > 80 || payload.place.length > 80 || payload.meetingPoint.length > 500 || payload.cleaningDay.length > 100 || payload.maintenanceTime.length > 100) throw new Error("資料過長，請縮短文字。");
        const existing = data.id ? findById(state.suite.poolLocations, data.id) : null;
        if (state.suite.poolLocations.some((item) => item.id !== (existing && existing.id) && window.SwimLocationImport.key(item) === window.SwimLocationImport.key(payload))) throw new Error("這個課堂泳池與泳池地點的組合已存在。");
        const previous = state.suite.poolLocations;
        state.suite.poolLocations = previous.map((item) => item.id === (existing && existing.id) ? { ...item, ...payload } : item);
        if (!existing) state.suite.poolLocations.push({ id: makeId(), ...payload });
        try { saveAll(); }
        catch {
          state.suite.poolLocations = previous;
          throw new Error("瀏覽器儲存空間不足；泳班地點未有儲存。請先備份資料。");
        }
        state.locationSelection = { pool: payload.pool, place: payload.place };
        closeForm();
        renderModule();
        showToast(existing ? "這組泳班地點已更新" : "這組泳班地點已新增");
      }
    });
  }

  function locationManageHtml() {
    const records = state.locationManagePool ? state.suite.poolLocations.filter((item) => item.pool === state.locationManagePool) : state.suite.poolLocations;
    return records.length ? records.map((item) => '<article class="location-manage-item"><div><strong>' + escapeHtml(item.pool) + '</strong><span>' + escapeHtml(item.place) + '</span></div><div class="row-actions"><button class="mini-button" type="button" data-action="edit-pool-location" data-id="' + escapeHtml(item.id) + '">✎ 編輯</button><button class="mini-button danger" type="button" data-action="delete-pool-location" data-id="' + escapeHtml(item.id) + '">' + trashIconHtml() + '<span>刪除</span></button></div></article>').join('') : '<p class="location-empty">沒有可管理的泳班地點組合。</p>';
  }

  function openLocationManage(pool = "") {
    state.locationMenuOpen = false;
    if (state.currentModule === "rooms") renderModule();
    state.locationManagePool = pool;
    document.querySelector("#location-manage-list").innerHTML = locationManageHtml();
    elements.locationManageDialog.showModal();
    document.body.classList.add("modal-open");
  }

  function deletePoolLocation(record) {
    if (!record || !window.confirm("確定刪除「" + record.pool + "／" + record.place + "」這一組泳班地點資料？其他組合不會刪除；現有學生及課堂所記錄的泳池名稱會保留。")) return;
    const previous = state.suite.poolLocations;
    state.suite.poolLocations = previous.filter((item) => item.id !== record.id);
    try { saveAll(); }
    catch {
      state.suite.poolLocations = previous;
      return showToast("瀏覽器儲存空間不足；未有刪除資料");
    }
    if (state.locationSelection.pool === record.pool && state.locationSelection.place === record.place) {
      state.locationSelection.place = "";
      if (!state.suite.poolLocations.some((item) => item.pool === record.pool)) state.locationSelection.pool = "";
    }
    if (elements.locationManageDialog.open) document.querySelector("#location-manage-list").innerHTML = locationManageHtml();
    renderModule();
    showToast("只刪除了選定的泳班地點組合");
  }

  function openLocationImport() {
    state.locationMenuOpen = false;
    if (state.currentModule === "rooms") renderModule();
    state.pendingLocationImport = null;
    elements.locationImportFile.value = "";
    elements.locationImportConfirm.disabled = true;
    document.querySelector("#location-import-preview").innerHTML = "";
    document.querySelector("#location-import-error").textContent = "";
    elements.locationImportDialog.showModal();
    document.body.classList.add("modal-open");
  }

  function previewLocationImport(records) {
    const preview = document.querySelector("#location-import-preview");
    const errorNode = document.querySelector("#location-import-error");
    errorNode.textContent = "";
    try {
      const plan = window.SwimLocationImport.plan(records, state.suite.poolLocations);
      state.pendingLocationImport = plan;
      elements.locationImportConfirm.disabled = !plan.add && !plan.update;
      preview.innerHTML = '<p class="preview-good">共 ' + records.length + ' 組：新增 ' + plan.add + '、更新 ' + plan.update + '、未變更 ' + plan.same + '。</p><p>只更新相同「課堂泳池＋泳池地點」的集合位置、清潔日與年度維修時間；未列出的組合及舊學生資料都不會刪除。</p><ul>' + plan.changes.slice(0, 6).map((item) => '<li>' + escapeHtml(item.record.pool + ' · ' + item.record.place + ' · ' + (item.type === 'add' ? '新增' : item.type === 'update' ? '更新' : '未變更')) + '</li>').join('') + '</ul>';
    } catch (error) {
      state.pendingLocationImport = null;
      elements.locationImportConfirm.disabled = true;
      preview.innerHTML = "";
      errorNode.textContent = error.message || "無法預覽泳班地點表。";
    }
  }

  async function previewLocationFile(file) {
    try { previewLocationImport(await window.SwimLocationImport.parse(file)); }
    catch (error) {
      state.pendingLocationImport = null;
      elements.locationImportConfirm.disabled = true;
      document.querySelector("#location-import-preview").innerHTML = "";
      document.querySelector("#location-import-error").textContent = error.message || "無法讀取泳班地點表。";
    }
  }

  function applyLocationImport() {
    const plan = state.pendingLocationImport;
    if (!plan || (!plan.add && !plan.update)) return;
    const previous = state.suite.poolLocations;
    const next = previous.map((item) => ({ ...item }));
    for (const change of plan.changes) {
      if (change.type === "add") next.push({ id: makeId(), ...change.record });
      if (change.type === "update") Object.assign(next.find((item) => item.id === change.id), change.record);
    }
    state.suite.poolLocations = next;
    try { saveAll(); }
    catch {
      state.suite.poolLocations = previous;
      document.querySelector("#location-import-error").textContent = "瀏覽器儲存空間不足；未有匯入或更新資料。請先備份。";
      return;
    }
    state.pendingLocationImport = null;
    elements.locationImportDialog.close();
    document.body.classList.remove("modal-open");
    renderModule();
    showToast("泳班地點已新增 " + plan.add + " 組、更新 " + plan.update + " 組");
  }

  function downloadLocationTemplate() {
    const blob = new Blob([window.SwimLocationImport.toCsv()], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "泳堂管家-泳班地點匯入範本.csv";
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  function timeMinutes(value) {
    if (value === "24:00") return 1440;
    return validTime(value) ? Number(value.slice(0, 2)) * 60 + Number(value.slice(3)) : NaN;
  }

  function minutesText(minutes) {
    return String(Math.floor(minutes / 60)).padStart(2, "0") + ":" + String(minutes % 60).padStart(2, "0");
  }

  function lessonOfficeBounds(date) {
    const settings = state.suite.bookingOptions.officeHours;
    const parsed = parseDate(date);
    const daily = settings && parsed && (settings[parsed.getDay()] || settings.default);
    const opening = daily && timeMinutes(daily.open || daily.start);
    const closing = daily && timeMinutes(daily.close || daily.end);
    return Number.isFinite(opening) && Number.isFinite(closing) && closing > opening ? [opening, closing] : [0, 1440];
  }

  function slotError(date, start, end) {
    if (!validDate(date) || formatYmd(parseDate(date)) !== date) return "請選擇有效日期。";
    const first = timeMinutes(start), last = timeMinutes(end);
    if (!Number.isFinite(first) || !Number.isFinite(last) || first >= last) return "結束時間必須遲於開始時間，請使用 HH:MM。";
    const [open, close] = lessonOfficeBounds(date);
    if (first < open || last > close) return "課堂時間必須位於當日辦公時間內。";
    return "";
  }

  function nextQuickSlot() {
    const now = new Date();
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let candidate = (now.getHours() + 1) * 60;
    for (let offset = 0; offset < 8; offset += 1) {
      if (candidate >= 1440) { date.setDate(date.getDate() + 1); candidate = 0; }
      const ymd = formatYmd(date);
      const [open, close] = lessonOfficeBounds(ymd);
      const start = Math.max(candidate, Math.ceil(open / 60) * 60);
      if (start + 60 <= close) return { date: ymd, start: minutesText(start), end: minutesText(start + 60) };
      date.setDate(date.getDate() + 1);
      candidate = 0;
    }
    return { date: formatYmd(date), start: "09:00", end: "10:00" };
  }

  function openQuickLesson(slot = null) {
    state.quickLesson = slot || nextQuickSlot();
    const date = document.querySelector("#quick-lesson-date");
    date.value = formatStudentRecordDate(state.quickLesson.date);
    document.querySelector("#quick-lesson-date-picker").value = state.quickLesson.date;
    document.querySelector("#quick-lesson-start").value = state.quickLesson.start;
    document.querySelector("#quick-lesson-end").value = state.quickLesson.end;
    document.querySelector("#quick-lesson-date-error").textContent = "";
    document.querySelector("#quick-lesson-error").textContent = "";
    elements.quickLessonDialog.showModal();
    document.body.classList.add("modal-open");
  }

  function updateQuickEndFromStart(value) {
    const start = timeMinutes(String(value || "").trim());
    if (!Number.isFinite(start)) return;
    const errorNode = document.querySelector("#quick-lesson-error");
    if (start + 60 > 1440) {
      errorNode.textContent = "開始時間太接近午夜，無法在當日自動安排完整一小時；請調整時間。";
      return;
    }
    document.querySelector("#quick-lesson-end").value = minutesText(start + 60);
    errorNode.textContent = "";
  }

  function submitQuickLesson() {
    const dateInput = document.querySelector("#quick-lesson-date");
    const date = studentRecordDateYmd(dateInput.value);
    const dateError = document.querySelector("#quick-lesson-date-error");
    dateError.textContent = date ? "" : "日期格式錯誤，請使用 DD-MMM-YYYY，例如 03-Dec-2026。";
    const start = document.querySelector("#quick-lesson-start").value.trim();
    const end = document.querySelector("#quick-lesson-end").value.trim();
    const error = date ? slotError(date, start, end) : "";
    document.querySelector("#quick-lesson-error").textContent = error;
    if (!date || error) return;
    elements.quickLessonDialog.close();
    openBookingForm({ date, start, end });
  }

  function timePickerValues(unit) {
    const picker = state.timePicker;
    const [open, close] = lessonOfficeBounds(picker.date);
    const isEnd = picker.target === "quick-lesson-end" || picker.target.startsWith("booking-end-");
    const max = unit === "hour" ? isEnd ? 24 : 23 : 59;
    return Array.from({ length: max + 1 }, (_, value) => value).filter((value) => {
      const hour = unit === "hour" ? value : picker.hour;
      const minute = unit === "minute" ? value : picker.minute;
      const minutes = hour * 60 + minute;
      if (unit === "hour") return hour * 60 <= close && (hour + 1) * 60 > open && (isEnd || hour * 60 < close) && (hour !== 24 || isEnd);
      return minutes >= open && minutes <= close && (isEnd || minutes < close) && (hour !== 24 || minute === 0);
    });
  }

  function renderTimePicker() {
    const picker = state.timePicker;
    for (const [unit, container] of [["hour", "#lesson-time-hours"], ["minute", "#lesson-time-minutes"]]) {
      const choices = timePickerValues(unit);
      const current = unit === "hour" ? picker.hour : picker.minute;
      const index = choices.indexOf(current);
      document.querySelector(container).innerHTML = Array.from({ length: 5 }, (_, offset) => {
        const value = choices[index + offset - 2];
        return value == null ? '<span class="lesson-time-blank"></span>' : '<button type="button" data-action="select-lesson-time" data-unit="' + unit + '" data-value="' + value + '" class="' + (value === current ? 'is-selected' : '') + '">' + String(value).padStart(2, "0") + '</button>';
      }).join("");
    }
  }

  function openTimePicker(target) {
    const input = document.getElementById(target);
    if (!input) return;
    const row = input.closest(".booking-date-row");
    const rawDate = row ? row.dataset.date : studentRecordDateYmd(document.querySelector("#quick-lesson-date").value) || todayYmd();
    const isEnd = target === "quick-lesson-end" || target.startsWith("booking-end-");
    const fallback = isEnd ? "21:00" : "20:00";
    const value = Number.isFinite(timeMinutes(input.value)) ? input.value : fallback;
    const [open, close] = lessonOfficeBounds(rawDate);
    const bounded = Math.max(open, Math.min(timeMinutes(value), close));
    state.timePicker = { target, date: rawDate, hour: Math.floor(bounded / 60), minute: bounded % 60 };
    if (!isEnd && state.timePicker.hour === 24) { state.timePicker.hour = 23; state.timePicker.minute = 59; }
    document.querySelector("#lesson-time-title").textContent = isEnd ? "結束" : "開始";
    document.querySelector("#lesson-time-error").textContent = "";
    renderTimePicker();
    elements.timePickerDialog.showModal();
  }

  function shiftTimePicker(unit, delta) {
    const choices = timePickerValues(unit);
    const current = unit === "hour" ? state.timePicker.hour : state.timePicker.minute;
    const index = choices.indexOf(current);
    const next = choices[Math.max(0, Math.min(choices.length - 1, index + delta))];
    if (next == null) return;
    state.timePicker[unit] = next;
    normalizeTimePicker();
    renderTimePicker();
  }

  function normalizeTimePicker() {
    const picker = state.timePicker;
    const [open, close] = lessonOfficeBounds(picker.date);
    const isEnd = picker.target === "quick-lesson-end" || picker.target.startsWith("booking-end-");
    const bounded = Math.max(open, Math.min(picker.hour * 60 + picker.minute, close - (isEnd ? 0 : 1)));
    picker.hour = Math.floor(bounded / 60);
    picker.minute = bounded % 60;
  }

  function confirmTimePicker() {
    const picker = state.timePicker;
    const value = minutesText(picker.hour * 60 + picker.minute);
    const input = document.getElementById(picker.target);
    if (!input) return elements.timePickerDialog.close();
    input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    elements.timePickerDialog.close();
  }

  function bookingStudentsForCourse(courseName, ageGroup = "", classSize = "") {
    return state.students.filter((student) => student.status !== "inactive" && student.enrollmentStatus !== "pending" &&
      ((student.enrollments || []).some((item) => sameCourseValue(item.courseName, courseName) &&
        (!ageGroup || sameCourseValue(item.ageGroup, ageGroup) || sameCourseValue(item.pricingAgeGroup, ageGroup)) &&
        (!classSize || sameCourseValue(item.classSize, classSize))) ||
        (!(student.enrollments || []).length && sameCourseValue(courseForStudent(student)?.name, courseName) &&
          (!ageGroup || sameCourseValue(courseForStudent(student)?.ageGroup, ageGroup) || sameCourseValue(student.ageGroup, ageGroup)) &&
          (!classSize || sameCourseValue(courseForStudent(student)?.classSize, classSize)))));
  }

  function renderBookingChoices() {
    const draft = state.bookingDraft;
    const search = draft.search.trim().toLocaleLowerCase();
    const matches = (name) => !search || String(name || "").toLocaleLowerCase().includes(search);
    const chips = (rows, selected, action, index) => rows.map((item) => '<button class="booking-chip' + (selected.has(item.value) ? ' is-selected' : '') + '" type="button" data-action="' + action + '" data-group="' + index + '" data-value="' + escapeHtml(item.value) + '" aria-pressed="' + selected.has(item.value) + '">' + escapeHtml(item.label) + '</button>').join('') || '<p class="booking-empty">未有符合的項目。</p>';
    document.querySelector("#booking-add-group").disabled = draft.groups.length >= 5;
    document.querySelector("#booking-groups").innerHTML = draft.groups.map((group, index) => {
      const usedTutors = new Set(draft.groups.filter((_, other) => other !== index).flatMap((item) => [...item.tutorIds]));
      const tutors = state.suite.accounts.filter((item) => item.role === "tutor" && !usedTutors.has(item.id) && (matches(item.name) || group.tutorIds.has(item.id)))
        .map((item) => ({ value: item.id, label: item.name }));
      const allowedIds = new Set([...group.tutorIds].flatMap((id) => findById(state.suite.accounts, id)?.courseIds || []));
      const courses = displayCourses().filter((item) => item.active !== false && allowedIds.has(item.id));
      const chosen = courses.find((item) => item.id === group.courseId);
      const preserved = !chosen && group.courseName ? { id: group.courseId || "legacy-course", name: "既有預約：" + group.courseName, ageGroup: group.ageGroup, classSize: group.classSize } : null;
      const courseRows = (preserved ? courses.concat(preserved) : courses).filter((item) => matches(item.name) || group.courseId === item.id)
        .map((item) => ({ value: item.id, label: [item.name, item.ageGroup, item.classSize].filter(Boolean).join(" · ") }));
      const eligibleStudents = group.courseName ? bookingStudentsForCourse(group.courseName, group.ageGroup, group.classSize) : [];
      const selectedLegacy = [...group.studentIds].map((id) => findById(state.students, id)).filter((item) => item && !eligibleStudents.some((other) => other.id === item.id));
      const students = eligibleStudents.concat(selectedLegacy).filter((item) => matches(item.name) || group.studentIds.has(item.id))
        .map((item) => ({ value: item.id, label: item.name }));
      const pools = locationSelectOptions();
      return '<article class="booking-group-card"><div class="student-section-heading"><h4>課堂 ' + (index + 1) + '</h4>' + (draft.groups.length > 1 ? '<button class="mini-button danger" type="button" data-action="booking-remove-group" data-group="' + index + '">移除</button>' : '') + '</div>' +
        '<fieldset class="booking-pick"><legend>導師</legend><div class="booking-chips">' + chips(tutors, group.tutorIds, "booking-tutor", index) + '</div></fieldset>' +
        '<fieldset class="booking-pick"><legend>可任教課程・年齡・人數</legend><div class="booking-chips">' + (group.tutorIds.size ? chips(courseRows, new Set(group.courseId ? [group.courseId] : group.courseName ? ["legacy-course"] : []), "booking-course", index) : '<p class="booking-empty">請先選擇導師。</p>') + '</div></fieldset>' +
        '<fieldset class="booking-pick"><legend>已報讀學生</legend><div class="booking-chips">' + (group.courseName ? chips(students, group.studentIds, "booking-student", index) : '<p class="booking-empty">請先選擇小組課堂。</p>') + '</div></fieldset>' +
        '<label class="booking-pool-field">課堂泳池<select data-booking-pool data-group="' + index + '" aria-label="課堂 ' + (index + 1) + ' 泳池"><option value="">未指定課堂泳池</option>' + pools.map((item) => '<option value="' + escapeHtml(item.value) + '"' + (item.value === group.roomId ? ' selected' : '') + '>' + escapeHtml(item.label) + '</option>').join('') + '</select></label></article>';
    }).join('');
  }

  function renderBookingCalendar() {
    const draft = state.bookingDraft;
    const first = new Date(draft.month.getFullYear(), draft.month.getMonth(), 1);
    const start = addDays(first, -first.getDay());
    document.querySelector("#booking-month-label").textContent = first.getFullYear() + "年" + (first.getMonth() + 1) + "月";
    document.querySelector("#booking-calendar-days").innerHTML = Array.from({ length: 42 }, (_, index) => {
      const date = addDays(start, index), ymd = formatYmd(date);
      const classes = [date.getMonth() !== first.getMonth() ? "is-outside" : "", ymd === todayYmd() ? "is-today" : "", draft.dates[ymd] ? "is-selected" : ""].filter(Boolean).join(" ");
      return '<button type="button" class="' + classes + '" data-action="booking-date" data-date="' + ymd + '" aria-label="' + escapeHtml(ymd) + '" aria-pressed="' + Boolean(draft.dates[ymd]) + '">' + date.getDate() + '</button>';
    }).join("");
  }

  function renderBookingDates() {
    const dates = Object.entries(state.bookingDraft.dates).sort(([a], [b]) => a.localeCompare(b));
    document.querySelector("#booking-selected-count").textContent = "已選日期 (" + dates.length + ")";
    document.querySelector("#booking-selected-dates").innerHTML = dates.map(([date, slot]) => {
      const label = (parseDate(date).getMonth() + 1) + "月" + parseDate(date).getDate() + "日";
      return '<div class="booking-date-row" data-date="' + date + '"><strong>' + label + '</strong><input id="booking-start-' + date + '" type="text" inputmode="numeric" value="' + escapeHtml(slot.start) + '" placeholder="開始" aria-label="' + label + '開始時間"><span>→</span><input id="booking-end-' + date + '" type="text" inputmode="numeric" value="' + escapeHtml(slot.end) + '" placeholder="結束" aria-label="' + label + '結束時間"><button type="button" data-action="booking-date" data-date="' + date + '" aria-label="移除' + label + '">×</button></div>';
    }).join('');
  }

  function openBookingForm(slot, existing) {
    const firstDate = slot.date || todayYmd();
    state.bookingDraft = {
      editingId: existing?.id || "", search: "",
      groups: [{ tutorIds: new Set(existing?.tutorIds || []), courseId: existing?.courseId || "",
        courseName: existing?.courseName || "", ageGroup: existing?.ageGroup || "",
        classSize: existing?.classSize || "", studentIds: new Set(existing?.studentIds || []),
        roomId: existing?.roomId || "", roomName: existing?.roomName || "" }],
      dates: { [firstDate]: { start: slot.start, end: slot.end } }, defaultSlot: { start: slot.start, end: slot.end }, month: parseDate(firstDate)
    };
    document.querySelector("#booking-title").textContent = existing ? "編輯預約課堂" : "預約課堂";
    document.querySelector("#booking-search").value = "";
    document.querySelector("#booking-error").textContent = "";
    renderBookingChoices();
    renderBookingCalendar();
    renderBookingDates();
    elements.bookingDialog.showModal();
    document.body.classList.add("modal-open");
  }

  function syncBookingStudent(studentId) {
    const student = findById(state.students, studentId);
    if (!student) return;
    const next = state.suite.lessonBookings.filter((booking) => booking.studentIds.includes(studentId))
      .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))[0];
    if (next) {
      if (!student.bookingManaged) {
        if (student.nextDate) return;
        student.bookingFallbackDate = student.nextDate || "";
        student.bookingFallbackTime = student.nextTime || student.time || "";
      }
      student.bookingManaged = true;
      student.nextDate = next.date;
      student.nextTime = next.start;
    } else if (student.bookingManaged) {
      student.bookingManaged = false;
      student.nextDate = student.bookingFallbackDate >= todayYmd() ? student.bookingFallbackDate : "";
      student.nextTime = student.bookingFallbackTime || student.time;
      student.bookingFallbackDate = "";
      student.bookingFallbackTime = "";
    }
  }

  function saveBookingDraft() {
    const draft = state.bookingDraft;
    const errorNode = document.querySelector("#booking-error");
    errorNode.textContent = "";
    if (!draft.groups.length || draft.groups.length > 5) { errorNode.textContent = "同一時段最多可新增五個課堂。"; return; }
    const validTutors = new Map(state.suite.accounts.filter((item) => item.role === "tutor").map((item) => [item.id, item]));
    const selectedTutorIds = new Set(), selectedStudentIds = new Set();
    for (let index = 0; index < draft.groups.length; index += 1) {
      const group = draft.groups[index];
      if (!group.courseName || !group.tutorIds.size || !group.studentIds.size) {
        errorNode.textContent = "課堂 " + (index + 1) + "：請選擇導師、可任教課程及至少一位已報讀學生。"; return;
      }
      if (group.tutorIds.size > 1 && !(draft.editingId && index === 0)) {
        errorNode.textContent = "每個新課堂只可選一位導師。"; return;
      }
      for (const id of group.tutorIds) {
        if (!validTutors.has(id) || selectedTutorIds.has(id)) { errorNode.textContent = "同一時段的課堂必須由不同導師身分負責。"; return; }
        selectedTutorIds.add(id);
      }
      const course = displayCourses().find((item) => item.id === group.courseId && sameCourseValue(item.name, group.courseName));
      const old = state.suite.lessonBookings.find((item) => item.id === draft.editingId);
      const preserved = old && index === 0 && sameCourseValue(old.courseName, group.courseName) &&
        old.tutorIds.length === group.tutorIds.size && old.tutorIds.every((id) => group.tutorIds.has(id)) &&
        old.studentIds.length === group.studentIds.size && old.studentIds.every((id) => group.studentIds.has(id));
      if (!course && !preserved) { errorNode.textContent = "課堂 " + (index + 1) + "：課程設定已變更，請重新選擇。"; return; }
      if (!preserved && [...group.tutorIds].some((id) => !validTutors.get(id).courseIds?.includes(group.courseId))) {
        errorNode.textContent = "課堂 " + (index + 1) + "：導師未獲設定任教所選課程。"; return;
      }
      const eligible = new Set(bookingStudentsForCourse(group.courseName, group.ageGroup, group.classSize).map((item) => item.id));
      for (const id of group.studentIds) {
        if ((!preserved && !eligible.has(id)) || selectedStudentIds.has(id)) { errorNode.textContent = "同一時段的學生只能編入一班，並須已報讀該課程組合。"; return; }
        selectedStudentIds.add(id);
      }
    }
    const dates = Object.entries(draft.dates).sort(([a], [b]) => a.localeCompare(b));
    if (!dates.length) { errorNode.textContent = "請從月曆選擇至少一個日期。"; return; }
    for (const [date, slot] of dates) {
      const problem = slotError(date, slot.start, slot.end);
      if (problem) { errorNode.textContent = date + "：" + problem; return; }
    }
    const previous = state.suite.lessonBookings;
    const old = previous.find((item) => item.id === draft.editingId);
    const created = dates.flatMap(([date, slot], dateIndex) => draft.groups.map((group, groupIndex) => {
      const room = locationSelectOptions().find((item) => item.value === group.roomId);
      return { id: dateIndex === 0 && groupIndex === 0 && old ? old.id : makeId(), date, start: slot.start, end: slot.end,
        courseId: group.courseId, courseName: group.courseName, ageGroup: group.ageGroup, classSize: group.classSize,
        tutorIds: [...group.tutorIds], studentIds: [...group.studentIds], roomId: group.roomId,
        roomName: room?.label || group.roomName || "", createdAt: dateIndex === 0 && groupIndex === 0 && old ? old.createdAt : new Date().toISOString() };
    }));
    const remaining = previous.filter((item) => item.id !== draft.editingId);
    for (const booking of created) {
      const overlaps = remaining.concat(created.filter((item) => item !== booking)).some((item) => item.date === booking.date && timeMinutes(booking.start) < timeMinutes(item.end) && timeMinutes(item.start) < timeMinutes(booking.end) &&
        (item.studentIds.some((id) => booking.studentIds.includes(id)) || item.tutorIds.some((id) => booking.tutorIds.includes(id))));
      if (overlaps) { errorNode.textContent = booking.date + " 有學生或導師已安排同時段課堂。"; return; }
      const legacyOverlap = booking.studentIds.some((id) => {
        const student = findById(state.students, id);
        if (!student || student.bookingManaged || student.nextDate !== booking.date) return false;
        const start = timeMinutes(student.nextTime || student.time);
        const end = start + (Number(courseForStudent(student)?.duration) || 60);
        return Number.isFinite(start) && timeMinutes(booking.start) < end && start < timeMinutes(booking.end);
      });
      if (legacyOverlap) { errorNode.textContent = booking.date + " 有學生已安排同時段課堂。"; return; }
    }
    for (const [date] of dates) {
      const intervals = remaining.concat(created).filter((item) => item.date === date).flatMap((item) => [[timeMinutes(item.start), 1], [timeMinutes(item.end), -1]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      let concurrent = 0;
      if (intervals.some(([, delta]) => (concurrent += delta) > 5)) { errorNode.textContent = date + " 同一時間最多可有五個課堂。"; return; }
    }
    const touched = new Set([...(old?.studentIds || []), ...draft.groups.flatMap((group) => [...group.studentIds])]);
    const snapshots = [...touched].map((id) => { const student = findById(state.students, id); return student && [student, student.nextDate, student.nextTime, student.bookingManaged, student.bookingFallbackDate, student.bookingFallbackTime]; }).filter(Boolean);
    state.suite.lessonBookings = remaining.concat(created);
    touched.forEach(syncBookingStudent);
    try { saveAll(); }
    catch {
      state.suite.lessonBookings = previous;
      snapshots.forEach(([student, date, time, managed, fallbackDate, fallbackTime]) => Object.assign(student, { nextDate: date, nextTime: time, bookingManaged: managed, bookingFallbackDate: fallbackDate, bookingFallbackTime: fallbackTime }));
      errorNode.textContent = "瀏覽器儲存空間不足；未有新增課堂。請先備份。"; return;
    }
    elements.bookingDialog.close();
    document.body.classList.remove("modal-open");
    state.scheduleDate = dates[0][0];
    renderModule();
    showToast("已預約 " + created.length + " 個日期的課堂");
  }

  function completeBooking(booking) {
    if (!booking) return;
    const students = booking.studentIds.map((id) => findById(state.students, id)).filter(Boolean);
    if (students.some((student) => student.remaining <= 0)) return showToast("有學生堂數已用完，請先記錄收款");
    if (!window.confirm("確認完成 " + booking.date + " 的課堂，並為 " + students.length + " 位學生各扣一堂？")) return;
    for (const student of students) {
      student.remaining -= 1;
      student.history.unshift({ id: makeId(), bookingId: booking.id, type: "completed", lessonDate: booking.date, lessonTime: booking.start,
        tutorId: booking.tutorIds[0] || "", tutorIds: booking.tutorIds, courseId: student.courseId || "", durationMinutes: timeMinutes(booking.end) - timeMinutes(booking.start),
        roomId: booking.roomId, roomName: booking.roomName, createdAt: new Date().toISOString() });
      student.history = student.history.slice(0, 100);
    }
    state.suite.lessonBookings = state.suite.lessonBookings.filter((item) => item.id !== booking.id);
    booking.studentIds.forEach(syncBookingStudent);
    saveAll(); renderModule(); showToast("課堂已完成，學生堂數已扣減");
  }

  function cancelBooking(booking) {
    if (!booking || !window.confirm("確認取消 " + booking.date + " 的預約課堂？學生堂數不會扣減。")) return;
    for (const id of booking.studentIds) {
      const student = findById(state.students, id);
      if (!student) continue;
      student.history.unshift({ id: makeId(), type: "cancelled", lessonDate: booking.date, lessonTime: booking.start, roomId: booking.roomId, roomName: booking.roomName, createdAt: new Date().toISOString() });
      student.history = student.history.slice(0, 100);
    }
    state.suite.lessonBookings = state.suite.lessonBookings.filter((item) => item.id !== booking.id);
    booking.studentIds.forEach(syncBookingStudent);
    saveAll(); renderModule(); showToast("課堂已取消，沒有扣堂");
  }

  function openLessonForm(student) {
    const eligible = state.students.filter((item) => item.enrollmentStatus !== "pending");
    if (!eligible.length) return showToast("請先新增已付款學生");
    const opening = clampWhole(state.suite.bookingOptions.openHour, 0, 22, 7);
    const closing = clampWhole(state.suite.bookingOptions.closeHour, opening + 1, 23, 22);
    const defaultCourse = courseForStudent(student || eligible[0]);
    const defaultDuration = defaultCourse && Number(defaultCourse.duration) || 60;
    const latestStart = Math.max(opening * 60, closing * 60 - defaultDuration);
    const defaultTimeMinutes = Math.min(latestStart, Math.max(opening * 60, 18 * 60));
    openForm({
      kicker: "時間表",
      title: "編排下一堂",
      fields: [
        { name: "studentId", label: "學生", type: "select", value: student ? student.id : eligible[0].id, required: true, wide: true, options: eligible.map((item) => ({ value: item.id, label: item.name })) },
        { name: "date", label: "日期", type: "date", value: student ? student.nextDate : state.scheduleDate || todayYmd(), required: true },
        { name: "time", label: "時間", type: "time", value: student ? student.nextTime || student.time : String(Math.floor(defaultTimeMinutes / 60)).padStart(2, "0") + ":" + String(defaultTimeMinutes % 60).padStart(2, "0"), min: String(opening).padStart(2, "0") + ":00", max: String(closing).padStart(2, "0") + ":00", required: true },
        { name: "roomId", label: "泳班地點", type: "select", value: student ? student.roomId : "", options: [{ value: "", label: "未指定泳班地點" }].concat(locationSelectOptions()) }
      ],
      onSubmit: (data) => {
        const target = findById(state.students, data.studentId);
        if (!target) throw new Error("找不到學生。");
        const targetCourse = courseForStudent(target);
        const duration = targetCourse && Number(targetCourse.duration) || 60;
        const [hour, minute] = data.time.split(":").map(Number);
        const startMinutes = hour * 60 + minute;
        if (startMinutes < opening * 60 || startMinutes + duration > closing * 60) throw new Error("課堂時間必須完整位於中心開放時間內。");
        const oldRoomName = locationNameForId(target.roomId, target.roomName);
        const newRoomName = locationNameForId(data.roomId, target.roomId === data.roomId ? target.roomName : "");
        target.history.unshift({ id: makeId(), type: "rescheduled", lessonDate: target.nextDate, lessonTime: target.nextTime || target.time,
          roomId: target.roomId || "", roomName: oldRoomName, newDate: data.date, newTime: data.time,
          newRoomId: data.roomId || "", newRoomName, createdAt: new Date().toISOString() });
        target.nextDate = data.date;
        target.nextTime = data.time;
        target.roomId = data.roomId || "";
        target.roomName = newRoomName;
        target.history = target.history.slice(0, 100);
        commit("下一堂已編排");
      }
    });
  }

  function openPaymentForm(student) {
    if (!state.students.length) return showToast("請先新增學生");
    openForm({
      kicker: "付款及收據",
      title: "記錄收款",
      fields: [
        { name: "studentId", label: "學生", type: "select", value: student ? student.id : state.students[0].id, required: true, wide: true, options: state.students.map((item) => ({ value: item.id, label: item.name })) },
        { name: "amount", label: "金額（HKD）", type: "number", value: 2400, min: 0, max: 999999, required: true },
        { name: "lessons", label: "增加堂數", type: "number", value: 8, min: 1, max: 999, required: true },
        { name: "date", label: "收款日期", type: "date", value: todayYmd(), required: true },
        { name: "method", label: "付款方式", type: "select", value: "轉數快", options: ["轉數快", "現金", "銀行轉帳", "信用卡", "其他"] },
        { name: "note", label: "備註", type: "textarea", value: "", wide: true }
      ],
      onSubmit: (data) => {
        const target = findById(state.students, data.studentId);
        if (!target) throw new Error("找不到學生。");
        const assigned = target.enrollmentStatus === "pending" ? nextStudentNumber(target.enrollmentYear || fiscalYear(target.recordDate || data.date), target.ageGroup) : null;
        const lessons = clampWhole(data.lessons, 1, 999, 1);
        const payment = {
          id: makeId(), studentId: target.id, studentName: target.name, amount: Number(data.amount), lessons,
          date: data.date, method: data.method, note: data.note || "",
          receiptNo: "R-" + data.date.replaceAll("-", "") + "-" + String(state.suite.payments.length + 1).padStart(3, "0")
        };
        state.suite.payments.push(payment);
        if (assigned) {
          target.studentNumber = assigned.value;
          target.enrollmentStatus = "paid";
          state.suite.studentNumberCounters[assigned.key] = assigned.sequence;
          target.nextDate = target.nextDate || target.enrollments?.[0]?.firstDate || "";
        }
        target.remaining += lessons;
        target.prepaid += lessons;
        target.history.unshift({ id: makeId(), type: "payment", lessons, amount: payment.amount, createdAt: new Date().toISOString() });
        commit("收款已記錄，學生堂數已增加");
      }
    });
  }

  function openAccountForm(account, forceTutor) {
    return openTutorForm(account && account.role === "tutor" ? account : null);
  }

  function tutorDuplicateMatches(kind, value, existing) {
    const normalized = kind === "email" ? String(value || "").trim().toLowerCase() : String(value || "").replace(/\D/g, "");
    if (!normalized) return [];
    return state.suite.accounts.filter((account) => account.id !== existing?.id &&
      (kind === "email" ? String(account.email || "").trim().toLowerCase() : String(account.phone || "").replace(/\D/g, "")) === normalized);
  }

  function confirmTutorDuplicate(kind, value, existing) {
    const normalized = kind === "email" ? String(value || "").trim().toLowerCase() : String(value || "").replace(/\D/g, "");
    const matches = tutorDuplicateMatches(kind, value, existing);
    const errorNode = document.querySelector("#tutor-form-error");
    if (!matches.length || (existing && (kind === "email" ? String(existing.email || "").trim().toLowerCase() : String(existing.phone || "").replace(/\D/g, "")) === normalized)) return true;
    if (kind === "email" && matches.some((account) => account.role !== "tutor")) {
      errorNode.textContent = "這個電郵已用於非導師帳戶，請使用另一個電郵。";
      return false;
    }
    if (tutorDuplicateConfirmations[kind] === normalized) return true;
    const names = matches.map((account) => account.name).join("、");
    const message = kind === "email"
      ? "電郵「" + value + "」已用於導師「" + names + "」。確認讓這些獨立導師檔案日後共用同一個 Supabase 登入帳戶？目前只會在本機合併顯示資料，不會建立帳戶。"
      : "電話「" + value + "」已用於導師「" + names + "」。請確認號碼正確，並允許多位導師使用同一電話？電話相同不會合併登入帳戶。";
    if (!window.confirm(message)) {
      errorNode.textContent = kind === "email" ? "請修改電郵，或再次確認共用登入電郵。" : "請修改電話，或再次確認共用電話。";
      return false;
    }
    tutorDuplicateConfirmations[kind] = normalized;
    errorNode.textContent = "";
    return true;
  }

  function openTutorForm(account) {
    const form = elements.tutorForm;
    form.reset();
    tutorDuplicateConfirmations = { email: "", phone: "" };
    document.querySelector("#tutor-form-title").textContent = account ? "編輯導師" : "新增導師";
    document.querySelector("#tutor-form-error").textContent = "";
    for (const name of ["id", "name", "phone", "hourlyRate", "email"]) {
      form.elements.namedItem(name).value = account && account[name] != null ? account[name] : "";
    }
    form.querySelectorAll(".tutor-floating").forEach((field) => field.classList.toggle("is-filled", Boolean(field.querySelector("input").value)));
    const selectedCourses = new Set(account && Array.isArray(account.courseIds) ? account.courseIds : []);
    const selectedItems = [...selectedCourses].map(tutorCourseForId).filter(Boolean);
    const choices = displayCourses().concat(selectedItems);
    document.querySelector("#tutor-course-options").innerHTML = choices.length ? uniqueCourseValues(choices, "name").map((name) => {
      const course = selectedItems.find((item) => sameCourseValue(item.name, name)) || choices.find((item) => sameCourseValue(item.name, name));
      return '<label class="tutor-course-option"><input type="checkbox" name="courseIds" value="' + escapeHtml(course.id) + '"' + (selectedItems.some((item) => sameCourseValue(item.name, name)) ? ' checked' : '') + '><span>' + escapeHtml(name) + '</span></label>';
    }).join('') : '<p>未有課程；可以先建立導師，之後再指派課程。</p>';
    const availability = new Set(account && Array.isArray(account.availability) ? account.availability : []);
    document.querySelector("#tutor-availability-grid").innerHTML = '<table><thead><tr><th></th>' + ["一", "二", "三", "四", "五", "六", "日"].map((day) => '<th>' + day + '</th>').join('') + '</tr></thead><tbody>' +
      [["上午", "am"], ["下午", "pm"], ["晚上", "evening"]].map(([label, slot]) => '<tr><th>' + label + '</th>' + Array.from({ length: 7 }, (_, index) => {
        const value = (index + 1) + ':' + slot;
        return '<td><label><input type="checkbox" name="availability" value="' + value + '"' + (availability.has(value) ? ' checked' : '') + '><span aria-hidden="true">×</span><span class="sr-only">' + label + '星期' + ["一", "二", "三", "四", "五", "六", "日"][index] + '</span></label></td>';
      }).join('') + '</tr>').join('') + '</tbody></table>';
    const permissions = new Set(account && Array.isArray(account.permissions) ? account.permissions : ["read_assigned_students", "read_assigned_lessons", "edit_assigned_lessons", "edit_own_notes"]);
    form.querySelectorAll('input[name="permission"]').forEach((input) => { input.checked = permissions.has(input.value); });
    elements.tutorDialog.showModal();
    document.body.classList.add("modal-open");
  }

  function openStudentImport() {
    state.pendingStudentImport = null;
    elements.studentImportFile.value = "";
    elements.studentImportConfirm.disabled = true;
    document.querySelector("#student-import-error").textContent = "";
    document.querySelector("#student-import-preview").innerHTML = "";
    elements.studentImportDialog.showModal();
    document.body.classList.add("modal-open");
  }

  function importDate(value) {
    const text = String(value || "").trim();
    if (/^\d+(?:\.\d+)?$/.test(text) && Number(text) > 1000) {
      const date = new Date(Date.UTC(1899, 11, 30) + Math.round(Number(text)) * 86400000);
      return date.toISOString().slice(0, 10);
    }
    return text;
  }

  function importTime(value) {
    const text = String(value || "").trim();
    if (/^0?\.\d+$/.test(text)) {
      const minutes = Math.round(Number(text) * 1440);
      return String(Math.floor(minutes / 60)).padStart(2, "0") + ":" + String(minutes % 60).padStart(2, "0");
    }
    const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(text);
    return match ? match[1].padStart(2, "0") + ":" + match[2] : text;
  }

  function importWeekday(value) {
    const text = String(value || "").trim();
    if (!text) return 1;
    const match = /^(?:星期|週|周)?([日天一二三四五六])$/.exec(text);
    if (match) return "日一二三四五六".indexOf(match[1] === "天" ? "日" : match[1]);
    if (/^[0-6]$/.test(text)) return Number(text);
    return -1;
  }

  function prepareStudentImport(records) {
    const students = [];
    const errors = [];
    const seen = new Set(state.students.map((student) => student.name.trim().toLocaleLowerCase()));
    let skipped = 0;
    for (const { rowNumber, values } of records) {
      const [name, courseName, tutorName, weekdayText, timeText, prepaidText, remainingText, dateText, roomName] = values;
      const cleanName = String(name || "").trim();
      const key = cleanName.toLocaleLowerCase();
      if (!cleanName) { errors.push("第 " + rowNumber + " 行：學生姓名不能留空。"); continue; }
      if (seen.has(key)) { skipped += 1; continue; }
      seen.add(key);
      const exactCourses = courseName ? state.suite.courses.filter((item) => courseLabel(item) === courseName) : [];
      const namedCourses = courseName && !exactCourses.length ? state.suite.courses.filter((item) => item.name === courseName) : [];
      const courseMatches = exactCourses.length ? exactCourses : namedCourses;
      const course = courseMatches.length === 1 ? courseMatches[0] : null;
      const tutor = tutorName ? state.suite.accounts.find((item) => item.role === "tutor" && item.name === tutorName) : null;
      const room = roomName ? locationSelectOptions().find((item) => item.label === roomName) : null;
      const weekday = importWeekday(weekdayText);
      const time = importTime(timeText || "18:00");
      const prepaid = prepaidText === "" ? 8 : Number(prepaidText);
      const remaining = remainingText === "" ? prepaid : Number(remainingText);
      const nextDate = dateText ? importDate(dateText) : formatYmd(nextDateForWeekday(weekday));
      const problems = [];
      if (courseName && courseMatches.length > 1) problems.push("課程名稱有多個年齡／人數組合，請使用「課程名稱｜年齡組別｜課程人數」填寫");
      else if (courseName && !course) problems.push("找不到課程「" + courseName + "」");
      if (tutorName && !tutor) problems.push("找不到導師「" + tutorName + "」");
      if (roomName && !room) problems.push("找不到泳班地點「" + roomName + "」");
      if (weekday < 0) problems.push("上課日必須為星期一至日或 0 至 6");
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) problems.push("固定時間格式應為 HH:MM");
      if (!Number.isInteger(prepaid) || prepaid < 1 || prepaid > 999) problems.push("預繳堂數須為 1–999");
      if (!Number.isInteger(remaining) || remaining < 0 || remaining > 999) problems.push("剩餘堂數須為 0–999");
      if (!validDate(nextDate) || formatYmd(parseDate(nextDate)) !== nextDate) problems.push("下一堂日期須為有效的 YYYY-MM-DD");
      if (problems.length) { errors.push("第 " + rowNumber + " 行：" + problems.join("；") + "。"); continue; }
      students.push({ id: makeId(), name: cleanName, courseId: course ? course.id : "", tutorId: tutor ? tutor.id : "", weekday,
        time, nextTime: time, prepaid, remaining, nextDate, roomId: room ? room.value : "", roomName: room ? room.label : "", status: "active", history: [], createdAt: new Date().toISOString() });
    }
    return { students, errors, skipped };
  }

  async function previewStudentImport(file) {
    const preview = document.querySelector("#student-import-preview");
    const errorNode = document.querySelector("#student-import-error");
    errorNode.textContent = "";
    preview.innerHTML = "";
    elements.studentImportConfirm.disabled = true;
    state.pendingStudentImport = null;
    try {
      const records = await window.SwimStudentImport.parse(file);
      const result = prepareStudentImport(records);
      preview.innerHTML = '<p class="preview-good">可新增 ' + result.students.length + ' 位學員' + (result.skipped ? '；同名略過 ' + result.skipped + ' 位' : '') + '</p>' +
        (result.students.length ? '<p>預覽：' + result.students.slice(0, 5).map((item) => escapeHtml(item.name)).join('、') + '</p>' : '') +
        (result.errors.length ? '<ul class="preview-warning">' + result.errors.slice(0, 12).map((item) => '<li>' + escapeHtml(item) + '</li>').join('') + '</ul>' : '');
      if (result.errors.length > 12) preview.innerHTML += '<p>另外還有 ' + (result.errors.length - 12) + ' 個錯誤。</p>';
      if (result.errors.length) errorNode.textContent = "請先修正檔案錯誤後重新選擇。";
      if (result.students.length && !result.errors.length) { state.pendingStudentImport = result.students; elements.studentImportConfirm.disabled = false; }
    } catch (error) { errorNode.textContent = error.message || "未能讀取檔案。"; }
  }

  function openManualForm(item) {
    openForm({
      kicker: "數位手冊",
      title: item ? "編輯紀錄" : "新增紀錄",
      fields: [
        { name: "id", type: "hidden", value: item ? item.id : "" },
        { name: "type", label: "類型", type: "select", value: item ? item.type : "note", options: [{ value: "homework", label: "功課" }, { value: "note", label: "筆記" }, { value: "photo", label: "相片" }] },
        { name: "studentId", label: "學生", type: "select", value: item ? item.studentId : "", options: [{ value: "", label: "所有學生" }].concat(state.students.map((student) => ({ value: student.id, label: student.name }))) },
        { name: "title", label: "標題", type: "text", value: item ? item.title : "", required: true, wide: true },
        { name: "date", label: "日期", type: "date", value: item ? item.date : todayYmd(), required: true },
        { name: "imageFile", label: "相片（最多 1MB）", type: "file", value: "", accept: "image/*" },
        { name: "content", label: "內容", type: "textarea", value: item ? item.content : "", wide: true }
      ],
      onSubmit: async (data, form) => {
        const existing = data.id ? findById(state.suite.manualItems, data.id) : null;
        const file = form.elements.imageFile.files[0];
        let image = existing ? existing.image || "" : "";
        if (file) image = await imageFileToDataUrl(file);
        const payload = { id: existing ? existing.id : makeId(), type: data.type, studentId: data.studentId || "", title: String(data.title).trim(), date: data.date, content: String(data.content || "").trim(), image };
        if (existing) Object.assign(existing, payload);
        else state.suite.manualItems.push(payload);
        commit(existing ? "手冊紀錄已更新" : "手冊紀錄已新增");
      }
    });
  }

  function openProductForm(product) {
    openForm({
      kicker: "產品管理",
      title: product ? "編輯產品" : "新增產品",
      fields: [
        { name: "id", type: "hidden", value: product ? product.id : "" },
        { name: "name", label: "產品名稱", type: "text", value: product ? product.name : "", required: true, wide: true },
        { name: "courseId", label: "連結課程", type: "select", value: product ? product.courseId : "", options: [{ value: "", label: "未連結" }].concat(state.suite.courses.map((course) => ({ value: course.id, label: course.name }))) },
        { name: "lessons", label: "套票堂數", type: "number", value: product ? product.lessons : 8, min: 1, max: 999, required: true },
        { name: "price", label: "售價（HKD）", type: "number", value: product ? product.price : 2400, min: 0, max: 999999, required: true },
        { name: "status", label: "狀態", type: "select", value: product ? product.status : "draft", options: [{ value: "draft", label: "草稿" }, { value: "live", label: "上架" }] },
        { name: "imageFile", label: "產品圖片（最多 1MB）", type: "file", accept: "image/*", wide: true }
      ],
      onSubmit: async (data, form) => {
        const existing = data.id ? findById(state.suite.products, data.id) : null;
        const file = form.elements.imageFile.files[0];
        let image = existing ? existing.image || "" : "";
        if (file) image = await imageFileToDataUrl(file);
        const payload = { id: existing ? existing.id : makeId(), name: String(data.name).trim(), courseId: data.courseId || "", lessons: Number(data.lessons), price: Number(data.price), status: data.status, image };
        if (existing) Object.assign(existing, payload);
        else state.suite.products.push(payload);
        commit(existing ? "產品已更新" : "產品已新增");
      }
    });
  }

  function openAnnouncementForm(item) {
    openForm({
      kicker: "公告欄",
      title: item ? "編輯公告" : "新增公告",
      fields: [
        { name: "id", type: "hidden", value: item ? item.id : "" },
        { name: "title", label: "標題", type: "text", value: item ? item.title : "", required: true, wide: true },
        { name: "type", label: "類型", type: "select", value: item ? item.type : "course", options: [{ value: "event", label: "活動" }, { value: "course", label: "課程消息" }, { value: "closure", label: "停課通告" }] },
        { name: "audience", label: "對象", type: "select", value: item ? item.audience : "所有人", options: ["所有人", "學生及家長", "導師"] },
        { name: "date", label: "日期", type: "date", value: item ? item.date : todayYmd(), required: true },
        { name: "status", label: "狀態", type: "select", value: item ? item.status : "active", options: [{ value: "active", label: "發布" }, { value: "draft", label: "草稿" }] },
        { name: "content", label: "內容", type: "textarea", value: item ? item.content : "", required: true, wide: true }
      ],
      onSubmit: (data) => upsertCollection("announcements", data, {
        title: String(data.title).trim(), type: data.type, audience: data.audience, date: data.date, status: data.status, content: String(data.content).trim()
      }, "公告")
    });
  }

  function upsertCollection(name, data, payload, label) {
    const collection = state.suite[name];
    const existing = data.id ? findById(collection, data.id) : null;
    if (existing) Object.assign(existing, payload);
    else collection.push({ id: makeId(), ...payload });
    commit(label + (existing ? "已更新" : "已新增"));
  }

  async function imageFileToDataUrl(file) {
    if (file.size > 1024 * 1024) throw new Error("圖片超過 1MB，請先縮小圖片。");
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("無法讀取圖片。"));
      reader.readAsDataURL(file);
    });
  }

  function markComplete(student) {
    if (student.remaining <= 0) {
      showToast("堂數已用完，請先記錄收款");
      return openMessage(student, "payment");
    }
    if (!window.confirm("確認 " + student.name + " 已完成 " + formatLongDate(student.nextDate) + " 的課堂並扣一堂？")) return;
    student.remaining -= 1;
    const course = courseForStudent(student);
    const tutor = findById(state.suite.accounts, student.tutorId);
    student.history.unshift({
      id: makeId(), type: "completed", lessonDate: student.nextDate, lessonTime: student.nextTime || student.time,
      tutorId: student.tutorId || "", courseId: student.courseId || "", durationMinutes: Number(course && course.duration) || 60,
      roomId: student.roomId || "", roomName: locationNameForId(student.roomId, student.roomName),
      hourlyRateAtCompletion: Number(tutor && tutor.hourlyRate) || 0, createdAt: new Date().toISOString()
    });
    student.nextDate = nextRecurringAfter(student.nextDate, student.weekday);
    student.nextTime = student.time;
    student.history = student.history.slice(0, 100);
    commit("課堂已完成，堂數已扣減");
  }

  function cancelLesson(student) {
    if (!window.confirm("確認取消 " + student.name + " 的下一堂？本次不會扣堂。")) return;
    student.history.unshift({ id: makeId(), type: "cancelled", lessonDate: student.nextDate, lessonTime: student.nextTime || student.time,
      roomId: student.roomId || "", roomName: locationNameForId(student.roomId, student.roomName), createdAt: new Date().toISOString() });
    student.nextDate = nextRecurringAfter(student.nextDate, student.weekday);
    student.nextTime = student.time;
    student.history = student.history.slice(0, 100);
    commit("課堂已取消，沒有扣堂");
  }

  function openMessage(student, type) {
    state.messageStudentId = student.id;
    state.messageType = type || "lesson";
    elements.messageTitle.textContent = student.name + "｜提醒訊息";
    document.querySelectorAll("[data-message-type]").forEach((button) => button.classList.toggle("is-active", button.dataset.messageType === state.messageType));
    updateMessageText();
    elements.messageDialog.showModal();
    document.body.classList.add("modal-open");
  }

  function updateMessageText() {
    const student = findById(state.students, state.messageStudentId);
    if (!student) return;
    if (state.messageType === "payment") {
      elements.messageText.value = "你好，提提你：" + student.name + (student.remaining === 0 ? "現有預繳課堂已經完成" : "目前尚餘 " + student.remaining + " 堂預繳課堂") + "。請安排續繳，以便保留之後的上課時段，謝謝！";
    } else {
      elements.messageText.value = "你好，提提你：" + student.name + " 下一堂游泳課是 " + formatLongDate(student.nextDate) + " " + formatTime(student.nextTime || student.time) + "。如需改期，請提早通知，謝謝！";
    }
  }

  function showReceipt(payment) {
    const student = findById(state.students, payment.studentId);
    elements.receiptContent.innerHTML = "<h3>" + escapeHtml(state.suite.settings.brandName) + "</h3><p>收據 " + escapeHtml(payment.receiptNo) + "</p>" +
      receiptLine("收款日期", payment.date) + receiptLine("學生", student ? student.name : payment.studentName) + receiptLine("套票堂數", payment.lessons + " 堂") +
      receiptLine("付款方式", payment.method) + receiptLine("備註", payment.note || "—") + '<div class="receipt-line total"><span>合計</span><strong>' + formatMoney(payment.amount) + "</strong></div>";
    elements.receiptDialog.showModal();
    document.body.classList.add("modal-open");
  }

  function receiptLine(label, value) {
    return '<div class="receipt-line"><span>' + escapeHtml(label) + "</span><strong>" + escapeHtml(value) + "</strong></div>";
  }

  function commit(message) {
    saveAll();
    closeForm();
    if (state.currentModule) renderModule();
    else renderShell();
    showToast(message);
  }

  function closeForm() {
    if (elements.formDialog.open) elements.formDialog.close();
    elements.formDialog.classList.remove("student-dialog");
    elements.formFields.classList.remove("student-form-fields");
    state.formHandler = null;
    document.body.classList.remove("modal-open");
  }

  function deleteFrom(collectionName, id, label) {
    if (!window.confirm("確定刪除這項" + label + "？")) return;
    state.suite[collectionName] = state.suite[collectionName].filter((item) => item.id !== id);
    commit(label + "已刪除");
  }

  function exportData() {
    const payload = { version: 2, exportedAt: new Date().toISOString(), students: state.students, suite: state.suite };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "swim-class-balance-backup-" + todayYmd() + ".json";
    link.click();
    URL.revokeObjectURL(link.href);
    showToast("備份檔已下載");
  }

  async function importData(file) {
    try {
      const payload = JSON.parse(await file.text());
      if (!payload || !Array.isArray(payload.students) || !payload.suite) throw new Error("檔案格式不正確。");
      if (!window.confirm("匯入會取代目前瀏覽器內所有泳堂管家資料，是否繼續？")) return;
      state.students = payload.students;
      state.suite = { ...defaultSuite(), ...payload.suite, settings: { ...defaultSuite().settings, ...(payload.suite.settings || {}) } };
      clearLegacyRooms();
      clearIncompleteCourses();
      commit("備份已匯入");
    } catch (error) {
      showToast(error.message || "無法匯入備份");
    } finally {
      elements.importData.value = "";
    }
  }

  function resetData() {
    if (!window.confirm("這會清除目前瀏覽器內所有學生、課堂、付款及設定，而且不能復原。確定繼續？")) return;
    state.students = [];
    state.suite = defaultSuite();
    commit("所有本機資料已重設");
  }

  let toastTimer;
  function showToast(message) {
    clearTimeout(toastTimer);
    elements.toast.textContent = message;
    elements.toast.classList.add("is-visible");
    toastTimer = setTimeout(() => elements.toast.classList.remove("is-visible"), 2600);
  }

  document.addEventListener("click", async (event) => {
    if (!state.loggedIn) return;
    const button = event.target.closest("button");
    if (!button) {
      const column = event.target.closest(".timeline-day-column");
      const card = column?.closest(".timeline-card");
      if (state.currentModule !== "schedule" || !card || Date.now() < suppressTimelineClickUntil) return;
      const rect = column.getBoundingClientRect();
      const openHour = Number(card.dataset.openHour);
      const totalHours = Number(card.dataset.totalHours);
      if (!rect.height || !Number.isFinite(openHour) || !Number.isFinite(totalHours) || !column.dataset.date) return;
      const slotMinutes = timelineSlotMinutes(state.scheduleZoom);
      const totalSlots = totalHours * 60 / slotMinutes;
      const position = Math.max(0, Math.min(rect.height - 0.001, event.clientY - rect.top));
      const start = openHour * 60 + Math.min(totalSlots - 1, Math.floor(position / rect.height * totalSlots)) * slotMinutes;
      openQuickLesson({ date: column.dataset.date, start: minutesText(start), end: minutesText(Math.min(start + 60, 1440)) });
      return;
    }
    if (button.dataset.close) {
      document.querySelector("#" + button.dataset.close)?.close();
      document.body.classList.remove("modal-open");
      return;
    }
    if (button.dataset.module) return openModule(button.dataset.module);
    if (button.dataset.messageType) {
      state.messageType = button.dataset.messageType;
      document.querySelectorAll("[data-message-type]").forEach((item) => item.classList.toggle("is-active", item === button));
      return updateMessageText();
    }

    const action = button.dataset.action;
    const id = button.dataset.id;
    if (action === "tutor-attendance" && state.role === "tutor") {
      button.disabled = true;
      try {
        await window.AdminAuth.markTutorAttendance(button.dataset.lessonId, button.dataset.studentId, button.dataset.value);
        state.tutorPortal = await window.AdminAuth.getTutorPortal();
        renderTutorPortal();
        showToast("點名已儲存，待管理員核對。");
      } catch (error) { button.disabled = false; showToast(error.message || "未能儲存點名。"); }
      return;
    }
    if (action === "tutor-refresh" && state.role === "tutor") {
      try { state.tutorPortal = await window.AdminAuth.getTutorPortal(); renderTutorPortal(); }
      catch (error) { showToast(error.message || "未能更新導師資料。"); }
      return;
    }
    if (action === "sync-tutor-portals" && state.role === "admin") {
      button.disabled = true;
      try {
        const items = buildTutorSnapshots();
        const result = await window.AdminAuth.syncTutors(items);
        state.tutorSyncStatus = "已同步 " + result.count + " 個導師登入電郵，時間：" + new Date().toLocaleString("zh-HK") + "。";
      } catch (error) { state.tutorSyncStatus = error.message || "同步失敗；雲端資料未更新。"; }
      if (state.currentModule === "accounts") renderModule();
      return;
    }
    if (action === "tutor-leave-status" && state.role === "admin") {
      button.disabled = true;
      try { await window.AdminAuth.updateTutorLeave(id, button.dataset.value); await refreshTutorLeaveRequests(); }
      catch (error) { button.disabled = false; showToast(error.message || "未能更新請假狀態。"); }
      return;
    }
    if (action === "refresh-attendance" && state.role === "admin") { await refreshTutorAttendance(); return; }
    if ((action === "attendance-decision" || action === "attendance-next-week") && state.role === "admin") {
      const item = state.tutorAttendance.find((row) => row.id === id);
      const review = button.closest(".attendance-review");
      const lesson = item && attendanceLessonDetails(item);
      if (!item || !lesson) return showToast("請先核對本機課堂。");
      const reason = review.querySelector('[name="reason"]').value.trim();
      const makeupDate = action === "attendance-next-week" ? formatYmd(addDays(parseDate(lesson.date), 7)) : review.querySelector('[name="makeupDate"]').value;
      const decision = action === "attendance-next-week" ? "makeup" : button.dataset.value;
      if (!reason) return showToast("請先填寫缺席原因。");
      if (decision === "makeup" && (!validDate(makeupDate) || makeupDate <= lesson.date)) return showToast("請選擇原課堂之後的補堂日期。");
      button.disabled = true;
      try { await window.AdminAuth.decideAttendance(id, decision, makeupDate, reason); await refreshTutorAttendance(); }
      catch (error) { button.disabled = false; showToast(error.message || "未能儲存決定。"); }
      return;
    }
    if (action === "attendance-apply" && state.role === "admin") {
      const item = state.tutorAttendance.find((row) => row.id === id);
      if (!item) return showToast("請更新點名紀錄。");
      button.disabled = true;
      try { await applyAttendanceRecord(item); }
      catch (error) { button.disabled = false; showToast(error.message || "未能套用點名。"); }
      return;
    }
    if (state.role === "tutor" && action !== "logout") return;
    if (action === "pick-lesson-time") return openTimePicker(button.dataset.target);
    if (action === "cancel-lesson-time") return elements.timePickerDialog.close();
    if (action === "confirm-lesson-time") return confirmTimePicker();
    if (action === "select-lesson-time") {
      state.timePicker[button.dataset.unit] = Number(button.dataset.value);
      normalizeTimePicker();
      return renderTimePicker();
    }
    if (action === "booking-add-group") {
      if (state.bookingDraft.groups.length < 5) state.bookingDraft.groups.push({ tutorIds: new Set(), courseId: "", courseName: "", ageGroup: "", classSize: "", studentIds: new Set(), roomId: "", roomName: "" });
      return renderBookingChoices();
    }
    if (action === "booking-remove-group") {
      if (state.bookingDraft.groups.length > 1) state.bookingDraft.groups.splice(Number(button.dataset.group), 1);
      return renderBookingChoices();
    }
    if (action === "booking-tutor") {
      const group = state.bookingDraft.groups[Number(button.dataset.group)];
      if (!group) return;
      group.tutorIds = group.tutorIds.has(button.dataset.value) ? new Set() : new Set([button.dataset.value]);
      group.courseId = ""; group.courseName = ""; group.ageGroup = ""; group.classSize = ""; group.studentIds.clear();
      return renderBookingChoices();
    }
    if (action === "booking-course") {
      const group = state.bookingDraft.groups[Number(button.dataset.group)];
      if (!group) return;
      const course = displayCourses().find((item) => item.id === button.dataset.value);
      group.courseId = course?.id || ""; group.courseName = course?.name || "";
      group.ageGroup = course?.ageGroup || ""; group.classSize = course?.classSize || "";
      group.studentIds.clear();
      return renderBookingChoices();
    }
    if (action === "booking-student") {
      const group = state.bookingDraft.groups[Number(button.dataset.group)];
      if (!group) return;
      group.studentIds.has(button.dataset.value) ? group.studentIds.delete(button.dataset.value) : group.studentIds.add(button.dataset.value);
      return renderBookingChoices();
    }
    if (action === "booking-month") {
      state.bookingDraft.month.setMonth(state.bookingDraft.month.getMonth() + Number(button.dataset.delta));
      return renderBookingCalendar();
    }
    if (action === "booking-date") {
      const draft = state.bookingDraft, date = button.dataset.date;
      if (draft.dates[date]) delete draft.dates[date];
      else draft.dates[date] = { ...draft.defaultSlot };
      renderBookingCalendar(); renderBookingDates(); return;
    }
    if (action === "booking-clear-dates") {
      state.bookingDraft.dates = {};
      renderBookingCalendar(); renderBookingDates(); return;
    }
    if (action === "edit-booking") {
      const booking = findById(state.suite.lessonBookings, id);
      return booking && openBookingForm(booking, booking);
    }
    if (action === "complete-booking") return completeBooking(findById(state.suite.lessonBookings, id));
    if (action === "cancel-booking") return cancelBooking(findById(state.suite.lessonBookings, id));
    if (action === "booking-message") {
      const booking = findById(state.suite.lessonBookings, id);
      const student = booking && findById(state.students, booking.studentIds[0]);
      return student && openMessage(student, "lesson");
    }
    if (action === "go-home") return showHome();
    if (action === "logout") {
      state.loggedIn = false;
      showLoggedOut();
      return window.AdminAuth?.signOut();
    }
    if (action === "schedule-mode") { state.scheduleMode = button.dataset.value; return renderModule(); }
    if (action === "schedule-display") { state.scheduleDisplay = state.scheduleDisplay === "list" ? "calendar" : "list"; return renderModule(); }
    if (action === "schedule-zoom") { state.scheduleZoom = Math.max(50, Math.min(200, state.scheduleZoom + Number(button.dataset.delta))); return renderModule(); }
    if (action === "schedule-hours") return openScheduleHours();
    if (action === "schedule-select-date") { state.scheduleDate = button.dataset.date; return renderModule(); }
    if (action === "schedule-shift") {
      const current = parseDate(state.scheduleDate || todayYmd());
      const amount = Number(button.dataset.delta);
      if (state.scheduleMode === "month") { current.setDate(1); current.setMonth(current.getMonth() + amount); }
      else current.setDate(current.getDate() + amount * (state.scheduleMode === "week" ? 7 : 1));
      state.scheduleDate = formatYmd(current);
      return renderModule();
    }
    if (action === "people-menu") { state.peopleMenuOpen = !state.peopleMenuOpen; return renderModule(); }
    if (action === "location-menu") { state.locationMenuOpen = !state.locationMenuOpen; return renderModule(); }
    if (action === "people-filter") { state.peopleFilter = button.dataset.value; state.peopleTab = state.peopleFilter === "tutors" ? "tutors" : "students"; state.peopleMenuOpen = false; return renderModule(); }
    if (action === "people-tab") { state.peopleTab = button.dataset.value; state.peopleFilter = state.peopleTab === "tutors" ? "tutors" : "all"; return renderModule(); }
    if (action === "people-layout") { state.peopleLayout = state.peopleLayout === "table" ? "cards" : "table"; return renderModule(); }
    if (action === "people-select-student") { state.selectedStudentId = id; return renderModule(); }
    if (state.currentModule === "people" && state.peopleMenuOpen) {
      state.peopleMenuOpen = false;
      document.querySelector(".people-mobile-menu")?.setAttribute("hidden", "");
      elements.peopleMoreButton.setAttribute("aria-expanded", "false");
    }
    if (action === "manual-filter") { state.manualFilter = button.dataset.value; return renderModule(); }
    if (action === "student-add-course") {
      const form = elements.dynamicForm;
      const rows = studentEnrollmentDrafts(form);
      if (rows.length < 4) renderStudentEnrollments(form, rows.concat({ courseName: "", classSize: "", firstDate: "", discount: "" }));
      return;
    }
    if (action === "student-remove-course") {
      const rows = studentEnrollmentDrafts(elements.dynamicForm);
      rows.splice(Number(button.dataset.index), 1);
      renderStudentEnrollments(elements.dynamicForm, rows);
      return;
    }
    if (action === "add-student") return openStudentForm();
    if (action === "add-tutor") return openTutorForm();
    if (action === "import-students") return openStudentImport();
    if (action === "edit-student") return openStudentForm(findById(state.students, id));
    if (action === "delete-student") {
      const student = findById(state.students, id);
      if (student && window.confirm("確定永久刪除 " + student.name + " 的學生資料及課堂紀錄？此操作不會刪除已存在的收款或收據。")) {
        state.suite.lessonBookings = state.suite.lessonBookings.map((booking) => ({ ...booking, studentIds: booking.studentIds.filter((studentId) => studentId !== id) }))
          .filter((booking) => booking.studentIds.length);
        state.students = state.students.filter((item) => item.id !== id);
        commit("學生已刪除");
      }
      return;
    }
    if (action === "complete-lesson") {
      const student = findById(state.students, id);
      return student?.bookingManaged ? completeBooking(state.suite.lessonBookings.find((item) => item.studentIds.includes(id) && item.date === student.nextDate)) : markComplete(student);
    }
    if (action === "cancel-lesson") {
      const student = findById(state.students, id);
      return student?.bookingManaged ? cancelBooking(state.suite.lessonBookings.find((item) => item.studentIds.includes(id) && item.date === student.nextDate)) : cancelLesson(student);
    }
    if (action === "reschedule") {
      const student = findById(state.students, id);
      const booking = student?.bookingManaged && state.suite.lessonBookings.find((item) => item.studentIds.includes(id) && item.date === student.nextDate);
      return booking ? openBookingForm(booking, booking) : openLessonForm(student);
    }
    if (action === "prepare-message") return openMessage(findById(state.students, id), button.dataset.type);
    if (action === "add-lesson") return openQuickLesson();
    if (action === "select-course-name") {
      state.courseSelection = { name: sameCourseValue(state.courseSelection.name, button.dataset.value) ? "" : button.dataset.value, ageGroup: "", classSize: "" };
      return renderModule();
    }
    if (action === "select-course-ageGroup") {
      state.courseSelection.ageGroup = sameCourseValue(state.courseSelection.ageGroup, button.dataset.value) ? "" : button.dataset.value;
      state.courseSelection.classSize = "";
      return renderModule();
    }
    if (action === "select-course-classSize") {
      state.courseSelection.classSize = sameCourseValue(state.courseSelection.classSize, button.dataset.value) ? "" : button.dataset.value;
      return renderModule();
    }
    if (action === "add-course") return openCourseForm();
    if (action === "import-courses") return openCourseImport();
    if (action === "download-course-template") return downloadCourseTemplate();
    if (action === "course-reference-preview") return previewCourseImport(window.SwimCourseImport.referenceRows);
    if (action === "save-reference-course") return saveReferenceCourse(id);
    if (action === "edit-course") return openCourseForm(findById(state.suite.courses, id));
    if (action === "toggle-course") {
      const item = findById(state.suite.courses, id); if (!item) return;
      item.active = item.active === false; return commit("課程狀態已更新");
    }
    if (action === "delete-course") return deleteCourse(id);
    if (action === "select-location-pool") {
      state.locationSelection = { pool: state.locationSelection.pool === button.dataset.value ? "" : button.dataset.value, place: "" };
      return renderModule();
    }
    if (action === "select-location-place") {
      state.locationSelection.place = state.locationSelection.place === button.dataset.value ? "" : button.dataset.value;
      return renderModule();
    }
    if (action === "add-pool") return openPoolForm();
    if (action === "import-locations") return openLocationImport();
    if (action === "manage-locations") return openLocationManage();
    if (action === "manage-pool") return openLocationManage(button.dataset.value);
    if (action === "edit-pool-location") return openPoolForm(findById(state.suite.poolLocations, id));
    if (action === "delete-pool-location") return deletePoolLocation(findById(state.suite.poolLocations, id));
    if (action === "download-location-template") return downloadLocationTemplate();
    if (action === "location-reference-preview") return previewLocationImport(window.SwimLocationImport.referenceRows);
    if (action === "add-payment") return openPaymentForm();
    if (action === "payment-for-student") return openPaymentForm(findById(state.students, id));
    if (action === "view-receipt") return showReceipt(findById(state.suite.payments, id));
    if (action === "print-receipt") return window.print();
    if (action === "add-manual") return openManualForm();
    if (action === "edit-manual") return openManualForm(findById(state.suite.manualItems, id));
    if (action === "delete-manual") return deleteFrom("manualItems", id, "手冊紀錄");
    if (action === "add-account") return openAccountForm(null, false);
    if (action === "edit-account") return openAccountForm(findById(state.suite.accounts, id));
    if (action === "toggle-account") {
      const item = findById(state.suite.accounts, id); item.status = item.status === "active" ? "inactive" : "active"; return commit("帳戶狀態已更新");
    }
    if (action === "delete-account") return deleteFrom("accounts", id, "帳戶");
    if (action === "add-product") return openProductForm();
    if (action === "edit-product") return openProductForm(findById(state.suite.products, id));
    if (action === "toggle-product") {
      const item = findById(state.suite.products, id); item.status = item.status === "live" ? "draft" : "live"; return commit("產品狀態已更新");
    }
    if (action === "delete-product") return deleteFrom("products", id, "產品");
    if (action === "add-announcement") return openAnnouncementForm();
    if (action === "edit-announcement") return openAnnouncementForm(findById(state.suite.announcements, id));
    if (action === "toggle-announcement") {
      const item = findById(state.suite.announcements, id); item.status = item.status === "active" ? "draft" : "active"; return commit("公告狀態已更新");
    }
    if (action === "delete-announcement") return deleteFrom("announcements", id, "公告");
    if (action === "export-data") return exportData();
    if (action === "import-data") return elements.importData.click();
    if (action === "reset-data") return resetData();
    if (action === "copy-contact") {
      await navigator.clipboard.writeText(document.querySelector("#contact-message").value);
      return showToast("查詢訊息已複製");
    }
  });

  elements.dynamicForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (elements.formDialog.classList.contains("student-dialog")) validateStudentRecordDate(elements.dynamicForm, true, true);
    if (!elements.dynamicForm.reportValidity() || !state.formHandler) return;
    elements.formError.textContent = "";
    elements.formSubmit.disabled = true;
    try {
      const data = Object.fromEntries(new FormData(elements.dynamicForm).entries());
      await state.formHandler(data, elements.dynamicForm);
    } catch (error) {
      elements.formError.textContent = error.message || "未能儲存，請檢查資料。";
    } finally {
      elements.formSubmit.disabled = false;
    }
  });

  document.addEventListener("submit", async (event) => {
    if (event.target.id !== "tutor-leave-form" || state.role !== "tutor") return;
    event.preventDefault();
    const form = event.target;
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const button = form.querySelector('button[type="submit"]');
    const errorNode = form.querySelector("#tutor-leave-error");
    button.disabled = true;
    errorNode.textContent = "";
    try {
      await window.AdminAuth.requestTutorLeave(data.get("startDate"), data.get("endDate"), data.get("reason"));
      state.tutorPortal = await window.AdminAuth.getTutorPortal();
      renderTutorPortal();
      showToast("請假申請已提交");
    } catch (error) {
      button.disabled = false;
      errorNode.textContent = error.message || "未能提交請假申請。";
    }
  });

  elements.tutorForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!elements.tutorForm.reportValidity()) return;
    const data = new FormData(elements.tutorForm);
    const name = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim().toLowerCase();
    const phone = String(data.get("phone") || "").trim();
    const hourlyRate = data.get("hourlyRate") === "" ? null : Number(data.get("hourlyRate"));
    const errorNode = document.querySelector("#tutor-form-error");
    if (!name || (hourlyRate !== null && (!Number.isFinite(hourlyRate) || hourlyRate < 0))) { errorNode.textContent = "請檢查導師姓名及時薪。"; return; }
    const existing = data.get("id") ? findById(state.suite.accounts, data.get("id")) : null;
    if (!confirmTutorDuplicate("email", email, existing) || !confirmTutorDuplicate("phone", phone, existing)) return;
    const payload = { id: existing ? existing.id : makeId(), role: "tutor", name, phone, email,
      hourlyRate, courseIds: data.getAll("courseIds"), availability: data.getAll("availability"), permissions: data.getAll("permission"),
      status: existing ? existing.status : "active" };
    if (existing) Object.assign(existing, payload);
    else state.suite.accounts.push(payload);
    saveAll();
    elements.tutorDialog.close();
    document.body.classList.remove("modal-open");
    renderModule();
    showToast(existing ? "導師資料已更新；請同步導師工作台" : "導師已新增；請同步導師工作台");
  });

  document.addEventListener("input", (event) => {
    if (elements.tutorDialog.open && elements.tutorForm.contains(event.target)) {
      const field = event.target.closest(".tutor-floating");
      if (field) field.classList.toggle("is-filled", Boolean(event.target.value));
    }
    if (elements.formDialog.open && elements.formDialog.classList.contains("student-dialog")) {
      const field = event.target.closest(".student-floating");
      if (field) field.classList.toggle("is-filled", Boolean(event.target.value));
      if (event.target.name === "birthMonth" || event.target.name === "birthYear") updateStudentAge(elements.dynamicForm);
      if (event.target.matches("[data-course-discount]")) {
        const card = event.target.closest(".student-course-card");
        const fee = Number(card.querySelector('input[readonly][type="number"]').value) || 0;
        card.querySelector(".student-net-fee strong").textContent = formatMoney(Math.max(0, fee - (Number(event.target.value) || 0)), 2);
      }
    }
    if (event.target.id === "location-name") {
      const submit = event.target.closest("form")?.querySelector('button[type="submit"]');
      if (submit) submit.disabled = !event.target.value.trim();
      return;
    }
    if (event.target.id === "people-search") {
      state.peopleSearch = event.target.value;
      document.querySelector("#people-results").innerHTML = peopleResultsHtml();
    }
  });

  document.addEventListener("focusin", (event) => {
    if (event.target.matches?.("[data-course-discount]")) event.target.placeholder = "HK$";
  });
  document.addEventListener("focusout", (event) => {
    if (event.target.matches?.("[data-course-discount]")) event.target.placeholder = "折扣優惠";
    if (elements.tutorDialog.open && elements.tutorForm.contains(event.target) && ["email", "phone"].includes(event.target.name) && event.target.value.trim() && event.target.checkValidity()) {
      const existing = findById(state.suite.accounts, elements.tutorForm.elements.id.value);
      confirmTutorDuplicate(event.target.name, event.target.value.trim(), existing);
    }
  });

  elements.studentImportFile.addEventListener("change", () => {
    const file = elements.studentImportFile.files[0];
    if (file) previewStudentImport(file);
  });

  elements.courseImportFile.addEventListener("change", () => {
    const file = elements.courseImportFile.files[0];
    if (file) previewCourseFile(file);
  });

  elements.locationImportFile.addEventListener("change", () => {
    const file = elements.locationImportFile.files[0];
    if (file) previewLocationFile(file);
  });

  elements.courseImportConfirm.addEventListener("click", applyCourseImport);
  elements.locationImportConfirm.addEventListener("click", applyLocationImport);

  elements.studentImportConfirm.addEventListener("click", () => {
    if (!state.pendingStudentImport || !state.pendingStudentImport.length) return;
    const count = state.pendingStudentImport.length;
    state.students.push(...state.pendingStudentImport);
    try { saveAll(); }
    catch {
      state.students.splice(-count, count);
      document.querySelector("#student-import-error").textContent = "瀏覽器儲存空間不足；未有匯入任何學員。請先備份現有資料。";
      return;
    }
    state.pendingStudentImport = null;
    elements.studentImportDialog.close();
    document.body.classList.remove("modal-open");
    renderModule();
    showToast("已匯入 " + count + " 位學員");
  });

  document.addEventListener("submit", (event) => {
    if (event.target.id === "quick-lesson-form") { event.preventDefault(); submitQuickLesson(); return; }
    if (event.target.id === "booking-form") { event.preventDefault(); saveBookingDraft(); return; }
    if (event.target.id === "schedule-hours-form") {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.target).entries());
      const openHour = Number(data.openHour);
      const closeHour = Number(data.closeHour);
      if (!Number.isInteger(openHour) || !Number.isInteger(closeHour) || closeHour <= openHour) {
        document.querySelector("#schedule-hours-error").textContent = "關閉時間必須遲於開放時間。";
        return;
      }
      state.suite.bookingOptions.openHour = openHour;
      state.suite.bookingOptions.closeHour = closeHour;
      saveAll();
      elements.scheduleHoursDialog.close();
      document.body.classList.remove("modal-open");
      renderModule();
      showToast("中心開放時間已儲存");
      return;
    }
    if (event.target.id !== "settings-form") return;
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target).entries());
    Object.assign(state.suite.settings, {
      brandName: String(data.brandName || "").trim() || "泳堂管家",
      coachName: String(data.coachName || "").trim() || "教練",
      accountType: data.accountType,
      lowBalance: clampWhole(data.lowBalance, 0, 50, LOW_DEFAULT),
      theme: data.theme === "dark" ? "dark" : "light",
      contactEmail: String(data.contactEmail || "").trim(),
      contactPhone: String(data.contactPhone || "").trim()
    });
    saveAll();
    renderShell();
    showToast("設定已儲存");
  });

  document.addEventListener("input", (event) => {
    if (event.target.id === "quick-lesson-start") updateQuickEndFromStart(event.target.value);
    if (event.target.id === "quick-lesson-date") {
      document.querySelector("#quick-lesson-date-error").textContent = event.target.value && !studentRecordDateYmd(event.target.value) && event.target.value.length >= 11 ? "日期格式錯誤，請使用 DD-MMM-YYYY。" : "";
    }
    if (event.target.id === "booking-search" && state.bookingDraft) {
      state.bookingDraft.search = event.target.value;
      renderBookingChoices();
    }
    const bookingRow = event.target.closest(".booking-date-row");
    if (bookingRow && state.bookingDraft) {
      const slot = state.bookingDraft.dates[bookingRow.dataset.date];
      if (slot) slot[event.target.id.startsWith("booking-end-") ? "end" : "start"] = event.target.value.trim();
    }
    if (event.target.name === "recordDate" && elements.formDialog.open && elements.formDialog.classList.contains("student-dialog")) {
      const value = event.target.value.trim();
      validateStudentRecordDate(elements.dynamicForm, value.length >= 10 || value.includes("/"));
    }
  });

  document.addEventListener("focusout", (event) => {
    if (event.target.name === "recordDate" && elements.formDialog.open && elements.formDialog.classList.contains("student-dialog")) {
      validateStudentRecordDate(elements.dynamicForm, true, true);
    }
  });

  document.addEventListener("invalid", (event) => {
    if (event.target.name === "recordDate" && elements.formDialog.classList.contains("student-dialog")) {
      validateStudentRecordDate(elements.dynamicForm, true);
    }
  }, true);

  document.addEventListener("change", (event) => {
    if (event.target.id === "quick-lesson-date-picker") {
      document.querySelector("#quick-lesson-date").value = formatStudentRecordDate(event.target.value);
      document.querySelector("#quick-lesson-date-error").textContent = "";
      return;
    }
    if (event.target.id === "quick-lesson-date") {
      const value = studentRecordDateYmd(event.target.value);
      if (value) {
        event.target.value = formatStudentRecordDate(value);
        document.querySelector("#quick-lesson-date-picker").value = value;
      }
      return;
    }
    if (event.target.matches?.("[data-booking-pool]") && state.bookingDraft) {
      const group = state.bookingDraft.groups[Number(event.target.dataset.group)];
      if (group) { group.roomId = event.target.value; group.roomName = ""; }
      return;
    }
    if (elements.formDialog.open && elements.formDialog.classList.contains("student-dialog") && elements.dynamicForm.contains(event.target)) {
      const form = elements.dynamicForm;
      if (event.target.id === "student-photo-file") {
        const file = event.target.files[0];
        if (file) {
          if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) { elements.formError.textContent = "請選擇 PNG、JPG、WebP 或 GIF 圖片。"; return; }
          const input = event.target;
          elements.formSubmit.disabled = true;
          imageFileToDataUrl(file).then((url) => {
            if (!elements.formDialog.open || !elements.dynamicForm.contains(input)) return;
            state.studentFormPhoto = url;
            document.querySelector("#student-photo-preview").innerHTML = '<img src="' + escapeHtml(url) + '" alt="學生相片預覽">';
            elements.formError.textContent = "";
          }).catch((error) => { elements.formError.textContent = error.message; })
            .finally(() => { elements.formSubmit.disabled = false; });
        }
        return;
      }
      if (event.target.id === "student-record-date-picker") {
        form.elements.recordDate.value = formatStudentRecordDate(event.target.value);
        validateStudentRecordDate(form, true, true);
        return;
      }
      if (event.target.name === "birthMonth" || event.target.name === "birthYear") { updateStudentAge(form); return; }
      if (event.target.name === "recordDate") { validateStudentRecordDate(form, true, true); return; }
      if (event.target.name === "roomId") {
        document.querySelector("#student-location-label").textContent = event.target.value ? event.target.nextElementSibling.textContent : "";
        event.target.closest(".student-location-field").classList.toggle("is-filled", Boolean(event.target.value));
        document.querySelector("#student-location-picker").open = false;
        updateStudentOtherPoolField(form);
        return;
      }
      if (event.target.name === "ageGroup") { updateStudentForm(form, true); return; }
      if (event.target.name === "enrollmentStatus" || event.target.name === "enrollmentYear") { updateStudentForm(form); return; }
      if (event.target.matches("[data-course-name]")) {
        const rows = studentEnrollmentDrafts(form);
        const row = rows[Number(event.target.closest(".student-course-card").dataset.courseIndex)];
        row.classSize = "";
        row.originalFee = 0;
        row.discount = "";
        renderStudentEnrollments(form, rows);
        return;
      }
      if (event.target.matches("[data-course-size]")) { renderStudentEnrollments(form, studentEnrollmentDrafts(form)); return; }
      if (event.target.matches("[data-course-date]")) {
        const field = event.target.closest(".student-date-field");
        field.querySelector(".student-date-display").value = validDate(event.target.value) ? event.target.value.split("-").reverse().join("/") : "";
        field.classList.toggle("is-filled", Boolean(event.target.value));
        return;
      }
    }
    if (event.target.id === "schedule-date") {
      if (validDate(event.target.value)) {
        state.scheduleDate = event.target.value;
        renderModule();
      }
      return;
    }
    const option = event.target.dataset.bookingOption;
    if (!option) return;
    state.suite.bookingOptions[option] = event.target.type === "checkbox" ? event.target.checked : clampWhole(event.target.value, 0, 120, 0);
    saveAll();
    showToast("預約選項已儲存");
  });

  let schedulePinch = null;
  const touchDistance = (touches) => Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
  elements.moduleContent.addEventListener("touchstart", (event) => {
    const card = event.target.closest(".timeline-card");
    if (state.currentModule !== "schedule" || !card || event.touches.length !== 2) return;
    schedulePinch = { card, distance: touchDistance(event.touches), zoom: state.scheduleZoom };
  }, { passive: true });
  elements.moduleContent.addEventListener("touchmove", (event) => {
    if (!schedulePinch || event.touches.length !== 2) return;
    event.preventDefault();
    const zoom = Math.max(50, Math.min(200, schedulePinch.zoom + Math.round((touchDistance(event.touches) - schedulePinch.distance) / 4)));
    if (zoom === state.scheduleZoom) return;
    state.scheduleZoom = zoom;
    const hourHeight = timelineHourHeight(zoom);
    const card = schedulePinch.card;
    card.style.setProperty("--hour-height", hourHeight + "px");
    card.style.setProperty("--slot-height", hourHeight * timelineSlotMinutes(zoom) / 60 + "px");
    card.querySelector(".timeline-body").style.height = Number(card.dataset.totalHours) * hourHeight + "px";
    card.querySelector(".schedule-zoom span").textContent = zoom + "%";
  }, { passive: false });
  const finishSchedulePinch = (event) => {
    if (!schedulePinch || event.touches.length >= 2) return;
    schedulePinch = null;
    suppressTimelineClickUntil = Date.now() + 350;
    renderModule();
  };
  elements.moduleContent.addEventListener("touchend", finishSchedulePinch, { passive: true });
  elements.moduleContent.addEventListener("touchcancel", finishSchedulePinch, { passive: true });

  elements.timePickerDialog.addEventListener("wheel", (event) => {
    const column = event.target.closest(".lesson-time-column");
    if (!column || !state.timePicker) return;
    event.preventDefault();
    shiftTimePicker(column.dataset.unit, event.deltaY > 0 ? 1 : -1);
  }, { passive: false });

  let lessonTouchY = 0;
  elements.timePickerDialog.addEventListener("touchstart", (event) => {
    if (event.target.closest(".lesson-time-column")) lessonTouchY = event.touches[0].clientY;
  }, { passive: true });
  elements.timePickerDialog.addEventListener("touchend", (event) => {
    const column = event.target.closest(".lesson-time-column");
    if (!column || !state.timePicker || !lessonTouchY) return;
    const distance = lessonTouchY - event.changedTouches[0].clientY;
    if (Math.abs(distance) > 15) shiftTimePicker(column.dataset.unit, distance > 0 ? 1 : -1);
    lessonTouchY = 0;
  }, { passive: true });

  elements.themeToggle.addEventListener("click", () => {
    state.suite.settings.theme = state.suite.settings.theme === "dark" ? "light" : "dark";
    saveAll();
    renderShell();
  });

  elements.bottomNav.addEventListener("mouseenter", () => document.body.classList.add("nav-expanded"));
  elements.bottomNav.addEventListener("mouseleave", () => document.body.classList.remove("nav-expanded"));
  elements.bottomNav.addEventListener("focusin", () => document.body.classList.add("nav-expanded"));
  elements.bottomNav.addEventListener("focusout", (event) => {
    if (!elements.bottomNav.contains(event.relatedTarget)) document.body.classList.remove("nav-expanded");
  });

  document.querySelector("#copy-message").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(elements.messageText.value);
    } catch {
      elements.messageText.select();
      document.execCommand("copy");
    }
    showToast("訊息已複製，請檢查後再發送");
  });

  elements.importData.addEventListener("change", () => {
    const file = elements.importData.files[0];
    if (file) importData(file);
  });

  document.querySelectorAll(".modal").forEach((dialog) => dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      dialog.close();
      document.body.classList.remove("modal-open");
    }
  }));

  window.AdminAuth?.setOnExpired(() => {
    state.loggedIn = false;
    showLoggedOut();
    elements.adminLoginError.textContent = "登入已到期，請重新登入。";
  });

  elements.adminLoginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = elements.adminLoginForm.elements.email.value.trim();
    const password = elements.adminLoginForm.elements.password.value;
    elements.adminLoginError.textContent = "";
    window.LoginUI?.setLoginBusy(true);
    try {
      if (!window.AdminAuth) throw new Error("登入服務尚未載入，請重新整理頁面。");
      const role = await window.AdminAuth.signIn(email, password) || "admin";
      if (role === "tutor") {
        state.tutorPortal = await window.AdminAuth.getTutorPortal();
      } else {
        const catalog = await window.AdminAuth.getCatalog();
        window.SwimCourseImport.setReferenceRows(catalog.courses);
        window.SwimLocationImport.setReferenceRows(catalog.locations);
        if (!hadPoolLocationsAtStartup) {
          state.suite.poolLocations = catalog.locations.map((row) => ({ id: makeId(), ...row }));
          saveAll();
        }
      }
      state.role = role;
      state.loggedIn = true;
      elements.adminLoginForm.elements.password.value = "";
      renderShell();
    } catch (error) {
      elements.adminLoginError.textContent = error.message || "登入失敗，請稍後再試。";
    } finally {
      window.LoginUI?.setLoginBusy(false);
    }
  });

  const recovery = window.AdminAuth?.getRecoveryState?.();
  if (recovery?.active) {
    elements.adminLoginForm.hidden = true;
    elements.adminResetForm.hidden = false;
    window.AdminAuth.checkRecovery().then((valid) => {
      if (valid) return;
      elements.adminResetForm.hidden = true;
      elements.adminLoginForm.hidden = false;
      elements.adminLoginError.textContent = window.AdminAuth.getRecoveryState().error;
    });
  } else if (recovery?.error) {
    elements.adminLoginError.textContent = recovery.error;
  }

  elements.adminResetForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const password = elements.adminResetForm.elements.newPassword.value;
    const confirmation = elements.adminResetForm.elements.confirmPassword.value;
    elements.adminResetError.textContent = "";
    if (password !== confirmation) {
      elements.adminResetError.textContent = "兩次輸入的密碼不一致。";
      return;
    }
    elements.adminResetSubmit.disabled = true;
    try {
      await window.AdminAuth.resetPassword(password);
      elements.adminResetForm.reset();
      elements.adminResetForm.hidden = true;
      elements.adminLoginForm.hidden = false;
      elements.adminLoginError.textContent = "密碼已更新，請使用新密碼登入。";
    } catch (error) {
      elements.adminResetError.textContent = error.message || "無法設定密碼，請稍後再試。";
    } finally {
      elements.adminResetSubmit.disabled = false;
    }
  });

  document.addEventListener("visibilitychange", async () => {
    if (document.visibilityState !== "visible" || !state.loggedIn) return;
    if (!await window.AdminAuth.check()) {
      state.loggedIn = false;
      showLoggedOut();
      elements.adminLoginError.textContent = "登入已失效，請重新登入。";
    }
  });

  renderShell();
})();
