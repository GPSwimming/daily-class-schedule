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
const instrumented = appSource.replace(/\n\}\)\(\);\s*$/, "\n  globalThis.studentTest = { fiscalYear, isMinorAge, nextStudentNumber, studentAgeGroups, studentCoursesForAge, studentRecordDateYmd, formatStudentRecordDate, studentFormHtml, studentEnrollmentHtml, studentLocationPickerHtml, saveStudentProfile, renderPeople, state };\n})();");
vm.runInNewContext(instrumented, context);
const { fiscalYear, isMinorAge, nextStudentNumber, studentAgeGroups, studentCoursesForAge, studentRecordDateYmd, formatStudentRecordDate, studentFormHtml, studentEnrollmentHtml, studentLocationPickerHtml, saveStudentProfile, renderPeople, state } = context.studentTest;

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
assert.match(studentFormHtml(null), /name="birthMonth"/, "birth month has its own select field");
assert.match(studentFormHtml(null), /name="birthYear"/, "birth year has its own select field");
assert.doesNotMatch(studentFormHtml(null), /name="birthDate"/, "new student form no longer shows the date picker");
assert.match(studentFormHtml(null), /<span>出生月份<\/span>/, "birth month floating label is concise");
assert.match(studentFormHtml(null), /<span>出生年份<\/span>/, "birth year floating label is concise");
assert.match(studentFormHtml(null), /student-dropdown-arrow/, "student selects use the shared arrow icon");
const unselectedLocation = studentLocationPickerHtml("", [{ value: "pool:1", label: "堅尼地城游泳池" }]);
assert.match(unselectedLocation, /class="student-floating student-location-field"/, "unselected lesson location uses the shared floating field");
assert.match(unselectedLocation, /<span id="student-location-label"><\/span>[\s\S]*?<span id="student-location-floating">課堂地點<\/span>/, "location hint sits inside the box and leaves it empty after focus");
assert.doesNotMatch(unselectedLocation, /<legend>|請選擇課堂泳池/, "location has no separate heading or extra placeholder");
assert.match(studentLocationPickerHtml("pool:1", [{ value: "pool:1", label: "堅尼地城游泳池" }]), /class="student-floating student-location-field is-filled"[\s\S]*?<span id="student-location-label">堅尼地城游泳池<\/span>/, "a selected pool keeps the floating label and value");
const oldBirthDateForm = studentFormHtml({ ageGroup: "6 - 11", birthDate: "2018-09-03" });
assert.match(oldBirthDateForm, /name="birthMonth"[\s\S]*?<option value="9" selected>9 月<\/option>/, "old birth date populates the month select");
assert.match(oldBirthDateForm, /name="birthYear"[\s\S]*?<option value="2018" selected>2018<\/option>/, "old birth date populates the year select");
assert.match(studentFormHtml(null), /<label class="student-record-date-calendar"[^>]*>[\s\S]*?<input id="student-record-date-picker" type="date"/, "today date icon directly contains the native date input for mobile tapping");
assert.doesNotMatch(studentFormHtml(null), /data-action="student-record-date-calendar"/, "today date no longer relies on a scripted click of a hidden picker");
const enrollmentHtml = studentEnrollmentHtml({ firstDate: "2026-11-02", discount: 0 }, 0, "6 - 11");
assert.match(enrollmentHtml, /class="student-floating student-date-field is-filled"[\s\S]*?value="02\/11\/2026"[\s\S]*?placeholder="DD\/MM\/YYYY"/, "first lesson date keeps its day/month/year display and floating label");
assert.match(enrollmentHtml, /<label class="student-date-calendar"[^>]*><svg[\s\S]*?<input data-course-date type="date"[^>]*><\/label><span>首堂日期<\/span>/, "first lesson calendar icon and native picker share one date box");
const childCourseNames = [...new Set(studentCoursesForAge("2.5 - 5").map((item) => item.name))];
assert.deepEqual(childCourseNames, ["感統改良課程", "進階游泳課程", "高階游泳課程", "游泳隊預備班", "游泳隊"], "youngest student group can select all five child courses");
assert.equal(new Set(studentCoursesForAge("6 - 11").map((item) => item.name)).size, 5, "six to eleven group keeps all five courses");
assert.equal(new Set(studentCoursesForAge("12 - 17").map((item) => item.name)).size, 5, "twelve to seventeen group keeps all five courses");
const highCourseHtml = studentEnrollmentHtml({ courseName: "高階游泳課程", classSize: "小組", discount: "" }, 0, "2.5 - 5");
assert.match(highCourseHtml, /value="200" readonly/, "the 4–5 course setting supplies the existing price");
assert.match(highCourseHtml, /按課程設定「4 - 5」組合計算/, "the form explains the pricing group");
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
saveStudentProfile({ name: "候補學生", ageGroup: "6 - 11", gender: "女", whatsapp: "91234567", recordDate: "2026-10-30", enrollmentYear: "2026", enrollmentStatus: "待確認，未付款", birthMonth: "9", birthYear: "2018" }, emptyForm);
const pending = state.students.at(-1);
assert.equal(pending.studentNumber, "", "pending student has no ID");
assert.equal(pending.remaining, 0, "new student is not credited with lessons");
assert.equal(pending.birthMonth, "9", "selected birth month is stored");
assert.equal(pending.birthYear, "2018", "selected birth year is stored");
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

const courseCard = { dataset: { enrollmentId: "", ageGroup: "2.5 - 5", duration: "60" }, querySelector: (selector) => ({
  "[data-course-name]": { value: "高階游泳課程" }, "[data-course-size]": { value: "小組" },
  "[data-course-date]": { value: "" }, "[data-course-discount]": { value: "" },
  'input[readonly][type="number"]': { value: "200" }
})[selector] };
saveStudentProfile({ name: "幼兒組課程測試", ageGroup: "2.5 - 5", gender: "女", whatsapp: "91234567", recordDate: "2026-11-05", enrollmentStatus: "待確認，未付款" },
  { querySelectorAll: (selector) => selector === ".student-course-card" ? [courseCard] : [] });
const savedChildCourse = state.students.at(-1).enrollments[0];
assert.equal(savedChildCourse.courseName, "高階游泳課程", "selected child course is saved");
assert.equal(savedChildCourse.ageGroup, "2.5 - 5", "student age group is preserved");
assert.equal(savedChildCourse.pricingAgeGroup, "4 - 5", "pricing source remains traceable");
assert.equal(savedChildCourse.originalFee, 200, "saved fee comes from course settings");

console.log("Student profile tests passed: fiscal years, unique IDs, age groups and legacy storage.");
