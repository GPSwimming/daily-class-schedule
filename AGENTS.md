# Codex 專案工作指引

開始修改前，先完整閱讀 `README.md` 同 `PROJECT_BRIEF.md`。

## 工作原則

- 保留使用者沒有要求更改的功能、文字及資料格式。
- 修改前檢查 `dist/index.html`、`dist/styles.css`、`dist/app.js`。
- 網站係 buildless 靜態專案；正式可部署內容全部位於 `dist/`。
- 保持 `swim-class-balance.v1` 及 `swim-class-suite.v2` 相容，避免令舊資料消失。
- 不要在前端、Git 儲存庫或備份加入 API key、密碼或私人憑證。
- 涉及刪除、資料遷移、雲端同步、真正登入或自動對外發送前，先向使用者解釋風險並取得明確確認。

## 完成定義

每次修改後至少執行：

```powershell
npm test
npm run check
```

如果改動介面，亦要在 390px 手機寬度及一般桌面寬度實際預覽，檢查沒有水平溢出、遮擋或無法操作的按鈕。部署前確認瀏覽器 console 沒有錯誤。

## 部署

呢個分享包不屬於任何現有 Sites 專案。使用者要求部署時，應為使用者建立或連接佢自己嘅 GitHub／Sites 專案；不要猜測或重用其他人的 project ID。


