# Cloudflare 緩存問題修復指南

## 問題描述

當通過 `https://chat.ai-tracks.com` 訪問上傳的文件時，返回 404 錯誤，但直接訪問 `localhost:8097` 可以正常訪問。這是因為 Cloudflare 正在緩存之前的 404 響應。

## 解決步驟

### 1. 確認 Nginx 配置已應用

```bash
# 測試 Nginx 配置
sudo nginx -t

# 重新加載 Nginx（如果配置有更新）
sudo systemctl reload nginx
```

### 2. 清除 Cloudflare 緩存

#### 方法 1：通過 Cloudflare Dashboard（推薦）

1. 登錄 Cloudflare Dashboard
2. 選擇域名 `chat.ai-tracks.com`
3. 進入 **Caching** → **Configuration**
4. 點擊 **Purge Everything** 清除所有緩存
   - 或者使用 **Custom Purge** 只清除特定 URL：
     - `https://chat.ai-tracks.com/api/uploads/*`

#### 方法 2：通過 Cloudflare API

```bash
# 清除所有緩存
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache" \
  -H "Authorization: Bearer {api_token}" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'

# 清除特定 URL
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache" \
  -H "Authorization: Bearer {api_token}" \
  -H "Content-Type: application/json" \
  --data '{"files":["https://chat.ai-tracks.com/api/uploads/messages/45ee7f20-dffa-46cf-b82d-edb733e0bd37.webp"]}'
```

### 3. 驗證修復

```bash
# 測試文件訪問
curl -I https://chat.ai-tracks.com/api/uploads/messages/45ee7f20-dffa-46cf-b82d-edb733e0bd37.webp

# 應該返回 200 OK，而不是 404
```

### 4. 檢查 Nginx 日誌

```bash
# 查看上傳文件的訪問日誌
sudo tail -f /var/log/nginx/chat.ai-tracks.com-uploads.log

# 查看錯誤日誌
sudo tail -f /var/log/nginx/chat.ai-tracks.com-error.log
```

## 防止未來緩存問題

### Cloudflare 頁面規則

在 Cloudflare Dashboard 中創建頁面規則：

1. 進入 **Rules** → **Page Rules**
2. 創建新規則：
   - **URL Pattern**: `chat.ai-tracks.com/api/uploads/*`
   - **Settings**:
     - **Cache Level**: Bypass（不緩存）
     - 或者 **Cache Level**: Standard，但設置 **Edge Cache TTL**: Respect Existing Headers

### Nginx 配置

已更新的 Nginx 配置會：
- 添加 `Cache-Control` 頭部
- 添加 `X-Cache-Status: BYPASS` 頭部
- 使用 `always` 標誌確保即使錯誤響應也添加頭部

## 調試技巧

### 1. 檢查請求是否到達後端

```bash
# 查看後端日誌
sudo journalctl -u chat-ai-tracks-com-uvicorn-gunicorn.service -f

# 如果請求沒有到達後端，檢查 Nginx 配置
sudo nginx -T | grep -A 20 "location.*uploads"
```

### 2. 測試本地 Nginx

```bash
# 直接測試 Nginx 代理
curl -I http://localhost/api/uploads/messages/45ee7f20-dffa-46cf-b82d-edb733e0bd37.webp \
  -H "Host: chat.ai-tracks.com"
```

### 3. 檢查 Cloudflare 緩存狀態

在響應頭中查看：
- `cf-cache-status: HIT` - 從緩存返回（可能是舊的 404）
- `cf-cache-status: MISS` - 未緩存，從源站獲取
- `cf-cache-status: BYPASS` - 繞過緩存

## 常見問題

### Q: 清除緩存後還是 404？

A: 檢查：
1. Nginx 配置是否正確應用：`sudo nginx -t && sudo systemctl reload nginx`
2. 後端服務是否運行：`sudo systemctl status chat-ai-tracks-com-uvicorn-gunicorn.service`
3. 文件是否真的存在：`ls -la /path/to/uploads/messages/45ee7f20-dffa-46cf-b82d-edb733e0bd37.webp`
4. Nginx 日誌是否有錯誤

### Q: 如何永久防止 Cloudflare 緩存 404？

A: 在 Cloudflare 頁面規則中設置 `/api/uploads/*` 為 Bypass，或者使用 Cloudflare Workers 來處理。

### Q: 為什麼 localhost 可以訪問但域名不行？

A: 因為：
- `localhost:8097` 直接訪問後端，不經過 Nginx 和 Cloudflare
- `https://chat.ai-tracks.com` 經過 Nginx → Cloudflare → 源站
- Cloudflare 可能緩存了之前的 404 響應

