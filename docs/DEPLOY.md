# 部署及分享方法

## 方法一：交俾 Codex 處理（建議）

在 Codex 開啟本專案資料夾後，可以講：

> 請檢查呢個靜態 Web App，建立一個屬於我自己嘅新 Sites 專案並部署。唔好重用其他人的 project ID；部署後俾我正式網址。

或者：

> 請幫我建立一個新 GitHub repository，上載呢個專案，再開啟 GitHub Pages。部署後測試正式網址。

Codex 應先使用目前登入帳戶，建立新專案，再把產生的專案識別保存在朋友自己的工作副本。

## 方法二：GitHub Pages

1. 建立一個新 GitHub repository。
2. 將 `dist/index.html`、`dist/styles.css`、`dist/app.js` 放到 repository 根目錄，或設定部署流程使用 `dist/`。
3. 在 repository Settings → Pages 選擇發佈來源。
4. 等待部署完成，打開正式網址測試。

如果直接把 `dist/` 內容放到 repository 根目錄，請保留三個檔案的相對位置。

## 方法三：其他靜態網站平台

Netlify、Cloudflare Pages、Vercel 等平台都可以把 `dist` 設為發佈目錄。呢個版本沒有伺服器端程式或建置步驟。

## 部署後驗收

- 首頁顯示 12 張功能卡。
- 手機寬度 390px 沒有水平捲動。
- 「課程設定 → 新增課程」表格可開啟。
- 新增測試學生後，重新整理頁面資料仍存在。
- 完成一堂會扣堂；取消不扣堂。
- 匯出備份能下載 JSON；在另一個瀏覽器測試匯入前，先使用假資料。
- Browser console 沒有 JavaScript error。


