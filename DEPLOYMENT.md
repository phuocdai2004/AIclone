# Deployment Guide - AIClone

## 1. Deploy Backend trên Render

### Bước 1: Chuẩn bị Backend
```bash
# Kiểm tra file requirements.txt có tất cả dependencies
cd backend
pip freeze > requirements.txt
```

### Bước 2: Trên Render Dashboard
1. Vào https://render.com/dashboard
2. Click **New +** → **Web Service**
3. Chọn kết nối GitHub repo `phuocdai2004/AIclone`
4. Cấu hình:
   - **Name**: `aiclone-backend`
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port 8000`
   - **Plan**: Free/Paid tùy chọn
   - **Region**: Singapore

### Bước 3: Thêm Environment Variables
Vào **Environment** tab, thêm:
```
GROQ_API_KEY=your_groq_api_key
GOOGLE_API_KEY=your_google_api_key
MONGODB_URI=your_mongodb_uri
```

### Bước 4: Deploy
- Click **Create Web Service**
- Render sẽ tự build và deploy từ GitHub
- Lấy URL: `https://aiclone-backend.onrender.com`

---

## 2. Deploy Frontend trên Vercel

### Bước 1: Chuẩn bị Frontend
Cập nhật API URL trong code:
```javascript
// src/App.jsx hoặc config file
const API_URL = process.env.REACT_APP_API_URL || 'https://aiclone-backend.onrender.com'
```

### Bước 2: Trên Vercel Dashboard
1. Vào https://vercel.com/dashboard
2. Click **Add New** → **Project**
3. Click **Import Git Repository**
4. Chọn `phuocdai2004/AIclone`
5. Cấu hình:
   - **Framework Preset**: React
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`

### Bước 3: Thêm Environment Variables
Vào **Environment Variables**, thêm:
```
REACT_APP_API_URL=https://aiclone-backend.onrender.com
```

### Bước 4: Deploy
- Click **Deploy**
- Vercel sẽ tự build từ GitHub
- Lấy URL: `https://your-project-name.vercel.app`

---

## 3. Cập nhật Frontend Config

Sau khi có Backend URL từ Render, cập nhật:

**frontend/src/config.js** (tạo file mới nếu chưa có):
```javascript
export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
```

Sử dụng trong code:
```javascript
import { API_URL } from './config';

axios.post(`${API_URL}/api/ai/chat`, { message })
```

---

## 4. Kiểm Tra Deploy

**Backend Check:**
```bash
curl https://aiclone-backend.onrender.com/docs
```

**Frontend Check:**
```bash
# Vào browser
https://your-project-name.vercel.app
```

---

## 5. Troubleshooting

### Backend không start
- Kiểm tra `requirements.txt` có đầy đủ
- Kiểm tra main.py path đúng
- Kiểm tra Environment Variables

### Frontend API call fail
- Kiểm tra CORS trong backend (main.py)
- Kiểm tra REACT_APP_API_URL đúng
- Kiểm tra Backend URL có sẵn

### CORS Error
Thêm vào backend/main.py:
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-vercel-url.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 6. Auto Deploy Setup

Cả Render và Vercel sẽ tự động deploy khi bạn push code lên GitHub branch `main`.

Để manual deploy:
- **Render**: Vào Web Service → click **Manual Deploy**
- **Vercel**: Vào Project → click **Redeploy**
