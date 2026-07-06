# Hệ thống Quản lý & Kiểm soát Chi phí Dự án (AntiGravity PM)

Ứng dụng web quản lý chi phí dự án bất động sản & xây dựng: Tổng mức đầu tư, ngân sách gói thầu, đấu thầu, hợp đồng, phát sinh, thanh quyết toán, vật tư, khấu trừ, rủi ro và trợ lý AI.

## Đặc điểm kỹ thuật

- **Ứng dụng tĩnh (static)**: chỉ gồm `index.html`, `app.js`, `db.js`, `style.css` — không cần backend, không cần cài đặt.
- **Lưu trữ dữ liệu**: toàn bộ dữ liệu nằm trong `localStorage` của trình duyệt (theo từng máy/trình duyệt). Dùng nút **Sao lưu** để xuất file JSON và **Phục hồi** để nạp lại — đây là cách chuyển dữ liệu giữa các máy và lưu trữ lâu dài.
- Thư viện ngoài (Lucide, Chart.js, ExcelJS) tải qua CDN — cần Internet để hiển thị đầy đủ biểu đồ/biểu tượng/xuất Excel.

## Chạy tại máy

Do trình duyệt chặn `file://` khi tải nhiều file JS, cần chạy qua một web server tĩnh:

```bash
# Cách 1: Python (có sẵn trên hầu hết máy)
python -m http.server 8734
# rồi mở http://localhost:8734

# Cách 2: Node
npx serve .
```

## Đưa lên web cho cả ban dùng

Vì đây là ứng dụng tĩnh, có thể host miễn phí trên GitHub Pages, Netlify hoặc Cloudflare Pages. Xem mục hướng dẫn triển khai.

## Sao lưu dữ liệu (quan trọng)

Dữ liệu chỉ nằm trên trình duyệt của từng người. **Xóa cache/dữ liệu trình duyệt = mất dữ liệu.** Hãy bấm **Sao lưu** định kỳ để tải file JSON về máy hoặc lưu lên ổ chung.
