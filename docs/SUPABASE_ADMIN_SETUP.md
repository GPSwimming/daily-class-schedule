# Supabase：先限網站管理員登入

Supabase 專案網址：`https://qflrsblacjukooikvfyx.supabase.co`。此網址不含密碼。

## 權限範圍

- 第一階段只有一位指定網站管理員可讀寫泳堂管家資料。公司員工、導師及學生即使有 Supabase Auth 帳戶，也不會自動得到應用資料權限。
- `supabase/admin_only.sql` 只建立空表及 Row Level Security (RLS) 政策。瀏覽器角色 `anon` 沒有讀寫權限；已登入的 `authenticated` 角色仍須在 `swim_app_admin` 白名單內。
- 不要把任何 API key、資料庫密碼、管理員或學生密碼加入網頁、Git、備份或聊天訊息。網頁只包含 Edge Function 的公開網址；函數從 Supabase 伺服器環境讀取公開 API key，並以 Auth + RLS 驗證管理員。

## 設定次序

1. 在 Supabase Dashboard 的 **Authentication → URL Configuration**，將 Site URL 設為 `https://gpswimming.github.io/daily-class-schedule/`，並將 `http://127.0.0.1:4173/` 加入 Redirect URLs，方便本機測試。
2. 在 **Authentication → Users** 為網站管理員建立或邀請一個 Auth 帳戶。Supabase Dashboard 管理帳號與 Web App Auth 帳戶並非同一個帳戶。
3. 由專案持有人在 SQL Editor 執行 `supabase/admin_only.sql`。目前已只匯入 52 組參考課程和 17 組參考泳池地點；學生資料沒有上載。
4. 在 SQL Editor 以實際管理員電郵查出其 Auth UUID，再加入白名單。電郵只在 SQL Editor 內輸入，不寫回原始碼：

   ```sql
   insert into public.swim_app_admin (user_id)
   select id from auth.users where email = '<管理員電郵>';
   ```

   上述指令應新增 **1 row**。若顯示 0 row，請檢查 Auth 帳戶的電郵是否正確。
5. 在啟用真正登入前，先測試未登入者、另一個非管理員帳戶與管理員帳戶的讀寫結果；確認前兩者無法讀寫 `swim_app_data`。
6. 學生、導師、收款及排課紀錄目前仍在各瀏覽器的本機儲存。日後如要跨裝置同步，先逐一核對備份，再另行取得上載授權。

## 網站登入接線

`dist/admin-auth.js` 只在記憶體持有管理員登入的短期 access token，不寫入本機儲存或備份。重新整理頁面及 token 到期後須重新登入。`supabase/functions/swim-admin-gateway` 處理密碼登入，並透過 `swim_app_admin` 的 RLS 白名單核對權限。`supabase/config.toml` 允許匿名呼叫函數入口；函數內的登入及每次身份檢查仍然會驗證 Auth 和管理員白名單。

部署前需先確認 `admin@gpswimming.com` 已完成電郵確認並設定密碼，Supabase Edge Function 可用，再把本機前端發佈至 GitHub Pages。函數依賴 Supabase 伺服器環境的 `SUPABASE_URL` 和 `SUPABASE_ANON_KEY`（或 `SUPABASE_PUBLISHABLE_KEY`）。切勿把 API key 複製入 `dist/`。

## 首次設定或重設密碼

1. 在 Supabase Dashboard → **Authentication → URL Configuration**，把 Site URL 設為 `https://gpswimming.github.io/daily-class-schedule/`，並把同一完整網址加入 Redirect URLs。重設郵件固定回到正式網站，避免手機開啟 `127.0.0.1`。
2. Supabase 現時使用預設郵件模板。要改成 `Reset your password for Genius-Pro Classroom Platform` 的主旨及 `supabase/recovery-email.html` 的版面，先在 **Project Settings → Authentication → SMTP Settings** 設定自家 SMTP；控制台未設定 SMTP 時不容許編輯模板。設定後到 **Authentication → Emails → Reset password** 更新模板，按鈕須使用 `{{ .ConfirmationURL }}`，不可貼 Firebase 連結或只用網站首頁網址。
3. 部署更新後，管理員在登入頁按「忘記密碼？」並輸入 `admin@gpswimming.com`。收到郵件後使用最新的一封，按連結進入「設定新密碼」畫面，輸入至少 12 字元的密碼並儲存。
4. 如顯示 `email rate limit exceeded`，先等發信額度恢復；Supabase 預設發信服務有低額度及收件人限制。正式使用應在 **Project Settings → Authentication → SMTP Settings** 設定自己的 SMTP。請勿在網頁程式或 Git 存放 SMTP 密碼。
5. 如連結顯示無效或已過期，先查 **Authentication → Logs**，核對最新郵件、Redirect URLs 與模板的 `{{ .ConfirmationURL }}`。某些郵件掃描器會預先開啟一次性連結；可按 Supabase 文件改用 OTP 模板或中間確認頁。

`npm test` 會以模擬 Supabase 回應驗證申請、白名單、回跳網址、管理員檢查及改密碼流程。真正寄信與點開收件箱連結仍須在 Supabase 控制台設定完成及部署後，由管理員以自己的郵箱端到端測試。

## 目前尚未完成的部分

現有網站仍以 `swim-class-balance.v1` 和 `swim-class-suite.v2` 儲存學生、導師及其他營運資料。登入畫面限制一般使用者進入操作介面，但同一瀏覽器既有的本機資料未搬到雲端，不能當作完整的裝置資料保護。52 組參考課程和 17 組參考地點已放在受 RLS 保護的 Supabase 資料表，公開 `dist/` 不再附帶這兩份明細。舊版已公開過的內容無法單靠新登入畫面收回。

真正登入、資料遷移和部署都須按 `AGENTS.md` 先向使用者說明具體風險並取得明確確認。
