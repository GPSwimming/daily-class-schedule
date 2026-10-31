(() => {
  "use strict";

  // Source: 泳班地點 - GPS Classroom, 工作表1, A1:E18 (read 2026-10-22).
  const SOURCE_URL = "https://docs.google.com/spreadsheets/d/1JGOooBrrsqgLQ_RKjtA8VXg4aaFr6GFSrv6TC0PQZFw/edit?usp=sharing";
  const HEADERS = ["課堂泳池", "泳池地點", "集合位置", "泳池清潔日\n(*如清潔日為紅日, 將改為同一星期括號內的日子清潔)", "年度維修時間"];
  const referenceRows = [
    { pool: "大角咀游泳池", place: "室內訓練池", meetingPoint: "福全街大角咀市政大樓四樓, 更衣室換衫之後出嚟, 喺遊樂場同埋25米泳池中間位置等", cleaningDay: "星期一 (星期三*)", maintenanceTime: "9月11日至10月31日" },
    { pool: "城門谷游泳池", place: "戶外嬉水池", meetingPoint: "大窩口地鐵站行上去, 更衣後, 出戶外泳池向住瀑布假山方向行過去, 圓形涼亭等", cleaningDay: "星期一 (星期三*)", maintenanceTime: "11月1日至翌年4月15日" },
    { pool: "城門谷游泳池", place: "室內主池", meetingPoint: "大窩口地鐵站行上去, 更衣後, 女更衣室室內泳池出口位置看臺前方等", cleaningDay: "星期一 (星期三*)", maintenanceTime: "5月1日至6月30日" },
    { pool: "維多利亞公園游泳池", place: "室內多用途池", meetingPoint: "天后站行過去, 搵銀色扶手欄桿, 沿旋轉樓梯行上去2/F入口, 更衣後, 喺50米泳池同埋多用途泳池, 中間白色長櫈等", cleaningDay: "星期一 (星期五*)", maintenanceTime: "2月20日至4月21日" },
    { pool: "維多利亞公園游泳池", place: "室內主池", meetingPoint: "天后站行過去, 搵銀色扶手欄桿, 沿旋轉樓梯行上去2/F入口, 更衣後, 喺50米泳池同埋多用途泳池, 中間白色長櫈等", cleaningDay: "星期一 (星期五*)", maintenanceTime: "2月20日至4月21日" },
    { pool: "九龍公園游泳池", place: "戶外下層嬉水池", meetingPoint: "柯士甸站/佐敦站行過去, 童軍總會旁, 停車場斜路行上去, 麥當勞對面入口, 更衣後, 出戶外泳池向前行, 廁所左邊落樓梯下方泳池", cleaningDay: "星期二 (星期四*)", maintenanceTime: "11月1日至翌年4月15日" },
    { pool: "九龍公園游泳池", place: "室內上層訓練池", meetingPoint: "柯士甸站/佐敦站行過去, 童軍總會旁, 停車場斜路行上去, 麥當勞對面入口, 更衣後, 搵上層室內25米游泳池, 近男更衣室出口池邊等", cleaningDay: "星期二 (星期四*)", maintenanceTime: "4月16日至6月5日" },
    { pool: "荔枝角公園游泳池", place: "戶外訓練池", meetingPoint: "美孚西站搭電梯上瑪嘉烈醫院出口, 天橋旁邊落樓梯到入口, 更衣後, 沿住隧道入室內50m副池, 向副池左前方方向行過去, 落樓梯, 第一個0.8m 細游泳池等。", cleaningDay: "星期三 (星期二*)", maintenanceTime: "11月1日至翌年4月15日" },
    { pool: "荔枝角公園游泳池", place: "室內副池", meetingPoint: "美孚西站搭電梯上瑪嘉烈醫院出口, 天橋旁邊落樓梯到入口, 更衣後, 沿住隧道入室內50m副池, 向副池左方行, 轉角樓梯位置等", cleaningDay: "星期三 (星期二*)", maintenanceTime: "4月16日至6月5日" },
    { pool: "摩理臣山游泳池", place: "戶外習泳池", meetingPoint: "灣仔站/會展站/電車站行過去, 沿住英皇鐘錶珠寶, 內街直入職訓局, 再入搵泳池入口, 更衣後, 戶外露天位置空地等", cleaningDay: "星期三 (星期二*)", maintenanceTime: "11月1日至翌年4月15日" },
    { pool: "摩理臣山游泳池", place: "室內訓練池", meetingPoint: "灣仔站/會展站/電車站行過去, 沿住英皇鐘錶珠寶, 內街直入職訓局, 再入搵泳池入口, 更衣後, 室內25米泳池, 接駁露天泳池出入口位置等", cleaningDay: "星期三 (星期二*)", maintenanceTime: "5月11日至6月30日" },
    { pool: "堅尼地城游泳池", place: "戶外副池", meetingPoint: "香港大學站西寶城出口, 左轉過馬路, 沿住窄巷直行向海旁方向找泳池入口, 更衣後, 過水簾出到露天空地位置等 (救生員房仔對出)", cleaningDay: "星期三 (星期四*)", maintenanceTime: "9月11日至10月31日" },
    { pool: "堅尼地城游泳池", place: "室內副池", meetingPoint: "香港大學站西寶城出口, 左轉過馬路, 沿住窄巷直行向海旁方向找泳池入口, 更衣後, 過水簾入室內泳池, 救生員房仔對出, 空地位置等", cleaningDay: "星期三 (星期四*)", maintenanceTime: "11月1日至翌年4月15日" },
    { pool: "觀塘游泳池", place: "戶外副池", meetingPoint: "觀塘站藍田方向，左邊天橋出口，落樓梯直行過2條馬路找泳池入口, 上二樓更衣後找出口, 隧道轉左, 過水簾出到露天空地位, 50副池右邊白色長櫈等", cleaningDay: "星期三 (星期五*)", maintenanceTime: "11月1日至翌年4月15日" },
    { pool: "觀塘游泳池", place: "室內訓練池", meetingPoint: "觀塘站藍田方向，左邊天橋出口，落樓梯直行過2條馬路找泳池入口, 上二樓更衣後找出口, 隧道轉右, 過水簾出行到盡頭，泳池樓梯位等 (救護站旁邊空地)", cleaningDay: "星期三 (星期五*)", maintenanceTime: "1月2日至2月21日" },
    { pool: "摩士公園游泳池", place: "戶外習泳池", meetingPoint: "黃大仙站摩士公園泳池出口, 上地面向前直行50米 (中間過一條馬路), 左轉搵入口, 更衣室出戶外泳池, 沿住樓梯慢慢落去3個細泳池, 旁邊有蓋長櫈等", cleaningDay: "星期五 (星期三*)", maintenanceTime: "11月1日至翌年4月15日" },
    { pool: "摩士公園游泳池", place: "室內副池", meetingPoint: "黃大仙站摩士公園泳池出口, 上地面向前直行50米 (中間過一條馬路), 左轉搵入口, 更衣室出室內泳池方向, 更衣室出口左轉, 泳池旁邊長櫈等", cleaningDay: "星期五 (星期三*)", maintenanceTime: "4月16日至6月5日" }
  ];

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

  window.SwimLocationImport = { SOURCE_URL, HEADERS, referenceRows, key, normalizeRows, parse, plan, toCsv };
})();
