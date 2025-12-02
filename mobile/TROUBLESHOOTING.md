# 故障排除指南

## 常見錯誤

### `getDevServer is not a function` 錯誤

這個錯誤通常發生在開發服務器連接問題時。解決方法：

1. **清除緩存並重新啟動**：
   ```bash
   cd mobile
   npx expo start --clear
   ```

2. **清除所有緩存**：
   ```bash
   # 清除 Metro bundler 緩存
   npx expo start --clear
   
   # 或者手動清除
   rm -rf node_modules
   npm install
   npx expo start --clear
   ```

3. **確保 Expo Router 配置正確**：
   - `package.json` 中的 `main` 字段應該是 `"expo-router/entry"`
   - 不應該有 `index.ts` 或 `App.tsx` 文件（已刪除）
   - 確保 `app/` 目錄結構正確

4. **重新安裝依賴**：
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

### WebSocket 連接問題

如果遇到 WebSocket 連接錯誤：

1. **檢查環境變數**：
   - 確保 `.env` 文件存在並配置正確
   - `EXPO_PUBLIC_WS_BASE_URL` 應該指向正確的 WebSocket 地址

2. **檢查後端服務**：
   - 確保後端 API 正在運行
   - 檢查 WebSocket 端點是否可訪問

### 模塊解析錯誤

如果遇到模塊找不到的錯誤：

1. **檢查 TypeScript 配置**：
   - 確保 `tsconfig.json` 配置正確
   - 檢查路徑別名配置

2. **重新構建**：
   ```bash
   npx expo start --clear
   ```

## 開發建議

1. **使用 Expo Go**：
   - 在手機上安裝 Expo Go 應用
   - 掃描 QR 碼進行快速開發和測試

2. **清除緩存**：
   - 如果遇到奇怪的錯誤，首先嘗試清除緩存
   - 使用 `--clear` 標誌啟動開發服務器

3. **檢查依賴版本**：
   - 確保所有依賴版本兼容
   - 特別是 `expo` 和 `expo-router` 的版本

