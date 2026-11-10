import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const source = await readFile(new URL("../dist/app.js", import.meta.url), "utf8");
const locationSource = await readFile(new URL("../dist/location-import.js", import.meta.url), "utf8");
const saved = new Map([
  ["swim-class-balance.v1", JSON.stringify([{ id: "student-1", name: "Rajinder Afghan", nextDate: "2026-10-19", nextTime: "08:00", time: "08:00", status: "active", remaining: 4, roomId: "old-room" }])],
  ["swim-class-suite.v2", JSON.stringify({ rooms: [{ id: "old-room", name: "主池 A 線" }] })]
]);
const nodes = new Map();
const handlers = new Map();
const nodeHandlers = new Map();
const classList = () => ({ add() {}, remove() {}, toggle() {} });
const node = (selector) => {
  if (!nodes.has(selector)) nodes.set(selector, { innerHTML: "", textContent: "", hidden: false, classList: classList(), addEventListener(name, handler) { nodeHandlers.set(selector + ":" + name, handler); }, setAttribute() {}, showModal() { this.open = true; }, close() { this.open = false; } });
  return nodes.get(selector);
};
const document = {
  documentElement: { dataset: {} },
  body: { classList: classList(), dataset: {} },
  querySelector: node,
  querySelectorAll: () => [],
  addEventListener: (name, handler) => handlers.set(name, handler)
};
const context = {
  document,
  localStorage: { getItem: (key) => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value) },
  sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  window: { scrollTo() {} },
  FormData: class { constructor(form) { this.form = form; } entries() { return Object.entries(this.form.fields); } },
  setTimeout: () => 1,
  clearTimeout() {},
  console
};
vm.runInNewContext(locationSource, context, { filename: "dist/location-import.js" });
vm.runInNewContext(source, context, { filename: "dist/app.js" });
assert.deepEqual(JSON.parse(saved.get("swim-class-suite.v2")).rooms, [], "old room list is removed from browser storage");
assert.equal(JSON.parse(saved.get("swim-class-balance.v1"))[0].roomName, "主池 A 線", "student keeps the recorded location name");

const click = async (dataset) => {
  const button = { dataset };
  await handlers.get("click")({ target: { closest: () => button } });
};
const content = () => node("#module-content").innerHTML;

await click({ module: "schedule" });
assert.match(content(), /timeline-body/, "week timeline renders");
assert.match(content(), /50%/, "zoom starts at 50%");

await click({ action: "schedule-zoom", delta: "10" });
assert.match(content(), /60%/, "desktop zoom button changes the grid by ten percent");
assert.doesNotMatch(content(), /07:30/, "50–70 percent uses one-hour slots");
for (let index = 0; index < 2; index++) await click({ action: "schedule-zoom", delta: "10" });
assert.match(content(), /07:30/, "71–120 percent uses half-hour slots");
for (let index = 0; index < 5; index++) await click({ action: "schedule-zoom", delta: "10" });
assert.match(content(), /07:15/, "121–200 percent uses quarter-hour slots");
for (let index = 0; index < 7; index++) await click({ action: "schedule-zoom", delta: "10" });
assert.match(content(), /200%/, "zoom reaches 200 percent");
assert.match(content(), /aria-label="放大時間格" disabled/, "zoom cannot pass 200 percent");
for (let index = 0; index < 12; index++) await click({ action: "schedule-zoom", delta: "-10" });
assert.match(content(), /80%/, "zoom returns to half-hour scale");

handlers.get("change")({ target: { id: "schedule-date", value: "2026-10-18", dataset: {} } });
await click({ action: "schedule-mode", value: "month" });
await click({ action: "schedule-display" });
assert.match(content(), /2026-10-19/, "monthly list includes another date in the selected month");
assert.match(content(), /Rajinder Afghan/, "monthly list includes the lesson");
assert.doesNotMatch(content(), /month-grid/, "list mode hides the calendar grid");

await click({ action: "schedule-hours" });
assert.equal(node("#schedule-hours-dialog").open, true, "opening-hours dialog opens");
const hoursBeforeInvalidSubmit = saved.get("swim-class-suite.v2");
handlers.get("submit")({ target: { id: "schedule-hours-form", fields: { openHour: "20", closeHour: "8" } }, preventDefault() {} });
assert.match(node("#schedule-hours-error").textContent, /必須遲於/, "invalid hours are rejected");
assert.equal(saved.get("swim-class-suite.v2"), hoursBeforeInvalidSubmit, "invalid hours are not persisted");
handlers.get("submit")({ target: { id: "schedule-hours-form", fields: { openHour: "8", closeHour: "20" } }, preventDefault() {} });
assert.equal(JSON.parse(saved.get("swim-class-suite.v2")).bookingOptions.openHour, 8, "opening hour is persisted");
assert.match(content(), /08:00 – 20:00/, "monthly list reflects saved hours");

await click({ action: "schedule-display" });
await click({ action: "schedule-mode", value: "day" });
assert.match(content(), /08:00/, "day grid begins at the new opening hour");
assert.match(content(), /20:00/, "day grid ends at the new closing hour");
assert.match(content(), /height:739\.2px/, "day timeline height uses saved hours and 80% zoom");
await click({ action: "schedule-mode", value: "week" });
assert.match(content(), /height:739\.2px/, "week timeline uses the same saved hour range");
const pinchBody = { style: {} }, pinchLabel = { textContent: "" };
const pinchCard = { dataset: { totalHours: "12" }, style: { setProperty() {} }, querySelector: (selector) => selector === ".timeline-body" ? pinchBody : pinchLabel };
const pinchTarget = { closest: () => pinchCard };
nodeHandlers.get("#module-content:touchstart")({ target: pinchTarget, touches: [{ clientX: 0, clientY: 0 }, { clientX: 100, clientY: 0 }] });
nodeHandlers.get("#module-content:touchmove")({ touches: [{ clientX: 0, clientY: 0 }, { clientX: 104, clientY: 0 }], preventDefault() {} });
assert.equal(pinchLabel.textContent, "81%", "four-pixel pinch changes zoom by one percent");
nodeHandlers.get("#module-content:touchend")({ touches: [] });
assert.match(content(), /81%/, "pinch zoom redraws the grid at the final value");
let pinchZoom = 81;
const pinchTo = (nextZoom) => {
  nodeHandlers.get("#module-content:touchstart")({ target: pinchTarget, touches: [{ clientX: 0, clientY: 0 }, { clientX: 100, clientY: 0 }] });
  nodeHandlers.get("#module-content:touchmove")({ touches: [{ clientX: 0, clientY: 0 }, { clientX: 100 + (nextZoom - pinchZoom) * 4, clientY: 0 }], preventDefault() {} });
  nodeHandlers.get("#module-content:touchend")({ touches: [] });
  pinchZoom = nextZoom;
};
pinchTo(70);
assert.doesNotMatch(content(), /08:30/, "70 percent keeps one-hour slots");
pinchTo(71);
assert.match(content(), /08:30/, "71 percent switches to half-hour slots");
pinchTo(120);
assert.doesNotMatch(content(), /08:15/, "120 percent keeps half-hour slots");
pinchTo(121);
assert.match(content(), /08:15/, "121 percent switches to quarter-hour slots");

await click({ module: "people" });
assert.match(content(), /新增課程/, "people header has course action");
assert.match(content(), /匯入/, "people header has student import action");
assert.match(content(), /新增導師/, "people header has separate tutor action");
assert.match(content(), /新增學生/, "people header has separate student action");
assert.equal((content().match(/people-metric-icon/g) || []).length, 5, "all five people metrics render matching SVG icons");
assert.match(content(), /待確認學員/, "pending student filter is available");
assert.equal(node("#module-actions").innerHTML, "", "people heading does not duplicate the add-student action");
assert.equal(node("#theme-toggle").hidden, true, "theme control is hidden outside the homepage");
assert.equal(node("#logout-button").hidden, true, "logout control is hidden outside the homepage");
assert.match(content(), /Rajinder Afghan/, "existing student remains visible");
await click({ action: "people-layout" });
assert.match(content(), /people-table/, "desktop table toggle renders a table");
await click({ action: "people-filter", value: "tutors" });
assert.match(content(), /未有導師資料/, "tutor filter renders tutor list");
await click({ action: "people-menu" });
assert.doesNotMatch(content(), /切換顯示模式|登出/, "personal information mobile menu contains only the four shortcuts");
await click({ module: "rooms" });
assert.match(content(), /課堂泳池/, "swimming location page uses the new pool selector");
assert.match(content(), /泳池地點/, "swimming location page uses the place selector");
assert.match(content(), /location-summary-grid/, "swimming location page has the matching information cards");
assert.doesNotMatch(content(), /舊有地點清單|使用中但未列入的泳班地點|主池 A 線/, "retired location sections and values are absent");
assert.equal(node(".module-heading").hidden, false, "swimming location page uses the course-style heading");
assert.equal(node("#location-top-actions").hidden, false, "swimming location top actions are visible");
await click({ action: "select-location-pool", value: "九龍公園游泳池" });
await click({ action: "select-location-place", value: "戶外下層嬉水池" });
assert.match(content(), /柯士甸站\/佐敦站行過去/, "selected combination shows its meeting point");
assert.match(content(), /星期二 \(星期四\*\)/, "selected combination shows its cleaning day");
assert.match(content(), /11月1日至翌年4月15日/, "selected combination shows its maintenance period");
await click({ action: "go-home" });
assert.equal(node("#theme-toggle").hidden, false, "theme control returns on the homepage");
assert.equal(node("#logout-button").hidden, false, "logout control returns on the homepage");

console.log("Schedule and people behavior tests passed: calendar, opening hours, profiles and actions.");
