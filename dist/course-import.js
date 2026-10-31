(() => {
  "use strict";

  // Source: 課程設定 - GP Classroom, 工作表1, A1:E53 (read 2026-10-22).
  const SOURCE_URL = "https://docs.google.com/spreadsheets/d/12sfH9psh9KkldqEybfH-0CMGNRi9ezLEgboA5eXZfhk/edit?usp=sharing";
  const HEADERS = ["課程名稱", "年齡組別", "課程人數", "課堂時間 (分鐘)", "原價 (HK$) (每位學生計算)"];
  const childAges = ["2.5 - 5", "6 - 11", "12 - 17"];
  const groupAges = ["4 - 5", "6 - 11", "12 - 17"];
  const adultAges = ["18-29", "30-39", "40-49", "50-59", "60-69"];
  const referenceRows = [];

  function addGroup(name, ages, sizes) {
    for (const [classSize, duration, fee] of sizes) {
      for (const ageGroup of ages) referenceRows.push({ name, ageGroup, classSize, duration, fee });
    }
  }
  addGroup("感統改良課程", childAges, [["1:1", 60, 700], ["1:2", 60, 400], ["1:3", 60, 300]]);
  addGroup("進階游泳課程", childAges, [["1:1", 60, 600], ["1:2", 60, 350], ["1:3-4", 60, 250]]);
  addGroup("高階游泳課程", groupAges, [["小組", 60, 200]]);
  addGroup("游泳隊預備班", groupAges, [["小組", 90, 160]]);
  addGroup("游泳隊", groupAges, [["小組", 120, 160]]);
  addGroup("成人初階(保證)游泳班", adultAges, [["1:1", 60, 700], ["1:2", 60, 450], ["1:3-4", 60, 300]]);
  addGroup("成人(技術改良)游泳班", adultAges, [["小組", 60, 250]]);
  addGroup("成人恆常訓練班", adultAges, [["小組", 60, 200]]);

  function key(item) {
    return [item.name, item.ageGroup, item.classSize].map((part) => String(part || "").trim().replace(/\s*[-–—]\s*/g, "-").replace(/\s+/g, " ").toLocaleLowerCase()).join("\u0001");
  }

  function parseNumber(value, label, rowNumber) {
    const clean = String(value ?? "").trim().replace(/^(?:HK\s*)?\$/i, "").replace(/,/g, "");
    const number = Number(clean);
    if (!clean || !Number.isFinite(number) || number < 0 || number > 99999) throw new Error("第 " + rowNumber + " 行的「" + label + "」不是有效數字。");
    return number;
  }

  function normalizeRows(rows) {
    if (!Array.isArray(rows) || !rows.length) throw new Error("課程表沒有資料。");
    const headers = rows[0].slice(0, 5).map((value) => String(value || "").replace(/\s+/g, "").replace(/[（）()]/g, "").toLocaleLowerCase());
    if (!headers[0].includes("課程名稱") || !headers[1].includes("年齡組別") || !headers[2].includes("課程人數") || !headers[3].includes("課堂時間") || !headers[3].includes("分鐘") || !headers[4].includes("原價")) {
      throw new Error("欄位與課程匯入範本不符，請保留首行五個欄位及次序。");
    }
    const records = [];
    const seen = new Set();
    for (let index = 1; index < rows.length; index += 1) {
      const cells = rows[index].slice(0, 5).map((value) => String(value ?? "").trim());
      if (!cells.some(Boolean)) continue;
      const rowNumber = index + 1;
      const [name, ageGroup, classSize] = cells;
      if (!name || !ageGroup || !classSize) throw new Error("第 " + rowNumber + " 行須填寫課程名稱、年齡組別及課程人數。");
      if (name.length > 80 || ageGroup.length > 24 || classSize.length > 24) throw new Error("第 " + rowNumber + " 行的文字過長。");
      if (!/^\d+(?:\.\d+)?\s*[-–—]\s*\d+(?:\.\d+)?$/.test(ageGroup)) throw new Error("第 " + rowNumber + " 行的年齡組別請用「6-11」格式。");
      const duration = parseNumber(cells[3], "課堂時間", rowNumber);
      const fee = parseNumber(cells[4], "原價", rowNumber);
      if (!Number.isInteger(duration) || duration < 15 || duration > 240) throw new Error("第 " + rowNumber + " 行的課堂時間須為 15 至 240 分鐘整數。");
      const record = { name, ageGroup, classSize, duration, fee };
      const recordKey = key(record);
      if (seen.has(recordKey)) throw new Error("第 " + rowNumber + " 行的課程名稱、年齡組別、課程人數組合重複。");
      seen.add(recordKey);
      records.push(record);
    }
    if (!records.length) throw new Error("課程表沒有可匯入的課程。");
    if (records.length > 500) throw new Error("每次最多匯入 500 組課程。");
    return records;
  }

  async function parse(file) {
    const rows = await window.SwimStudentImport.readRows(file);
    return normalizeRows(rows);
  }

  function plan(records, existing) {
    const lookup = new Map();
    for (const course of existing) {
      if (!course.ageGroup || !course.classSize) continue;
      const recordKey = key(course);
      if (lookup.has(recordKey)) throw new Error("現有課程有重複組合，請先逐一檢查及修正。");
      lookup.set(recordKey, course);
    }
    const changes = records.map((record) => {
      const found = lookup.get(key(record));
      const type = !found ? "add" : Number(found.duration) === record.duration && Number(found.fee) === record.fee ? "same" : "update";
      return { type, record, id: found ? found.id : null };
    });
    return { changes, add: changes.filter((item) => item.type === "add").length, update: changes.filter((item) => item.type === "update").length, same: changes.filter((item) => item.type === "same").length };
  }

  function toCsv(records = referenceRows) {
    const quote = (value) => '"' + String(value).replace(/"/g, '""') + '"';
    return "\uFEFF" + [HEADERS, ...records.map((item) => [item.name, item.ageGroup, item.classSize, item.duration, item.fee])].map((row) => row.map(quote).join(",")).join("\r\n") + "\r\n";
  }

  window.SwimCourseImport = { SOURCE_URL, HEADERS, referenceRows, key, normalizeRows, parse, plan, toCsv };
})();
