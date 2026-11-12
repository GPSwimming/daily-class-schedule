(() => {
  "use strict";

  const words = {
    "zh-Hant": {
      signIn: "登入", signInBusy: "登入中…", email: "電郵", password: "密碼", forgot: "忘記密碼？",
      consent: "我已閱讀私隱政策，了解本平台如何處理登入及課堂資料。", register: "註冊",
      privacyLink: "私隱政策 Privacy Policy", privacyTitle: "私隱政策", backToLogin: "← 返回登入",
      resetTitle: "重設密碼", resetInstructions: "輸入你的登入電郵，我們會傳送重設密碼連結至該郵箱。",
      cancel: "取消", sendReset: "發送重設郵件", sending: "發送中…", close: "關閉",
      resetSent: "如電郵屬於已授權帳戶，重設連結已發送。請檢查收件箱及垃圾郵件。",
      setPassword: "設定新密碼", setPasswordHint: "請輸入最少 12 個字元的新密碼，完成後重新登入。",
      newPassword: "新密碼", confirmPassword: "確認新密碼", savePassword: "儲存新密碼",
      showPassword: "顯示密碼", hidePassword: "隱藏密碼", darkMode: "切換夜間模式", lightMode: "切換日間模式",
      privacy: `
        <p>生效日期：2026 年 11 月 11 日</p>
        <p>Genius Pro Swimming（「我們」）使用泳堂管家管理泳班。以下說明這個網站目前如何處理資料。</p>
        <h2>1. 我們處理的資料</h2>
        <ul><li>管理員登入電郵及密碼驗證由 Supabase Auth 處理；我們的網頁不保存明文密碼。</li><li>你在網站輸入的學生、導師、課堂、收款及相片等資料，現階段主要保存在該裝置的瀏覽器儲存空間。</li><li>部分課程及泳班地點參考資料由受限制的 Supabase 資料表提供。</li></ul>
        <h2>2. 用途與存放</h2>
        <p>資料用於編排課堂、管理學生及導師、記錄堂數和收款，以及提供相關操作。網站由 GitHub Pages 發佈；登入服務及受保護的參考資料使用 Supabase。學生資料目前不會自動上載至 Supabase，也不會自動在裝置之間同步。</p>
        <h2>3. 保存與刪除</h2>
        <p>瀏覽器資料會保留至管理員在網站刪除、清除瀏覽資料或匯入其他備份。更換裝置前請先匯出備份。刪除本機資料不會自動刪除你已另外儲存的備份檔。</p>
        <h2>4. 安全與兒童資料</h2>
        <p>正式網站使用 HTTPS，管理介面設有管理員登入。資料若仍存放在本機瀏覽器，亦須由裝置持有人保護裝置及備份。學生資料由管理員輸入和管理；目前沒有開放學生帳戶。</p>
        <h2>5. 查閱與聯絡</h2>
        <p>如需查閱、更正或刪除資料，請聯絡 <a href="mailto:admin@gpswimming.com">admin@gpswimming.com</a>。政策更新會在本頁顯示新日期。</p>`
    },
    en: {
      signIn: "Sign In", signInBusy: "Signing in…", email: "Email", password: "Password", forgot: "Forgot password?",
      consent: "I have read the Privacy Policy and understand how this platform handles login and lesson data.", register: "Register",
      privacyLink: "Privacy Policy", privacyTitle: "Privacy Policy", backToLogin: "← Back to login",
      resetTitle: "Reset Password", resetInstructions: "Enter your sign-in email and we will send a password reset link to that address.",
      cancel: "Cancel", sendReset: "Send reset email", sending: "Sending…", close: "Close",
      resetSent: "If this is an authorized account, a reset link has been sent. Please check your inbox and spam folder.",
      setPassword: "Set a new password", setPasswordHint: "Enter a new password of at least 12 characters, then sign in again.",
      newPassword: "New password", confirmPassword: "Confirm new password", savePassword: "Save new password",
      showPassword: "Show password", hidePassword: "Hide password", darkMode: "Switch to dark mode", lightMode: "Switch to light mode",
      privacy: `
        <p>Effective date: 11 November 2026</p>
        <p>Genius Pro Swimming ("we") uses the Swimming Classroom Manager to run swimming lessons. This policy describes how the current website handles data.</p>
        <h2>1. Data we process</h2>
        <ul><li>Supabase Auth handles administrator email and password authentication. The website does not store plain-text passwords.</li><li>Student, coach, lesson, payment and photo data entered in the site is currently stored mainly in the browser on that device.</li><li>Some course and pool reference data comes from restricted Supabase tables.</li></ul>
        <h2>2. Purpose and storage</h2>
        <p>We use data to schedule lessons, manage students and coaches, track lesson balances and payments, and support related operations. GitHub Pages hosts the site; Supabase provides authentication and protected reference data. Student data is not automatically uploaded to Supabase or synchronized between devices.</p>
        <h2>3. Retention and deletion</h2>
        <p>Browser data remains until an administrator deletes it in the site, clears browser storage, or imports another backup. Export a backup before changing devices. Deleting local data does not automatically delete backup files saved elsewhere.</p>
        <h2>4. Security and children's data</h2>
        <p>The hosted site uses HTTPS and the management interface requires administrator login. When data remains in local browser storage, the device owner must also protect the device and backups. Administrators enter and manage student data; student accounts are not currently available.</p>
        <h2>5. Access and contact</h2>
        <p>To request access, correction or deletion, contact <a href="mailto:admin@gpswimming.com">admin@gpswimming.com</a>. A new effective date will appear here if this policy changes.</p>`
    },
    "zh-Hans": {
      signIn: "登录", signInBusy: "登录中…", email: "电邮", password: "密码", forgot: "忘记密码？",
      consent: "我已阅读隐私政策，了解本平台如何处理登录及课堂资料。", register: "注册",
      privacyLink: "隐私政策 Privacy Policy", privacyTitle: "隐私政策", backToLogin: "← 返回登录",
      resetTitle: "重设密码", resetInstructions: "输入你的登录电邮，我们会发送重设密码链接至该邮箱。",
      cancel: "取消", sendReset: "发送重设邮件", sending: "发送中…", close: "关闭",
      resetSent: "如电邮属于已授权账户，重设链接已发送。请检查收件箱及垃圾邮件。",
      setPassword: "设置新密码", setPasswordHint: "请输入最少 12 个字符的新密码，完成后重新登录。",
      newPassword: "新密码", confirmPassword: "确认新密码", savePassword: "保存新密码",
      showPassword: "显示密码", hidePassword: "隐藏密码", darkMode: "切换夜间模式", lightMode: "切换日间模式",
      privacy: `
        <p>生效日期：2026 年 11 月 11 日</p>
        <p>Genius Pro Swimming（“我们”）使用泳堂管家管理泳班。以下说明网站目前如何处理资料。</p>
        <h2>1. 我们处理的资料</h2>
        <ul><li>管理员登录电邮及密码验证由 Supabase Auth 处理；网页不保存明文密码。</li><li>在网站输入的学生、教练、课堂、收款及照片等资料，目前主要保存在该设备的浏览器存储空间。</li><li>部分课程及泳班地点参考资料由受限制的 Supabase 数据表提供。</li></ul>
        <h2>2. 用途与存放</h2>
        <p>资料用于编排课堂、管理学生及教练、记录课时余额和收款。网站由 GitHub Pages 发布；登录服务和受保护的参考资料使用 Supabase。学生资料目前不会自动上传到 Supabase，也不会自动跨设备同步。</p>
        <h2>3. 保存与删除</h2>
        <p>浏览器资料会保留至管理员在网站删除、清除浏览资料或导入其他备份。更换设备前请先导出备份。删除本地资料不会自动删除已另行保存的备份文件。</p>
        <h2>4. 安全与儿童资料</h2>
        <p>正式网站使用 HTTPS，管理界面设有管理员登录。本地浏览器资料仍需由设备持有人保护设备和备份。学生资料由管理员输入和管理；目前没有开放学生账户。</p>
        <h2>5. 查阅与联系</h2>
        <p>如需查阅、更正或删除资料，请联系 <a href="mailto:admin@gpswimming.com">admin@gpswimming.com</a>。政策更新会在本页显示新日期。</p>`
    }
  };

  const page = document.querySelector(".auth-page");
  const recoveryDialog = document.querySelector("#auth-recovery-dialog");
  const recoveryForm = document.querySelector("#auth-recovery-form");
  const recoverySuccess = document.querySelector("#auth-recovery-success");
  const recoveryError = document.querySelector("#auth-recovery-error");
  const signInButton = document.querySelector("#admin-login-submit");
  let language = "zh-Hant";
  let loginBusy = false;

  function translate() {
    const dictionary = words[language];
    page.lang = language;
    document.querySelectorAll("[data-auth-text]").forEach((element) => {
      element.textContent = dictionary[element.dataset.authText] || "";
    });
    document.querySelector("#auth-privacy-content").innerHTML = dictionary.privacy;
    document.querySelectorAll("[data-auth-lang]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.authLang === language));
    });
    signInButton.textContent = loginBusy ? dictionary.signInBusy : dictionary.signIn;
    document.querySelectorAll("[data-auth-visibility]").forEach((button) => {
      button.setAttribute("aria-label", dictionary[button.getAttribute("aria-pressed") === "true" ? "hidePassword" : "showPassword"]);
    });
    const themeButton = document.querySelector("#auth-theme-toggle");
    themeButton.setAttribute("aria-label", dictionary[document.body.classList.contains("auth-dark") ? "lightMode" : "darkMode"]);
  }

  function setLoginBusy(value) {
    loginBusy = Boolean(value);
    signInButton.disabled = loginBusy;
    signInButton.textContent = words[language][loginBusy ? "signInBusy" : "signIn"];
  }

  document.querySelectorAll("[data-auth-lang]").forEach((button) => button.addEventListener("click", () => {
    language = button.dataset.authLang;
    translate();
  }));
  document.querySelector("#auth-theme-toggle").addEventListener("click", () => {
    document.body.classList.toggle("auth-dark");
    const dark = document.body.classList.contains("auth-dark");
    const button = document.querySelector("#auth-theme-toggle");
    button.textContent = dark ? "☀" : "☾";
    translate();
  });
  document.querySelectorAll("[data-auth-visibility]").forEach((button) => button.addEventListener("click", (event) => {
    event.preventDefault();
    const input = document.getElementById(button.dataset.authVisibility);
    const visible = input.type === "password";
    input.type = visible ? "text" : "password";
    button.setAttribute("aria-pressed", String(visible));
    button.setAttribute("aria-label", words[language][visible ? "hidePassword" : "showPassword"]);
  }));
  document.querySelector("#auth-privacy-button").addEventListener("click", () => {
    document.querySelector("#auth-main-content").hidden = true;
    document.querySelector("#auth-privacy-view").hidden = false;
    document.querySelector("#auth-privacy-view").scrollIntoView({ block: "start" });
  });
  document.querySelector("#auth-privacy-back").addEventListener("click", () => {
    document.querySelector("#auth-privacy-view").hidden = true;
    document.querySelector("#auth-main-content").hidden = false;
  });
  document.querySelector("#auth-forgot-button").addEventListener("click", () => {
    recoveryForm.hidden = false;
    recoverySuccess.hidden = true;
    recoveryError.textContent = "";
    recoveryForm.elements.email.value = document.querySelector("#admin-email").value.trim();
    recoveryDialog.showModal();
  });
  document.querySelector("#auth-recovery-cancel").addEventListener("click", () => recoveryDialog.close());
  document.querySelector("#auth-recovery-close").addEventListener("click", () => recoveryDialog.close());
  recoveryForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    recoveryError.textContent = "";
    const button = document.querySelector("#auth-recovery-send");
    button.disabled = true;
    button.textContent = words[language].sending;
    try {
      await window.AdminAuth.requestReset(recoveryForm.elements.email.value);
      recoveryForm.hidden = true;
      recoverySuccess.hidden = false;
    } catch (error) {
      recoveryError.textContent = error.message || "Unable to send email.";
    } finally {
      button.disabled = false;
      button.textContent = words[language].sendReset;
    }
  });
  document.querySelector("#auth-reset-back").addEventListener("click", () => {
    document.querySelector("#admin-reset-form").hidden = true;
    document.querySelector("#admin-login-form").hidden = false;
  });
  translate();
  window.LoginUI = { setLoginBusy, translate };
})();
