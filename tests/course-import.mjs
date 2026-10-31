import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const [studentSource, courseSource] = await Promise.all([
  readFile(new URL("dist/student-import.js", root), "utf8"),
  readFile(new URL("dist/course-import.js", root), "utf8")
]);
const context = { window: {}, TextDecoder, DataView, Uint8Array, Blob, Response, DecompressionStream, String, Number };
vm.runInNewContext(studentSource, context, { filename: "dist/student-import.js" });
vm.runInNewContext(courseSource, context, { filename: "dist/course-import.js" });
const importer = context.window.SwimCourseImport;

assert.equal(importer.referenceRows.length, 52, "Google source contains 52 combinations");
const example1 = importer.referenceRows.find((item) => item.name === "感統改良課程" && item.ageGroup === "6 - 11" && item.classSize === "1:1");
assert.equal(example1.duration, 60);
assert.equal(example1.fee, 700);
const example2 = importer.referenceRows.find((item) => item.name === "游泳隊" && item.ageGroup === "4 - 5" && item.classSize === "小組");
assert.equal(example2.duration, 120);
assert.equal(example2.fee, 160);
assert.equal(new Set(importer.referenceRows.map(importer.key)).size, 52, "source combinations are unique");

const csv = importer.toCsv();
const parsed = await importer.parse({ name: "courses.csv", size: csv.length, text: async () => csv });
assert.equal(parsed.length, 52, "CSV template round trips");
assert.equal(parsed.find((item) => importer.key(item) === importer.key(example2)).fee, 160);
const googleCsvRows = [
  ["課程名稱", "年齡組別", "課程人數", "課堂時間 \n(分鐘)", "原價 (HK$)\n(每位學生計算）"],
  ["游泳隊", "4 - 5", "小組", "120", "$160"]
];
assert.equal(importer.normalizeRows(googleCsvRows)[0].fee, 160, "original Google header and currency syntax import");
if (process.argv[2]) {
  const bytes = await readFile(process.argv[2]);
  const actualSheet = await importer.parse({ name: "source.xlsx", size: bytes.length, arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) });
  assert.equal(actualSheet.length, 52, "Google XLSX export imports all combinations");
  for (const row of actualSheet) {
    const reference = importer.referenceRows.find((item) => importer.key(item) === importer.key(row));
    assert.ok(reference, "exported combination exists in captured catalog");
    assert.equal(row.duration, reference.duration);
    assert.equal(row.fee, reference.fee);
  }
}

const plan = importer.plan([example1, example2], [{ id: "existing", ...example1, ageGroup: "6-11", fee: 650 }]);
assert.equal(plan.add, 1);
assert.equal(plan.update, 1);
assert.equal(plan.changes.find((item) => item.type === "update").id, "existing", "matching key preserves record identity");
assert.throws(() => importer.normalizeRows([importer.HEADERS, ["游泳隊", "4 - 5", "小組", "120", "$160"], ["游泳隊", "4-5", "小組", "120", "$160"]]), /組合重複/);
assert.throws(() => importer.normalizeRows([importer.HEADERS, ["游泳隊", "4 - 5", "小組", "錯誤", "$160"]]), /不是有效數字/);
assert.throws(() => importer.plan([example1], [{ id: "a", ...example1 }, { id: "b", ...example1 }]), /重複組合/);

console.log("Course import tests passed: 52 source rows, examples, CSV, validation and identity-safe update planning.");
