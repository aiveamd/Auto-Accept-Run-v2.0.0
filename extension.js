
const vscode = require('vscode');

let autoAcceptInterval = null;
let enabled = true;
let statusBarItem;

// 完整的 Antigravity accept commands 列表
// 來源：munkhin 的 Auto Accept Agent 擴充套件 + 額外補充
const ACCEPT_COMMANDS = [
    // Agent 步驟接受
    'antigravity.agent.acceptAgentStep',

    // 通用接受
    'antigravity.command.accept',

    // 檔案修改接受
    'antigravity.prioritized.agentAcceptAllInFile',
    'antigravity.prioritized.agentAcceptFocusedHunk',

    // 自動補全接受
    'antigravity.prioritized.supercompleteAccept',
    'antigravity.acceptCompletion',

    // 終端指令接受
    'antigravity.terminal.accept',
    'antigravity.terminalCommand.accept',
    'antigravity.prioritized.terminalSuggestion.accept',
];

function activate(context) {
    // 註冊切換指令
    let disposable = vscode.commands.registerCommand('unlimited.toggle', function () {
        enabled = !enabled;
        updateStatusBar();
        if (enabled) {
            vscode.window.showInformationMessage('Auto-Accept: ON ✅');
        } else {
            vscode.window.showInformationMessage('Auto-Accept: OFF 🛑');
        }
    });
    context.subscriptions.push(disposable);

    try {
        // 狀態列顯示
        statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 10000);
        statusBarItem.command = 'unlimited.toggle';
        context.subscriptions.push(statusBarItem);

        updateStatusBar();
        statusBarItem.show();
    } catch (e) {
        // 靜默失敗
    }

    // 啟動輪詢
    startLoop();

    // 輸出啟動資訊
    const outputChannel = vscode.window.createOutputChannel('Auto Accept (Custom)');
    outputChannel.appendLine(`Auto Accept (Custom) 已啟動`);
    outputChannel.appendLine(`監控 ${ACCEPT_COMMANDS.length} 個 accept commands`);
    outputChannel.appendLine(`輪詢間隔: 400ms`);
    context.subscriptions.push(outputChannel);
}

function updateStatusBar() {
    if (!statusBarItem) return;

    if (enabled) {
        statusBarItem.text = "✅ Auto-Accept: ON";
        statusBarItem.tooltip = "自動接受已啟用 (點擊暫停)\n監控 " + ACCEPT_COMMANDS.length + " 個 commands";
        statusBarItem.backgroundColor = undefined;
    } else {
        statusBarItem.text = "🛑 Auto-Accept: OFF";
        statusBarItem.tooltip = "自動接受已暫停 (點擊恢復)";
        statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    }
}

function startLoop() {
    // 每 400ms 嘗試執行所有 accept commands
    autoAcceptInterval = setInterval(async () => {
        if (!enabled) return;

        // 同時嘗試所有 commands，失敗的會被靜默忽略
        await Promise.allSettled(
            ACCEPT_COMMANDS.map(cmd =>
                vscode.commands.executeCommand(cmd).catch(() => { })
            )
        );
    }, 400);
}

function deactivate() {
    if (autoAcceptInterval) {
        clearInterval(autoAcceptInterval);
    }
}

module.exports = {
    activate,
    deactivate
}
