
const vscode = require('vscode');

let autoAcceptInterval = null;
let enabled = true;
let statusBarItem;
let domInjected = false;

// 完整的 Antigravity accept commands 列表
const ACCEPT_COMMANDS = [
    'antigravity.agent.acceptAgentStep',
    'antigravity.command.accept',
    'antigravity.prioritized.agentAcceptAllInFile',
    'antigravity.prioritized.agentAcceptFocusedHunk',
    'antigravity.prioritized.supercompleteAccept',
    'antigravity.acceptCompletion',
    'antigravity.terminal.accept',
    'antigravity.terminalCommand.accept',
    'antigravity.prioritized.terminalSuggestion.accept',
    'antigravity.simpleBrowser.allow',
    'antigravity.browser.allow',
    'antigravity.browser.allowJavaScript',
    'antigravity.dialog.accept',
    'antigravity.dialog.confirm',
    'antigravity.notification.accept',
];

// DOM auto-click 腳本（會被注入到 Electron 主視窗）
const DOM_SCRIPT = `
(function(){
  if(window.__aaInjected) return;
  window.__aaInjected = true;
  const P=['accept all','accept','run command','run','approve','always allow','allow','confirm','save all','save','yes','proceed','continue','ok','全部接受','接受','執行','確認','儲存','允許'];
  const X=['cancel','reject','deny','delete','remove','discard','revert','auto-accept','auto accept','toggle','取消','拒絕','刪除'];
  let n=0;
  function g(e){let t='';for(const c of e.childNodes)if(c.nodeType===3)t+=c.textContent;return(t.trim()||e.textContent||'').trim().toLowerCase()}
  function s(t){if(!t||t.length>100)return false;for(const p of X)if(t.includes(p))return false;for(const p of P)if(t.includes(p))return true;return false}
  function v(e){try{const st=window.getComputedStyle(e);return st.display!=='none'&&st.visibility!=='hidden'&&st.opacity!=='0'}catch(x){return true}}
  function f(root,d){
    if(!root||d>10)return;
    try{
      const els=root.querySelectorAll('button,[role="button"],a[role="button"],.monaco-button,.action-label,.dialog-button,.monaco-dialog-button');
      for(const e of els){const t=g(e);if(t&&s(t)&&!e.disabled&&v(e)){e.click();n++;console.log('[AA-DOM] clicked: '+t+' (#'+n+')')}}
      root.querySelectorAll('iframe').forEach(i=>{try{if(i.contentDocument)f(i.contentDocument,d+1)}catch(x){}});
      root.querySelectorAll('*').forEach(e=>{if(e.shadowRoot)f(e.shadowRoot,d+1)});
    }catch(x){}
  }
  setInterval(()=>f(document,0),500);
  new MutationObserver(muts=>{for(const m of muts)for(const nd of m.addedNodes)if(nd.nodeType===1){const cn=(nd.className||'').toString().toLowerCase(),rl=(nd.getAttribute&&nd.getAttribute('role')||'').toLowerCase();if(rl==='dialog'||rl==='alertdialog'||cn.includes('dialog')||cn.includes('confirm'))setTimeout(()=>f(nd,0),100)}}).observe(document.body,{childList:true,subtree:true});
  console.log('[AA-DOM] Auto-click script injected successfully');
})();
`;

// 嘗試透過 Electron API 注入 DOM 腳本
function tryInjectDOMScript(outputChannel) {
    if (domInjected) return;

    const attempts = [
        // 方法 1: 直接 require electron
        () => {
            const { BrowserWindow } = require('electron');
            return BrowserWindow.getAllWindows();
        },
        // 方法 2: 透過 process.mainModule
        () => {
            const mainModule = process.mainModule || require.main;
            if (!mainModule) throw new Error('No main module');
            const { BrowserWindow } = mainModule.require('electron');
            return BrowserWindow.getAllWindows();
        },
        // 方法 3: 透過 global require
        () => {
            const electronPath = require.resolve('electron');
            const { BrowserWindow } = require(electronPath);
            return BrowserWindow.getAllWindows();
        },
    ];

    for (let i = 0; i < attempts.length; i++) {
        try {
            const windows = attempts[i]();
            if (windows && windows.length > 0) {
                // 對所有視窗注入腳本
                for (const win of windows) {
                    try {
                        win.webContents.executeJavaScript(DOM_SCRIPT)
                            .then(() => {
                                domInjected = true;
                                outputChannel.appendLine(`[${new Date().toLocaleTimeString()}] ✅ DOM 腳本已注入 (方法 ${i + 1})`);
                            })
                            .catch(err => {
                                outputChannel.appendLine(`[${new Date().toLocaleTimeString()}] ⚠️ DOM 注入回傳錯誤: ${err.message}`);
                            });
                    } catch (winErr) {
                        // 個別視窗注入失敗，繼續下一個
                    }
                }
                return; // 成功找到視窗，退出
            }
        } catch (e) {
            // 這個方法不行，試下一個
            outputChannel.appendLine(`[${new Date().toLocaleTimeString()}] 方法 ${i + 1} 失敗: ${e.message}`);
        }
    }

    outputChannel.appendLine(`[${new Date().toLocaleTimeString()}] ⚠️ 無法注入 DOM 腳本，Electron API 不可用。請手動在 DevTools Console 貼上腳本。`);
}

function activate(context) {
    const outputChannel = vscode.window.createOutputChannel('Auto Accept (Custom)');
    context.subscriptions.push(outputChannel);

    // 註冊切換指令
    let disposable = vscode.commands.registerCommand('unlimited.toggle', function () {
        enabled = !enabled;
        updateStatusBar();
        if (enabled) {
            outputChannel.appendLine(`[${new Date().toLocaleTimeString()}] 已啟用`);
        } else {
            outputChannel.appendLine(`[${new Date().toLocaleTimeString()}] 已停用`);
        }
    });
    context.subscriptions.push(disposable);

    try {
        statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 10000);
        statusBarItem.command = 'unlimited.toggle';
        context.subscriptions.push(statusBarItem);
        updateStatusBar();
        statusBarItem.show();
    } catch (e) {
        // 靜默失敗
    }

    // 啟動 VS Code commands 輪詢
    startLoop(outputChannel);

    // 嘗試注入 DOM 腳本（延遲 3 秒等視窗完全載入）
    setTimeout(() => tryInjectDOMScript(outputChannel), 3000);
    // 再次嘗試（有些視窗可能延遲建立）
    setTimeout(() => tryInjectDOMScript(outputChannel), 10000);

    outputChannel.appendLine(`Auto Accept (Custom) v2.2.0 已啟動`);
    outputChannel.appendLine(`監控 ${ACCEPT_COMMANDS.length} 個 accept commands`);
    outputChannel.appendLine(`輪詢間隔: 400ms`);
    outputChannel.appendLine(`將嘗試自動注入 DOM auto-click 腳本...`);
}

function updateStatusBar() {
    if (!statusBarItem) return;
    if (enabled) {
        statusBarItem.text = "✅ AA: ON";
        statusBarItem.tooltip = "自動接受已啟用 (點擊暫停)\n監控 " + ACCEPT_COMMANDS.length + " 個 commands";
        statusBarItem.backgroundColor = undefined;
    } else {
        statusBarItem.text = "🛑 AA: OFF";
        statusBarItem.tooltip = "自動接受已暫停 (點擊恢復)";
        statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    }
}

function startLoop(outputChannel) {
    autoAcceptInterval = setInterval(async () => {
        if (!enabled) return;
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
