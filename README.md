# Antigravity Auto Accept 自動確認工具

## 問題
Antigravity 的內建設定 (Auto Execution: Always Proceed, Review Policy: Always Proceed) 以及擴充套件 (Auto Accept Agent) 都無法正常自動確認。

## 解決方案

### 方案一：JavaScript Console 注入（推薦 ✅）

**步驟：**

1. 打開 Antigravity
2. 按 `Help` → `Toggle Developer Tools`（或按 `Ctrl+Shift+I`）
3. 切到 **Console** 分頁
4. 複製 `auto-accept.js`（完整版）或 `auto-accept-mini.js`（精簡版）的內容
5. 貼到 Console 裡，按 **Enter**
6. 看到 `🚀 Auto Accept ON!` 就代表成功了

**控制指令（在 Console 輸入）：**

```js
__autoAccept.stop()    // 停止自動確認
__autoAccept.start()   // 重新啟動
__autoAccept.status()  // 查看狀態和累計點擊次數
__autoAccept.reset()   // 重置計數器
```

> ⚠️ **注意**：每次重啟 Antigravity 都需要重新貼一次腳本。

---

### 方案二：搭配 Advanced Settings 設定

除了腳本之外，建議也調整以下進階設定：

1. 打開 Antigravity 設定
2. 點 **Advanced Settings**
3. 找到 **Terminal** 區段
4. 將 **Terminal Command Auto Execution** 改為 `Turbo`（如果有的話）
5. 確認 **Agent Review Policy** = `Always Proceed`
6. 確認 **Deny List** 是空的（沒有被封鎖的指令）

---

### 方案三：安裝 pesosz 的 Antigravity Auto Accept 擴充套件

如果上面兩個方案仍有問題，可以試試這個擴充套件：

1. 在 Antigravity 的 Extensions 搜尋 `Antigravity Auto Accept`（發布者：pesosz）
2. 安裝並重啟 Antigravity
3. 用 `Ctrl+Alt+Shift+U` 切換開關
4. 狀態列會顯示 🟢（啟用）或 🔴（停用）

---

## 檔案說明

| 檔案 | 說明 |
|------|------|
| `auto-accept.js` | 完整版腳本，有詳細註解，可自訂設定 |
| `auto-accept-mini.js` | 精簡版一行腳本，方便快速貼到 Console |
| `README.md` | 本說明文件 |

## 自訂設定（完整版）

打開 `auto-accept.js`，修改 `CONFIG` 物件：

```js
const CONFIG = {
  CHECK_INTERVAL: 800,         // 檢查間隔（毫秒）
  AUTO_ACCEPT_EDITS: true,     // 自動接受檔案修改
  AUTO_ACCEPT_COMMANDS: true,  // 自動執行終端指令
  AUTO_ACCEPT_SAVE: true,      // 自動確認儲存
  SHOW_LOGS: true,             // Console 顯示日誌
};
```
