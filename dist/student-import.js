(() => {
  "use strict";

  const HEADERS = ["學生姓名", "課程", "負責導師", "每週上課日", "固定時間", "預繳堂數", "現時剩餘堂數", "下一堂日期", "課室／泳線"];
  const decoder = new TextDecoder("utf-8");

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = "";
    let quoted = false;
    const source = text.replace(/^\uFEFF/, "");
    for (let index = 0; index < source.length; index += 1) {
      const character = source[index];
      if (character === '"') {
        if (quoted && source[index + 1] === '"') { field += '"'; index += 1; }
        else quoted = !quoted;
      } else if (character === "," && !quoted) {
        row.push(field); field = "";
      } else if ((character === "\n" || character === "\r") && !quoted) {
        if (character === "\r" && source[index + 1] === "\n") index += 1;
        row.push(field); rows.push(row); row = []; field = "";
      } else field += character;
    }
    if (quoted) throw new Error("CSV 引號未配對，請重新從 Excel 另存檔案。");
    if (field || row.length) { row.push(field); rows.push(row); }
    return rows;
  }

  function xmlText(value) {
    return value.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|amp|lt|gt|quot|apos);/g, (_, code) => {
      if (code[0] === "#") return String.fromCodePoint(code[1] === "x" ? parseInt(code.slice(2), 16) : Number(code.slice(1)));
      return { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" }[code];
    });
  }

  function textTags(xml) {
    return Array.from(xml.matchAll(/<(?:\w+:)?t\b[^>]*>([\s\S]*?)<\/(?:\w+:)?t>/g), (match) => xmlText(match[1])).join("");
  }

  function columnIndex(reference) {
    const letters = /^([A-Z]+)/.exec(reference);
    if (!letters) return -1;
    return Array.from(letters[1]).reduce((value, letter) => value * 26 + letter.charCodeAt(0) - 64, 0) - 1;
  }

  function worksheetRows(xml, shared) {
    const rows = [];
    for (const rowMatch of xml.matchAll(/<(?:\w+:)?row\b[^>]*>([\s\S]*?)<\/(?:\w+:)?row>/g)) {
      const row = Array(HEADERS.length).fill("");
      for (const cell of rowMatch[1].matchAll(/<(?:\w+:)?c\b([^>]*)>([\s\S]*?)<\/(?:\w+:)?c>/g)) {
        const reference = /\br="([A-Z]+[0-9]+)"/.exec(cell[1]);
        const index = reference ? columnIndex(reference[1]) : -1;
        if (index < 0 || index >= HEADERS.length) continue;
        const type = /\bt="([^"]+)"/.exec(cell[1]);
        const value = /<(?:\w+:)?v\b[^>]*>([\s\S]*?)<\/(?:\w+:)?v>/.exec(cell[2]);
        row[index] = type && type[1] === "s" ? shared[Number(value && value[1])] || "" : type && type[1] === "inlineStr" ? textTags(cell[2]) : value ? xmlText(value[1]) : "";
      }
      rows.push(row);
    }
    return rows;
  }

  async function xlsxRows(file) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes.length > 5 * 1024 * 1024) throw new Error("檔案超過 5MB，請分批匯入。");
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let end = -1;
    for (let index = bytes.length - 22; index >= Math.max(0, bytes.length - 65557); index -= 1) {
      if (view.getUint32(index, true) === 0x06054b50) { end = index; break; }
    }
    if (end < 0) throw new Error("不是有效的 Excel .xlsx 檔案。");
    const count = view.getUint16(end + 10, true);
    if (count > 1000) throw new Error("Excel 檔案內容過大，請使用範本。");
    let offset = view.getUint32(end + 16, true);
    const entries = new Map();
    for (let index = 0; index < count; index += 1) {
      if (view.getUint32(offset, true) !== 0x02014b50) throw new Error("Excel 檔案目錄損壞。");
      const nameLength = view.getUint16(offset + 28, true);
      const extraLength = view.getUint16(offset + 30, true);
      const commentLength = view.getUint16(offset + 32, true);
      const name = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
      entries.set(name, { method: view.getUint16(offset + 10, true), size: view.getUint32(offset + 20, true), expanded: view.getUint32(offset + 24, true), local: view.getUint32(offset + 42, true) });
      offset += 46 + nameLength + extraLength + commentLength;
    }
    const readEntry = async (name) => {
      const entry = entries.get(name);
      if (!entry) return "";
      if (entry.expanded > 4 * 1024 * 1024) throw new Error("Excel 工作表過大，請分批匯入。");
      const start = entry.local;
      if (view.getUint32(start, true) !== 0x04034b50) throw new Error("Excel 檔案內容損壞。");
      const dataStart = start + 30 + view.getUint16(start + 26, true) + view.getUint16(start + 28, true);
      const compressed = bytes.subarray(dataStart, dataStart + entry.size);
      if (entry.method === 0) return decoder.decode(compressed);
      if (entry.method !== 8 || typeof DecompressionStream === "undefined") throw new Error("此瀏覽器未能讀取 .xlsx，請在 Excel 另存為 CSV 後匯入。");
      const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
      const expanded = new Uint8Array(await new Response(stream).arrayBuffer());
      if (expanded.length > 4 * 1024 * 1024) throw new Error("Excel 工作表過大，請分批匯入。");
      return decoder.decode(expanded);
    };
    const sharedXml = await readEntry("xl/sharedStrings.xml");
    const shared = Array.from(sharedXml.matchAll(/<(?:\w+:)?si\b[^>]*>([\s\S]*?)<\/(?:\w+:)?si>/g), (match) => textTags(match[1]));
    const worksheet = await readEntry("xl/worksheets/sheet1.xml");
    if (!worksheet) throw new Error("找不到 Excel 的第一個工作表。");
    return worksheetRows(worksheet, shared);
  }

  async function readRows(file) {
    if (file.size > 5 * 1024 * 1024) throw new Error("檔案超過 5MB，請分批匯入。");
    const rows = /\.csv$/i.test(file.name) ? parseCsv(await file.text()) : /\.xlsx$/i.test(file.name) ? await xlsxRows(file) : null;
    if (!rows || !rows.length) throw new Error("請選擇 .xlsx 或 .csv 範本檔案。");
    return rows;
  }

  async function parse(file) {
    const rows = await readRows(file);
    if (HEADERS.some((header, index) => String(rows[0][index] || "").trim() !== header)) throw new Error("欄位與範本不符，請下載最新 Excel 範本。");
    const records = rows.slice(1).map((row, index) => ({ rowNumber: index + 2, values: row.map((value) => String(value == null ? "" : value).trim()) }))
      .filter(({ values }) => values.some(Boolean));
    if (records.length > 500) throw new Error("每次最多匯入 500 位學員，請分批處理。");
    return records;
  }

  window.SwimStudentImport = { HEADERS, parse, readRows };
})();
