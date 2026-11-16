import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { inflateRawSync } from "node:zlib";
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
function workbookXml(name) {
  const end = bytes.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  let offset = bytes.readUInt32LE(end + 16);
  for (let count = bytes.readUInt16LE(end + 10); count > 0; count -= 1) {
    const length = bytes.readUInt16LE(offset + 28);
    const extra = bytes.readUInt16LE(offset + 30);
    const comment = bytes.readUInt16LE(offset + 32);
    const entryName = bytes.toString("utf8", offset + 46, offset + 46 + length);
    if (entryName === name) {
      const local = bytes.readUInt32LE(offset + 42);
      const start = local + 30 + bytes.readUInt16LE(local + 26) + bytes.readUInt16LE(local + 28);
      const data = bytes.subarray(start, start + bytes.readUInt32LE(offset + 20));
      return (bytes.readUInt16LE(offset + 10) === 8 ? inflateRawSync(data) : data).toString("utf8");
    }
    offset += 46 + length + extra + comment;
  }
  throw new Error("Missing workbook entry: " + name);
}
const sheetXml = workbookXml("xl/worksheets/sheet1.xml");
const stylesXml = workbookXml("xl/styles.xml");
const styleList = [...stylesXml.match(/<x:cellXfs\b[^>]*>([\s\S]*?)<\/x:cellXfs>/)[1].matchAll(/<x:xf\b[^>]*>/g)].map((match) => match[0]);
const cellFormat = (reference) => {
  const style = Number(sheetXml.match(new RegExp('<x:c\\s+r="' + reference + '"\\s+s="(\\d+)"'))[1]);
  return Number(styleList[style].match(/numFmtId="(\d+)"/)[1]);
};
assert.equal(cellFormat("B2"), 201, "age dropdown cells are preformatted as text, avoiding Excel date conversion");
assert.equal(cellFormat("B251"), 201, "the last import row keeps the age text format");
assert.equal(cellFormat("G2"), 200, "record date cells retain a real dd-mm-yy date format");
assert.equal(cellFormat("H2"), 0, "joining year is an independent general-format value");
assert.match(sheetXml, /sqref="H2:H251"[\s\S]*?<x:formula1>"2026,2025,2024,2023"<\/x:formula1>/, "joining year offers the four requested choices");
assert.doesNotMatch(sheetXml, /<x:f\b/, "blank import cells contain no date or year formulas");
const template = await importer.parse({ name: "template.xlsx", size: bytes.length, arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) });
assert.equal(template.length, 0, "blank template has no student records");

const oldHeaders = ["學生姓名", "課程", "負責導師", "每週上課日", "固定時間", "預繳堂數", "現時剩餘堂數", "下一堂日期", "課室／泳線"];
const oldCsv = oldHeaders.join(",") + "\r\n陳明,兒童游泳初階,,,,,,,\r\n";
await assert.rejects(() => importer.parse({ name: "old.csv", size: oldCsv.length, text: async () => oldCsv }), /最新 16 欄 Excel 範本/);
await assert.rejects(() => importer.parse({ name: "bad.csv", size: 3, text: async () => "bad" }), /最新 16 欄 Excel 範本/);
console.log("Student import tests passed: v2 CSV, XLSX template, version and old-template rejection.");
