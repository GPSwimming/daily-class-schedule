import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import vm from "node:vm";

const files = await Promise.all(["location-import.js", "course-import.js", "app.js"].map((name) => readFile(new URL(`../dist/${name}`, import.meta.url), "utf8")));
const saved = new Map([
  ["swim-class-balance.v1", JSON.stringify([
    { id: "s1", name: "測試學生", ageGroup: "6 - 11", enrollmentStatus: "paid", status: "active", remaining: 4,
      enrollments: [{ id: "e1", courseName: "進階游泳課程", classSize: "1:1", ageGroup: "6 - 11" }] },
    { id: "s2", name: "已有下一堂", ageGroup: "6 - 11", enrollmentStatus: "paid", status: "active", remaining: 4, nextDate: "2026-11-10", nextTime: "18:00",
      enrollments: [{ id: "e2", courseName: "進階游泳課程", classSize: "1:1", ageGroup: "6 - 11" }] }
  ])],
  ["swim-class-suite.v2", JSON.stringify({ accounts: [{ id: "t1", role: "tutor", name: "測試導師" }] })]
]);
const nodes = new Map();
const handlers = new Map();
const classList = () => ({ add() {}, remove() {}, toggle() {} });
const node = (selector) => {
  if (!nodes.has(selector)) nodes.set(selector, { value: "", innerHTML: "", textContent: "", hidden: false, classList: classList(),
    addEventListener(name, handler) { this[`on${name}`] = handler; }, setAttribute() {}, showModal() { this.open = true; }, close() { this.open = false; } });
  return nodes.get(selector);
};
const document = { documentElement: { dataset: {} }, body: { classList: classList(), dataset: {} }, querySelector: node,
  querySelectorAll: () => [], getElementById: (id) => node(`#${id}`), addEventListener: (name, handler) => handlers.set(name, handler) };
const context = { document, localStorage: { getItem: (key) => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value) },
  sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} }, window: { scrollTo() {} }, crypto: { randomUUID },
  setTimeout: () => 1, clearTimeout() {}, console };
for (let index = 0; index < files.length; index += 1) vm.runInNewContext(files[index], context, { filename: ["location-import.js", "course-import.js", "app.js"][index] });

const click = async (dataset) => handlers.get("click")({ target: { closest: () => ({ dataset }) } });
await click({ module: "schedule" });
const timelineCard = { dataset: { openHour: "7", totalHours: "15" } };
const blankMondayCell = { dataset: { date: "2026-11-02" }, getBoundingClientRect: () => ({ top: 100, height: 600 }),
  closest: (selector) => selector === ".timeline-card" ? timelineCard : null };
await handlers.get("click")({ clientY: 196, target: { closest: (selector) => selector === ".timeline-day-column" ? blankMondayCell : null } });
assert.equal(node("#quick-lesson-dialog").open, true, "clicking anywhere in a blank calendar cell opens quick add");
assert.equal(node("#quick-lesson-date").value, "02-Nov-2026", "clicked column supplies the date");
assert.equal(node("#quick-lesson-start").value, "09:00", "clicked row supplies the start time");
assert.equal(node("#quick-lesson-end").value, "10:00", "clicked row defaults to a one-hour lesson");
await click({ close: "quick-lesson-dialog" });
for (let index = 0; index < 3; index += 1) await click({ action: "schedule-zoom", delta: "10" });
await handlers.get("click")({ clientY: 205, target: { closest: (selector) => selector === ".timeline-day-column" ? blankMondayCell : null } });
assert.equal(node("#quick-lesson-start").value, "09:30", "30-minute zoom maps the clicked half-hour cell");
await click({ close: "quick-lesson-dialog" });
for (let index = 0; index < 5; index += 1) await click({ action: "schedule-zoom", delta: "10" });
await handlers.get("click")({ clientY: 191, target: { closest: (selector) => selector === ".timeline-day-column" ? blankMondayCell : null } });
assert.equal(node("#quick-lesson-start").value, "09:15", "15-minute zoom maps the clicked quarter-hour cell");
await click({ close: "quick-lesson-dialog" });
await click({ action: "add-lesson" });
assert.equal(node("#quick-lesson-dialog").open, true, "green plus opens quick add");
assert.match(node("#quick-lesson-date").value, /^\d{2}-[A-Z][a-z]{2}-\d{4}$/, "quick date uses the student date format");
assert.equal(Number(node("#quick-lesson-end").value.slice(0, 2)) - Number(node("#quick-lesson-start").value.slice(0, 2)), 1, "quick end defaults one hour later");
node("#quick-lesson-start").value = "18:00";
handlers.get("input")({ target: { id: "quick-lesson-start", value: "18:00", closest: () => null } });
assert.equal(node("#quick-lesson-end").value, "19:00", "editing the start time moves the end one hour later");

node("#quick-lesson-date").value = "31/12/2026";
handlers.get("submit")({ target: { id: "quick-lesson-form" }, preventDefault() {} });
assert.match(node("#quick-lesson-date-error").textContent, /日期格式錯誤/, "invalid manual date is rejected");
node("#quick-lesson-date").value = "05-Nov-2026";
node("#quick-lesson-start").value = "21:00";
node("#quick-lesson-end").value = "20:00";
handlers.get("submit")({ target: { id: "quick-lesson-form" }, preventDefault() {} });
assert.match(node("#quick-lesson-error").textContent, /結束時間必須遲於/, "end time must follow start time");
node("#quick-lesson-end").value = "22:00";
handlers.get("submit")({ target: { id: "quick-lesson-form" }, preventDefault() {} });
assert.equal(node("#booking-dialog").open, true, "quick add opens booking page");
assert.match(node("#booking-students").innerHTML, /請先選擇課程/, "students wait for course choice");
await click({ action: "booking-tutor", value: "t1" });
await click({ action: "booking-course", value: "進階游泳課程" });
assert.match(node("#booking-students").innerHTML, /測試學生/, "enrolled student appears for matching course");
await click({ action: "booking-student", value: "s1" });
await click({ action: "booking-student", value: "s2" });
await click({ action: "booking-date", date: "2026-11-12" });
assert.match(node("#booking-selected-count").textContent, /2/, "calendar supports multiple lesson dates");
handlers.get("submit")({ target: { id: "booking-form" }, preventDefault() {} });
const suite = JSON.parse(saved.get("swim-class-suite.v2"));
const students = JSON.parse(saved.get("swim-class-balance.v1"));
assert.equal(suite.lessonBookings.length, 2, "each date is saved as a booking");
assert.deepEqual(suite.lessonBookings.map((item) => item.date).sort(), ["2026-11-05", "2026-11-12"]);
assert.equal(students[0].bookingManaged, true, "student next lesson is linked to the booking");
assert.equal(students[0].nextDate, "2026-11-05", "earliest booking becomes the next lesson");
assert.equal(students[1].nextDate, "2026-11-10", "an existing next lesson remains scheduled");
assert.match(node("#module-content").innerHTML, /預約課堂/, "schedule displays saved booking");
console.log("Booking flow tests passed: quick date, course matching, multi-date save, schedule integration.");
