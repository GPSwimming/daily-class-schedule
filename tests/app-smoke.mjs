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
  "課室設定",
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
assert.doesNotMatch(js, /class=\\\\"/, "rendered HTML does not contain escaped class delimiters");

assert.match(css, /@media \(max-width: 620px\)/, "narrow mobile layout exists");
assert.match(css, /@media \(min-width: 760px\)/, "desktop enhancement exists");
assert.match(css, /:root\[data-theme="dark"\]/, "dark theme is styled");
assert.match(css, /@media print/, "receipt print layout exists");

console.log("App smoke tests passed: all 12 modules, required UI targets, persistence, backup, and responsive styles.");

