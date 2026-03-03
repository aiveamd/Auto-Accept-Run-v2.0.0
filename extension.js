
const vscode = require('vscode');

let autoAcceptInterval = null;
let enabled = true;
let statusBarItem;
let domInjected = false;

// ✅ 正確的 Antigravity accept commands（從原始碼 nls.keys.json 找到的）
const ACCEPT_COMMANDS = [
    // Agent 工具/步驟接受
    'chatAgent.acceptTool',
    'chatAgent.autoApprove',
    'chatAgent.runCommand',

    // 檔案修改接受
    'chatEditing.acceptAllFiles',
    'chatEditing.acceptFile',
    'chatEditing.acceptHunk',

    // 終端指令接受
    'poll.terminal.accept',
    'poll.terminal.acceptRun',

    // 終端建議接受
    'workbench.action.terminal.acceptSelectedSuggestion',
    'workbench.action.terminal.acceptSelectedSuggestionEnter',

    // MCP 接受
    'mcp.elicit.accept',

    // 工具允許
    'tool.allow',

    // 合併編輯器接受
    'mergeEditor.accept',
    'mergeEditor.acceptMerge',

    // Inline 補全/編輯接受
    'editor.action.accessibleViewAcceptInlineCompletionAction',
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
        () => {
            const { BrowserWindow } = require('electron');
            return BrowserWindow.getAllWindows();
        },
        () => {
            const mainModule = process.mainModule || require.main;
            if (!mainModule) throw new Error('No main module');
            const { BrowserWindow } = mainModule.require('electron');
            return BrowserWindow.getAllWindows();
        },
    ];

    for (let i = 0; i < attempts.length; i++) {
        try {
            const windows = attempts[i]();
            if (windows && windows.length > 0) {
                for (const win of windows) {
                    try {
                        win.webContents.executeJavaScript(DOM_SCRIPT)
                            .then(() => {
                                domInjected = true;
                                outputChannel.appendLine(`[${ts()}] ✅ DOM 腳本已注入 (方法 ${i + 1})`);
                            })
                            .catch(err => {
                                outputChannel.appendLine(`[${ts()}] ⚠️ DOM 注入失敗: ${err.message}`);
                            });
                    } catch (winErr) { }
                }
                return;
            }
        } catch (e) {
            outputChannel.appendLine(`[${ts()}] 方法 ${i + 1} 不可用: ${e.message}`);
        }
    }

    outputChannel.appendLine(`[${ts()}] ⚠️ 無法注入 DOM 腳本 — Electron API 不可用`);
}

function ts() {
    return new Date().toLocaleTimeString();
}

function activate(context) {
    const outputChannel = vscode.window.createOutputChannel('Auto Accept (Custom)');
    context.subscriptions.push(outputChannel);

    // 註冊切換指令
    let disposable = vscode.commands.registerCommand('unlimited.toggle', function () {
        enabled = !enabled;
        updateStatusBar();
        outputChannel.appendLine(`[${ts()}] ${enabled ? '已啟用' : '已停用'}`);
    });
    context.subscriptions.push(disposable);

    try {
        statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 10000);
        statusBarItem.command = 'unlimited.toggle';
        context.subscriptions.push(statusBarItem);
        updateStatusBar();
        statusBarItem.show();
    } catch (e) { }

    // 啟動 VS Code commands 輪詢
    startLoop(outputChannel);

    // 嘗試注入 DOM 腳本
    setTimeout(() => tryInjectDOMScript(outputChannel), 3000);
    setTimeout(() => tryInjectDOMScript(outputChannel), 10000);

    outputChannel.appendLine(`Auto Accept (Custom) v2.3.0 已啟動`);
    outputChannel.appendLine(`監控 ${ACCEPT_COMMANDS.length} 個 accept commands`);
    outputChannel.appendLine(`Commands: ${ACCEPT_COMMANDS.join(', ')}`);
    outputChannel.appendLine(`輪詢間隔: 400ms`);
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
