// ==============================================
// Antigravity Auto Accept Script v1.0
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
//   ✅ 深入搜尋 iframe 內的按鈕
//   ✅ 狀態顯示在 Console 中
// ==============================================

(function () {
  'use strict';

  // 設定區 —— 你可以修改這些
  const CONFIG = {
    // 檢查間隔（毫秒），預設 800ms
    CHECK_INTERVAL: 800,

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
  const ACCEPT_PATTERNS = [
    // 英文按鈕
    'accept all',
    'accept',
    'run command',
    'run',
    'approve',
    'allow',
    'confirm',
    'save all',
    'save',
    'yes',
    'proceed',
    'continue',
    'always allow',
    // 如果 Antigravity 有中文介面
    '接受',
    '全部接受',
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
    'no',
    '取消',
    '拒絕',
    '刪除',
  ];

  let clickCount = 0;
  let isRunning = true;

  function log(msg) {
    if (CONFIG.SHOW_LOGS) {
      console.log(
        `%c[Auto Accept]%c ${msg}`,
        'color: #4CAF50; font-weight: bold;',
        'color: inherit;'
      );
    }
  }

  function warn(msg) {
    if (CONFIG.SHOW_LOGS) {
      console.warn(`[Auto Accept] ${msg}`);
    }
  }

  // 取得文字內容並清理
  function getCleanText(el) {
    return (el.textContent || el.innerText || '').trim().toLowerCase();
  }

  // 檢查是否是可點擊的按鈕
  function isClickableButton(el) {
    const tag = el.tagName.toLowerCase();
    const role = (el.getAttribute('role') || '').toLowerCase();
    const classList = Array.from(el.classList || []).join(' ').toLowerCase();

    return (
      tag === 'button' ||
      tag === 'a' ||
      role === 'button' ||
      classList.includes('button') ||
      classList.includes('btn') ||
      classList.includes('action') ||
      el.hasAttribute('onclick')
    );
  }

  // 檢查按鈕文字是否匹配我們要自動點擊的模式
  function shouldAutoClick(text) {
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

  // 在指定 document 中搜尋並點擊按鈕
  function findAndClickButtons(doc) {
    if (!doc) return;

    try {
      // 搜尋所有可能的按鈕元素
      const selectors = [
        'button',
        'a[role="button"]',
        '[role="button"]',
        '.monaco-button',
        '.action-label',
        '.codicon-action-label',
        // Antigravity 特有的 selectors
        '.accept-button',
        '.run-button',
        '.approve-button',
        '[data-action="accept"]',
        '[data-action="run"]',
      ];

      const elements = doc.querySelectorAll(selectors.join(','));

      for (const el of elements) {
        const text = getCleanText(el);

        if (
          text &&
          shouldAutoClick(text) &&
          isClickableButton(el) &&
          !el.disabled
        ) {
          // 確認元素是可見的
          const style = doc.defaultView
            ? doc.defaultView.getComputedStyle(el)
            : null;
          if (
            style &&
            (style.display === 'none' ||
              style.visibility === 'hidden' ||
              style.opacity === '0')
          ) {
            continue;
          }

          // 點擊！
          el.click();
          clickCount++;
          log(
            `✅ 已自動點擊: "${text}" (累計 ${clickCount} 次)`
          );
        }
      }

      // 也搜尋 iframe 內的按鈕
      const iframes = doc.querySelectorAll('iframe');
      for (const iframe of iframes) {
        try {
          if (iframe.contentDocument) {
            findAndClickButtons(iframe.contentDocument);
          }
        } catch (e) {
          // 跨域 iframe，忽略
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

  // 啟動
  const intervalId = setInterval(autoAcceptLoop, CONFIG.CHECK_INTERVAL);

  // 提供停止/啟動的全域函式
  window.__autoAccept = {
    stop: function () {
      isRunning = false;
      clearInterval(intervalId);
      log('⏹️ Auto Accept 已停止');
    },
    start: function () {
      isRunning = true;
      log('▶️ Auto Accept 已重新啟動');
      setInterval(autoAcceptLoop, CONFIG.CHECK_INTERVAL);
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
  };

  log('🚀 Auto Accept 已啟動！');
  log('📋 可用指令:');
  log('   __autoAccept.stop()   — 停止');
  log('   __autoAccept.start()  — 重新啟動');
  log('   __autoAccept.status() — 查看狀態');
  log('   __autoAccept.reset()  — 重置計數器');
})();
