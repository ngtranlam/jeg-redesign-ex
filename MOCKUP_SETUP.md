# Hướng dẫn tích hợp Dynamic Mockups API

## 1. Cài đặt API Key

### Bước 1: Đăng ký tài khoản Dynamic Mockups
- Truy cập: https://app.dynamicmockups.com
- Đăng ký tài khoản mới
- Xác thực email

### Bước 2: Lấy API Key
- Đăng nhập vào dashboard
- Vào phần "API" hoặc "Settings"
- Copy API Key

### Bước 3: Cấu hình API Key
Thêm biến môi trường `DYNAMIC_MOCKUPS_API_KEY` vào backend:

**Local development:**
```bash
export DYNAMIC_MOCKUPS_API_KEY="your_api_key_here"
```

**Render.com:**
- Vào dashboard của service
- Settings > Environment Variables
- Thêm: `DYNAMIC_MOCKUPS_API_KEY` = `your_api_key_here`

## 2. Cài đặt thư viện

Backend đã được cập nhật với thư viện `httpx`. Chạy:

```bash
cd llm-extract-image
pip install -r app/requirements.txt
```

## 3. Test API

### Test lấy collections:
```bash
curl -X GET "https://jeg-redesign.onrender.com/dynamic-mockups/collections"
```

### Test lấy mockups:
```bash
curl -X GET "https://jeg-redesign.onrender.com/dynamic-mockups/mockups"
```

## 4. Sử dụng Extension

1. **Chụp ảnh** → Chọn vùng màn hình
2. **Chọn Provider/Model** → OpenAI hoặc Gemini
3. **Chọn Mode** → Canny hoặc Normal
4. **Chọn Mockup Settings** → Gender, Product, View, Color
5. **Nhấn RUN** → Trích xuất design
6. **Nhấn Create Mockup** → Tạo mockup từ design

## 5. Cấu trúc API

### Endpoints đã thêm:
- `GET /dynamic-mockups/collections` - Lấy danh sách collections
- `GET /dynamic-mockups/mockups` - Lấy danh sách mockups
- `POST /dynamic-mockups/create-mockup` - Tạo mockup từ design

### Parameters cho create-mockup:
- `design_image` (file) - Ảnh design đã trích xuất
- `mockup_uuid` (string) - UUID của mockup template
- `smart_object_uuid` (string) - UUID của smart object
- `print_area_preset_uuid` (optional) - UUID của print area preset

## 6. Troubleshooting

### Lỗi "API key not configured":
- Kiểm tra biến môi trường `DYNAMIC_MOCKUPS_API_KEY`
- Restart backend service

### Lỗi "API error: 401":
- API key không hợp lệ hoặc hết hạn
- Kiểm tra lại API key trong dashboard

### Lỗi "Render API error":
- Mockup UUID hoặc Smart Object UUID không đúng
- Kiểm tra danh sách mockups có sẵn

## 7. Cải tiến tiếp theo

1. **Lọc mockups theo filter**: Implement filter theo gender, product, view, color
2. **Preview mockup**: Hiển thị thumbnail mockup trước khi tạo
3. **Multiple mockups**: Tạo nhiều mockup cùng lúc
4. **Custom upload**: Upload mockup template riêng
5. **Mockup gallery**: Lưu và quản lý mockups đã tạo

## 8. Tài liệu tham khảo

- [Dynamic Mockups API Docs](https://docs.dynamicmockups.com/api-reference/)
- [Get Mockups API](https://docs.dynamicmockups.com/api-reference/get-mockups-api)
- [Render API](https://docs.dynamicmockups.com/api-reference/render-api) 