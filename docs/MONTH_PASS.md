# 月票私有素材

月票介面位於 `dist/month-pass/`，在泳堂管家登入後於同一網頁開啟。GitHub Pages 只部署 HTML、CSS 和 JavaScript；含姓名及預訂參考編號的三張截圖、兩張動畫圖片及影片保存在 Supabase 私有 bucket `swim-month-pass-private`。

切勿把 `facilities.jpg`、`choose-type.jpg`、`monthly-passes.jpg`、`background.png`、`ring.png` 或 `pool-motion-15s.mp4` 放入 `dist/` 或 Git 儲存庫。GitHub Pages 的檔案即使頁面設有登入也可被直接下載。

部署時先在 Supabase 建立私有 bucket，執行 `supabase/month_pass_storage.sql`，並部署 `supabase/functions/swim-admin-gateway/index.ts`。月票素材由已登入管理員的權杖經 Edge Function 讀取。瀏覽器直接打開 `month-pass/` 不會取得素材。影片只在下載或分享時讀取，以減少流量。

若更換素材，應先在私有 bucket 更新，再確認無憑證或非管理員無法下載，最後部署 `dist/`。Supabase 免費方案的 Storage、流量及 Edge Function 額度由整個 organization 共用，請在 Supabase Usage 頁面監察。
