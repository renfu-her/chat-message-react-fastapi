# 修復 getDevServer 錯誤

## 問題
`TypeError: getDevServer is not a function (it is Object)`

## 解決步驟

### 1. 清除所有緩存和構建文件
```bash
cd mobile

# 清除 Metro bundler 緩存
rm -rf .expo
rm -rf node_modules/.cache

# 清除 npm 緩存
npm cache clean --force

# 刪除 node_modules 和 lock 文件
rm -rf node_modules
rm -rf package-lock.json
```

### 2. 重新安裝依賴
```bash
npm install
```

### 3. 清除 Expo 緩存並啟動
```bash
# 使用 --clear 標誌清除所有緩存
npx expo start --clear

# 或者使用簡寫
npx expo start -c
```

### 4. 如果問題仍然存在，嘗試重置
```bash
# 完全重置
rm -rf .expo node_modules package-lock.json
npm install
npx expo start --clear --reset-cache
```

## 已修復的配置

1. ✅ 禁用了 `newArchEnabled`（在 app.json 中設置為 false）
2. ✅ 刪除了衝突的 `index.ts` 和 `App.tsx` 文件
3. ✅ 創建了 `metro.config.js` 配置文件

## 注意事項

- 確保使用 `expo-router/entry` 作為入口點（已在 package.json 中配置）
- 不要手動創建 `index.ts` 或 `App.tsx` 文件
- 使用 Expo Router 時，路由由 `app/` 目錄結構自動處理

