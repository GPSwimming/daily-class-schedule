import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const source = await readFile(new URL("dist/student-import.js", root), "utf8");
const context = { window: {}, TextDecoder, DataView, Uint8Array, Blob, Response, DecompressionStream, String, Number };
vm.runInNewContext(source, context, { filename: "dist/student-import.js" });
const importer = context.window.SwimStudentImport;
assert.equal(importer.HEADERS.length, 9);

const csv = importer.HEADERS.join(",") + "\r\n\"陳, 明\",兒童游泳初階,,星期一,18:00,8,7,2026-10-21,\r\n";
const records = await importer.parse({ name: "students.csv", size: csv.length, text: async () => csv });
assert.equal(records.length, 1);
assert.equal(records[0].values[0], "陳, 明");

const bytes = await readFile(new URL("dist/students-import-template.xlsx", root));
const template = await importer.parse({ name: "template.xlsx", size: bytes.length, arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) });
assert.equal(template.length, 0, "blank template has no student records");

await assert.rejects(() => importer.parse({ name: "bad.csv", size: 3, text: async () => "bad" }), /欄位與範本不符/);
console.log("Student import tests passed: CSV, XLSX template and header validation.");
