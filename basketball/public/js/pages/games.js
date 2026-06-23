import { api } from '../api.js?v=31';
import { navigate } from '../router.js?v=31';
import { toast, setPageTitle, lockBody, unlockBody } from '../share.js?v=31';

export async function render(main) {
  setPageTitle('Raya 篮球生活');
  document.getElementById('breadcrumb-trail').innerHTML = '<span class="current">篮球生活</span>';

  main.innerHTML = `
    <div id="dashboard"></div>
    <div id="games-list"></div>
    <div style="text-align:center;padding:16px">
      <button class="btn btn-primary btn-lg" id="btn-new-game">+ 新建比赛</button>
    </div>
    <div id="modal-new-game" class="modal-overlay" style="display:none"></div>
  `;

  await loadDashboard();
  await loadGames();

  document.getElementById('btn-new-game').addEventListener('click', () => {
    showNewGameModal();
  });
}

async function loadDashboard() {
  const el = document.getElementById('dashboard');
  try {
    const d = await api.getDashboard();
    if (!d.record || d.record.total === 0) { el.innerHTML = ''; return; }

    const r = d.record;
    const winRate = r.total > 0 ? ((r.wins / r.total) * 100).toFixed(1) : 0;

    const topRow = (data, label, unit) => data.map((p, i) =>
      `<div style="font-size:.8rem;line-height:1.8"><span style="color:#9ca3af">${i+1}.</span> ${h(p.name)} <span style="color:var(--primary);font-weight:700">${p.total}${unit}</span></div>`
    ).join('');

    el.innerHTML = `
      <div class="card" style="padding:12px 14px">
        <div style="display:flex;gap:12px;align-items:center;margin-bottom:12px">
          <canvas id="pie-chart" width="90" height="90" style="flex-shrink:0"></canvas>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 16px;font-size:.82rem;line-height:1.8">
            <div>总场次 <b>${r.total}</b></div>
            <div>胜率 <b style="color:var(--primary)">${winRate}%</b></div>
            <div>胜利 <b style="color:#16a34a">${r.wins}</b></div>
            <div>失利 <b style="color:#dc2626">${r.losses}</b></div>
          </div>
        </div>
        <div style="display:flex;gap:6px">
          <div style="flex:1;background:#f0fdf4;border-radius:8px;padding:8px">
            <div style="font-size:.7rem;color:#16a34a;font-weight:700;margin-bottom:4px">得分 TOP3</div>
            ${topRow(d.topPoints, '得分', '分')}
          </div>
          <div style="flex:1;background:#eff6ff;border-radius:8px;padding:8px">
            <div style="font-size:.7rem;color:#2563eb;font-weight:700;margin-bottom:4px">抢断 TOP3</div>
            ${topRow(d.topSteals, '抢断', '次')}
          </div>
          <div style="flex:1;background:#fefce8;border-radius:8px;padding:8px">
            <div style="font-size:.7rem;color:#ca8a04;font-weight:700;margin-bottom:4px">篮板 TOP3</div>
            ${topRow(d.topRebounds, '篮板', '个')}
          </div>
        </div>
      </div>`;

    // Draw pie chart
    setTimeout(() => {
      const c = document.getElementById('pie-chart');
      if (!c) return;
      const ctx = c.getContext('2d');
      const cx = 45, cy = 45, r = 38;
      const total = r.wins + r.losses || 1;
      const winAngle = (r.wins / total) * Math.PI * 2;
      // Full circle background
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2);
      ctx.fillStyle = '#e5e7eb'; ctx.fill();
      // Wins
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, -Math.PI/2, -Math.PI/2 + winAngle);
      ctx.fillStyle = '#16a34a'; ctx.fill();
      // Center text
      ctx.fillStyle = '#374151'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(winRate + '%', cx, cy + 6);
    }, 100);

  } catch (e) { el.innerHTML = ''; }
}

async function loadGames() {
  const list = document.getElementById('games-list');
  try {
    const games = await api.getGames();
    if (games.length === 0) {
      list.innerHTML = `<div class="empty"><div class="icon">🏀</div><p>还没有比赛记录</p><p style="font-size:.8rem">点击下方按钮开始第一场比赛吧</p></div>`;
      return;
    }
    list.innerHTML = games.map(g => gameCard(g)).join('');
    list.querySelectorAll('.game-card').forEach(el => {
      el.addEventListener('click', () => navigate(`/game/${el.dataset.id}`));
    });
  } catch (e) {
    list.innerHTML = `<div class="empty"><p>加载失败: ${e.message}</p></div>`;
  }
}

function gameCard(g) {
  const our = g.our_score ?? '--';
  const opp = g.opponent_score ?? '--';
  let resultTag = '';
  if (g.status === 'finished' && g.our_score != null && g.opponent_score != null) {
    if (g.our_score > g.opponent_score) resultTag = '<span class="score-tag score-win">胜</span>';
    else if (g.our_score < g.opponent_score) resultTag = '<span class="score-tag score-loss">负</span>';
    else resultTag = '<span class="score-tag score-draw">平</span>';
  }
  let statusTag = '';
  if (g.status === 'live') {
    const today = new Date().toISOString().slice(0, 10);
    if (g.game_date > today) {
      statusTag = '<span style="color:#3b82f6;font-size:.75rem;font-weight:600">◷ 即将开始</span>';
    } else if (g.game_date === today) {
      statusTag = '<span style="color:#f97316;font-size:.75rem;font-weight:600">● 进行中</span>';
    } else {
      statusTag = '<span style="color:#f97316;font-size:.75rem;font-weight:600">● 进行中</span>';
    }
  }

  return `
    <div class="card game-card" data-id="${g.id}">
      <div class="card-row">
        <div>
          <div style="font-size:.8rem;color:var(--text-muted)">${g.game_date}</div>
          <div style="font-weight:700;font-size:1rem">深圳湾女篮 vs ${h(g.opponent)} ${resultTag} ${statusTag}</div>
          ${g.recorder_name ? `<div style="font-size:.75rem;color:var(--text-muted)">记录: ${h(g.recorder_name)}</div>` : ''}
          ${g.location ? `<div style="font-size:.75rem;color:var(--text-muted)">📍 ${h(g.location)}</div>` : ''}
          ${g.notes ? `<div style="font-size:.72rem;color:#f97316;font-weight:600">🔴 ${h(g.notes)}</div>` : ''}
        </div>
        <div style="font-size:1.4rem;font-weight:800;text-align:right">
          ${our} : ${opp}
        </div>
      </div>
    </div>`;
}

function showNewGameModal() {
  const today = new Date().toISOString().slice(0, 10);
  const modal = document.getElementById('modal-new-game');
  modal.style.display = 'flex';
  lockBody();
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-title">新建比赛</div>
      <div class="form-group">
        <label class="form-label">对手名称 *</label>
        <input class="form-input" id="new-opponent" placeholder="如：实验学校" autocomplete="off">
      </div>
      <div class="form-group">
        <label class="form-label">比赛日期 *</label>
        <div class="form-date-wrap"><input class="form-input" type="date" id="new-date" value="${today}"></div>
      </div>
      <div class="form-group">
        <label class="form-label">比赛地点</label>
        <input class="form-input" id="new-location" placeholder="选填" autocomplete="off">
      </div>
      <div class="form-group">
        <label class="form-label">备注</label>
        <input class="form-input" id="new-notes" placeholder="如：决赛、友谊赛（选填）" autocomplete="off">
      </div>
      <div class="form-group">
        <label class="form-label">你的名字 & 记录码 *</label>
        <div style="display:flex;gap:8px">
          <input class="form-input" id="new-name" placeholder="名字" maxlength="20" autocomplete="off" style="flex:1;min-width:0">
          <input class="form-input" type="password" id="new-code" placeholder="记录码" maxlength="4" inputmode="numeric" pattern="[0-9]*" autocomplete="off" style="width:100px;flex-shrink:0">
        </div>
      </div>
      <button class="btn btn-primary btn-block" id="btn-submit-game">创建比赛</button>
      <button class="btn btn-outline btn-block" style="margin-top:8px" id="btn-cancel-game">取消</button>
    </div>
  `;

  document.getElementById('btn-submit-game').addEventListener('click', async () => {
    const opponent = document.getElementById('new-opponent').value.trim();
    const game_date = document.getElementById('new-date').value;
    const location = document.getElementById('new-location').value.trim();
    const notes = document.getElementById('new-notes').value.trim();
    const name = document.getElementById('new-name').value.trim();
    const code = document.getElementById('new-code').value.trim();
    if (!opponent) { toast('请输入对手名称'); return; }
    if (!game_date) { toast('请选择比赛日期'); return; }
    if (!name) { toast('请输入你的名字'); return; }
    if (!code) { toast('请输入记录码'); return; }

    try {
      // Validate code
      const { code: serverCode } = await api.getRecorderCode();
      if (code !== serverCode) { toast('记录码错误'); return; }

      const { id } = await api.createGame({ opponent, game_date, location, notes });
      // Auto-claim recorder
      await api.claimRecorder(id, code, name);
      modal.style.display = 'none';
      unlockBody();
      navigate(`/game/${id}`);
    } catch (e) {
      toast('创建失败: ' + e.message);
    }
  });

  document.getElementById('btn-cancel-game').addEventListener('click', () => {
    modal.style.display = 'none';
    unlockBody();
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) { modal.style.display = 'none'; unlockBody(); }
  });
}

function h(str) { return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
