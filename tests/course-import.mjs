import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { catalog } from "./catalog-fixture.mjs";

const root = new URL("../", import.meta.url);
const [studentSource, courseSource] = await Promise.all([
  readFile(new URL("dist/student-import.js", root), "utf8"),
  readFile(new URL("dist/course-import.js", root), "utf8")
]);
const context = { window: {}, TextDecoder, DataView, Uint8Array, Blob, Response, DecompressionStream, String, Number };
vm.runInNewContext(studentSource, context);
vm.runInNewContext(courseSource, context);
const importer = context.window.SwimCourseImport;

assert.equal(importer.referenceRows.length, 0, "course catalog is absent from public JavaScript");
importer.setReferenceRows(catalog.courses);
assert.equal(importer.referenceRows.length, catalog.courses.length, "authenticated catalog can populate references");
const first = catalog.courses[0];
const second = catalog.courses[1];
const csv = importer.toCsv();
const parsed = await importer.parse({ name: "courses.csv", size: csv.length, text: async () => csv });
assert.equal(parsed.length, catalog.courses.length, "CSV template round trips after catalog load");
const plan = importer.plan([first, second], [{ id: "existing", ...first, fee: 650 }]);
assert.equal(plan.add, 1);
assert.equal(plan.update, 1);
assert.equal(plan.changes.find((item) => item.type === "update").id, "existing", "matching key preserves record identity");
assert.throws(() => importer.normalizeRows([importer.HEADERS, ["課程甲", "6 - 11", "1:1", "60", "$700"], ["課程甲", "6-11", "1:1", "60", "$700"]]), /組合重複/);
assert.throws(() => importer.normalizeRows([importer.HEADERS, ["課程甲", "6 - 11", "1:1", "錯誤", "$700"]]), /不是有效數字/);
assert.throws(() => importer.setReferenceRows([{ name: "壞資料" }]), /格式錯誤/);
console.log("Course import tests passed: protected catalog, CSV, validation and update planning.");
