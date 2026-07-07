/**
 * cloud-sync.js — Đăng nhập bảo mật + đồng bộ dữ liệu dùng chung real-time qua Firebase.
 *
 * BẢO MẬT:
 *  - Người dùng phải ĐĂNG NHẬP bằng tài khoản Google và email phải nằm trong ALLOWED_EMAILS.
 *  - Luật Firestore (firestore.rules) chặn phía máy chủ: chỉ các email này mới đọc/ghi được,
 *    nên kể cả ai có link cũng không lấy được dữ liệu.
 *
 * ĐỒNG BỘ:
 *  - localStorage là kho làm việc chính (chạy được cả khi mất mạng).
 *  - Mỗi thay đổi -> đẩy toàn bộ lên 1 document chung trên Firestore; người khác đổi -> tự kéo về.
 *
 * Muốn thêm/bớt người dùng: sửa danh sách ALLOWED_EMAILS bên dưới VÀ trong firestore.rules cho khớp.
 */

const CLOUD_CONFIG = {
  firebase: {
    apiKey: "AIzaSyBRwGvn0xEy1yZiOyA1oWF7wB2oSYvsw-g",
    authDomain: "kscp-klb.firebaseapp.com",
    projectId: "kscp-klb",
    storageBucket: "kscp-klb.firebasestorage.app",
    messagingSenderId: "547491599584",
    appId: "1:547491599584:web:2a9db8022fc8588525ec85"
  },
  // Định danh kho dữ liệu dùng chung của ban (mọi người phải giống nhau)
  docId: "kscp-ban-chung"
};

// Danh sách email được phép sử dụng phần mềm (phải trùng với firestore.rules)
const ALLOWED_EMAILS = [
  "vuongnb@klbgroup.vn",   // Admin - Trưởng ban QLCP
  "mydh@klbgroup.vn",
  "tuannn@klbgroup.vn",
  "diendp@klbgroup.vn",
  "bacbc@klbgroup.vn"
];

(function initCloudSync() {
  if (!CLOUD_CONFIG.firebase.apiKey) {
    console.log("[CloudSync] Chưa cấu hình đám mây — chạy chế độ lưu cục bộ (localStorage).");
    return;
  }
  if (typeof firebase === "undefined" || !firebase.firestore || !firebase.auth) {
    console.error("[CloudSync] Chưa nạp đủ thư viện Firebase (app/auth/firestore). Kiểm tra các thẻ <script> trong index.html.");
    return;
  }

  let auth, docRef;
  try {
    firebase.initializeApp(CLOUD_CONFIG.firebase);
    auth = firebase.auth();
    docRef = firebase.firestore().collection("kscp").doc(CLOUD_CONFIG.docId);
  } catch (e) {
    console.error("[CloudSync] Lỗi khởi tạo Firebase:", e);
    return;
  }

  const overlay = buildLoginOverlay();
  let syncStarted = false;

  // Theo dõi trạng thái đăng nhập
  auth.onAuthStateChanged((user) => {
    if (!user) {
      showLoginScreen();
      return;
    }
    const email = (user.email || "").toLowerCase();
    if (!ALLOWED_EMAILS.map((e) => e.toLowerCase()).includes(email)) {
      showDeniedScreen(email);
      auth.signOut();
      return;
    }
    // Đã đăng nhập và có quyền
    hideOverlay();
    if (!syncStarted) {
      syncStarted = true;
      startSync(user);
    }
  });

  // ---- ĐĂNG NHẬP GOOGLE ----
  function doGoogleLogin() {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    setOverlayMessage("Đang mở cửa sổ đăng nhập Google…", "");
    auth.signInWithPopup(provider).catch((err) => {
      console.error("[CloudSync] Lỗi đăng nhập:", err);
      if (err && (err.code === "auth/popup-blocked" || err.code === "auth/cancelled-popup-request" || err.code === "auth/operation-not-supported-in-this-environment")) {
        auth.signInWithRedirect(provider);
      } else {
        showLoginScreen("Đăng nhập chưa thành công. Vui lòng thử lại.");
      }
    });
  }

  // ---- ĐỒNG BỘ (chỉ chạy sau khi đăng nhập hợp lệ) ----
  function startSync(user) {
    const banner = showStatus("Đã đăng nhập: " + user.email + " — đang kết nối dữ liệu…", "#f59e0b");
    const origSave = window.db.saveData.bind(window.db);
    let applyingRemote = false;
    let pushTimer = null;

    // Chặn saveData: ghi localStorage như cũ, rồi đẩy lên mây (gộp trong 800ms)
    window.db.saveData = function (data) {
      origSave(data);
      if (applyingRemote) return;
      clearTimeout(pushTimer);
      pushTimer = setTimeout(() => {
        docRef.set({ payload: JSON.stringify(data), updatedAt: Date.now(), updatedBy: user.email })
          .catch((e) => {
            console.error("[CloudSync] Lỗi đẩy dữ liệu lên mây:", e);
            showStatus("Lỗi đồng bộ lên mây — dữ liệu vẫn được lưu cục bộ.", "#ef4444");
          });
      }, 800);
    };

    // Lắng nghe thay đổi real-time từ người dùng khác
    docRef.onSnapshot(
      (snap) => {
        if (!snap.exists) {
          docRef.set({ payload: JSON.stringify(window.db.getData()), updatedAt: Date.now(), updatedBy: user.email });
          setStatus(banner, "Đã tạo kho dữ liệu dùng chung.", "#22c55e", true);
          return;
        }
        if (snap.metadata.hasPendingWrites) return;
        try {
          const remote = snap.data();
          const data = JSON.parse(remote.payload);
          applyingRemote = true;
          origSave(data);
          applyingRemote = false;
          refreshUI();
          const when = remote.updatedAt ? new Date(remote.updatedAt).toLocaleTimeString("vi-VN") : "";
          const who = remote.updatedBy ? " bởi " + remote.updatedBy : "";
          setStatus(banner, "Đã đồng bộ" + (when ? " lúc " + when : "") + who, "#22c55e", true);
        } catch (e) {
          applyingRemote = false;
          console.error("[CloudSync] Lỗi đọc dữ liệu từ mây:", e);
        }
      },
      (err) => {
        console.error("[CloudSync] Mất kết nối tới Firestore:", err);
        showStatus("Mất kết nối dữ liệu dùng chung — đang dùng bản cục bộ.", "#ef4444");
      }
    );

    // Gắn nút Đăng xuất vào thanh trên cùng
    addLogoutButton(user);
  }

  function refreshUI() {
    try {
      if (typeof populateProjectSelector === "function") populateProjectSelector();
      const sel = document.getElementById("global-project-select");
      if (sel && window.state) {
        const stillExists =
          window.state.currentProjectId === "all" ||
          (window.db.getProjectById && window.db.getProjectById(window.state.currentProjectId));
        if (!stillExists) window.state.currentProjectId = "all";
        sel.value = window.state.currentProjectId;
      }
      if (typeof renderActiveTab === "function") renderActiveTab();
    } catch (e) {
      console.error("[CloudSync] Lỗi làm mới giao diện:", e);
    }
  }

  function addLogoutButton(user) {
    if (document.getElementById("btn-cloud-logout")) return;
    const header = document.querySelector(".header-actions") || document.body;
    const btn = document.createElement("button");
    btn.id = "btn-cloud-logout";
    btn.className = "btn btn-secondary";
    btn.title = "Đăng xuất khỏi " + user.email;
    btn.innerHTML = '<i data-lucide="log-out"></i>Đăng xuất';
    btn.addEventListener("click", () => {
      if (confirm("Đăng xuất khỏi tài khoản " + user.email + "?")) auth.signOut().then(() => location.reload());
    });
    header.appendChild(btn);
    if (window.lucide) window.lucide.createIcons();
  }

  // ---- GIAO DIỆN MÀN HÌNH ĐĂNG NHẬP ----
  function buildLoginOverlay() {
    let el = document.getElementById("login-overlay");
    if (el) return el;
    el = document.createElement("div");
    el.id = "login-overlay";
    el.style.cssText =
      "position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;" +
      "background:linear-gradient(135deg,#0f172a,#1e293b);font-family:system-ui,'Segoe UI',sans-serif;";
    el.innerHTML =
      '<div style="text-align:center;color:#e2e8f0;max-width:420px;padding:40px 32px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.5);">' +
      '<div style="font-size:34px;font-weight:800;letter-spacing:1px;color:#818cf8;margin-bottom:6px;">KSCP</div>' +
      '<div style="font-size:14px;color:#94a3b8;margin-bottom:28px;">Hệ thống Kiểm soát Chi phí Dự án</div>' +
      '<div id="login-message" style="font-size:14px;color:#cbd5e1;margin-bottom:20px;min-height:20px;">Vui lòng đăng nhập bằng tài khoản được cấp quyền.</div>' +
      '<button id="btn-google-login" style="display:inline-flex;align-items:center;gap:10px;background:#fff;color:#1f2937;border:none;padding:12px 22px;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.2);">' +
      '<svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.8-6.8C35.6 2.4 30.1 0 24 0 14.6 0 6.4 5.4 2.6 13.2l7.9 6.1C12.3 13.2 17.6 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.9 7.2l7.6 5.9c4.4-4.1 7.1-10.1 7.1-17.6z"/><path fill="#FBBC05" d="M10.5 28.3c-.5-1.4-.8-3-.8-4.8s.3-3.4.8-4.8l-7.9-6.1C1 15.9 0 19.8 0 24s1 8.1 2.6 11.4l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.1 0 11.3-2 15-5.5l-7.6-5.9c-2.1 1.4-4.8 2.3-7.4 2.3-6.4 0-11.7-3.7-13.5-9.8l-7.9 6.1C6.4 42.6 14.6 48 24 48z"/></svg>' +
      'Đăng nhập với Google</button>' +
      '<div style="font-size:12px;color:#64748b;margin-top:22px;">Chỉ các tài khoản trong ban được cấp quyền mới truy cập được.<br>Liên hệ Admin (Trưởng ban QLCP) nếu cần thêm quyền.</div>' +
      "</div>";
    (document.body || document.documentElement).appendChild(el);
    el.querySelector("#btn-google-login").addEventListener("click", doGoogleLogin);
    return el;
  }

  function showLoginScreen(msg) {
    overlay.style.display = "flex";
    const btn = overlay.querySelector("#btn-google-login");
    if (btn) btn.style.display = "inline-flex";
    setOverlayMessage(msg || "Vui lòng đăng nhập bằng tài khoản được cấp quyền.", msg ? "#f87171" : "");
  }

  function showDeniedScreen(email) {
    overlay.style.display = "flex";
    setOverlayMessage(
      'Tài khoản <b>' + (email || "này") + "</b> không có quyền sử dụng phần mềm.<br>Vui lòng đăng nhập bằng email đã được Admin cấp quyền.",
      "#f87171"
    );
    const btn = overlay.querySelector("#btn-google-login");
    if (btn) btn.style.display = "inline-flex";
  }

  function setOverlayMessage(html, color) {
    const m = overlay.querySelector("#login-message");
    if (m) {
      m.innerHTML = html;
      m.style.color = color || "#cbd5e1";
    }
  }

  function hideOverlay() {
    overlay.style.display = "none";
  }

  // ---- DẢI THÔNG BÁO TRẠNG THÁI ----
  function showStatus(text, color) {
    let el = document.getElementById("cloud-sync-status");
    if (!el) {
      el = document.createElement("div");
      el.id = "cloud-sync-status";
      el.style.cssText =
        "position:fixed;right:16px;bottom:16px;z-index:9999;padding:8px 14px;border-radius:8px;" +
        "font-size:13px;font-weight:600;color:#fff;box-shadow:0 4px 16px rgba(0,0,0,.3);" +
        "font-family:system-ui,sans-serif;transition:opacity .4s;opacity:1;max-width:360px;";
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.style.background = color;
    el.style.opacity = "1";
    return el;
  }
  function setStatus(el, text, color, autoHide) {
    if (!el) return;
    el.textContent = text;
    el.style.background = color;
    el.style.opacity = "1";
    if (autoHide) setTimeout(() => (el.style.opacity = "0"), 3000);
  }
})();
