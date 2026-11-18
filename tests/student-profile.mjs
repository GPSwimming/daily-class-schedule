import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { catalog } from "./catalog-fixture.mjs";

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
const classList = () => {
  const values = new Set();
  return { add(value) { values.add(value); }, remove(value) { values.delete(value); }, toggle(value, force) {
    if (force === false || (force === undefined && values.has(value))) values.delete(value);
    else values.add(value);
  }, contains(value) { return values.has(value); } };
};
const nodes = new Map();
const listeners = new Map();
const windowListeners = new Map();
let expireSession;
let loginAttempts = 0;
const node = (selector) => {
  if (!nodes.has(selector)) nodes.set(selector, { innerHTML: "", textContent: "", hidden: false, classList: classList(), addEventListener(name, callback) { this[`on${name}`] = callback; }, setAttribute() {} });
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
  window: { scrollTo() {}, addEventListener: (name, callback) => windowListeners.set(name, callback),
    LoginUI: { setLoginBusy: (busy) => { node("#admin-login-submit").disabled = busy; } },
    AdminAuth: { signIn: async () => { loginAttempts += 1; }, signOut: async () => {}, check: async () => true, getCatalog: async () => catalog, setOnExpired(callback) { expireSession = callback; } } },
  setTimeout: () => 1, clearTimeout() {}, console
};
vm.runInNewContext(locationSource, context);
vm.runInNewContext(courseSource, context);
const instrumented = appSource.replace(/\n\}\)\(\);\s*$/, "\n  globalThis.studentTest = { fiscalYear, studentJoiningYears, latestEnrolledCourseForStudent, studentMobileCardHtml, isMinorAge, nextStudentNumber, studentAgeGroups, studentCoursesForAge, studentRecordDateYmd, formatStudentRecordDate, studentFormHtml, studentEnrollmentHtml, studentLocationPickerHtml, renderStudentYears, prepareStudentImport, saveStudentProfile, syncStudentDatePicker, lessonsForDate, renderPeople, state };\n})();");
vm.runInNewContext(instrumented, context);
node("#admin-login-form").elements = { email: { value: "admin@example.com" }, password: { value: "test-only" } };
await node("#admin-login-form").onsubmit({ preventDefault() {} });
const { fiscalYear, studentJoiningYears, latestEnrolledCourseForStudent, studentMobileCardHtml, isMinorAge, nextStudentNumber, studentAgeGroups, studentCoursesForAge, studentRecordDateYmd, formatStudentRecordDate, studentFormHtml, studentEnrollmentHtml, studentLocationPickerHtml, renderStudentYears, prepareStudentImport, saveStudentProfile, syncStudentDatePicker, lessonsForDate, renderPeople, state } = context.studentTest;

assert.equal(fiscalYear("2026-03-31"), 2025);
assert.equal(fiscalYear("2026-04-01"), 2026);
assert.equal(fiscalYear("2027-03-31"), 2026);
assert.equal(fiscalYear("2027-04-01"), 2027);
assert.deepEqual([...studentJoiningYears("2023-04-01")], [2023, 2022, 2021, 2020]);
assert.deepEqual([...studentJoiningYears("2024-03-31")], [2023, 2022, 2021, 2020]);
assert.deepEqual([...studentJoiningYears("2026-04-01")], [2026, 2025, 2024, 2023]);
assert.deepEqual([...studentJoiningYears("2027-03-31")], [2026, 2025, 2024, 2023]);
assert.equal(studentRecordDateYmd("03-Dec-2026"), "2026-12-03", "typed student date uses day-month-year order");
assert.equal(studentRecordDateYmd("31/12/2026"), "", "slash-separated dates are rejected");
assert.equal(studentRecordDateYmd("31-Feb-2026"), "", "impossible dates are rejected");
assert.equal(formatStudentRecordDate("2026-12-03"), "03-Dec-2026", "stored ISO dates display in the requested format");
assert.equal(isMinorAge("12 - 17"), true);
assert.equal(isMinorAge("18 - 29"), false);
assert.equal(nextStudentNumber(2026, "6 - 11").value, "K260013", "counter prevents reusing deleted numbers");
assert.equal(nextStudentNumber(2025, "18 - 29").value, "A250009", "adult sequence is separate");
const pinky = { id: "pinky", name: "Pinky", enrollments: [
  { courseName: "感統改良課程", firstDate: "2026-11-01" },
  { courseName: "進階游泳課程", firstDate: "2026-12-01" }
] };
assert.equal(latestEnrolledCourseForStudent(pinky).name, "進階游泳課程", "latest starting enrollment supplies the student summary");
assert.match(studentMobileCardHtml(pinky), /<h2>Pinky<\/h2><p>進階游泳課程<\/p>/, "mobile student card shows the latest course");
const yearForm = { elements: { id: { value: "" }, recordDate: { value: "16-Nov-2026" } } };
renderStudentYears(yearForm, 2025);
assert.match(node("#student-year-choices").innerHTML, /name="enrollmentYear" value="2025" checked/, "2025 stays selected in the student form");
yearForm.elements.recordDate.value = "16-Nov-2027";
renderStudentYears(yearForm, 2025);
assert.match(node("#student-year-choices").innerHTML, /name="enrollmentYear" value="2027"/, "the first joining-year choice follows the record date's fiscal year");
assert.match(node("#student-year-choices").innerHTML, /name="enrollmentYear" value="2025" checked/, "a selected year remains selected when still in the four-year window");
yearForm.elements.recordDate.value = "16-Nov-2023";
renderStudentYears(yearForm, 2025);
assert.match(node("#student-year-choices").innerHTML, /name="enrollmentYear" value="2023" checked/, "the first year is selected when the previous year falls outside the window");
assert.match(node("#student-year-choices").innerHTML, /name="enrollmentYear" value="2020"/, "the four choices extend back three years");
const importedYear = prepareStudentImport([{ rowNumber: 2, values: ["年份測試", "6 - 11", "", "", "女", "已付款", "16-11-26", "2025", "課程甲", "1:1", "", "85200000001", "", "", "", ""] }]);
assert.equal(importedYear.errors.length, 0, "joining year does not depend on the record date");
assert.equal(importedYear.students[0].enrollmentYear, 2025, "Excel joining year maps to the student profile");
assert.match(importedYear.students[0].studentNumber, /^K25/, "Excel joining year determines the student number");
const invalidYear = prepareStudentImport([{ rowNumber: 2, values: ["年份測試", "6 - 11", "", "", "女", "已付款", "16-11-26", "2022", "課程甲", "1:1", "", "85200000001", "", "", "", ""] }]);
assert.match(invalidYear.errors.join(" "), /學生加入年份須為 2026、2025、2024 或 2023/, "only the four listed years are accepted");
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
assert.match(studentLocationPickerHtml("", []), /name="roomId" value="other-pool"[^>]*><span>其他<\/span>/, "Other stays available even when no pools are configured");
assert.match(studentFormHtml({ roomId: "other-pool", roomName: "私人泳池" }), /id="student-other-pool-field"[^>]*><label class="student-floating is-filled"><input name="otherPoolName"[^>]*value="私人泳池"[\s\S]*?<span>其他泳池 \(請註明\)<\/span>/, "editing restores the custom pool in the shared floating field");
const oldBirthDateForm = studentFormHtml({ ageGroup: "6 - 11", birthDate: "2018-09-03" });
assert.match(oldBirthDateForm, /name="birthMonth"[\s\S]*?<option value="9" selected>9 月<\/option>/, "old birth date populates the month select");
assert.match(oldBirthDateForm, /name="birthYear"[\s\S]*?<option value="2018" selected>2018<\/option>/, "old birth date populates the year select");
assert.match(studentFormHtml(null), /<label class="student-record-date-calendar"[^>]*>[\s\S]*?<input id="student-record-date-picker" type="date"/, "today date icon directly contains the native date input for mobile tapping");
assert.doesNotMatch(studentFormHtml({ recordDate: "2026-11-17" }), /id="student-record-date-picker" type="date" value=/, "editing gives the native today picker an empty reset default");
assert.doesNotMatch(studentFormHtml(null), /課堂排程、導師與堂數|student-legacy-fields/, "new student form omits the retired scheduling section");
assert.match(studentFormHtml(null), /studentLocationPickerHtml|student-location-field[\s\S]*?電郵（稍後登入用）[\s\S]*?name="email" type="email"/, "student email appears below the lesson location");
assert.match(studentFormHtml(null), /密碼（接駁 Supabase 後設定）[\s\S]*?type="password"[^>]*disabled/, "student password cannot be entered before Supabase is connected");
assert.doesNotMatch(studentFormHtml(null), /name="password"/, "student password is not submitted or stored");
assert.doesNotMatch(studentFormHtml(null), /data-action="student-record-date-calendar"/, "today date no longer relies on a scripted click of a hidden picker");
const enrollmentHtml = studentEnrollmentHtml({ firstDate: "2026-11-02", discount: 0 }, 0, "6 - 11");
assert.match(enrollmentHtml, /class="student-floating student-date-field is-filled"[\s\S]*?value="02\/11\/2026"[\s\S]*?placeholder="DD\/MM\/YYYY"/, "first lesson date keeps its day/month/year display and floating label");
assert.match(enrollmentHtml, /<label class="student-date-calendar"[^>]*><svg[\s\S]*?<input data-course-date type="date"[^>]*><\/label><span>首堂日期<\/span>/, "first lesson calendar icon and native picker share one date box");
assert.doesNotMatch(enrollmentHtml, /data-course-date type="date" value=/, "editing gives the first lesson picker an empty reset default");
assert.match(enrollmentHtml, /class="student-first-lesson-row"[\s\S]*?data-course-date type="date"[\s\S]*?data-action="student-add-lesson" data-index="0">新增課堂<\/button>/, "each first lesson date has an adjacent quick add button");
const firstLessonPicker = { value: "2026-11-02" };
const quickAddButton = { dataset: { action: "student-add-lesson" }, closest: (selector) => selector === ".student-course-card" ? { querySelector: () => firstLessonPicker } : null };
node("#form-fields").innerHTML = "unsaved student fields";
node("#form-dialog").open = true;
node("#quick-lesson-dialog").showModal = function () { this.open = true; };
await listeners.get("click")({ target: { closest: (selector) => selector === "button" ? quickAddButton : null } });
assert.equal(node("#quick-lesson-date").value, "02-Nov-2026", "quick add inherits this course's first lesson date");
assert.equal(node("#quick-lesson-start").value, "09:00", "quick add begins at 09:00");
assert.equal(node("#quick-lesson-end").value, "10:00", "quick add ends at 10:00");
assert.equal(node("#form-fields").innerHTML, "unsaved student fields", "opening quick add preserves the student form draft");
node("#quick-lesson-dialog").open = false;

const dateForm = node("#dynamic-form");
const recordDateText = { value: "17-Nov-2026", setCustomValidity(message) { this.validationMessage = message; }, closest: () => ({ classList: classList() }) };
dateForm.elements = { id: { value: "" }, recordDate: recordDateText, ageGroup: { value: "6 - 11" }, birthMonth: { value: "" }, birthYear: { value: "" },
  guardianName: { closest: () => ({ querySelector: () => ({ textContent: "" }) }) }, enrollmentStatus: { value: "已付款" } };
dateForm.dataset = { recordDateYmd: "2026-11-17" };
dateForm.contains = () => true;
dateForm.querySelectorAll = () => [];
dateForm.querySelector = () => null;
node("#student-age-preview").parentElement = { classList: classList() };
node("#form-dialog").open = true;
node("#form-dialog").classList.add("student-dialog");
const todayPicker = node("#student-record-date-picker");
todayPicker.id = "student-record-date-picker";
todayPicker.value = "";
listeners.get("input")({ target: todayPicker });
assert.equal(recordDateText.value, "", "native today reset clears the edit form display on input");
assert.equal(todayPicker.value, "", "native today reset does not restore the saved date");
todayPicker.value = "2026-11-18";
listeners.get("change")({ target: todayPicker });
assert.equal(recordDateText.value, "18-Nov-2026", "a new today date can be chosen after reset");
const firstDateDisplay = { value: "13/07/2026" };
const firstDateField = { classList: classList(), querySelector: () => firstDateDisplay };
const firstDatePicker = { value: "", matches: (selector) => selector === "[data-course-date]", closest: () => firstDateField };
listeners.get("input")({ target: firstDatePicker });
assert.equal(firstDateDisplay.value, "", "native first lesson reset clears the edit form display on input");
firstDatePicker.value = "2026-07-20";
listeners.get("change")({ target: firstDatePicker });
assert.equal(firstDateDisplay.value, "20/07/2026", "a new first lesson date can be chosen after reset");
node("#form-dialog").open = false;
node("#form-dialog").classList.remove("student-dialog");
const childCourseNames = [...new Set(studentCoursesForAge("2.5 - 5").map((item) => item.name))];
assert.deepEqual(childCourseNames, ["課程甲", "課程乙", "課程丙", "課程丁", "課程戊"], "youngest student group can select all five child courses");
assert.equal(new Set(studentCoursesForAge("6 - 11").map((item) => item.name)).size, 5, "six to eleven group keeps all five courses");
assert.equal(new Set(studentCoursesForAge("12 - 17").map((item) => item.name)).size, 5, "twelve to seventeen group keeps all five courses");
const highCourseHtml = studentEnrollmentHtml({ courseName: "課程丙", classSize: "小組", discount: "" }, 0, "2.5 - 5");
assert.match(highCourseHtml, /value="200" readonly/, "the 4–5 course setting supplies the existing price");
assert.match(highCourseHtml, /按課程設定「4 - 5」組合計算/, "the form explains the pricing group");
assert.equal(state.students[0].enrollmentStatus, "legacy", "old records remain distinguishable and are not auto-numbered");
assert.equal(state.students[0].enrollmentYear, null, "missing legacy year stays empty");
assert.equal(state.students[0].prepaid, 8, "old balance remains unchanged");
assert.equal(state.students[1].studentNumber, "K260010", "new number survives reload");
assert.equal(state.students[1].nextDate, "", "unassigned new records do not acquire a phantom lesson");
assert.equal(state.students[0].email, "", "legacy students load without an email field");

const emptyForm = { querySelectorAll: () => [] };
assert.throws(() => saveStudentProfile({ name: "測試", ageGroup: "6 - 11", gender: "女", whatsapp: "91234567", recordDate: "31/12/2026", enrollmentStatus: "待確認，未付款" }, emptyForm), /日期格式錯誤/, "invalid dates cannot save a student");
state.students[0].tutorId = "tutor-1";
state.students[0].weekday = 3;
state.students[0].time = "17:30";
saveStudentProfile({ id: "legacy", name: "舊學生", enrollmentStatus: "已付款", recordDate: "2026-10-30", prepaid: "8", remaining: "4", nextDate: "2026-10-30" }, emptyForm);
assert.equal(state.students[0].enrollmentStatus, "legacy", "editing incomplete legacy profile does not force an ID");
assert.equal(state.students[0].remaining, 4, "editing incomplete legacy profile preserves balance");
assert.equal(state.students[0].nextDate, "2026-10-30", "editing incomplete legacy profile preserves schedule");
assert.equal(state.students[0].tutorId, "tutor-1", "editing student preserves the assigned tutor after removing legacy fields");
assert.equal(state.students[0].weekday, 3, "editing student preserves the old lesson weekday");
assert.equal(state.students[0].time, "17:30", "editing student preserves the old lesson time");
saveStudentProfile({ name: "候補學生", ageGroup: "6 - 11", gender: "女", whatsapp: "91234567", email: " learner@example.com ", recordDate: "2026-10-30", enrollmentYear: "2026", enrollmentStatus: "待確認，未付款", birthMonth: "9", birthYear: "2018" }, emptyForm);
const pending = state.students.at(-1);
assert.equal(pending.email, "learner@example.com", "student email is stored without surrounding spaces");
assert.match(studentFormHtml(pending), /name="email" type="email"[^>]*value="learner@example.com"/, "student email appears when editing");
assert.equal(pending.studentNumber, "", "pending student has no ID");
assert.equal(pending.remaining, 0, "new student is not credited with lessons");
assert.equal(pending.birthMonth, "9", "selected birth month is stored");
assert.equal(pending.birthYear, "2018", "selected birth year is stored");
state.peopleFilter = "pending";
assert.match(renderPeople(), /候補學生[\s\S]*91234567[\s\S]*6 - 11[\s\S]*修改學生資訊[\s\S]*刪除/, "pending list exposes contact, age and follow-up actions");
saveStudentProfile({ id: pending.id, name: pending.name, ageGroup: pending.ageGroup, gender: pending.gender, whatsapp: pending.whatsapp, email: pending.email, recordDate: pending.recordDate, enrollmentYear: "2026", enrollmentStatus: "已付款" }, emptyForm);
assert.equal(pending.studentNumber, "K260013", "payment confirmation allocates the next unused child number");
assert.equal(JSON.parse(saved.get("swim-class-balance.v1")).find((item) => item.id === pending.id).email, "learner@example.com", "student email survives a save and reload");
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
  "[data-course-name]": { value: "課程丙" }, "[data-course-size]": { value: "小組" },
  "[data-course-date]": { value: "" }, "[data-course-discount]": { value: "" },
  'input[readonly][type="number"]': { value: "200" }
})[selector] };
saveStudentProfile({ name: "幼兒組課程測試", ageGroup: "2.5 - 5", gender: "女", whatsapp: "91234567", recordDate: "2026-11-05", enrollmentStatus: "待確認，未付款" },
  { querySelectorAll: (selector) => selector === ".student-course-card" ? [courseCard] : [] });
const savedChildCourse = state.students.at(-1).enrollments[0];
assert.equal(savedChildCourse.courseName, "課程丙", "selected child course is saved");
assert.equal(savedChildCourse.ageGroup, "2.5 - 5", "student age group is preserved");
assert.equal(savedChildCourse.pricingAgeGroup, "4 - 5", "pricing source remains traceable");
assert.equal(savedChildCourse.originalFee, 200, "saved fee comes from course settings");
const datedCourseCard = { ...courseCard, querySelector: (selector) => ({
  "[data-course-name]": { value: "課程丙" }, "[data-course-size]": { value: "小組" },
  "[data-course-date]": { value: "2027-04-10" }, "[data-course-discount]": { value: "" },
  'input[readonly][type="number"]': { value: "200" }
})[selector] };
const datedCourseForm = { querySelectorAll: (selector) => selector === ".student-course-card" ? [datedCourseCard] : [] };
const datedStudentData = { name: "首堂日期測試", ageGroup: "2.5 - 5", gender: "女", whatsapp: "91234567", recordDate: "2027-04-02", enrollmentStatus: "已付款" };
saveStudentProfile(datedStudentData, datedCourseForm);
const datedStudent = state.students.at(-1);
assert.equal(datedStudent.enrollments[0].firstDate, "2027-04-10", "first lesson date stays in the enrollment");
assert.equal(datedStudent.nextDate, "", "saving a first lesson date does not schedule a class at the default 18:00 time");
assert.equal(lessonsForDate("2027-04-10").some((lesson) => lesson.student?.id === datedStudent.id), false, "the timetable has no class until a time is assigned");
datedStudent.nextDate = "2027-04-10";
datedStudent.nextTime = "18:00";
assert.equal(lessonsForDate("2027-04-10").some((lesson) => lesson.student?.id === datedStudent.id), false, "an older automatically copied first date is not displayed as an 18:00 class");
assert.match(studentMobileCardHtml(datedStudent), /未編排課堂/, "an older copied first date appears as unscheduled in the student profile");
saveStudentProfile({ ...datedStudentData, id: datedStudent.id }, datedCourseForm);
assert.equal(datedStudent.nextDate, "", "editing an enrolled student clears an inferred automatic date but retains the enrollment first date");
datedStudent.nextDate = "2027-04-10";
datedStudent.history.push({ type: "rescheduled", newDate: "2027-04-10" });
assert.equal(lessonsForDate("2027-04-10").some((lesson) => lesson.student?.id === datedStudent.id), true, "a deliberately scheduled lesson on the first date remains visible");
state.students = state.students.filter((student) => student.id !== datedStudent.id);

assert.throws(() => saveStudentProfile({ name: "未填泳池", ageGroup: "6 - 11", gender: "女", whatsapp: "91234567", recordDate: "2026-11-05", enrollmentStatus: "待確認，未付款", roomId: "other-pool", otherPoolName: "  " }, emptyForm), /請註明其他泳池名稱/, "Other needs a named pool");
saveStudentProfile({ name: "自訂泳池學員", ageGroup: "6 - 11", gender: "女", whatsapp: "91234567", recordDate: "2026-11-05", enrollmentStatus: "待確認，未付款", roomId: "other-pool", otherPoolName: "  私人泳池  " }, emptyForm);
const customPoolStudent = state.students.at(-1);
assert.equal(customPoolStudent.roomId, "other-pool", "custom location stores a stable option ID");
assert.equal(customPoolStudent.roomName, "私人泳池", "custom location stores the typed name");
assert.match(studentFormHtml(customPoolStudent), /name="roomId" value="other-pool" checked/, "the fixed option remains selected when editing");
assert.equal(JSON.parse(saved.get("swim-class-balance.v1")).at(-1).roomName, "私人泳池", "custom pool survives browser storage");
saveStudentProfile({ id: customPoolStudent.id, name: customPoolStudent.name, ageGroup: customPoolStudent.ageGroup, gender: customPoolStudent.gender, whatsapp: customPoolStudent.whatsapp, recordDate: customPoolStudent.recordDate, enrollmentStatus: "待確認，未付款", roomId: "other-pool", otherPoolName: "另一個泳池" }, emptyForm);
assert.equal(customPoolStudent.roomName, "另一個泳池", "editing changes only this student's custom pool name");

context.window.matchMedia = () => ({ matches: true });
document.visibilityState = "hidden";
await listeners.get("visibilitychange")();
assert.equal(state.loggedIn, true, "briefly backgrounding the mobile browser preserves an unexpired login");
document.visibilityState = "visible";
await listeners.get("visibilitychange")();
assert.equal(state.loggedIn, true, "returning to the browser checks and keeps a valid login");
node("#auth-consent").checked = true;
node("#admin-login-form").elements.password.type = "text";
await listeners.get("click")({ target: { closest: () => ({ dataset: { action: "logout" } }) } });
assert.equal(state.loggedIn, false, "manual logout returns to the login page");
assert.equal(node("#admin-login-submit").disabled, false, "manual logout restores the login button");
assert.equal(node("#admin-login-form").elements.email.value, "", "manual logout clears the old email");
assert.equal(node("#admin-login-form").elements.password.type, "password", "manual logout hides the password again");
assert.equal(node("#auth-consent").checked, false, "manual logout resets privacy consent");
node("#admin-login-form").elements.email.value = "admin@example.com";
node("#admin-login-form").elements.password.value = "test-again";
await node("#admin-login-form").onsubmit({ preventDefault() {} });
assert.equal(state.loggedIn, true, "login works again without reloading after manual logout");
windowListeners.get("pagehide")();
assert.equal(state.loggedIn, false, "closing the mobile page ends its session");
assert.match(node("#admin-login-error").textContent, /重新登入/, "closing the page asks for a fresh login");
assert.equal(node("#admin-login-submit").disabled, false, "logout resets the login button");
assert.equal(node("#admin-login-form").elements.password.value, "", "logout clears the previous password");
assert.equal(node("#admin-login-form").hidden, false, "logout shows the login form");
node("#admin-login-form").elements.email.value = "admin@example.com";
node("#admin-login-form").elements.password.value = "test-again";
await node("#admin-login-form").onsubmit({ preventDefault() {} });
assert.equal(state.loggedIn, true, "login works again without reloading after mobile logout");
expireSession();
assert.equal(state.loggedIn, false, "the one-hour expiry still ends the session");
assert.equal(node("#admin-login-submit").disabled, false, "expiry resets the login button");
node("#admin-login-form").elements.email.value = "admin@example.com";
node("#admin-login-form").elements.password.value = "test-after-expiry";
await node("#admin-login-form").onsubmit({ preventDefault() {} });
assert.equal(state.loggedIn, true, "login works again without reloading after expiry");
assert.equal(loginAttempts, 4, "all four login submissions reached the authentication service");

console.log("Student profile tests passed: fiscal years, unique IDs, age groups and legacy storage.");
