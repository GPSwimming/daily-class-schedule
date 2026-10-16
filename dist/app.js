(() => {
  "use strict";

  const LEGACY_KEY = "swim-class-balance.v1";
  const SUITE_KEY = "swim-class-suite.v2";
  const LOW_DEFAULT = 2;
  const WEEKDAYS = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
  const FEATURES = [
    { id: "schedule", icon: "🗓️", title: "時間表/編排課堂", description: "日・週・月課堂", accent: "var(--blue-soft)" },
    { id: "courses", icon: "🎟️", title: "課程設定", description: "課程・級別・選項", accent: "#f5e6d2" },
    { id: "people", icon: "👤", title: "個人資訊", description: "學生資料・導師資料・學業狀態", accent: "var(--blue-soft)" },
    { id: "rooms", icon: "🚪", title: "課室設定", description: "房間清單・預約選項", accent: "#f2ded4" },
    { id: "payments", icon: "💰", title: "付款", description: "付款・收據・月結", accent: "var(--yellow-soft)" },
    { id: "manual", icon: "📖", title: "數位手冊", description: "功課・筆記・相片", accent: "var(--purple-soft)" },
    { id: "accounts", icon: "🧑‍🏫", title: "帳戶管理", description: "家長・導師 登入資料", accent: "var(--pink-soft)" },
    { id: "products", icon: "📦", title: "產品管理", description: "上架課程・定價與產品圖片", accent: "#e1e7ea" },
    { id: "announcements", icon: "📣", title: "公告欄", description: "活動・課程・停課通告", accent: "#f9edca" },
    { id: "settings", icon: "⚙️", title: "設定", description: "帳戶類別等設定", accent: "#e1e5e7" },
    { id: "contact", icon: "✉️", title: "聯絡我們", description: "有任何查詢，歡迎聯絡我們", accent: "var(--green-soft)" },
    { id: "help", icon: "❓", title: "說明中心", description: "開台流程與常見問題", accent: "#dceafd" }
  ];

  const moduleMeta = Object.fromEntries(FEATURES.map((item) => [item.id, item]));
  const todayYmd = () => formatYmd(startOfToday());
  const makeId = () => Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);

  const state = {
    students: loadStudents(),
    suite: loadSuite(),
    currentModule: null,
    scheduleMode: "week",
    peopleTab: "students",
    manualFilter: "all",
    messageStudentId: null,
    messageType: "lesson",
    formHandler: null,
    loggedIn: sessionStorage.getItem("swim-suite.logged-out") !== "1"
  };

  const elements = {
    homeView: document.querySelector("#home-view"),
    moduleView: document.querySelector("#module-view"),
    loggedOutView: document.querySelector("#logged-out-view"),
    pageLabel: document.querySelector("#page-label"),
    brandName: document.querySelector("#brand-name"),
    coachName: document.querySelector("#coach-name"),
    profileAvatar: document.querySelector("#profile-avatar"),
    featureGrid: document.querySelector("#feature-grid"),
    moduleKicker: document.querySelector("#module-kicker"),
    moduleTitle: document.querySelector("#module-title"),
    moduleDescription: document.querySelector("#module-description"),
    moduleActions: document.querySelector("#module-actions"),
    moduleContent: document.querySelector("#module-content"),
    bottomNav: document.querySelector(".bottom-nav"),
    themeToggle: document.querySelector("#theme-toggle"),
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
      courses: [
        { id: makeId(), name: "兒童游泳初階", level: "初階", duration: 60, fee: 320, active: true },
        { id: makeId(), name: "成人游泳基礎", level: "基礎", duration: 60, fee: 380, active: true }
      ],
      rooms: [
        { id: makeId(), name: "主池 A 線", location: "主泳池", capacity: 6, active: true }
      ],
      bookingOptions: { onlineBooking: true, preventOverlap: true, bufferMinutes: 10 },
      payments: [],
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
        rooms: Array.isArray(saved.rooms) ? saved.rooms : fallback.rooms,
        bookingOptions: { ...fallback.bookingOptions, ...(saved.bookingOptions || {}) },
        payments: Array.isArray(saved.payments) ? saved.payments : [],
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
        prepaid: clampWhole(item.prepaid, 1, 999, 8),
        remaining: clampWhole(item.remaining, 0, 999, 0),
        nextDate: validDate(item.nextDate) ? item.nextDate : formatYmd(nextDateForWeekday(normalizeWeekday(item.weekday))),
        courseId: item.courseId || "",
        roomId: item.roomId || "",
        tutorId: item.tutorId || "",
        status: item.status || "active",
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

  function formatMoney(value) {
    return new Intl.NumberFormat("zh-HK", { style: "currency", currency: "HKD", maximumFractionDigits: 0 }).format(Number(value) || 0);
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
    else if (state.currentModule) renderModule();
    else showHome();
  }

  function featureCardHtml(item) {
    return '<button class="feature-card" type="button" data-module="' + item.id + '" style="--card-accent:' + item.accent + '">' +
      '<span class="feature-icon" aria-hidden="true">' + item.icon + '</span>' +
      '<strong>' + escapeHtml(item.title) + '</strong><small>' + escapeHtml(item.description) + '</small></button>';
  }

  function showHome() {
    state.currentModule = null;
    elements.homeView.hidden = false;
    elements.moduleView.hidden = true;
    elements.loggedOutView.hidden = true;
    elements.bottomNav.hidden = false;
    elements.pageLabel.textContent = "主頁";
    setActiveNav(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showLoggedOut() {
    elements.homeView.hidden = true;
    elements.moduleView.hidden = true;
    elements.loggedOutView.hidden = false;
    elements.bottomNav.hidden = true;
    elements.pageLabel.textContent = "泳堂管家";
  }

  function openModule(id) {
    if (!moduleMeta[id]) return;
    state.currentModule = id;
    elements.homeView.hidden = true;
    elements.loggedOutView.hidden = true;
    elements.moduleView.hidden = false;
    elements.bottomNav.hidden = false;
    renderModule();
    setActiveNav(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function setActiveNav(id) {
    document.querySelectorAll(".bottom-nav button").forEach((button) => button.classList.toggle("is-active", button.dataset.module === id));
  }

  function renderModule() {
    const meta = moduleMeta[state.currentModule];
    if (!meta) return showHome();
    elements.pageLabel.textContent = meta.title;
    elements.moduleKicker.textContent = meta.description;
    elements.moduleTitle.textContent = meta.title;
    elements.moduleDescription.textContent = moduleDescription(meta.id);
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
      courses: "管理課程名稱、級別、時長、收費與啟用狀態。",
      people: "集中管理學生及導師資料、堂數與負責安排。",
      rooms: "建立場地清單及設定預約規則。",
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
      people: ["add-student", "＋ 新增學生"],
      rooms: ["add-room", "＋ 新增課室"],
      payments: ["add-payment", "＋ 記錄收款"],
      manual: ["add-manual", "＋ 新增紀錄"],
      accounts: ["add-account", "＋ 新增帳戶"],
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
    const today = todayYmd();
    const seven = state.students.filter((student) => {
      const distance = dateDistance(student.nextDate);
      return distance >= 0 && distance <= 6;
    }).length;
    const monthKey = today.slice(0, 7);
    const monthCount = state.students.filter((student) => student.nextDate.startsWith(monthKey)).length;
    const mode = state.scheduleMode;
    let calendar = "";
    if (mode === "week") calendar = weekStripHtml();
    if (mode === "month") calendar = monthGridHtml();
    const filtered = scheduleStudentsForMode(mode);
    return statsHtml([
      { label: "今日課堂", value: state.students.filter((item) => item.nextDate === today).length, unit: "堂" },
      { label: "未來七日", value: seven, unit: "堂" },
      { label: "本月課堂", value: monthCount, unit: "堂" },
      { label: "需要續費", value: state.students.filter((item) => item.remaining <= lowBalance()).length, unit: "位" }
    ]) +
      '<section class="panel"><div class="toolbar"><div class="segmented">' +
      ["day", "week", "month"].map((item) => '<button type="button" data-action="schedule-mode" data-value="' + item + '" class="' + (mode === item ? "is-active" : "") + '">' + ({ day: "日", week: "週", month: "月" })[item] + "</button>").join("") +
      '</div><span class="badge neutral">' + filtered.length + " 堂</span></div>" + calendar +
      '<div class="panel-heading" style="margin-top:14px"><div><h2>課堂安排</h2><p>按時間排序的下一堂</p></div></div>' +
      scheduleRowsHtml(filtered) + "</section>";
  }

  function scheduleStudentsForMode(mode) {
    const today = startOfToday();
    return [...state.students].filter((student) => {
      const date = parseDate(student.nextDate);
      if (mode === "day") return student.nextDate === formatYmd(today);
      if (mode === "week") {
        const distance = dateDistance(student.nextDate);
        return distance >= 0 && distance <= 6;
      }
      return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth();
    }).sort((a, b) => a.nextDate.localeCompare(b.nextDate) || (a.nextTime || a.time).localeCompare(b.nextTime || b.time));
  }

  function weekStripHtml() {
    const today = startOfToday();
    return '<div class="calendar-strip">' + Array.from({ length: 7 }, (_, index) => {
      const date = addDays(today, index);
      const dateString = formatYmd(date);
      const count = state.students.filter((item) => item.nextDate === dateString).length;
      return '<div class="calendar-day ' + (index === 0 ? "is-today" : "") + '"><span>' + WEEKDAYS[date.getDay()].replace("星期", "週") +
        "</span><strong>" + date.getDate() + "</strong><em>" + count + " 堂</em></div>";
    }).join("") + "</div>";
  }

  function monthGridHtml() {
    const today = startOfToday();
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    const start = addDays(first, -first.getDay());
    return '<div class="month-grid">' + Array.from({ length: 42 }, (_, index) => {
      const date = addDays(start, index);
      const ymd = formatYmd(date);
      const count = state.students.filter((item) => item.nextDate === ymd).length;
      const classes = [date.getMonth() !== today.getMonth() ? "is-muted" : "", ymd === todayYmd() ? "is-today" : ""].join(" ");
      return '<div class="month-cell ' + classes + '">' + date.getDate() + (count ? '<div>' + '<span class="month-dot"></span>'.repeat(Math.min(count, 4)) + "</div>" : "") + "</div>";
    }).join("") + "</div>";
  }

  function scheduleRowsHtml(students) {
    if (!students.length) return emptyHtml("🗓️", "暫時沒有課堂", "你可以按「編排課堂」更新學生的下一堂日期。");
    return '<div class="list-stack">' + students.map((student) => {
      const room = findById(state.suite.rooms, student.roomId);
      return '<article class="list-row"><div class="row-icon">' + parseDate(student.nextDate).getDate() + '</div><div class="row-main"><strong>' +
        escapeHtml(student.name) + "</strong><span>" + escapeHtml(formatLongDate(student.nextDate)) + " · " + escapeHtml(formatTime(student.nextTime || student.time)) +
        (room ? " · " + escapeHtml(room.name) : "") + " · 尚餘 " + student.remaining + ' 堂</span></div><div class="row-actions">' +
        '<button class="mini-button" type="button" data-action="complete-lesson" data-id="' + student.id + '">完成</button>' +
        '<button class="mini-button" type="button" data-action="reschedule" data-id="' + student.id + '">改期</button>' +
        '<button class="mini-button danger" type="button" data-action="cancel-lesson" data-id="' + student.id + '">取消</button>' +
        '<button class="mini-button" type="button" data-action="prepare-message" data-id="' + student.id + '" data-type="lesson">提醒</button></div></article>';
    }).join("") + "</div>";
  }

  function renderCourses() {
    const active = state.suite.courses.filter((item) => item.active).length;
    return statsHtml([
      { label: "課程總數", value: state.suite.courses.length, unit: "個" },
      { label: "正在招生", value: active, unit: "個" },
      { label: "平均時長", value: average(state.suite.courses.map((item) => item.duration)), unit: "分鐘" },
      { label: "平均單堂", value: formatMoney(average(state.suite.courses.map((item) => item.fee))) }
    ]) + '<section class="panel"><div class="panel-heading"><div><h2>課程及級別</h2><p>停用課程不會從既有學生資料刪除</p></div></div>' +
      (state.suite.courses.length ? '<div class="list-stack">' + state.suite.courses.map((course) =>
        '<article class="list-row"><div class="row-icon">🎟️</div><div class="row-main"><strong>' + escapeHtml(course.name) + '</strong><span>' +
        escapeHtml(course.level) + " · " + course.duration + " 分鐘 · " + formatMoney(course.fee) + '</span></div><span class="badge ' + (course.active ? "" : "neutral") + '">' +
        (course.active ? "啟用" : "停用") + '</span><div class="row-actions"><button class="mini-button" type="button" data-action="toggle-course" data-id="' + course.id + '">' +
        (course.active ? "停用" : "啟用") + '</button><button class="mini-button" type="button" data-action="edit-course" data-id="' + course.id + '">編輯</button>' +
        '<button class="mini-button danger" type="button" data-action="delete-course" data-id="' + course.id + '">刪除</button></div></article>'
      ).join("") + "</div>" : emptyHtml("🎟️", "未有課程", "新增第一個課程及級別。")) + "</section>";
  }

  function renderPeople() {
    const tutors = state.suite.accounts.filter((item) => item.role === "tutor");
    const tab = state.peopleTab;
    return '<section class="panel"><div class="toolbar"><div class="segmented"><button type="button" data-action="people-tab" data-value="students" class="' +
      (tab === "students" ? "is-active" : "") + '">學生 ' + state.students.length + '</button><button type="button" data-action="people-tab" data-value="tutors" class="' +
      (tab === "tutors" ? "is-active" : "") + '">導師 ' + tutors.length + '</button></div><button class="button button-secondary" type="button" data-action="' +
      (tab === "students" ? "add-student" : "add-account") + '">＋ 新增' + (tab === "students" ? "學生" : "導師") + "</button></div>" +
      (tab === "students" ? studentGridHtml() : tutorListHtml(tutors)) + "</section>";
  }

  function studentGridHtml() {
    if (!state.students.length) return emptyHtml("👤", "未有學生資料", "新增學生後便可以排課、收款及準備提醒。");
    return '<div class="student-grid">' + [...state.students].sort((a, b) => a.name.localeCompare(b.name, "zh-Hant")).map((student) => {
      const course = findById(state.suite.courses, student.courseId);
      const low = student.remaining <= lowBalance();
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
    return '<div class="list-stack">' + tutors.map((item) =>
      '<article class="list-row"><div class="row-icon">🧑‍🏫</div><div class="row-main"><strong>' + escapeHtml(item.name) + '</strong><span>' +
      escapeHtml(item.email || "未有電郵") + " · " + escapeHtml(item.status === "active" ? "啟用" : "停用") + '</span></div><div class="row-actions"><button class="mini-button" type="button" data-action="edit-account" data-id="' +
      item.id + '">編輯</button></div></article>'
    ).join("") + "</div>";
  }

  function renderRooms() {
    const options = state.suite.bookingOptions;
    return statsHtml([
      { label: "課室／泳線", value: state.suite.rooms.length, unit: "個" },
      { label: "可使用", value: state.suite.rooms.filter((item) => item.active).length, unit: "個" },
      { label: "網上預約", value: options.onlineBooking ? "開啟" : "關閉" },
      { label: "緩衝時間", value: options.bufferMinutes, unit: "分鐘" }
    ]) + '<div class="setting-grid"><section class="panel"><div class="panel-heading"><div><h2>房間清單</h2><p>泳池、泳線或實體課室</p></div></div>' +
      (state.suite.rooms.length ? '<div class="list-stack">' + state.suite.rooms.map((room) =>
        '<article class="list-row"><div class="row-icon">🚪</div><div class="row-main"><strong>' + escapeHtml(room.name) + '</strong><span>' +
        escapeHtml(room.location) + " · 容量 " + room.capacity + " 人</span></div><span class=\"badge " + (room.active ? "" : "neutral") + '">' +
        (room.active ? "可預約" : "停用") + '</span><div class="row-actions"><button class="mini-button" type="button" data-action="edit-room" data-id="' + room.id +
        '">編輯</button><button class="mini-button danger" type="button" data-action="delete-room" data-id="' + room.id + '">刪除</button></div></article>'
      ).join("") + "</div>" : emptyHtml("🚪", "未有課室", "新增泳池、泳線或課室。")) + '</section><section class="panel"><div class="panel-heading"><div><h2>預約選項</h2><p>設定排課規則</p></div></div>' +
      '<label class="checkbox-field"><input type="checkbox" data-booking-option="onlineBooking" ' + (options.onlineBooking ? "checked" : "") + '> 允許網上預約</label>' +
      '<label class="checkbox-field" style="margin-top:12px"><input type="checkbox" data-booking-option="preventOverlap" ' + (options.preventOverlap ? "checked" : "") + '> 防止同一課室重疊</label>' +
      '<label class="field" style="margin-top:15px"><span>課堂之間緩衝分鐘</span><input type="number" min="0" max="120" data-booking-option="bufferMinutes" value="' +
      options.bufferMinutes + '"></label><p class="helper-text">設定會在此瀏覽器內套用到新排課。</p></section></div>';
  }

  function renderPayments() {
    const month = todayYmd().slice(0, 7);
    const monthPayments = state.suite.payments.filter((item) => item.date.startsWith(month));
    const total = monthPayments.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const outstanding = state.students.filter((item) => item.remaining <= lowBalance());
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
    const parents = state.suite.accounts.filter((item) => item.role === "parent").length;
    const tutors = state.suite.accounts.filter((item) => item.role === "tutor").length;
    return statsHtml([
      { label: "帳戶總數", value: state.suite.accounts.length, unit: "個" },
      { label: "家長帳戶", value: parents, unit: "個" },
      { label: "導師帳戶", value: tutors, unit: "個" },
      { label: "啟用帳戶", value: state.suite.accounts.filter((item) => item.status === "active").length, unit: "個" }
    ]) + '<section class="panel"><div class="panel-heading"><div><h2>本機帳戶目錄</h2><p>只記錄聯絡及角色資料，不儲存密碼</p></div></div>' +
      (state.suite.accounts.length ? '<div class="list-stack">' + state.suite.accounts.map((account) =>
        '<article class="list-row"><div class="row-icon">' + (account.role === "tutor" ? "🧑‍🏫" : "👪") + '</div><div class="row-main"><strong>' +
        escapeHtml(account.name) + '</strong><span>' + (account.role === "tutor" ? "導師" : "家長") + " · " + escapeHtml(account.email || account.phone || "未有聯絡資料") +
        '</span></div><span class="badge ' + (account.status === "active" ? "" : "neutral") + '">' + (account.status === "active" ? "啟用" : "停用") +
        '</span><div class="row-actions"><button class="mini-button" type="button" data-action="toggle-account" data-id="' + account.id + '">' +
        (account.status === "active" ? "停用" : "啟用") + '</button><button class="mini-button" type="button" data-action="edit-account" data-id="' + account.id +
        '">編輯</button><button class="mini-button danger" type="button" data-action="delete-account" data-id="' + account.id + '">刪除</button></div></article>'
      ).join("") + "</div>" : emptyHtml("🧑‍🏫", "未有帳戶", "新增家長或導師帳戶目錄。")) + "</section>";
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
      ["完成品牌及帳戶設定", "建立課程與級別", "新增課室／泳線及預約規則", "新增導師與家長帳戶目錄", "建立學生及指派課程、導師", "記錄首次收款及預繳堂數", "編排下一堂日期、時間與課室", "日常完成課堂、改期、發提醒及記筆記"].map((text, index) =>
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

  function studentFields(student) {
    const item = student || {};
    const courseOptions = [{ value: "", label: "未指定課程" }].concat(state.suite.courses.map((course) => ({ value: course.id, label: course.name + "｜" + course.level })));
    const roomOptions = [{ value: "", label: "未指定課室" }].concat(state.suite.rooms.map((room) => ({ value: room.id, label: room.name })));
    const tutorOptions = [{ value: "", label: "未指定導師" }].concat(state.suite.accounts.filter((account) => account.role === "tutor").map((account) => ({ value: account.id, label: account.name })));
    return [
      { name: "id", type: "hidden", value: item.id || "" },
      { name: "name", label: "學生姓名", type: "text", value: item.name || "", required: true, wide: true },
      { name: "courseId", label: "課程", type: "select", value: item.courseId || "", options: courseOptions },
      { name: "tutorId", label: "負責導師", type: "select", value: item.tutorId || "", options: tutorOptions },
      { name: "weekday", label: "每週上課日", type: "select", value: item.weekday == null ? 1 : item.weekday, options: WEEKDAYS.map((label, value) => ({ label, value })) },
      { name: "time", label: "固定時間", type: "time", value: item.time || "18:00", required: true },
      { name: "prepaid", label: "預繳堂數", type: "number", value: item.prepaid == null ? 8 : item.prepaid, min: 1, max: 999, required: true },
      { name: "remaining", label: "現時剩餘堂數", type: "number", value: item.remaining == null ? 8 : item.remaining, min: 0, max: 999, required: true },
      { name: "nextDate", label: "下一堂日期", type: "date", value: item.nextDate || formatYmd(nextDateForWeekday(item.weekday == null ? 1 : item.weekday)), required: true },
      { name: "roomId", label: "課室／泳線", type: "select", value: item.roomId || "", options: roomOptions }
    ];
  }

  function openStudentForm(student) {
    openForm({
      kicker: "個人資訊",
      title: student ? "編輯學生" : "新增學生",
      fields: studentFields(student),
      onSubmit: (data) => {
        const existing = data.id ? findById(state.students, data.id) : null;
        const payload = {
          id: existing ? existing.id : makeId(),
          name: String(data.name || "").trim(),
          courseId: data.courseId || "",
          tutorId: data.tutorId || "",
          weekday: normalizeWeekday(data.weekday),
          time: data.time,
          nextTime: existing && existing.time === data.time ? existing.nextTime : data.time,
          prepaid: clampWhole(data.prepaid, 1, 999, 8),
          remaining: clampWhole(data.remaining, 0, 999, 0),
          nextDate: data.nextDate,
          roomId: data.roomId || "",
          status: existing ? existing.status : "active",
          history: existing ? existing.history : [],
          createdAt: existing ? existing.createdAt : new Date().toISOString()
        };
        if (!payload.name) throw new Error("請輸入學生姓名。");
        if (existing) Object.assign(existing, payload);
        else state.students.push(payload);
        commit(existing ? "學生資料已更新" : "學生已新增");
      }
    });
  }

  function openCourseForm(course) {
    openForm({
      kicker: "課程設定",
      title: course ? "編輯課程" : "新增課程",
      fields: [
        { name: "id", type: "hidden", value: course ? course.id : "" },
        { name: "name", label: "課程名稱", type: "text", value: course ? course.name : "", required: true, wide: true },
        { name: "level", label: "級別", type: "text", value: course ? course.level : "初階", required: true },
        { name: "duration", label: "每堂分鐘", type: "number", value: course ? course.duration : 60, min: 15, max: 240, required: true },
        { name: "fee", label: "參考單堂收費（HKD）", type: "number", value: course ? course.fee : 350, min: 0, max: 99999, required: true },
        { name: "active", label: "狀態", type: "select", value: course ? String(course.active) : "true", options: [{ value: "true", label: "啟用" }, { value: "false", label: "停用" }] }
      ],
      onSubmit: (data) => upsertCollection("courses", data, {
        name: String(data.name).trim(), level: String(data.level).trim(), duration: Number(data.duration), fee: Number(data.fee), active: data.active === "true"
      }, "課程")
    });
  }

  function openRoomForm(room) {
    openForm({
      kicker: "課室設定",
      title: room ? "編輯課室" : "新增課室",
      fields: [
        { name: "id", type: "hidden", value: room ? room.id : "" },
        { name: "name", label: "名稱", type: "text", value: room ? room.name : "", required: true, wide: true },
        { name: "location", label: "地點", type: "text", value: room ? room.location : "", required: true },
        { name: "capacity", label: "容量", type: "number", value: room ? room.capacity : 6, min: 1, max: 999, required: true },
        { name: "active", label: "狀態", type: "select", value: room ? String(room.active) : "true", options: [{ value: "true", label: "可預約" }, { value: "false", label: "停用" }] }
      ],
      onSubmit: (data) => upsertCollection("rooms", data, {
        name: String(data.name).trim(), location: String(data.location).trim(), capacity: Number(data.capacity), active: data.active === "true"
      }, "課室")
    });
  }

  function openLessonForm(student) {
    if (!state.students.length) return showToast("請先新增學生");
    openForm({
      kicker: "時間表",
      title: "編排下一堂",
      fields: [
        { name: "studentId", label: "學生", type: "select", value: student ? student.id : state.students[0].id, required: true, wide: true, options: state.students.map((item) => ({ value: item.id, label: item.name })) },
        { name: "date", label: "日期", type: "date", value: student ? student.nextDate : todayYmd(), required: true },
        { name: "time", label: "時間", type: "time", value: student ? student.nextTime || student.time : "18:00", required: true },
        { name: "roomId", label: "課室／泳線", type: "select", value: student ? student.roomId : "", options: [{ value: "", label: "未指定" }].concat(state.suite.rooms.map((room) => ({ value: room.id, label: room.name }))) }
      ],
      onSubmit: (data) => {
        const target = findById(state.students, data.studentId);
        if (!target) throw new Error("找不到學生。");
        target.history.unshift({ id: makeId(), type: "rescheduled", lessonDate: target.nextDate, lessonTime: target.nextTime || target.time, newDate: data.date, newTime: data.time, createdAt: new Date().toISOString() });
        target.nextDate = data.date;
        target.nextTime = data.time;
        target.roomId = data.roomId || "";
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
        const lessons = clampWhole(data.lessons, 1, 999, 1);
        const payment = {
          id: makeId(), studentId: target.id, studentName: target.name, amount: Number(data.amount), lessons,
          date: data.date, method: data.method, note: data.note || "",
          receiptNo: "R-" + data.date.replaceAll("-", "") + "-" + String(state.suite.payments.length + 1).padStart(3, "0")
        };
        state.suite.payments.push(payment);
        target.remaining += lessons;
        target.prepaid += lessons;
        target.history.unshift({ id: makeId(), type: "payment", lessons, amount: payment.amount, createdAt: new Date().toISOString() });
        commit("收款已記錄，學生堂數已增加");
      }
    });
  }

  function openAccountForm(account, forceTutor) {
    openForm({
      kicker: "帳戶管理",
      title: account ? "編輯帳戶" : "新增帳戶",
      fields: [
        { name: "id", type: "hidden", value: account ? account.id : "" },
        { name: "name", label: "姓名", type: "text", value: account ? account.name : "", required: true, wide: true },
        { name: "role", label: "角色", type: "select", value: account ? account.role : forceTutor ? "tutor" : "parent", options: [{ value: "parent", label: "家長" }, { value: "tutor", label: "導師" }] },
        { name: "status", label: "狀態", type: "select", value: account ? account.status : "active", options: [{ value: "active", label: "啟用" }, { value: "inactive", label: "停用" }] },
        { name: "email", label: "電郵", type: "email", value: account ? account.email : "" },
        { name: "phone", label: "電話", type: "tel", value: account ? account.phone : "" }
      ],
      onSubmit: (data) => upsertCollection("accounts", data, {
        name: String(data.name).trim(), role: data.role, status: data.status, email: String(data.email || "").trim(), phone: String(data.phone || "").trim()
      }, "帳戶")
    });
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
    student.history.unshift({ id: makeId(), type: "completed", lessonDate: student.nextDate, lessonTime: student.nextTime || student.time, createdAt: new Date().toISOString() });
    student.nextDate = nextRecurringAfter(student.nextDate, student.weekday);
    student.nextTime = student.time;
    student.history = student.history.slice(0, 100);
    commit("課堂已完成，堂數已扣減");
  }

  function cancelLesson(student) {
    if (!window.confirm("確認取消 " + student.name + " 的下一堂？本次不會扣堂。")) return;
    student.history.unshift({ id: makeId(), type: "cancelled", lessonDate: student.nextDate, lessonTime: student.nextTime || student.time, createdAt: new Date().toISOString() });
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
    const button = event.target.closest("button");
    if (!button) return;
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
    if (action === "go-home") return showHome();
    if (action === "logout") {
      state.loggedIn = false;
      sessionStorage.setItem("swim-suite.logged-out", "1");
      return showLoggedOut();
    }
    if (action === "login") {
      state.loggedIn = true;
      sessionStorage.removeItem("swim-suite.logged-out");
      return showHome();
    }
    if (action === "schedule-mode") { state.scheduleMode = button.dataset.value; return renderModule(); }
    if (action === "people-tab") { state.peopleTab = button.dataset.value; return renderModule(); }
    if (action === "manual-filter") { state.manualFilter = button.dataset.value; return renderModule(); }
    if (action === "add-student") return openStudentForm();
    if (action === "edit-student") return openStudentForm(findById(state.students, id));
    if (action === "delete-student") {
      const student = findById(state.students, id);
      if (student && window.confirm("確定刪除 " + student.name + " 及其課堂紀錄？")) {
        state.students = state.students.filter((item) => item.id !== id);
        commit("學生已刪除");
      }
      return;
    }
    if (action === "complete-lesson") return markComplete(findById(state.students, id));
    if (action === "cancel-lesson") return cancelLesson(findById(state.students, id));
    if (action === "reschedule") return openLessonForm(findById(state.students, id));
    if (action === "prepare-message") return openMessage(findById(state.students, id), button.dataset.type);
    if (action === "add-lesson") return openLessonForm();
    if (action === "add-course") return openCourseForm();
    if (action === "edit-course") return openCourseForm(findById(state.suite.courses, id));
    if (action === "toggle-course") {
      const item = findById(state.suite.courses, id); item.active = !item.active; return commit("課程狀態已更新");
    }
    if (action === "delete-course") return deleteFrom("courses", id, "課程");
    if (action === "add-room") return openRoomForm();
    if (action === "edit-room") return openRoomForm(findById(state.suite.rooms, id));
    if (action === "delete-room") return deleteFrom("rooms", id, "課室");
    if (action === "add-payment") return openPaymentForm();
    if (action === "payment-for-student") return openPaymentForm(findById(state.students, id));
    if (action === "view-receipt") return showReceipt(findById(state.suite.payments, id));
    if (action === "print-receipt") return window.print();
    if (action === "add-manual") return openManualForm();
    if (action === "edit-manual") return openManualForm(findById(state.suite.manualItems, id));
    if (action === "delete-manual") return deleteFrom("manualItems", id, "手冊紀錄");
    if (action === "add-account") return openAccountForm(null, state.currentModule === "people");
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

  document.addEventListener("submit", (event) => {
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

  document.addEventListener("change", (event) => {
    const option = event.target.dataset.bookingOption;
    if (!option) return;
    state.suite.bookingOptions[option] = event.target.type === "checkbox" ? event.target.checked : clampWhole(event.target.value, 0, 120, 0);
    saveAll();
    showToast("預約選項已儲存");
  });

  elements.themeToggle.addEventListener("click", () => {
    state.suite.settings.theme = state.suite.settings.theme === "dark" ? "light" : "dark";
    saveAll();
    renderShell();
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

  renderShell();
})();

