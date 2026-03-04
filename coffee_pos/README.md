# Coffee POS System

Hệ thống quản lý bán hàng đa quán (multi-tenant), hỗ trợ nhiều user dùng cùng lúc.

## Tính năng

- ✅ Multi-tenant: Mỗi quán có dữ liệu riêng biệt
- ✅ Quản lý sản phẩm, danh mục, nguyên liệu
- ✅ Quản lý công thức món (tự động trừ nguyên liệu khi bán)
- ✅ Nhập kho nguyên liệu với giá vốn
- ✅ Báo cáo doanh thu, lợi nhuận
- ✅ Quản lý nhân viên (admin/staff)
- ✅ Mã giảm giá
- ✅ Responsive: Dùng được trên điện thoại
- ✅ Hóa đơn in được

## Công nghệ

- Backend: Flask + SQLAlchemy
- Database: PostgreSQL (production) / SQLite (local)
- Frontend: Vanilla JS + Tailwind CSS
- Deploy: Render / Railway / PythonAnywhere

## Deploy lên Render.com (Khuyến nghị)

### Bước 1: Tạo tài khoản
- Vào https://render.com
- Đăng ký bằng GitHub

### Bước 2: Tạo PostgreSQL Database
1. Dashboard → **New** → **PostgreSQL**
2. Đặt tên: `coffee-pos-db`
3. Chọn plan: **Free**
4. Click **Create Database**
5. Copy **Internal Database URL** để dùng ở bước sau

### Bước 3: Deploy Web Service
1. Dashboard → **New** → **Web Service**
2. Connect GitHub repo chứa code
3. Cấu hình:
   - **Name**: `coffee-pos`
   - **Environment**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app`
4. Thêm Environment Variables:
   - `DATABASE_URL`: (paste URL từ bước 2)
   - `SECRET_KEY`: (tạo chuỗi ngẫu nhiên 32 ký tự)
   - `PYTHON_VERSION`: `3.10.0`
5. Click **Create Web Service**

### Bước 4: Khởi tạo database
1. Vào **Shell** tab của Web Service
2. Chạy:
```bash
python
```
3. Trong Python shell:
```python
from app import app, db
with app.app_context():
    db.create_all()
```
4. Exit: `exit()`

### Bước 5: Truy cập
- Link sẽ có dạng: `https://coffee-pos-xxx.onrender.com`
- Tạo tài khoản shop đầu tiên tại trang đăng ký

## Deploy lên Railway.app

### Bước 1: Tạo project
1. https://railway.app → New Project
2. Deploy from GitHub repo

### Bước 2: Thêm PostgreSQL
1. New → Database → Add PostgreSQL

### Bước 3: Config
Railway tự động set `DATABASE_URL`, chỉ cần thêm:
- `SECRET_KEY`: (chuỗi ngẫu nhiên)

### Bước 4: Deploy
Tự động deploy khi push code lên GitHub.

## Chạy local (SQLite)

```bash
# Cài đặt
pip install -r requirements.txt

# Chạy
python app.py
```

Truy cập: http://localhost:5000

## Lưu ý bảo mật

1. **Thay đổi SECRET_KEY** trong production
2. **Không** dùng debug mode trên production
3. **Backup database** định kỳ
4. Dùng **HTTPS** (Render/Railway tự động cung cấp)

## Quản lý nhiều quán

Mỗi quán đăng ký sẽ có:
- Database riêng biệt (cách ly hoàn toàn)
- User admin riêng
- Sản phẩm, nguyên liệu, đơn hàng riêng

Các quán không thể xem dữ liệu của nhau.

## Hỗ trợ

Liên hệ nếu cần hỗ trợ deploy.
