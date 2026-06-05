import { api } from '../api.js';
import { navigate } from '../router.js';
import { toast, setPageTitle, lockBody, unlockBody } from '../share.js';

export async function render(main) {
  setPageTitle('Raya 篮球生活');
  document.getElementById('breadcrumb-trail').innerHTML = '<span class="current">篮球生活</span>';

  main.innerHTML = `
    <div id="games-list"></div>
    <div style="text-align:center;padding:16px">
      <button class="btn btn-primary btn-lg" id="btn-new-game">+ 新建比赛</button>
    </div>
    <div id="modal-new-game" class="modal-overlay" style="display:none"></div>
  `;

  await loadGames();

  document.getElementById('btn-new-game').addEventListener('click', () => {
    showNewGameModal();
  });
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

      const { id } = await api.createGame({ opponent, game_date, location });
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
