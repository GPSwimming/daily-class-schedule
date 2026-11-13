import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const source = await readFile(new URL("dist/student-import.js", root), "utf8");
const context = { window: {}, TextDecoder, DataView, Uint8Array, Blob, Response, DecompressionStream, String, Number };
vm.runInNewContext(source, context, { filename: "dist/student-import.js" });
const importer = context.window.SwimStudentImport;
assert.equal(importer.TEMPLATE_VERSION, "STUDENT_IMPORT_V2_16_COLUMNS");
assert.equal(importer.HEADERS.length, 16);

const csv = importer.HEADERS.join(",") + "\r\n\"陳, 明\",6 - 11,11 月,2017,男,已付款,14-11-26,2026,進階游泳課程,1:1,陳太,+85291234567,太子,九龍公園游泳池,test@example.com,\r\n";
const records = await importer.parse({ name: "students.csv", size: csv.length, text: async () => csv });
assert.equal(records.length, 1);
assert.equal(records[0].values[0], "陳, 明");
assert.equal(records[0].values[15], "");

const bytes = await readFile(new URL("dist/students-import-template.xlsx", root));
const template = await importer.parse({ name: "template.xlsx", size: bytes.length, arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) });
assert.equal(template.length, 0, "blank template has no student records");

const oldHeaders = ["學生姓名", "課程", "負責導師", "每週上課日", "固定時間", "預繳堂數", "現時剩餘堂數", "下一堂日期", "課室／泳線"];
const oldCsv = oldHeaders.join(",") + "\r\n陳明,兒童游泳初階,,,,,,,\r\n";
await assert.rejects(() => importer.parse({ name: "old.csv", size: oldCsv.length, text: async () => oldCsv }), /最新 16 欄 Excel 範本/);
await assert.rejects(() => importer.parse({ name: "bad.csv", size: 3, text: async () => "bad" }), /最新 16 欄 Excel 範本/);
console.log("Student import tests passed: v2 CSV, XLSX template, version and old-template rejection.");
