/**
 * cloud-sync.js — Phân quyền 3 cấp + đồng bộ dữ liệu dùng chung real-time (Firebase).
 *
 * MÔ HÌNH QUYỀN:
 *  - Khách (không đăng nhập / ai có link): CHỈ XEM. Mọi nút thêm/sửa/xóa bị ẩn.
 *  - Thành viên (đăng nhập, email trong roster): xem + thêm/sửa/xóa các mục nghiệp vụ.
 *  - Admin: toàn quyền (dự án, dữ liệu mẫu, sao lưu/phục hồi, cán bộ, thương hiệu, DUYỆT THÀNH VIÊN...).
 *
 * BẢO MẬT: firestore.rules chặn phía máy chủ — ai có link chỉ ĐỌC được; chỉ tài khoản
 * trong roster mới GHI. Vai trò lấy từ doc "kscp/_members" (Admin tự quản lý trong app).
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
  docId: "kscp-ban-chung"
};

// Admin gốc (KHÔNG XÓA ĐƯỢC, luôn có quyền — dùng làm admin dự phòng) + roster khởi tạo
const BOOTSTRAP_ADMINS = ["vuongnb@klbgroup.vn", "minhvuongktxd@gmail.com"];
const INITIAL_ADMINS = ["vuongnb@klbgroup.vn", "minhvuongktxd@gmail.com"];
const INITIAL_MEMBERS = ["mydh@klbgroup.vn", "tuannn@klbgroup.vn", "diendp@klbgroup.vn", "bacbc@klbgroup.vn"];
function isBootstrapAdmin(email) {
  return !!email && BOOTSTRAP_ADMINS.map(function (e) { return e.toLowerCase(); }).includes(email.toLowerCase());
}

// Nút chỉ Thành viên + Admin thấy (ẩn với Khách)
const EDIT_SELECTORS = [
  "#btn-add-budget", "#btn-add-bid", "#btn-add-contract", "#btn-add-addendum", "#btn-add-variation",
  "#btn-add-payment", "#btn-add-material", "#btn-add-support-deduction", "#btn-add-penalty-deduction",
  "#btn-add-risk", "#btn-ai-analyze-risks",
  "#btn-template-materials", "#btn-import-materials", "#btn-template-support-deductions",
  "#btn-import-support-deductions", "#btn-template-penalty-deductions", "#btn-import-penalty-deductions",
  ".edit-budget-btn", ".delete-budget-btn", ".edit-bid-btn", ".delete-bid-btn", ".edit-ctr-btn",
  ".delete-ctr-btn", ".edit-addendum-btn", ".delete-addendum-btn", ".edit-var-btn", ".delete-var-btn",
  ".edit-pay-btn", ".delete-pay-btn", ".edit-risk-btn", ".delete-risk-btn", ".edit-wbs-btn",
  ".edit-material-btn", ".delete-material-btn", ".edit-sd-btn", ".delete-sd-btn", ".edit-pd-btn", ".delete-pd-btn"
];
// Nút CHỈ Admin thấy
const ADMIN_SELECTORS = [
  "#btn-add-new-project", "#btn-reset-mock", "#btn-backup-json", "#btn-restore-json",
  "#btn-edit-current-project", "#btn-delete-current-project", "#btn-edit-tmdt-categories",
  "#btn-save-sla", "#btn-save-branding", "#btn-add-officer", "#btn-save-api-key", "#btn-edit-api-config",
  ".edit-proj-btn", ".edit-officer-btn", ".delete-officer-btn"
];

(function initCloudSync() {
  if (!CLOUD_CONFIG.firebase.apiKey) {
    console.log("[CloudSync] Chưa cấu hình đám mây — chạy chế độ lưu cục bộ.");
    return;
  }
  if (typeof firebase === "undefined" || !firebase.firestore || !firebase.auth) {
    console.error("[CloudSync] Chưa nạp đủ thư viện Firebase (app/auth/firestore).");
    return;
  }

  let auth, dataRef, membersRef;
  try {
    firebase.initializeApp(CLOUD_CONFIG.firebase);
    auth = firebase.auth();
    const fs = firebase.firestore();
    dataRef = fs.collection("kscp").doc(CLOUD_CONFIG.docId);
    membersRef = fs.collection("kscp").doc("_members");
  } catch (e) {
    console.error("[CloudSync] Lỗi khởi tạo Firebase:", e);
    return;
  }

  injectPermCss();

  let roster = { adminEmails: INITIAL_ADMINS.slice(), memberEmails: INITIAL_MEMBERS.slice() };
  let currentUser = null;
  let currentRole = "guest"; // guest | none | member | admin
  const origSave = window.db.saveData.bind(window.db);
  let applyingRemote = false;
  let pushTimer = null;
  let syncStarted = false;

  // ---- GHI DỮ LIỆU: luôn ghi localStorage; chỉ đẩy lên mây nếu có quyền sửa ----
  window.db.saveData = function (data) {
    origSave(data);
    if (applyingRemote) return;
    if (currentRole !== "member" && currentRole !== "admin") return; // Khách: không đẩy lên mây
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => {
      dataRef.set({ payload: JSON.stringify(data), updatedAt: Date.now(), updatedBy: currentUser ? currentUser.email : "" })
        .catch((e) => { console.error("[CloudSync] Lỗi đẩy dữ liệu:", e); showStatus("Lỗi đồng bộ lên mây.", "#ef4444"); });
    }, 800);
  };

  // ---- ĐỌC DỮ LIỆU real-time: chạy cho MỌI người (kể cả khách) ----
  function startDataSync() {
    if (syncStarted) return;
    syncStarted = true;
    const banner = showStatus("Đang tải dữ liệu dùng chung…", "#f59e0b");
    dataRef.onSnapshot(
      (snap) => {
        if (!snap.exists) {
          if (currentRole === "member" || currentRole === "admin") {
            dataRef.set({ payload: JSON.stringify(window.db.getData()), updatedAt: Date.now(), updatedBy: currentUser.email });
          }
          setStatus(banner, "Kho dữ liệu dùng chung sẵn sàng.", "#22c55e", true);
          return;
        }
        if (snap.metadata.hasPendingWrites) return;
        try {
          const remote = snap.data();
          applyingRemote = true;
          origSave(JSON.parse(remote.payload));
          applyingRemote = false;
          refreshUI();
          const when = remote.updatedAt ? new Date(remote.updatedAt).toLocaleTimeString("vi-VN") : "";
          const who = remote.updatedBy ? " bởi " + remote.updatedBy : "";
          setStatus(banner, "Đã cập nhật" + (when ? " lúc " + when : "") + who, "#22c55e", true);
        } catch (e) {
          applyingRemote = false;
          console.error("[CloudSync] Lỗi đọc dữ liệu:", e);
        }
      },
      (err) => { console.error("[CloudSync] Lỗi Firestore:", err); showStatus("Không tải được dữ liệu dùng chung.", "#ef4444"); }
    );
  }

  // ---- ROSTER (danh sách thành viên + vai trò) ----
  membersRef.onSnapshot((snap) => {
    if (snap.exists) {
      const d = snap.data();
      roster = {
        adminEmails: (d.adminEmails || []).slice(),
        memberEmails: (d.memberEmails || []).slice()
      };
    } else {
      roster = { adminEmails: INITIAL_ADMINS.slice(), memberEmails: INITIAL_MEMBERS.slice() };
    }
    recomputeRole();
  }, (e) => console.error("[CloudSync] Lỗi đọc roster:", e));

  function roleOf(email) {
    if (!email) return "guest";
    email = email.toLowerCase();
    const admins = roster.adminEmails.map((x) => x.toLowerCase());
    const members = roster.memberEmails.map((x) => x.toLowerCase());
    if (isBootstrapAdmin(email) || admins.includes(email)) return "admin";
    if (members.includes(email)) return "member";
    return "none";
  }

  function recomputeRole() {
    currentRole = currentUser ? roleOf(currentUser.email) : "guest";
    applyPermissions(currentRole);
    updateHeaderUI();
  }

  // ---- ĐĂNG NHẬP ----
  auth.onAuthStateChanged((user) => {
    currentUser = user || null;
    recomputeRole();
    // Nếu là Admin và roster chưa tồn tại trên mây -> khởi tạo
    if (user && roleOf(user.email) === "admin") {
      membersRef.get().then((s) => {
        if (!s.exists) membersRef.set({ adminEmails: INITIAL_ADMINS, memberEmails: INITIAL_MEMBERS, updatedAt: Date.now(), updatedBy: user.email }).catch(() => {});
      });
    }
  });

  function doGoogleLogin() {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    auth.signInWithPopup(provider).catch((err) => {
      console.error("[CloudSync] Lỗi đăng nhập:", err);
      if (err && (err.code === "auth/popup-blocked" || err.code === "auth/cancelled-popup-request")) auth.signInWithRedirect(provider);
      else alert("Đăng nhập chưa thành công: " + (err && err.message ? err.message : err));
    });
  }
  function doLogout() {
    if (confirm("Đăng xuất khỏi tài khoản " + (currentUser ? currentUser.email : "") + "?")) auth.signOut().then(() => location.reload());
  }

  // ---- PHÂN QUYỀN GIAO DIỆN ----
  function applyPermissions(role) {
    const canEdit = role === "member" || role === "admin";
    const isAdmin = role === "admin";
    setHidden(EDIT_SELECTORS, !canEdit);
    setHidden(ADMIN_SELECTORS, !isAdmin);
  }
  function setHidden(selectors, hide) {
    selectors.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        if (hide) el.setAttribute("data-perm-hide", "1");
        else el.removeAttribute("data-perm-hide");
      });
    });
  }
  function injectPermCss() {
    const s = document.createElement("style");
    s.textContent = "[data-perm-hide]{display:none !important;}";
    document.head.appendChild(s);
  }
  // Bảng vẽ lại liên tục -> theo dõi DOM để áp lại quyền
  let permTimer = null;
  const observer = new MutationObserver(() => {
    clearTimeout(permTimer);
    permTimer = setTimeout(() => applyPermissions(currentRole), 60);
  });
  if (document.body) observer.observe(document.body, { childList: true, subtree: true });

  function refreshUI() {
    try {
      if (typeof populateProjectSelector === "function") populateProjectSelector();
      const sel = document.getElementById("global-project-select");
      if (sel && window.state) {
        const ok = window.state.currentProjectId === "all" || (window.db.getProjectById && window.db.getProjectById(window.state.currentProjectId));
        if (!ok) window.state.currentProjectId = "all";
        sel.value = window.state.currentProjectId;
      }
      if (typeof renderActiveTab === "function") renderActiveTab();
      applyPermissions(currentRole);
    } catch (e) { console.error("[CloudSync] Lỗi làm mới UI:", e); }
  }

  // ---- THANH TRẠNG THÁI TÀI KHOẢN (góc phải trên) ----
  function updateHeaderUI() {
    const header = document.querySelector(".header-actions");
    if (!header) return;
    let box = document.getElementById("cloud-auth-box");
    if (!box) {
      box = document.createElement("div");
      box.id = "cloud-auth-box";
      box.style.cssText = "display:flex;align-items:center;gap:8px;margin-left:12px;";
      header.appendChild(box);
    }
    if (!currentUser) {
      box.innerHTML = "";
      const b = mkBtn("btn-cloud-login", "btn btn-primary", '<i data-lucide="log-in"></i>Đăng nhập');
      b.addEventListener("click", doGoogleLogin);
      box.appendChild(b);
    } else {
      const roleLabel = currentRole === "admin" ? "Admin" : currentRole === "member" ? "Thành viên" : "Chưa được cấp quyền";
      const roleColor = currentRole === "admin" ? "#f59e0b" : currentRole === "member" ? "#22c55e" : "#ef4444";
      box.innerHTML =
        '<span style="font-size:12px;color:var(--text-muted);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' +
        currentUser.email + ' · <b style="color:' + roleColor + '">' + roleLabel + "</b></span>";
      if (currentRole === "admin") {
        const m = mkBtn("btn-manage-members", "btn btn-secondary", '<i data-lucide="users-round"></i>Thành viên');
        m.addEventListener("click", openMembersModal);
        box.appendChild(m);
      }
      const out = mkBtn("btn-cloud-logout", "btn btn-secondary", '<i data-lucide="log-out"></i>Đăng xuất');
      out.addEventListener("click", doLogout);
      box.appendChild(out);
    }
    if (window.lucide) window.lucide.createIcons();
  }
  function mkBtn(id, cls, html) {
    const b = document.createElement("button");
    b.id = id; b.className = cls; b.innerHTML = html;
    return b;
  }

  // ---- MÀN HÌNH QUẢN LÝ THÀNH VIÊN (Admin) ----
  function openMembersModal() {
    let modal = document.getElementById("members-modal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "members-modal";
      modal.style.cssText = "position:fixed;inset:0;z-index:100001;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.6);";
      modal.innerHTML =
        '<div style="background:#1e293b;color:#e2e8f0;width:520px;max-width:94vw;max-height:88vh;overflow:auto;border-radius:14px;border:1px solid rgba(255,255,255,.1);padding:24px;font-family:system-ui,sans-serif;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;"><h2 style="margin:0;font-size:19px;color:#818cf8;">Quản lý thành viên</h2>' +
        '<button id="members-close" style="background:none;border:none;color:#94a3b8;font-size:24px;cursor:pointer;line-height:1;">&times;</button></div>' +
        '<p style="font-size:12.5px;color:#94a3b8;margin:0 0 16px;">Admin có toàn quyền. Thành viên được thêm/sửa/xóa dữ liệu nghiệp vụ. Khách (không đăng nhập) chỉ xem.</p>' +
        '<div id="members-list" style="margin-bottom:18px;"></div>' +
        '<div style="border-top:1px solid rgba(255,255,255,.1);padding-top:16px;">' +
        '<div style="font-weight:600;margin-bottom:8px;font-size:14px;">Thêm thành viên mới</div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
        '<input id="member-email" type="email" placeholder="email@klbgroup.vn" style="flex:1;min-width:200px;padding:9px 12px;border-radius:7px;border:1px solid rgba(255,255,255,.15);background:#0f172a;color:#e2e8f0;font-size:14px;">' +
        '<select id="member-role" style="padding:9px 12px;border-radius:7px;border:1px solid rgba(255,255,255,.15);background:#0f172a;color:#e2e8f0;font-size:14px;"><option value="member">Thành viên</option><option value="admin">Admin</option></select>' +
        '<button id="member-add" class="btn btn-primary">Thêm</button></div>' +
        '<div id="member-msg" style="font-size:12.5px;color:#f87171;margin-top:8px;min-height:16px;"></div></div>' +
        "</div>";
      document.body.appendChild(modal);
      modal.querySelector("#members-close").addEventListener("click", () => (modal.style.display = "none"));
      modal.querySelector("#member-add").addEventListener("click", addMember);
    }
    modal.style.display = "flex";
    renderMembersList();
  }

  function renderMembersList() {
    const list = document.getElementById("members-list");
    if (!list) return;
    const rows = [];
    const seen = {};
    // Admin gốc (dự phòng) luôn hiện đầu tiên
    BOOTSTRAP_ADMINS.forEach((e) => { const l = e.toLowerCase(); if (!seen[l]) { seen[l] = 1; rows.push(memberRow(e, "admin")); } });
    roster.adminEmails.forEach((e) => { const l = e.toLowerCase(); if (!seen[l]) { seen[l] = 1; rows.push(memberRow(e, "admin")); } });
    roster.memberEmails.forEach((e) => { const l = e.toLowerCase(); if (!seen[l]) { seen[l] = 1; rows.push(memberRow(e, "member")); } });
    list.innerHTML =
      '<div style="font-size:12px;color:#64748b;margin-bottom:6px;">Đang có ' + Object.keys(seen).length + " người</div>" + rows.join("");
    list.querySelectorAll("[data-remove]").forEach((b) =>
      b.addEventListener("click", () => removeMember(b.getAttribute("data-remove")))
    );
  }
  function memberRow(email, role) {
    const isBoot = isBootstrapAdmin(email);
    const badge = role === "admin" ? '<span style="color:#f59e0b;font-weight:600;">Admin</span>' : '<span style="color:#22c55e;">Thành viên</span>';
    const rm = isBoot
      ? '<span style="font-size:11px;color:#64748b;">Admin gốc</span>'
      : '<button data-remove="' + email + '" style="background:none;border:1px solid rgba(239,68,68,.4);color:#f87171;border-radius:6px;padding:3px 9px;font-size:12px;cursor:pointer;">Xóa</button>';
    return (
      '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;border-radius:8px;background:rgba(255,255,255,.03);margin-bottom:6px;">' +
      '<span style="font-size:13.5px;">' + email + " &nbsp; " + badge + "</span>" + rm + "</div>"
    );
  }

  function addMember() {
    const emailEl = document.getElementById("member-email");
    const roleEl = document.getElementById("member-role");
    const msg = document.getElementById("member-msg");
    const email = (emailEl.value || "").trim().toLowerCase();
    msg.style.color = "#f87171";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { msg.textContent = "Email không hợp lệ."; return; }
    const all = roster.adminEmails.concat(roster.memberEmails).map((x) => x.toLowerCase());
    if (all.includes(email)) { msg.textContent = "Email này đã có trong danh sách."; return; }
    const next = { adminEmails: roster.adminEmails.slice(), memberEmails: roster.memberEmails.slice() };
    if (roleEl.value === "admin") next.adminEmails.push(email);
    else next.memberEmails.push(email);
    saveRoster(next, msg, () => { emailEl.value = ""; });
  }
  function removeMember(email) {
    const low = email.toLowerCase();
    if (isBootstrapAdmin(email)) return;
    const next = {
      adminEmails: roster.adminEmails.filter((e) => e.toLowerCase() !== low),
      memberEmails: roster.memberEmails.filter((e) => e.toLowerCase() !== low)
    };
    saveRoster(next, document.getElementById("member-msg"));
  }
  function saveRoster(next, msg, onOk) {
    membersRef.set({ adminEmails: next.adminEmails, memberEmails: next.memberEmails, updatedAt: Date.now(), updatedBy: currentUser ? currentUser.email : "" })
      .then(() => {
        roster = next;
        recomputeRole();
        renderMembersList();
        if (msg) { msg.style.color = "#22c55e"; msg.textContent = "Đã lưu."; }
        if (onOk) onOk();
      })
      .catch((e) => { if (msg) { msg.style.color = "#f87171"; msg.textContent = "Lỗi lưu: " + e.message; } });
  }

  // ---- THANH TRẠNG THÁI ĐỒNG BỘ (góc phải dưới) ----
  function showStatus(text, color) {
    let el = document.getElementById("cloud-sync-status");
    if (!el) {
      el = document.createElement("div");
      el.id = "cloud-sync-status";
      el.style.cssText = "position:fixed;right:16px;bottom:16px;z-index:9999;padding:8px 14px;border-radius:8px;font-size:13px;font-weight:600;color:#fff;box-shadow:0 4px 16px rgba(0,0,0,.3);font-family:system-ui,sans-serif;transition:opacity .4s;max-width:360px;";
      document.body.appendChild(el);
    }
    el.textContent = text; el.style.background = color; el.style.opacity = "1";
    return el;
  }
  function setStatus(el, text, color, autoHide) {
    if (!el) return;
    el.textContent = text; el.style.background = color; el.style.opacity = "1";
    if (autoHide) setTimeout(() => (el.style.opacity = "0"), 3000);
  }

  // Bắt đầu: đọc dữ liệu cho mọi người, dựng thanh tài khoản, áp quyền khách
  startDataSync();
  updateHeaderUI();
  applyPermissions("guest");
})();
