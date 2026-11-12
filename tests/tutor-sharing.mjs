import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const source = await readFile(new URL("../dist/app.js", import.meta.url), "utf8");
const accountsSource = source.match(/  function sharedTutorAccounts\(\) \{[\s\S]*?\n  \}/)?.[0];
const monthSource = source.match(/  function sharedTutorMonth\([\s\S]*?\n  \}/)?.[0];
const duplicateSource = source.match(/  function tutorDuplicateMatches\([\s\S]*?\n  \}/)?.[0];
assert.ok(accountsSource && monthSource && duplicateSource, "shared coach account helpers exist");

const accounts = [
  { id: "sensory", role: "tutor", name: "Alex 感統", email: " Alex@Example.com ", phone: "9123 4567" },
  { id: "advanced", role: "tutor", name: "Alex 進階", email: "alex@example.com", phone: "91234567" },
  { id: "adult", role: "tutor", name: "Alex 成人", email: "alex@example.com", phone: "91234567" },
  { id: "other", role: "tutor", name: "另一位", email: "other@example.com", phone: "9888 8888" }
];
const records = [
  { bookingId: "sensory-class", type: "completed", lessonDate: "2026-11-09", lessonTime: "15:00", tutorIds: ["sensory"], durationMinutes: 60 },
  { bookingId: "advanced-class", type: "completed", lessonDate: "2026-11-09", lessonTime: "15:00", tutorIds: ["advanced"], durationMinutes: 60 },
  { bookingId: "adult-class", type: "completed", lessonDate: "2026-11-09", lessonTime: "15:00", tutorIds: ["adult"], durationMinutes: 60 },
  { bookingId: "later-class", type: "completed", lessonDate: "2026-11-09", lessonTime: "16:00", tutorIds: ["sensory"], durationMinutes: 60 }
];
const state = { suite: { accounts, courses: [] }, students: [{ id: "student-a", history: records }, { id: "student-b", history: [records[0]] }] };
const context = vm.createContext({
  state, Map, Set,
  todayYmd: () => "2026-11-12",
  validTime: (text) => /^\d{2}:\d{2}$/.test(String(text || "")),
  timeMinutes: (text) => Number(text.slice(0, 2)) * 60 + Number(text.slice(3, 5)),
  findById: (rows, id) => rows.find((row) => row.id === id)
});
vm.runInContext(accountsSource + "\n" + monthSource + "\n" + duplicateSource, context);
const groups = vm.runInContext("sharedTutorAccounts()", context);
assert.equal(groups.length, 1, "email matching ignores case and surrounding spaces");
assert.equal(groups[0].tutors.length, 3, "three distinct tutor profiles share one login email");
const summary = vm.runInContext("sharedTutorMonth(sharedTutorAccounts()[0].tutors)", context);
assert.equal(summary.classes, 4, "separate simultaneous classes count separately while a multi-student booking counts once");
assert.equal(summary.hours, 2, "overlapping classes count as one actual clock hour");
assert.equal(summary.classesByTutor.get("sensory").size, 2);
assert.equal(vm.runInContext("tutorDuplicateMatches('phone', '9123-4567', null).length", context), 3, "phone formatting does not hide duplicates");
assert.equal(vm.runInContext("tutorDuplicateMatches('email', 'alex@example.com', { id: 'sensory' }).length", context), 2, "editing a profile excludes itself from duplicate matching");
console.log("Tutor sharing tests passed: duplicate contacts, shared identities, class counts and overlap-free hours.");
