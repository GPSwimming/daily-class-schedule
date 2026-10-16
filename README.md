# 泳堂管家｜Codex 可編輯分享版

呢個資料夾包含完整 Web App 原始碼，可以直接交俾朋友，再由朋友喺自己嘅 Codex 開啟、修改及部署。

## 包含內容

- `dist/index.html`：網頁結構
- `dist/styles.css`：手機及桌面版樣式
- `dist/app.js`：全部功能及瀏覽器本機資料處理
- `tests/app-smoke.mjs`：基本完整性測試
- `serve.mjs`：本機預覽伺服器
- `PROJECT_BRIEF.md`：功能、資料結構及重要限制
- `AGENTS.md`：俾 Codex 讀取嘅專案工作指引
- `docs/DEPLOY.md`：重新部署方法

## 最快使用方法

1. 解壓縮 ZIP。
2. 在 Codex 選擇「開啟資料夾」，選擇 `swim-class-balance-codex`。
3. 對 Codex 講：

   > 請先閱讀 README.md、PROJECT_BRIEF.md 同 AGENTS.md，然後幫我預覽及檢查呢個 Web App。暫時唔好改功能。

4. 要修改時，清楚講出想改嘅功能，例如：

   > 請喺現有泳堂管家加入 WhatsApp 提醒按鈕，保留其他功能同本機資料格式；完成後跑測試同俾我預覽確認。

## 本機預覽

電腦已安裝 Node.js 的話，在專案資料夾執行：

```powershell
npm run preview
```

然後開啟 `http://127.0.0.1:4173`。

## 測試

```powershell
npm test
```

## 重要私隱提示

目前版本將學生、課堂及付款資料儲存在使用者自己瀏覽器的 `localStorage`，不會自動同步到雲端。請勿輸入身份證號碼、健康紀錄、密碼或其他敏感資料。更換裝置或清除瀏覽資料前，應先在 App「設定」匯出 JSON 備份。

## 重新部署

分享包刻意不包含原作者的 Git 歷史、Sites 專案 ID、登入資料或部署憑證。朋友應使用自己嘅 GitHub 或 Sites 帳戶建立新專案。詳情見 `docs/DEPLOY.md`。


