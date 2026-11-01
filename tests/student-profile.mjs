import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const [locationSource, courseSource, appSource] = await Promise.all([
  readFile(new URL("../dist/location-import.js", import.meta.url), "utf8"),
  readFile(new URL("../dist/course-import.js", import.meta.url), "utf8"),
  readFile(new URL("../dist/app.js", import.meta.url), "utf8")
]);
const saved = new Map([
  ["swim-class-balance.v1", JSON.stringify([
    { id: "legacy", name: "舊學生", nextDate: "2026-10-30", prepaid: 8, remaining: 4 },
    { id: "paid", name: "新學生", ageGroup: "6 - 11", gender: "女", whatsapp: "91234567", enrollmentStatus: "paid", studentNumber: "K260010", enrollmentYear: 2026, nextDate: "" }
  ])],
  ["swim-class-suite.v2", JSON.stringify({ studentNumberCounters: { K26: 12, A25: 8 } })]
]);
const classList = () => ({ add() {}, remove() {}, toggle() {} });
const nodes = new Map();
const listeners = new Map();
const node = (selector) => {
  if (!nodes.has(selector)) nodes.set(selector, { innerHTML: "", textContent: "", hidden: false, classList: classList(), addEventListener() {}, setAttribute() {} });
  return nodes.get(selector);
};
const document = {
  documentElement: { dataset: {} }, body: { classList: classList(), dataset: {} },
  querySelector: node, querySelectorAll: () => [], addEventListener: (name, callback) => listeners.set(name, callback)
};
const context = {
  document,
  localStorage: { getItem: (key) => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value) },
  sessionStorage: { getItem: () => null },
  window: { scrollTo() {} },
  setTimeout: () => 1, clearTimeout() {}, console
};
vm.runInNewContext(locationSource, context);
vm.runInNewContext(courseSource, context);
const instrumented = appSource.replace(/\n\}\)\(\);\s*$/, "\n  globalThis.studentTest = { fiscalYear, isMinorAge, nextStudentNumber, studentAgeGroups, studentRecordDateYmd, formatStudentRecordDate, studentFormHtml, saveStudentProfile, renderPeople, state };\n})();");
vm.runInNewContext(instrumented, context);
const { fiscalYear, isMinorAge, nextStudentNumber, studentAgeGroups, studentRecordDateYmd, formatStudentRecordDate, studentFormHtml, saveStudentProfile, renderPeople, state } = context.studentTest;

assert.equal(fiscalYear("2026-03-31"), 2025);
assert.equal(fiscalYear("2026-04-01"), 2026);
assert.equal(fiscalYear("2027-03-31"), 2026);
assert.equal(fiscalYear("2027-04-01"), 2027);
assert.equal(studentRecordDateYmd("03-Dec-2026"), "2026-12-03", "typed student date uses day-month-year order");
assert.equal(studentRecordDateYmd("31/12/2026"), "", "slash-separated dates are rejected");
assert.equal(studentRecordDateYmd("31-Feb-2026"), "", "impossible dates are rejected");
assert.equal(formatStudentRecordDate("2026-12-03"), "03-Dec-2026", "stored ISO dates display in the requested format");
assert.equal(isMinorAge("12 - 17"), true);
assert.equal(isMinorAge("18 - 29"), false);
assert.equal(nextStudentNumber(2026, "6 - 11").value, "K260013", "counter prevents reusing deleted numbers");
assert.equal(nextStudentNumber(2025, "18 - 29").value, "A250009", "adult sequence is separate");
assert.ok(studentAgeGroups().some((age) => age === "2.5 - 5"));
assert.ok(studentAgeGroups().some((age) => age === "60 - 69"));
assert.match(studentFormHtml(null), /name="birthDate" type="date"/, "birth date uses the same native date control as the next lesson date");
assert.match(studentFormHtml(null), /出生日期（選填）/, "birth date keeps its optional label");
assert.equal(state.students[0].enrollmentStatus, "legacy", "old records remain distinguishable and are not auto-numbered");
assert.equal(state.students[0].enrollmentYear, null, "missing legacy year stays empty");
assert.equal(state.students[0].prepaid, 8, "old balance remains unchanged");
assert.equal(state.students[1].studentNumber, "K260010", "new number survives reload");
assert.equal(state.students[1].nextDate, "", "unassigned new records do not acquire a phantom lesson");

const emptyForm = { querySelectorAll: () => [] };
assert.throws(() => saveStudentProfile({ name: "測試", ageGroup: "6 - 11", gender: "女", whatsapp: "91234567", recordDate: "31/12/2026", enrollmentStatus: "待確認，未付款" }, emptyForm), /日期格式錯誤/, "invalid dates cannot save a student");
saveStudentProfile({ id: "legacy", name: "舊學生", enrollmentStatus: "已付款", recordDate: "2026-10-30", prepaid: "8", remaining: "4", nextDate: "2026-10-30" }, emptyForm);
assert.equal(state.students[0].enrollmentStatus, "legacy", "editing incomplete legacy profile does not force an ID");
assert.equal(state.students[0].remaining, 4, "editing incomplete legacy profile preserves balance");
assert.equal(state.students[0].nextDate, "2026-10-30", "editing incomplete legacy profile preserves schedule");
saveStudentProfile({ name: "候補學生", ageGroup: "6 - 11", gender: "女", whatsapp: "91234567", recordDate: "2026-10-30", enrollmentYear: "2026", enrollmentStatus: "待確認，未付款", birthDate: "2018-09-03", birthMonth: "9", birthYear: "2018" }, emptyForm);
const pending = state.students.at(-1);
assert.equal(pending.studentNumber, "", "pending student has no ID");
assert.equal(pending.remaining, 0, "new student is not credited with lessons");
assert.equal(pending.birthDate, "2018-09-03", "selected birth date is stored without breaking legacy birth month and year fields");
state.peopleFilter = "pending";
assert.match(renderPeople(), /候補學生[\s\S]*91234567[\s\S]*6 - 11[\s\S]*修改學生資訊[\s\S]*刪除/, "pending list exposes contact, age and follow-up actions");
saveStudentProfile({ id: pending.id, name: pending.name, ageGroup: pending.ageGroup, gender: pending.gender, whatsapp: pending.whatsapp, recordDate: pending.recordDate, enrollmentYear: "2026", enrollmentStatus: "已付款" }, emptyForm);
assert.equal(pending.studentNumber, "K260013", "payment confirmation allocates the next unused child number");
assert.doesNotMatch(renderPeople(), /候補學生/, "paid student leaves the pending list");
assert.equal(JSON.parse(saved.get("swim-class-suite.v2")).studentNumberCounters.K26, 13, "allocated number is persisted");
state.students = state.students.filter((item) => item.id !== pending.id);
assert.equal(nextStudentNumber(2026, "6 - 11").value, "K260014", "deleted numbers are never reused");
state.suite.studentNumberCounters.K26 = 9999;
assert.throws(() => nextStudentNumber(2026, "6 - 11"), /已用完/, "yearly sequence stops at 9999");

const studentForm = node("#dynamic-form");
studentForm.elements = { ageGroup: { value: "" } };
studentForm.querySelectorAll = () => [];
await listeners.get("click")({ target: { closest: () => ({ dataset: { action: "student-add-course" } }) } });
assert.match(node("#student-course-list").innerHTML, /student-course-card/, "add button creates a course row before age selection");
assert.equal(node("#student-add-course").disabled, false, "add button stays available until four course rows exist");

console.log("Student profile tests passed: fiscal years, unique IDs, age groups and legacy storage.");
