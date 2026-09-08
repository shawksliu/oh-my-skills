/**
 * chatgpt_fast_generate.js
 * 
 * 按照解耦架构设计：
 * 阶段一（脚本负责）：
 * 1. 输入内容并发送；
 * 2. 循环高频监控是否有弹窗，一旦弹出立即秒关（随时弹窗、多次弹窗全部秒杀）；
 * 3. 监控图片是否已生成完成；
 * 4. 图片生成完成后，脚本立即返回完成状态。
 * 
 * 阶段二（下载流程负责）：
 * 监控到脚本完成后，执行独立下载流程并取图。
 */

// 阶段一核心函数：输入 -> 发送 -> 循环秒关弹窗 -> 监控出图
async function runGenerateAndWatch(promptText, options = {}) {
  const timeoutMs = options.timeoutMs || 120000;
  const startTime = Date.now();

  console.log('[Phase 1] 启动生图与循环秒关守护引擎...');

  // 1. 先关闭可能残留的旧弹窗或全屏预览
  const closeViewerBtn = document.querySelector('button[aria-label*="关闭全屏"], button[aria-label*="Close preview"], button[aria-label="关闭全屏显示"]');
  if (closeViewerBtn) closeViewerBtn.click();

  // 2. 循环高频秒关守护器（支持随时弹窗、多次弹窗）
  const dismissKeywords = ['明白了', 'Got it', 'Dismiss', '关闭', '我知道了', '好的'];
  const dismissModals = () => {
    const buttons = document.querySelectorAll('button, div[role="button"]');
    for (const btn of buttons) {
      const text = (btn.innerText || btn.textContent || '').trim();
      if (dismissKeywords.some(kw => text.includes(kw))) {
        btn.click();
        console.log(`[Auto-Dismiss] 循环检测命中并秒关弹窗: "${text}"`);
      }
    }
  };

  // 立即执行一次并开启 200ms 高频循环秒关
  dismissModals();
  const dismissTimer = setInterval(dismissModals, 200);

  // 3. 输入内容并发送
  try {
    const textarea = document.querySelector('#prompt-textarea') || 
                     document.querySelector('div[contenteditable="true"]') ||
                     document.querySelector('textarea');
    if (!textarea) {
      clearInterval(dismissTimer);
      return { success: false, error: '未找到输入框' };
    }

    textarea.focus();
    const p = textarea.querySelector('p') || textarea;
    p.focus();

    // 优先采用 Selection 范围选区 + execCommand 模拟原生按键输入
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(p);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
    document.execCommand('insertText', false, promptText);

    // 强力兜底：若 execCommand 受限未生效，直接写入 textContent 并派发原生事件
    if (!p.textContent || p.textContent.trim() === '') {
      p.textContent = promptText;
      p.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: promptText }));
    }

    await new Promise(r => setTimeout(r, 400));
    dismissModals();

    const sendBtn = document.querySelector('button[data-testid="send-button"]') ||
                    document.querySelector('#composer-submit-button') ||
                    document.querySelector('button[aria-label="Send prompt"]') ||
                    document.querySelector('button[aria-label="发送提示"]') ||
                    textarea.closest('form')?.querySelector('button[type="submit"]');

    if (sendBtn && !sendBtn.disabled) {
      sendBtn.click();
      console.log('[Phase 1] 提示词已发送');
    } else {
      textarea.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true
      }));
      console.log('[Phase 1] 已通过 Enter 发送');
    }

    // 4. 记录已有图片集合
    const existingSrcs = new Set(
      Array.from(document.querySelectorAll('main img')).map(img => img.src)
    );

    // 5. 持续监控图片是否已生成完成
    console.log('[Phase 1] 正在监控 DALL-E 图片生成状态...');
    const targetImg = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        clearInterval(watchTimer);
        reject(new Error(`等待生图超时（已耗时 ${timeoutMs / 1000} 秒）`));
      }, timeoutMs);

      const watchTimer = setInterval(() => {
        const imgs = Array.from(document.querySelectorAll('main img, [data-message-author-role="assistant"] img'));
        for (const img of imgs) {
          const src = img.src || '';
          const isAvatar = (img.alt && img.alt.includes('avatar')) || (img.className && img.className.includes('avatar'));
          const isDalle = (src.includes('backend-api/estuary/content') || src.startsWith('blob:') || src.startsWith('data:')) &&
                          (img.naturalWidth > 300 || img.clientWidth > 300) &&
                          img.complete;

          if (isDalle && !existingSrcs.has(src)) {
            clearInterval(watchTimer);
            clearTimeout(timeout);
            resolve(img);
            return;
          }
        }
      }, 500);
    });

    console.log('[Phase 1] 图片已确认生成完成！', targetImg.src);

    return {
      success: true,
      status: 'image_ready',
      durationMs: Date.now() - startTime,
      imageSrc: targetImg.src,
      alt: targetImg.alt || '',
      width: targetImg.naturalWidth,
      height: targetImg.naturalHeight
    };

  } finally {
    // 脚本主要监控流程结束后，注销秒关定时器
    clearInterval(dismissTimer);
  }
}

// 阶段二核心函数：独立下载流程
function triggerImageDownload() {
  console.log('[Phase 2] 执行独立下载流程...');
  const imgs = Array.from(document.querySelectorAll('main img')).filter(img => img.naturalWidth > 300);
  const targetImg = imgs[imgs.length - 1];
  if (!targetImg) return { success: false, error: '未找到目标图片' };

  // 1. 尝试直接点击卡片上的下载按钮
  const saveBtn = targetImg.closest('div')?.querySelector('button[aria-label*="下载"], button[aria-label*="Save"], button:has(svg)');
  if (saveBtn) {
    saveBtn.click();
    console.log('[Phase 2] 已直接点击卡片下载按钮');
    return { success: true, mode: 'inline_save' };
  }

  // 2. 备选方案：点击图片打开全屏预览再点击保存
  targetImg.click();
  setTimeout(() => {
    const modalBtn = document.querySelector('button[aria-label*="保存"], button[aria-label*="Save"], button[aria-label*="下载"]');
    if (modalBtn) {
      modalBtn.click();
      console.log('[Phase 2] 已在全屏预览中点击保存按钮');
    }
  }, 400);

  return { success: true, mode: 'preview_save' };
}

window.runGenerateAndWatch = runGenerateAndWatch;
window.triggerImageDownload = triggerImageDownload;
