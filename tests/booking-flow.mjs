import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import vm from "node:vm";
import { catalog } from "./catalog-fixture.mjs";

const files = await Promise.all(["location-import.js", "course-import.js", "app.js"].map((name) => readFile(new URL(`../dist/${name}`, import.meta.url), "utf8")));
const saved = new Map([
  ["swim-class-balance.v1", JSON.stringify([
    { id: "s1", name: "測試學生", roomId: "pool:%E7%94%B2%E6%B3%B3%E6%B1%A0", roomName: "甲泳池", ageGroup: "6 - 11", enrollmentStatus: "paid", status: "active", remaining: 4,
      enrollments: [{ id: "e1", courseName: "課程甲", classSize: "1:1", ageGroup: "6 - 11" }] },
    { id: "s2", name: "已有下一堂", roomId: "pool:%E7%94%B2%E6%B3%B3%E6%B1%A0", roomName: "甲泳池", ageGroup: "6 - 11", enrollmentStatus: "paid", status: "active", remaining: 4, nextDate: "2026-11-10", nextTime: "18:00",
      enrollments: [{ id: "e2", courseName: "課程甲", classSize: "1:1", ageGroup: "6 - 11" }] },
    { id: "s3", name: "另一學生", roomId: "pool:%E4%B9%99%E6%B3%B3%E6%B1%A0", roomName: "乙泳池", ageGroup: "6 - 11", enrollmentStatus: "paid", status: "active", remaining: 4,
      enrollments: [{ id: "e3", courseName: "課程甲", classSize: "1:1", ageGroup: "6 - 11" }] },
    { id: "s4", name: "不同年齡人數學生", roomId: "pool:%E7%94%B2%E6%B3%B3%E6%B1%A0", roomName: "甲泳池", ageGroup: "12 - 17", enrollmentStatus: "paid", status: "active", remaining: 4,
      enrollments: [{ id: "e4", courseName: "課程甲", classSize: "1:3", ageGroup: "12 - 17" }] },
    { id: "s5", name: "其他課程學生", roomId: "pool:%E7%94%B2%E6%B3%B3%E6%B1%A0", roomName: "甲泳池", ageGroup: "6 - 11", enrollmentStatus: "paid", status: "active", remaining: 4,
      enrollments: [{ id: "e5", courseName: "課程乙", classSize: "1:1", ageGroup: "6 - 11" }] }
  ])],
  ["swim-class-suite.v2", JSON.stringify({ accounts: [{ id: "t1", role: "tutor", name: "測試導師", courseIds: ["reference-1"] },
    { id: "t2", role: "tutor", name: "第二導師", courseIds: ["reference-1"] }],
    poolLocations: [{ id: "p1", pool: "甲泳池", place: "甲地點", meetingPoint: "入口", cleaningDay: "星期一", maintenanceTime: "一月" },
      { id: "p2", pool: "乙泳池", place: "乙地點", meetingPoint: "入口", cleaningDay: "星期二", maintenanceTime: "二月" }] })]
]);
const nodes = new Map();
const handlers = new Map();
const scheduledTimers = [];
let coarsePointer = false;
const classList = () => ({ add() {}, remove() {}, toggle() {}, contains() { return false; } });
const node = (selector) => {
  if (!nodes.has(selector)) nodes.set(selector, { value: "", innerHTML: "", textContent: "", hidden: false, classList: classList(),
    addEventListener(name, handler) { this[`on${name}`] = handler; }, setAttribute() {}, querySelector() { return null; }, querySelectorAll() { return []; }, reportValidity() { return true; }, showModal() { this.open = true; }, close() { this.open = false; } });
  return nodes.get(selector);
};
const document = { documentElement: { dataset: {} }, body: { classList: classList(), dataset: {} }, querySelector: node,
  querySelectorAll: () => [], getElementById: (id) => node(`#${id}`), addEventListener: (name, handler) => handlers.set(name, handler) };
let formValues = [];
let confirmCancellation = true;
let confirmationMessage = "";
const context = { document, FormData: class {
  entries() { return formValues; }
  get(name) { return formValues.find(([key]) => key === name)?.[1] ?? null; }
  getAll(name) { return formValues.filter(([key]) => key === name).map(([, value]) => value); }
}, localStorage: { getItem: (key) => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value) },
  sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} }, window: { scrollTo() {}, confirm(message) { confirmationMessage = message; return confirmCancellation; }, AdminAuth: { signIn: async () => {}, signOut: async () => {}, check: async () => true, getCatalog: async () => catalog, setOnExpired() {} } }, crypto: { randomUUID },
  setTimeout: (callback, delay) => { if (delay === 120) scheduledTimers.push(callback); return 1; }, clearTimeout() {}, Event: class { constructor(type) { this.type = type; } }, console };
context.window.matchMedia = () => ({ matches: coarsePointer });
for (let index = 0; index < files.length; index += 1) vm.runInNewContext(files[index], context, { filename: ["location-import.js", "course-import.js", "app.js"][index] });
node("#admin-login-form").elements = { email: { value: "admin@example.com" }, password: { value: "test-only" } };
await node("#admin-login-form").onsubmit({ preventDefault() {} });
node("#tutor-form").reset = () => {};
node("#tutor-form").elements = { namedItem: (name) => node(`#tutor-${name}`) };
node("#tutor-form").querySelectorAll = () => [];

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
await click({ close: "quick-lesson-dialog" });
assert.match(node("#module-content").innerHTML, /id="schedule-add-date" type="date"/, "schedule plus uses the existing native calendar picker");
assert.doesNotMatch(node("#module-content").innerHTML, /id="schedule-add-date" type="date" value=/, "picker starts empty so confirming the currently shown date also triggers quick add");
handlers.get("change")({ target: { id: "schedule-add-date", value: "2026-11-18" } });
assert.equal(node("#quick-lesson-dialog").open, true, "confirming a date from the schedule plus opens quick add");
assert.equal(node("#quick-lesson-date").value, "18-Nov-2026", "the chosen calendar date is carried into quick add");
node("#quick-lesson-start").value = "18:00";
handlers.get("input")({ target: { id: "quick-lesson-start", value: "18:00", closest: () => null } });
assert.equal(node("#quick-lesson-end").value, "19:00", "editing the start time moves the end one hour later");
await click({ close: "quick-lesson-dialog" });
coarsePointer = true;
handlers.get("change")({ target: { id: "schedule-add-date", value: "" } });
handlers.get("focusout")({ target: { id: "schedule-add-date" } });
assert.equal(node("#quick-lesson-dialog").open, false, "resetting the mobile calendar does not open quick add");
handlers.get("change")({ target: { id: "schedule-add-date", value: "2026-11-19" } });
assert.equal(node("#quick-lesson-dialog").open, false, "selecting a day keeps the native mobile calendar unobscured");
handlers.get("focusout")({ target: { id: "schedule-add-date" } });
assert.equal(node("#quick-lesson-dialog").open, false, "the quick dialog waits for the native calendar to close");
scheduledTimers.shift()();
assert.equal(node("#quick-lesson-dialog").open, true, "confirming the mobile calendar opens quick add after dismissal");
assert.equal(node("#quick-lesson-date").value, "19-Nov-2026", "the confirmed mobile date reaches quick add");
coarsePointer = false;
for (const [typed, expected] of [["2", "02:00"], ["12", "12:00"], ["16", "16:00"], ["1230", "12:30"], ["2:5", "02:05"]]) {
  const input = { value: typed, dataset: {}, matches: () => true, dispatchEvent() {}, name: "" };
  handlers.get("focusout")({ target: input });
  assert.equal(input.value, expected, `typed time ${typed} gains a valid colon`);
}

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
assert.equal(node("#booking-dismiss-button").hidden, false, "a new booking keeps the dismiss button");
assert.equal(node("#booking-cancel-button").hidden, true, "a new booking cannot be deleted before it exists");
assert.match(node("#booking-groups").innerHTML, /請先選擇導師/, "course choices wait for a tutor");
await click({ action: "booking-add-tutor" });
assert.equal(node("#tutor-dialog").open, true, "booking add tutor opens the existing tutor form");
assert.equal(node("#booking-dialog").open, true, "unfinished booking stays open beneath the tutor form");
await click({ close: "tutor-dialog" });
assert.equal(node("#booking-dialog").open, true, "canceling tutor creation returns to booking");
await click({ action: "booking-add-tutor" });
formValues = [["id", ""], ["name", "新增測試導師"], ["phone", ""], ["hourlyRate", ""], ["email", ""], ["courseIds", "reference-0"]];
node("#tutor-form").onsubmit({ preventDefault() {} });
formValues = [];
assert.equal(node("#tutor-dialog").open, false, "saving tutor closes the tutor form");
assert.equal(node("#booking-dialog").open, true, "saving tutor returns to the unfinished booking");
assert.match(node("#booking-groups").innerHTML, /新增測試導師/, "new tutor appears immediately in booking choices");
assert.match(node("#booking-selected-count").textContent, /1/, "booking date survives tutor creation");
await click({ action: "booking-tutor", group: "0", value: "t1" });
assert.match(node("#booking-groups").innerHTML, /課程甲/, "tutor's permitted course appears");
const courseChip = node("#booking-groups").innerHTML.match(/<button[^>]*data-action="booking-course"[^>]*data-value="reference-0"[^>]*>([^<]*)<\/button>/);
assert.equal(courseChip?.[1], "課程甲", "booking course choice shows only the course name");
assert.equal((node("#booking-groups").innerHTML.match(/data-action="booking-course"/g) || []).length, 1, "tutor permission for one variant displays its course name once");
await click({ action: "booking-course", group: "0", value: "reference-0" });
assert.match(node("#booking-groups").innerHTML, /請先選擇學生地區/, "student choices wait for a pool filter");
await click({ action: "booking-filter-pool", group: "0", value: "pool:%E7%94%B2%E6%B3%B3%E6%B1%A0" });
assert.match(node("#booking-groups").innerHTML, /測試學生/, "student enrolled in the selected pool appears");
assert.match(node("#booking-groups").innerHTML, /不同年齡人數學生/, "same course name remains eligible across ages and class sizes");
assert.doesNotMatch(node("#booking-groups").innerHTML, /其他課程學生/, "a different course name remains ineligible");
assert.doesNotMatch(node("#booking-groups").innerHTML, /另一學生/, "student in a different pool stays hidden");
await click({ action: "booking-student", group: "0", value: "s1" });
await click({ action: "booking-student", group: "0", value: "s4" });
assert.match(node("#booking-groups").innerHTML, /data-action="booking-remove-student"[^>]+data-value="s1"/, "selected student moves to a removable class list");
await click({ action: "booking-remove-student", group: "0", value: "s1" });
assert.match(node("#booking-groups").innerHTML, /data-action="booking-student"[^>]+data-value="s1"/, "removed student returns to the pool choices");
await click({ action: "booking-student", group: "0", value: "s1" });
await click({ action: "booking-filter-pool", group: "0", value: "pool:%E4%B9%99%E6%B3%B3%E6%B1%A0" });
assert.match(node("#booking-groups").innerHTML, /另一學生/, "a second selected pool contributes more students");
await click({ action: "booking-student", group: "0", value: "s3" });
await click({ action: "booking-location", group: "0", value: "pool:%E4%B9%99%E6%B3%B3%E6%B1%A0" });
await click({ action: "booking-add-group" });
await click({ action: "booking-tutor", group: "1", value: "t2" });
await click({ action: "booking-course", group: "1", value: "reference-0" });
await click({ action: "booking-filter-pool", group: "1", value: "pool:%E7%94%B2%E6%B3%B3%E6%B1%A0" });
await click({ action: "booking-student", group: "1", value: "s2" });
await click({ action: "booking-date", date: "2026-11-12" });
assert.match(node("#booking-selected-count").textContent, /2/, "calendar supports multiple lesson dates");
await click({ action: "booking-student", group: "0", value: "s5" });
await handlers.get("submit")({ target: { id: "booking-form" }, preventDefault() {} });
assert.match(node("#booking-error").textContent, /須已報讀該課程/, "save rejects a student enrolled in a different course name");
await click({ action: "booking-remove-student", group: "0", value: "s5" });
await handlers.get("submit")({ target: { id: "booking-form" }, preventDefault() {} });
const suite = JSON.parse(saved.get("swim-class-suite.v2"));
const students = JSON.parse(saved.get("swim-class-balance.v1"));
assert.equal(suite.lessonBookings.length, 4, "each class and date is saved as its own booking");
assert.deepEqual(suite.lessonBookings.map((item) => item.date).sort(), ["2026-11-05", "2026-11-05", "2026-11-12", "2026-11-12"]);
assert.deepEqual([...new Set(suite.lessonBookings.filter((item) => item.date === "2026-11-05").map((item) => item.tutorIds[0]))].sort(), ["t1", "t2"], "simultaneous classes use different tutors");
assert.equal(suite.lessonBookings[0].studentIds.length, 3, "one class can include students from different ages, class sizes and pools when the course name matches");
assert.equal(suite.lessonBookings[0].roomName, "乙泳池", "actual class location is independent of each student's preferred pool");
assert.equal(students[0].bookingManaged, true, "student next lesson is linked to the booking");
assert.equal(students[0].nextDate, "2026-11-05", "earliest booking becomes the next lesson");
assert.equal(students[3].bookingManaged, true, "same-name course student passes save validation despite different age and class size");
assert.equal(students[1].nextDate, "2026-11-10", "an existing next lesson remains scheduled");
assert.match(node("#module-content").innerHTML, /預約課堂/, "schedule displays saved booking");
assert.match(node("#module-content").innerHTML, /timeline-lane-1/, "simultaneous lessons receive distinct week-calendar lanes");
await click({ action: "edit-booking", id: suite.lessonBookings[0].id });
assert.equal(node("#booking-dismiss-button").hidden, true, "editing removes the old dismiss button from the footer");
assert.equal(node("#booking-cancel-button").hidden, false, "editing exposes cancel reservation in the footer");
for (let index = 0; index < 4; index += 1) await click({ action: "booking-add-group" });
assert.equal(node("#booking-add-group").disabled, true, "a sixth class cannot be added to one booking slot");
assert.equal((node("#booking-groups").innerHTML.match(/class="booking-group-card"/g) || []).length, 5);
await click({ action: "booking-location", group: "0", value: "other-pool" });
assert.match(node("#booking-groups").innerHTML, /其他泳池/, "other location displays a floating input");
handlers.get("input")({ target: { matches: (selector) => selector === "[data-booking-other-name]", dataset: { group: "0" }, value: "新泳池", parentElement: { classList: classList() }, closest: () => null } });
await click({ action: "booking-add-location", group: "0" });
assert.equal(node("#form-dialog").open, true, "new location shortcut opens the existing pool form");
assert.match(node("#form-fields").innerHTML, /value="新泳池"/, "typed other pool name carries into the pool form");
formValues = Object.entries({ id: "", publicPool: "", privatePool: "新泳池", place: "主池", meetingPoint: "大門", cleaningDay: "星期一", maintenanceTime: "一月" });
await node("#dynamic-form").onsubmit({ preventDefault() {} });
assert.equal(node("#form-dialog").open, false, "saving the new pool closes its form");
assert.equal(node("#booking-dialog").open, true, "saving the new pool returns to the unfinished booking");
assert.match(node("#booking-groups").innerHTML, /data-action="booking-location"[^>]+data-value="pool-private:%E6%96%B0%E6%B3%B3%E6%B1%A0"[^>]+aria-pressed="true"/, "new private pool becomes the actual class location");
assert.match(node("#booking-groups").innerHTML, /測試學生/, "selected students remain in the booking draft after returning");
const cancelledId = suite.lessonBookings[0].id;
const beforeCancel = JSON.parse(saved.get("swim-class-balance.v1"));
confirmCancellation = false;
await click({ action: "cancel-editing-booking" });
assert.match(confirmationMessage, /不能復原/, "cancel reservation warns before deletion");
assert.equal(node("#booking-dialog").open, true, "declining the warning keeps the editor open");
assert.equal(JSON.parse(saved.get("swim-class-suite.v2")).lessonBookings.length, 4, "declining the warning keeps every booking");
confirmCancellation = true;
await click({ action: "cancel-editing-booking" });
const afterCancelSuite = JSON.parse(saved.get("swim-class-suite.v2"));
const afterCancelStudents = JSON.parse(saved.get("swim-class-balance.v1"));
assert.equal(node("#booking-dialog").open, false, "confirmed cancellation closes the editor");
assert.equal(afterCancelSuite.lessonBookings.length, 3, "confirmed cancellation deletes only one reservation");
assert.equal(afterCancelSuite.lessonBookings.some((item) => item.id === cancelledId), false, "the edited reservation is removed");
assert.deepEqual(afterCancelStudents.map((item) => item.remaining), beforeCancel.map((item) => item.remaining), "cancelling an unfinished booking never deducts or invents a refund");
assert.equal(afterCancelStudents[0].nextDate, "2026-11-12", "the next booked lesson replaces the cancelled date");
console.log("Booking flow tests passed: course matching, pool filtering, cross-pool students, multi-date save and confirmed cancellation.");
