# Auto Accept Agent (Unlocked) v12.7.1

基於 MunKhin 的 Auto Accept Agent v12.7.0，移除所有付費限制。

## 安裝步驟

### 1. 安裝擴充套件
```bash
# 下載 vsix（用瀏覽器去 GitHub releases 下載，或用 git clone）
git clone https://github.com/aiveamd/Auto-Accept-Run-v2.0.0.git

# 安裝 vsix
antigravity --install-extension ./antigravity-auto-accept-custom-12.7.1.vsix --force
```

### 2. 設定 CDP（必要）

以**系統管理員身份**開啟 PowerShell，貼上以下腳本：

```powershell
$WshShell = New-Object -ComObject WScript.Shell
$searchLocations = @(
    [Environment]::GetFolderPath('Desktop'),
    "$env:USERPROFILE\Desktop",
    "$env:USERPROFILE\OneDrive\Desktop",
    "$env:APPDATA\Microsoft\Windows\Start Menu\Programs",
    "$env:ProgramData\Microsoft\Windows\Start Menu\Programs",
    "$env:USERPROFILE\AppData\Roaming\Microsoft\Internet Explorer\Quick Launch\User Pinned\TaskBar"
)
$foundShortcuts = @()
foreach ($location in $searchLocations) {
    if (Test-Path $location) {
        $shortcuts = Get-ChildItem -Path $location -Recurse -Filter "*.lnk" -ErrorAction SilentlyContinue | Where-Object { $_.Name -like "*Antigravity*" }
        $foundShortcuts += $shortcuts
    }
}
if ($foundShortcuts.Count -eq 0) {
    $exePath = "$env:LOCALAPPDATA\Programs\Antigravity\Antigravity.exe"
    if (Test-Path $exePath) {
        $desktopPath = [Environment]::GetFolderPath('Desktop')
        $shortcutPath = "$desktopPath\Antigravity.lnk"
        $shortcut = $WshShell.CreateShortcut($shortcutPath)
        $shortcut.TargetPath = $exePath
        $shortcut.Arguments = "--remote-debugging-port=9000"
        $shortcut.Save()
        Write-Host "Created: $shortcutPath"
    }
} else {
    foreach ($shortcutFile in $foundShortcuts) {
        $shortcut = $WshShell.CreateShortcut($shortcutFile.FullName)
        $originalArgs = $shortcut.Arguments
        if ($originalArgs -match "--remote-debugging-port=\d+") {
            $shortcut.Arguments = $originalArgs -replace "--remote-debugging-port=\d+", "--remote-debugging-port=9000"
        } else {
            $shortcut.Arguments = "--remote-debugging-port=9000 " + $originalArgs
        }
        $shortcut.Save()
        Write-Host "Updated: $($shortcutFile.FullName)"
    }
}
Write-Host "Done! Restart Antigravity."
```

### 3. 重啟 Antigravity
完全關閉 Antigravity，再用桌面捷徑或開始選單重新開啟。

## Antigravity 更新後修復

每次 Antigravity 更新後，CDP flag 會被覆蓋。只需要：
1. 重跑上面的 PowerShell 腳本
2. 重啟 Antigravity

## 狀態列說明

- `✓ Auto Accept: ON` — 正常運行中
- `Background: OFF/ON` — 多聊天背景模式
- `⚙️` — 設定面板
