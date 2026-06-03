// Detect WeChat browser
function isWeChat() {
  return /micromessenger/i.test(navigator.userAgent);
}

// Module-level state
let shareCallback = null;
let btnReady = false;

export function setPageTitle(title) {
  document.title = title;
}

export function setupShare(buttonId, getShareData) {
  shareCallback = getShareData;
  if (btnReady) return;
  const btn = document.getElementById(buttonId);
  if (!btn) return;
  btnReady = true;
  btn.style.display = '';

  btn.addEventListener('click', async () => {
    if (!shareCallback) return;
    const data = shareCallback();
    if (isWeChat()) { showSharePanel(data); return; }
    if (navigator.share) {
      try { await navigator.share(data); return; } catch (e) {}
    }
    showSharePanel(data);
  });
}

function showSharePanel(data) {
  const text = `${data.title || ''}\n${data.text || ''}`.trim();
  const url = data.url || window.location.href;
  const existing = document.getElementById('share-panel');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'share-panel';
  overlay.innerHTML = `
    <div class="modal-content">
      <div class="modal-title">分享</div>
      <div style="background:var(--bg);padding:12px;border-radius:8px;margin-bottom:12px;font-size:.9rem;line-height:1.6">
        <div style="font-weight:700;margin-bottom:4px">${h(data.title || '')}</div>
        <div style="color:var(--text-muted)">${h(data.text || '')}</div>
      </div>
      <button class="btn btn-primary btn-block" id="btn-copy-all">📋 复制全部内容</button>
      <button class="btn btn-outline btn-block" style="margin-top:8px" id="btn-copy-link">🔗 仅复制链接</button>
      <button class="btn btn-sm" style="margin-top:8px;width:100%;color:var(--text-muted)" id="btn-close-share">关闭</button>
    </div>
  `;
  document.body.appendChild(overlay);
  lockBody();

  const fullText = text + '\n' + url;
  overlay.querySelector('#btn-copy-all').addEventListener('click', () => {
    copyText(fullText); toast('已复制，粘贴到微信发送即可'); overlay.remove(); unlockBody();
  });
  overlay.querySelector('#btn-copy-link').addEventListener('click', () => {
    copyText(url); toast('链接已复制'); overlay.remove(); unlockBody();
  });
  overlay.querySelector('#btn-close-share').addEventListener('click', () => { overlay.remove(); unlockBody(); });
  overlay.addEventListener('click', (e) => { if (e.target === overlay) { overlay.remove(); unlockBody(); } });
}

// Body scroll lock
let scrollY = 0;
export function lockBody() {
  scrollY = window.scrollY;
  document.body.style.overflow = 'hidden';
  document.body.style.position = 'fixed';
  document.body.style.top = `-${scrollY}px`;
  document.body.style.width = '100%';
}
export function unlockBody() {
  document.body.style.overflow = '';
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.width = '';
  window.scrollTo(0, scrollY);
}

function copyText(text) {
  if (navigator.clipboard) { navigator.clipboard.writeText(text); return; }
  const ta = document.createElement('textarea');
  ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.select();
  document.execCommand('copy'); document.body.removeChild(ta);
}

export function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2000);
}

// --- Screenshot-based share images using html2canvas ---

let h2cReady = false;
async function loadHtml2Canvas() {
  if (h2cReady) return window.html2canvas;
  if (window.html2canvas) { h2cReady = true; return window.html2canvas; }
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
    s.onload = () => { h2cReady = true; resolve(window.html2canvas); };
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

async function captureElement(el) {
  const html2canvas = await loadHtml2Canvas();
  const canvas = await html2canvas(el, { backgroundColor: '#f8f9fa', scale: 2, useCORS: true, logging: false });
  return canvas.toDataURL('image/png');
}

export async function generateLeaderboardImage(leaderboardData, type) {
  const el = document.getElementById('app');
  const btnRow = el.querySelector('#lb-content + div');
  if (btnRow) btnRow.style.display = 'none';
  const imgData = await captureElement(el);
  if (btnRow) btnRow.style.display = '';
  return imgData;
}

export async function generateGameImage(game) {
  const el = document.getElementById('app');
  // Hide claim bar, mode toggle, footer buttons temporarily
  const sections = ['#claim-area', '#game-footer'];
  const hidden = [];
  sections.forEach(sel => {
    const e = el.querySelector(sel);
    if (e) { hidden.push([e, e.style.display]); e.style.display = 'none'; }
  });
  const imgData = await captureElement(el);
  hidden.forEach(([e, d]) => { e.style.display = d; });
  return imgData;
}

export async function generatePlayerImage(player, totals, games) {
  const el = document.getElementById('app');
  const btnRow = document.getElementById('btn-player-share-img')?.parentElement;
  if (btnRow) btnRow.style.display = 'none';
  const imgData = await captureElement(el);
  if (btnRow) btnRow.style.display = '';
  return imgData;
}

function h(str) { return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
