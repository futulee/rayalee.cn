export function setPageTitle(title) {
  document.title = title;
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
