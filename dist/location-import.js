(() => {
  "use strict";

  // Source: 泳班地點 - GPS Classroom, 工作表1, A1:E18 (read 2026-10-22).
  const SOURCE_URL = "https://docs.google.com/spreadsheets/d/1JGOooBrrsqgLQ_RKjtA8VXg4aaFr6GFSrv6TC0PQZFw/edit?usp=sharing";
  const HEADERS = ["課堂泳池", "泳池地點", "集合位置", "泳池清潔日\n(*如清潔日為紅日, 將改為同一星期括號內的日子清潔)", "年度維修時間"];
  const referenceRows = [];

  function setReferenceRows(rows) {
    if (!Array.isArray(rows) || rows.length > 500 || rows.some((row) => !row || typeof row.pool !== "string" || typeof row.place !== "string" || typeof row.meetingPoint !== "string" || typeof row.cleaningDay !== "string" || typeof row.maintenanceTime !== "string")) {
      throw new Error("受保護地點資料格式錯誤。");
    }
    referenceRows.splice(0, referenceRows.length, ...rows);
  }

  function key(item) {
    return [item.pool, item.place].map((part) => String(part || "").trim().replace(/\s+/g, " ").toLocaleLowerCase()).join("\u0001");
  }

  function normalizeRows(rows) {
    if (!Array.isArray(rows) || !rows.length) throw new Error("泳班地點表沒有資料。");
    const headers = rows[0].slice(0, 5).map((value) => String(value || "").replace(/\s+/g, ""));
    if (headers.length < 5 || headers[0] !== "課堂泳池" || headers[1] !== "泳池地點" || headers[2] !== "集合位置" || !headers[3].startsWith("泳池清潔日") || headers[4] !== "年度維修時間") {
      throw new Error("欄位與泳班地點匯入範本不符，請保留首行五個欄位及次序。");
    }
    const records = [];
    const seen = new Set();
    for (let index = 1; index < rows.length; index += 1) {
      const cells = rows[index].slice(0, 5).map((value) => String(value ?? "").trim());
      if (!cells.some(Boolean)) continue;
      if (cells.length < 5 || cells.some((value) => !value)) throw new Error("第 " + (index + 1) + " 行須填妥五個欄位。");
      const [pool, place, meetingPoint, cleaningDay, maintenanceTime] = cells;
      if (pool.length > 80 || place.length > 80 || meetingPoint.length > 500 || cleaningDay.length > 100 || maintenanceTime.length > 100) throw new Error("第 " + (index + 1) + " 行的文字過長。");
      const record = { pool, place, meetingPoint, cleaningDay, maintenanceTime };
      if (seen.has(key(record))) throw new Error("第 " + (index + 1) + " 行的課堂泳池與泳池地點組合重複。");
      seen.add(key(record));
      records.push(record);
    }
    if (!records.length) throw new Error("泳班地點表沒有可匯入的組合。");
    if (records.length > 500) throw new Error("每次最多匯入 500 組泳班地點。");
    return records;
  }

  async function parse(file) {
    return normalizeRows(await window.SwimStudentImport.readRows(file));
  }

  function plan(records, existing) {
    const lookup = new Map();
    for (const item of existing) {
      const recordKey = key(item);
      if (lookup.has(recordKey)) throw new Error("現有泳班地點有重複組合，請先檢查及修正。");
      lookup.set(recordKey, item);
    }
    const changes = records.map((record) => {
      const found = lookup.get(key(record));
      const type = !found ? "add" : ["meetingPoint", "cleaningDay", "maintenanceTime"].every((field) => String(found[field] || "").trim() === record[field]) ? "same" : "update";
      return { type, record, id: found ? found.id : null };
    });
    return { changes, add: changes.filter((item) => item.type === "add").length, update: changes.filter((item) => item.type === "update").length, same: changes.filter((item) => item.type === "same").length };
  }

  function toCsv(records = referenceRows) {
    const quote = (value) => '"' + String(value).replace(/"/g, '""') + '"';
    return "\uFEFF" + [HEADERS, ...records.map((item) => [item.pool, item.place, item.meetingPoint, item.cleaningDay, item.maintenanceTime])].map((row) => row.map(quote).join(",")).join("\r\n") + "\r\n";
  }

  window.SwimLocationImport = { SOURCE_URL, HEADERS, referenceRows, setReferenceRows, key, normalizeRows, parse, plan, toCsv };
})();
