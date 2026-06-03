// Detect WeChat browser
function isWeChat() {
  return /micromessenger/i.test(navigator.userAgent);
}

// Module-level state — set once, updated by each page
let shareCallback = null;
let btnReady = false;

export function setPageTitle(title) {
  document.title = title;
}

export function setupShare(buttonId, getShareData) {
  shareCallback = getShareData;

  if (btnReady) return; // Already set up the button

  const btn = document.getElementById(buttonId);
  if (!btn) return;

  btnReady = true;
  btn.style.display = '';

  btn.addEventListener('click', async () => {
    if (!shareCallback) return;
    const data = shareCallback();

    // In WeChat, Web Share API doesn't work — always use custom panel
    if (isWeChat()) {
      showSharePanel(data);
      return;
    }

    // Try native share first
    if (navigator.share) {
      try {
        await navigator.share(data);
        return;
      } catch (e) {
        // cancelled or failed — fall through
      }
    }

    showSharePanel(data);
  });
}

function showSharePanel(data) {
  const text = `${data.title || ''}\n${data.text || ''}`.trim();
  const url = data.url || window.location.href;

  // Remove any existing panel
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
    copyText(fullText);
    toast('已复制，粘贴到微信发送即可');
    overlay.remove(); unlockBody();
  });

  overlay.querySelector('#btn-copy-link').addEventListener('click', () => {
    copyText(url);
    toast('链接已复制');
    overlay.remove(); unlockBody();
  });

  overlay.querySelector('#btn-close-share').addEventListener('click', () => {
    overlay.remove(); unlockBody();
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) { overlay.remove(); unlockBody(); }
  });
}

// Body scroll lock for modals
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
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text);
  } else {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); document.body.removeChild(ta);
  }
}

export function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2000);
}

// Generate leaderboard image for sharing
export async function generateLeaderboardImage(leaderboardData, type) {
  const canvas = document.createElement('canvas');
  canvas.width = 750;
  canvas.height = 100 + leaderboardData.length * 70;

  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f8f9fa';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#f97316';
  ctx.fillRect(0, 0, canvas.width, 80);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 32px sans-serif';
  ctx.textAlign = 'center';
  const titles = { points: '得分榜', steals: '抢断榜', assists: '助攻榜', rebounds: '篮板榜' };
  ctx.fillText(`Raya 篮球生活 - ${titles[type] || '排行榜'}`, canvas.width / 2, 52);

  leaderboardData.slice(0, 14).forEach((p, i) => {
    const y = 100 + i * 70;
    ctx.fillStyle = i % 2 === 0 ? '#fff' : '#f9fafb';
    ctx.fillRect(0, y, canvas.width, 70);
    ctx.fillStyle = '#6b7280';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${i + 1}`, 30, y + 45);
    ctx.fillStyle = '#f97316';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(`#${p.number}`, 80, y + 45);
    ctx.fillStyle = '#1a1a2e';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(p.name, 160, y + 45);
    ctx.fillStyle = '#f97316';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${p.total}`, canvas.width - 30, y + 45);
  });

  return canvas.toDataURL('image/png');
}

// Generate game summary share image
export async function generateGameImage(game) {
  const canvas = document.createElement('canvas');
  canvas.width = 750;
  canvas.height = 120 + game.stats.length * 50;

  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f8f9fa';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Title
  ctx.fillStyle = '#f97316';
  ctx.fillRect(0, 0, canvas.width, 80);
  const ourScore = game.our_score ?? game.stats.reduce((s, r) => s + r.pts_2pt * 2 + r.pts_3pt * 3 + r.pts_1pt, 0);
  const vsText = `深圳湾女篮 vs ${game.opponent}  ${ourScore}:${game.opponent_score ?? '--'}`;
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(vsText, canvas.width / 2, 40);
  ctx.font = '14px sans-serif';
  ctx.fillText(`${game.game_date}  ${game.location || ''}`, canvas.width / 2, 62);

  // Players sorted by points
  const sorted = [...game.stats].sort((a, b) => (b.pts_2pt * 2 + b.pts_3pt * 3 + b.pts_1pt) - (a.pts_2pt * 2 + a.pts_3pt * 3 + a.pts_1pt));

  sorted.forEach((s, i) => {
    const y = 95 + i * 50;
    const pts = s.pts_2pt * 2 + s.pts_3pt * 3 + s.pts_1pt;
    ctx.fillStyle = i % 2 === 0 ? '#fff' : '#f9fafb';
    ctx.fillRect(0, y, canvas.width, 50);
    ctx.fillStyle = '#6b7280';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`#${s.number}`, 20, y + 32);
    ctx.fillStyle = '#1a1a2e';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(s.name, 70, y + 32);
    ctx.fillStyle = '#f97316';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${pts}分`, 730, y + 32);
  });

  ctx.fillStyle = '#adb5bd';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('rayalee.cn/basketball', canvas.width / 2, canvas.height - 10);

  return canvas.toDataURL('image/png');
}

// Generate player stats share image
export async function generatePlayerImage(player, totals, games) {
  const canvas = document.createElement('canvas');
  canvas.width = 750;
  canvas.height = 520;

  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f8f9fa';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Header
  ctx.fillStyle = '#f97316';
  ctx.fillRect(0, 0, canvas.width, 100);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`#${player.number} ${player.name}`, canvas.width / 2, 45);
  ctx.font = '18px sans-serif';
  ctx.fillText('深圳湾学校女篮校队', canvas.width / 2, 75);

  // Total stats
  const totalPts = (totals.total_2pt || 0) * 2 + (totals.total_3pt || 0) * 3 + (totals.total_1pt || 0);
  const gp = totals.games_played || 1;
  const stats = [
    ['总得分', totalPts],
    ['场均', (totalPts / gp).toFixed(1)],
    ['总篮板', totals.total_rebounds],
    ['总抢断', totals.total_steals],
    ['总助攻', totals.total_assists],
    ['比赛场次', gp],
  ];

  stats.forEach((s, i) => {
    const x = 20 + (i % 3) * 245;
    const y = 120 + Math.floor(i / 3) * 80;
    ctx.fillStyle = '#fff';
    ctx.fillRect(x, y, 225, 64);
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, 225, 64);
    ctx.fillStyle = '#f97316';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(s[1], x + 112, y + 28);
    ctx.fillStyle = '#6b7280';
    ctx.font = '14px sans-serif';
    ctx.fillText(s[0], x + 112, y + 50);
  });

  // Recent games
  if (games.length > 0) {
    ctx.fillStyle = '#1a1a2e';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('最近比赛', 20, 310);

    games.slice(0, 5).forEach((g, i) => {
      const y = 330 + i * 35;
      const pts = g.pts_2pt * 2 + g.pts_3pt * 3 + g.pts_1pt;
      ctx.fillStyle = i % 2 === 0 ? '#fff' : '#f9fafb';
      ctx.fillRect(20, y, 710, 30);
      ctx.fillStyle = '#6b7280';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(g.game_date, 30, y + 21);
      ctx.fillText(g.opponent, 180, y + 21);
      ctx.fillStyle = '#f97316';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${pts}分`, 730, y + 21);
    });
  }

  // Footer
  ctx.fillStyle = '#adb5bd';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('rayalee.cn/basketball', canvas.width / 2, canvas.height - 15);

  return canvas.toDataURL('image/png');
}

function h(str) { return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
