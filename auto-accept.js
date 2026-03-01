// ==============================================
// Antigravity Auto Accept Script v2.0
// ==============================================
// 使用方式：
//   1. 在 Antigravity 中按 Help → Toggle Developer Tools (或 Ctrl+Shift+I)
//   2. 切到 Console 分頁
//   3. 貼上這段程式碼，按 Enter
//   4. 每次重啟 Antigravity 需要重新貼一次
//
// 功能：
//   ✅ 自動接受檔案修改 (Accept / Accept All)
//   ✅ 自動執行終端指令 (Run / Run Command)
//   ✅ 自動確認儲存檔案 (Save)
//   ✅ 自動允許 JavaScript 執行 (Allow)
//   ✅ 深入搜尋 iframe 及 shadow DOM 內的按鈕
//   ✅ MutationObserver 即時監控新增的 dialog
//   ✅ 狀態顯示在 Console 中
// ==============================================

(function () {
  'use strict';

  // 防止重複啟動
  if (window.__autoAccept) {
    try { window.__autoAccept.stop(); } catch (e) { }
  }

  // 設定區 —— 你可以修改這些
  const CONFIG = {
    // 檢查間隔（毫秒），預設 500ms
    CHECK_INTERVAL: 500,

    // 是否自動接受檔案修改
    AUTO_ACCEPT_EDITS: true,

    // 是否自動執行終端指令
    AUTO_ACCEPT_COMMANDS: true,

    // 是否自動確認儲存
    AUTO_ACCEPT_SAVE: true,

    // 是否在 Console 顯示日誌
    SHOW_LOGS: true,
  };

  // 要搜尋並自動點擊的按鈕文字（不分大小寫）
  // 更精確的排列：長 pattern 在前，避免誤匹配
  const ACCEPT_PATTERNS = [
    // 英文按鈕
    'accept all',
    'accept',
    'run command',
    'run',
    'approve',
    'always allow',
    'allow',
    'confirm',
    'save all',
    'save',
    'yes',
    'proceed',
    'continue',
    'ok',
    // 中文介面
    '全部接受',
    '接受',
    '執行',
    '確認',
    '儲存',
    '允許',
  ];

  // 排除的按鈕文字（避免誤觸）
  const EXCLUDE_PATTERNS = [
    'cancel',
    'reject',
    'deny',
    'delete',
    'remove',
    'discard',
    'revert',
    '取消',
    '拒絕',
    '刪除',
  ];

  let clickCount = 0;
  let isRunning = true;
  let intervalId = null;
  let observer = null;

  function log(msg) {
    if (CONFIG.SHOW_LOGS) {
      console.log(
        `%c[Auto Accept v2]%c ${msg}`,
        'color: #4CAF50; font-weight: bold;',
        'color: inherit;'
      );
    }
  }

  function warn(msg) {
    if (CONFIG.SHOW_LOGS) {
      console.warn(`[Auto Accept v2] ${msg}`);
    }
  }

  // 取得文字內容並清理（只取直接文字，不含子元素的深層文字）
  function getCleanText(el) {
    return (el.textContent || el.innerText || '').trim().toLowerCase();
  }

  // 取得按鈕的直接文字（更精確，避免被父元素的文字干擾）
  function getDirectText(el) {
    let text = '';
    for (const node of el.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent;
      }
    }
    return text.trim().toLowerCase() || getCleanText(el);
  }

  // 檢查按鈕文字是否匹配我們要自動點擊的模式
  function shouldAutoClick(text) {
    if (!text || text.length > 100) return false; // 文字太長的不是按鈕

    // 先排除危險按鈕
    for (const pattern of EXCLUDE_PATTERNS) {
      if (text.includes(pattern)) return false;
    }

    // 再檢查是否是我們要的按鈕
    for (const pattern of ACCEPT_PATTERNS) {
      if (text.includes(pattern)) return true;
    }

    return false;
  }

  // 檢查元素是否可見
  function isVisible(el, doc) {
    try {
      const style = (doc && doc.defaultView)
        ? doc.defaultView.getComputedStyle(el)
        : window.getComputedStyle(el);
      if (!style) return true; // 無法確定時假設可見
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0' &&
        el.offsetWidth > 0 &&
        el.offsetHeight > 0
      );
    } catch (e) {
      return true;
    }
  }

  // 在指定根節點中搜尋並點擊按鈕
  function findAndClickButtons(root, depth = 0) {
    if (!root || depth > 10) return; // 防止無限遞迴

    try {
      // 搜尋所有可能的按鈕元素
      const selectors = [
        'button',
        'a[role="button"]',
        '[role="button"]',
        '.monaco-button',
        '.action-label',
        '.codicon-action-label',
        // Antigravity / VS Code dialog 專用
        '.dialog-button',
        '.monaco-dialog-button',
        '.dialog-button-row button',
        '.msgbox-button',
        // 通用確認 dialog
        '.confirm-button',
        '.primary-button',
        '.accept-button',
        '.run-button',
        '.approve-button',
        '[data-action="accept"]',
        '[data-action="run"]',
        '[data-action="allow"]',
      ];

      const elements = root.querySelectorAll(selectors.join(','));
      const ownerDoc = root.ownerDocument || root;

      for (const el of elements) {
        const text = getDirectText(el);

        if (
          text &&
          shouldAutoClick(text) &&
          !el.disabled &&
          isVisible(el, ownerDoc)
        ) {
          el.click();
          clickCount++;
          log(
            `✅ 已自動點擊: "${text}" (累計 ${clickCount} 次)`
          );
        }
      }

      // 搜尋 iframe 內的按鈕
      const iframes = root.querySelectorAll('iframe');
      for (const iframe of iframes) {
        try {
          if (iframe.contentDocument) {
            findAndClickButtons(iframe.contentDocument, depth + 1);
          }
        } catch (e) {
          // 跨域 iframe，忽略
        }
      }

      // 🔥 穿透 shadow DOM 搜尋
      const allElements = root.querySelectorAll('*');
      for (const el of allElements) {
        if (el.shadowRoot) {
          findAndClickButtons(el.shadowRoot, depth + 1);
        }
      }
    } catch (e) {
      warn(`搜尋按鈕時發生錯誤: ${e.message}`);
    }
  }

  // 主要的輪詢函式
  function autoAcceptLoop() {
    if (!isRunning) return;
    findAndClickButtons(document);
  }

  // 設定 MutationObserver 即時監控 dialog 出現
  function setupObserver() {
    try {
      observer = new MutationObserver((mutations) => {
        if (!isRunning) return;
        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // 新增的元素可能是 dialog 或包含按鈕
              const el = node;
              const className = (el.className || '').toString().toLowerCase();
              const role = (el.getAttribute && el.getAttribute('role') || '').toLowerCase();

              // 如果是 dialog 相關的元素，立即掃描
              if (
                role === 'dialog' ||
                role === 'alertdialog' ||
                className.includes('dialog') ||
                className.includes('msgbox') ||
                className.includes('notification') ||
                className.includes('confirm') ||
                el.tagName === 'DIALOG'
              ) {
                // 延遲一點讓 DOM 完全渲染
                setTimeout(() => findAndClickButtons(el), 100);
              }

              // 也掃描子元素
              if (el.querySelectorAll) {
                const dialogs = el.querySelectorAll('[role="dialog"], [role="alertdialog"], .dialog, .monaco-dialog-box');
                if (dialogs.length > 0) {
                  setTimeout(() => {
                    for (const d of dialogs) {
                      findAndClickButtons(d);
                    }
                  }, 100);
                }
              }
            }
          }
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      log('👁️ MutationObserver 已啟動，即時監控 dialog');
    } catch (e) {
      warn(`MutationObserver 設定失敗: ${e.message}`);
    }
  }

  // 啟動
  intervalId = setInterval(autoAcceptLoop, CONFIG.CHECK_INTERVAL);
  setupObserver();

  // 提供停止/啟動的全域函式
  window.__autoAccept = {
    stop: function () {
      isRunning = false;
      if (intervalId) clearInterval(intervalId);
      if (observer) observer.disconnect();
      log('⏹️ Auto Accept 已停止');
    },
    start: function () {
      isRunning = true;
      intervalId = setInterval(autoAcceptLoop, CONFIG.CHECK_INTERVAL);
      setupObserver();
      log('▶️ Auto Accept 已重新啟動');
    },
    status: function () {
      log(
        `📊 狀態: ${isRunning ? '運行中' : '已停止'} | 累計點擊: ${clickCount} 次`
      );
    },
    reset: function () {
      clickCount = 0;
      log('🔄 計數器已重置');
    },
    // 手動觸發一次掃描
    scan: function () {
      findAndClickButtons(document);
      log('🔍 手動掃描完成');
    },
  };

  log('🚀 Auto Accept v2 已啟動！');
  log('📋 可用指令:');
  log('   __autoAccept.stop()   — 停止');
  log('   __autoAccept.start()  — 重新啟動');
  log('   __autoAccept.status() — 查看狀態');
  log('   __autoAccept.scan()   — 手動掃描');
  log('   __autoAccept.reset()  — 重置計數器');
})();
