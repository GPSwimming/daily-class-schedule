import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const source = await readFile(new URL("../dist/location-import.js", import.meta.url), "utf8");
const context = { window: {} };
vm.runInNewContext(source, context, { filename: "dist/location-import.js" });
const api = context.window.SwimLocationImport;

assert.equal(api.referenceRows.length, 17, "all 17 spreadsheet combinations are bundled");
assert.equal(new Set(api.referenceRows.map(api.key)).size, 17, "each pool and place pair is unique");
assert.equal(new Set(api.referenceRows.map((row) => row.pool)).size, 9, "nine pools are represented");
const kowloon = api.referenceRows.find((row) => row.pool === "九龍公園游泳池" && row.place === "戶外下層嬉水池");
assert.equal(kowloon.cleaningDay, "星期二 (星期四*)");
assert.equal(kowloon.maintenanceTime, "11月1日至翌年4月15日");
assert.match(kowloon.meetingPoint, /童軍總會旁/);

const initial = api.plan(api.referenceRows, []);
assert.equal(initial.add, 17, "first import adds all combinations");
assert.equal(initial.update, 0);
const saved = api.referenceRows.map((row, index) => ({ id: `place-${index}`, ...row }));
const repeat = api.plan(api.referenceRows, saved);
assert.equal(repeat.same, 17, "repeat import changes nothing");
const edited = [{ ...api.referenceRows[0], cleaningDay: "星期四" }];
const update = api.plan(edited, saved);
assert.equal(update.update, 1, "matching pair updates its details");
assert.equal(update.add, 0);
assert.equal(update.changes[0].id, "place-0", "existing record id is retained");
assert.equal(update.changes.length, 1, "unlisted combinations are not targeted for deletion");

const rows = [api.HEADERS, ["  九龍公園游泳池  ", " 戶外下層嬉水池 ", "  集合位置 ", " 星期二 ", " 11月 "]];
assert.equal(api.normalizeRows(rows)[0].pool, "九龍公園游泳池", "spreadsheet values are trimmed");
assert.throws(() => api.normalizeRows([api.HEADERS, rows[1], rows[1]]), /組合重複/);
assert.throws(() => api.normalizeRows([["課堂泳池", "泳池地點", "集合位置", "泳池清潔日", "錯誤欄位"], rows[1]]), /欄位/);
assert.match(api.toCsv(), /課堂泳池/);
assert.match(api.toCsv(), /九龍公園游泳池/);

console.log("Location import tests passed: 17 source rows, pair keys, validation and additive updates.");
