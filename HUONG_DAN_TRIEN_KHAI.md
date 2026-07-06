# Hướng dẫn đưa phần mềm lên web cho cả ban dùng chung

Anh đã chọn: **dữ liệu dùng chung real-time** + host trên **GitHub Pages** (miễn phí). Tổ hợp:

- **GitHub Pages** phục vụ giao diện (miễn phí, vĩnh viễn).
- **Firebase Firestore** làm kho dữ liệu dùng chung trên mây (gói miễn phí Spark: 1 GB lưu trữ, 50.000 lượt đọc/ngày — dư cho một ban).

Toàn bộ đều miễn phí và không cần thẻ tín dụng.

---

## PHẦN 1 — Tạo kho dữ liệu dùng chung (Firebase)

1. Vào https://console.firebase.google.com → đăng nhập bằng tài khoản Google → **Add project** → đặt tên (ví dụ `kscp-ban`) → bỏ qua Google Analytics → **Create project**.
2. Menu trái → **Build → Firestore Database** → **Create database** → chọn vị trí `asia-southeast1 (Singapore)` → chọn **Start in test mode** → **Enable**.
   - *Test mode cho phép đọc/ghi tự do trong 30 ngày. Xem PHẦN 4 để khóa lại an toàn.*
3. Bấm biểu tượng ⚙️ (Project settings) → kéo xuống mục **Your apps** → bấm biểu tượng web `</>` → đặt nickname → **Register app**.
4. Màn hình hiện đoạn `const firebaseConfig = { apiKey: "...", authDomain: "...", ... }`. **Copy các giá trị này.**
5. Mở file `cloud-sync.js`, dán các giá trị vào phần `CLOUD_CONFIG.firebase`:
   ```js
   const CLOUD_CONFIG = {
     firebase: {
       apiKey: "AIza...",          // dán từ Firebase
       authDomain: "kscp-ban.firebaseapp.com",
       projectId: "kscp-ban",
       storageBucket: "kscp-ban.appspot.com",
       messagingSenderId: "1234567890",
       appId: "1:1234567890:web:abcdef"
     },
     docId: "kscp-ban-chung"       // giữ nguyên; mọi người phải giống nhau
   };
   ```
6. Lưu file. Xong — từ giờ mọi thay đổi sẽ tự đồng bộ giữa tất cả người dùng.

> Nếu để trống `apiKey`, app vẫn chạy bình thường ở chế độ lưu cục bộ (không đồng bộ).

---

## PHẦN 2 — Đưa giao diện lên GitHub Pages

1. Tạo tài khoản tại https://github.com (miễn phí).
2. Bấm **New repository** → đặt tên (ví dụ `kscp`) → chọn **Public** → **Create repository**.
3. Tải code lên. Nếu chưa quen dòng lệnh, dùng **GitHub Desktop** (kéo-thả), hoặc dùng lệnh:
   ```bash
   git remote add origin https://github.com/<tên-của-anh>/kscp.git
   git branch -M main
   git push -u origin main
   ```
   *(Kho đã được khởi tạo git sẵn, chỉ cần push.)*
4. Trên GitHub, vào repo → **Settings → Pages** → mục **Branch** chọn `main` / `(root)` → **Save**.
5. Chờ ~1 phút, GitHub hiện địa chỉ dạng `https://<tên-của-anh>.github.io/kscp/`. Gửi link này cho cả ban.

---

## PHẦN 3 — Quy tắc sử dụng cho cả ban

- Mọi người mở cùng một link, dùng chung một kho dữ liệu. Ai sửa thì người khác thấy cập nhật trong vài giây (góc phải dưới hiện trạng thái đồng bộ).
- **Hạn chế:** mô hình "ghi sau đè ghi trước". Nếu hai người sửa **cùng lúc**, thay đổi của người lưu sau sẽ được giữ. Nên phân công rõ ai phụ trách nhập phần nào, tránh cùng lúc sửa cùng dữ liệu.
- **Sao lưu định kỳ:** bấm nút **Sao lưu** (đầu trang) hàng tuần để tải file JSON về ổ chung — phòng khi cần khôi phục.

---

## PHẦN 4 — Khóa bảo mật Firestore (làm sau 30 ngày, quan trọng)

Test mode sẽ hết hạn sau 30 ngày. Để dữ liệu chi phí không bị người lạ đọc/ghi:

- **Đơn giản nhất (nội bộ tin cậy):** vào Firestore → **Rules**, đặt luật chỉ cho phép nếu biết `docId`. Mức bảo vệ cơ bản.
- **Chắc chắn hơn:** bật **Authentication** (đăng nhập Google/email) rồi đặt Rules chỉ cho tài khoản trong ban. Việc này cần thêm ít code đăng nhập — khi anh tới bước này, báo em làm tiếp.

---

## Tóm tắt việc anh cần làm

| Bước | Việc | Ai làm |
|---|---|---|
| 1 | Tạo Firebase project + Firestore, lấy config | Anh (theo PHẦN 1) |
| 2 | Dán config vào `cloud-sync.js` | Anh, hoặc gửi config cho em dán |
| 3 | Tạo GitHub repo + push + bật Pages | Anh (theo PHẦN 2) |
| 4 | Khóa bảo mật Firestore sau 30 ngày | Anh + em hỗ trợ |
