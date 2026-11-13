import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const [html, css, js] = await Promise.all([
  readFile(new URL("dist/index.html", root), "utf8"),
  readFile(new URL("dist/styles.css", root), "utf8"),
  readFile(new URL("dist/app.js", root), "utf8"),
]);

const featureTitles = [
  "時間表/編排課堂",
  "課程設定",
  "個人資訊",
  "泳班地點",
  "付款",
  "數位手冊",
  "帳戶管理",
  "產品管理",
  "公告欄",
  "設定",
  "聯絡我們",
  "說明中心",
];

for (const title of featureTitles) {
  assert.ok(js.includes(`title: "${title}"`), `feature exists: ${title}`);
}

for (const id of [
  "home-view",
  "module-view",
  "feature-grid",
  "module-content",
  "form-dialog",
  "message-dialog",
  "receipt-dialog",
  "import-data",
  "tutor-form",
  "student-import-dialog",
  "course-import-dialog",
  "location-import-dialog",
  "location-manage-dialog",
  "location-top-actions",
  "location-more-button",
  "people-more-button",
  "people-top-actions",
  "logout-button",
]) {
  assert.match(html, new RegExp(`id=["']${id}["']`), `required DOM target exists: ${id}`);
}

assert.match(html, /viewport-fit=cover/, "mobile viewport is configured");
assert.match(html, /個人資訊/);
assert.match(html, /時間表/);
assert.match(html, /付款/);
assert.match(html, /數位手冊/);

assert.match(js, /swim-class-balance\.v1/, "legacy student storage key is preserved");
assert.match(js, /swim-class-suite\.v2/, "suite storage key is present");
assert.match(js, /data-action="cancel-lesson"/, "cancel lesson control is rendered");
assert.match(js, /function exportData\(/, "backup export is implemented");
assert.match(js, /function importData\(/, "backup import is implemented");
assert.match(js, /圖片超過 1MB/, "local image size limit is enforced");
assert.match(js, /目前是本機帳戶目錄/, "local-only account limitation is disclosed");
assert.match(js, /data-action="import-students"|peopleActionHtml\("import-students"/, "student import action exists");
assert.match(js, /peopleActionHtml\("add-tutor"/, "separate tutor action exists");
assert.match(html, /students-import-template\.xlsx/, "Excel template download exists");
assert.match(html, /course-import\.js/, "course import data and parser are loaded");
assert.match(html, /location-import\.js/, "location import data and parser are loaded");
assert.match(js, /function courseChipSection\(/, "course combination selectors exist");
assert.match(js, /function deleteCourse\(/, "complete course deletion is guarded");
assert.doesNotMatch(js, /label: "平均時長"|label: "平均單堂"/, "course average boxes were removed");
assert.match(html, /密碼（在 Supabase 設定）/, "coach password is set only in Supabase");
assert.match(html, /type="password"[^>]*disabled/, "password cannot be entered or persisted locally");
assert.doesNotMatch(html, /people-top-action[^>]*data-action="add-course"/, "people top actions omit add course");
assert.match(html, /data-action="import-students"[\s\S]*匯入學生[\s\S]*data-action="add-student"[\s\S]*data-action="add-tutor"/, "people top actions follow the requested order and label");
assert.equal((html.match(/class="people-action-icon"/g) || []).length, 6, "people and location actions use matching SVG icons");
assert.match(html, /class="bottom-nav"[\s\S]*data-action="go-home"[\s\S]*data-module="people"[\s\S]*data-module="schedule"[\s\S]*data-module="payments"[\s\S]*data-module="manual"/, "five navigation items follow the requested order");
assert.equal((html.match(/class="nav-icon"/g) || []).length, 5, "all five navigation items use matching SVG icons");
assert.match(html, /本月人工＝教練時薪 × 本月已完成游泳班時數/, "hourly wage calculation is explained");
assert.match(js, /accounts: \["add-tutor", "＋ 新增導師"\]/, "account module opens the dedicated tutor form");
assert.match(js, /function tutorMonthlyPayroll\(/, "monthly tutor payroll calculation exists");
assert.match(js, /function peopleMetricIconHtml\(/, "people summary cards use the requested SVG icon set");
assert.match(js, /課堂泳池/, "swimming location page uses course-style pool selectors");
assert.match(js, /排程的課堂泳池篩選，預約泳班時的地點選項/, "swimming location introduction is present");
assert.match(js, /function deletePoolLocation\(/, "pool location combinations have guarded independent deletion");
assert.doesNotMatch(js, /<h2>舊有地點清單<\/h2>|<h3>使用中但未列入的泳班地點<\/h3>/, "retired location sections are absent");
assert.match(js, /function clearLegacyRooms\(/, "retired room data is cleared while recorded names are kept");
assert.doesNotMatch(js, /title: "課室設定"/, "old classroom module title was replaced");
assert.match(js, /durationMinutes: Number\(course && course\.duration\)/, "completed lessons preserve paid duration");
assert.doesNotMatch(js, /title: account \? "編輯帳戶" : "新增帳戶"/, "generic account form was removed");
assert.doesNotMatch(js, /people-theme/, "personal information menu does not duplicate the theme control");
assert.doesNotMatch(js, /people: \["add-student", "＋ 新增學生"\]/, "personal information heading does not duplicate the add-student action");
assert.doesNotMatch(js, /class=\\\\"/, "rendered HTML does not contain escaped class delimiters");

assert.match(css, /@media \(max-width: 620px\)/, "narrow mobile layout exists");
assert.match(css, /@media \(min-width: 760px\)/, "desktop enhancement exists");
assert.match(css, /body \{ padding-left: 76px;/, "desktop navigation uses a compact default width");
assert.match(css, /body\.nav-expanded \{ padding-left: 190px; \}/, "desktop navigation expands the content offset");
assert.match(css, /body\.nav-expanded \.bottom-nav \{ width: 190px;/, "desktop navigation expands on interaction");
assert.match(css, /grid-template-rows: 68px repeat\(5, 50px\) 1fr/, "desktop sidebar has five navigation rows");
assert.match(css, /:root\[data-theme="dark"\]/, "dark theme is styled");
assert.match(css, /@media print/, "receipt print layout exists");

console.log("App smoke tests passed: all 12 modules, required UI targets, persistence, backup, and responsive styles.");
