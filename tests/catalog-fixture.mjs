// Synthetic catalog: production course prices and pool directions stay out of public files.
const child = ["2.5 - 5", "6 - 11", "12 - 17"];
const group = ["4 - 5", "6 - 11", "12 - 17"];
const entries = [
  ["課程甲", child, "1:1", 60, 700],
  ["課程乙", child, "1:2", 60, 350],
  ["課程丙", group, "小組", 60, 200],
  ["課程丁", group, "小組", 90, 160],
  ["課程戊", group, "小組", 120, 160],
  ["成人課程", ["18-29", "30-39", "40-49", "50-59", "60-69"], "小組", 60, 250]
];

export const catalog = {
  courses: entries.flatMap(([name, ages, classSize, duration, fee]) => ages.map((ageGroup) => ({ name, ageGroup, classSize, duration, fee }))),
  locations: [
    { pool: "測試泳池", place: "室內池", meetingPoint: "入口", cleaningDay: "星期一", maintenanceTime: "一月" },
    { pool: "測試泳池", place: "戶外池", meetingPoint: "大堂", cleaningDay: "星期二", maintenanceTime: "二月" }
  ]
};
