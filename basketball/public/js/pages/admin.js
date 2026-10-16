import { api } from '../api.js?v=38';
import { navigate } from '../router.js?v=31';
import { setPageTitle, toast, lockBody, unlockBody } from '../share.js?v=31';

let currentTab = 'team';

export async function render(main) {
  const authed = sessionStorage.getItem('bb_admin_auth') === '1';
  setPageTitle('管理后台');
  document.getElementById('breadcrumb-trail').innerHTML = '<a href="#/">篮球生活</a> <span class="sep">›</span> <span class="current">管理后台</span>';

  if (!authed) {
    renderLogin(main);
    return;
  }

  main.innerHTML = `
    <div class="tabs">
      <div class="tab${currentTab === 'team' ? ' active' : ''}" data-tab="team">球队管理</div>
      <div class="tab${currentTab === 'games' ? ' active' : ''}" data-tab="games">比赛管理</div>
      <div class="tab${currentTab === 'password' ? ' active' : ''}" data-tab="password">密码管理</div>
    </div>
    <div id="admin-content"></div>
  `;

  main.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      currentTab = tab.dataset.tab;
      render(main);
    });
  });

  await renderTab(currentTab);
}

function pwd() { return sessionStorage.getItem('bb_admin_pwd') || ''; }

function renderLogin(main) {
  main.innerHTML = `
    <div class="card" style="padding:20px">
      <div style="text-align:center;font-size:2rem;margin-bottom:10px">🔐</div>
      <div style="font-weight:700;text-align:center;margin-bottom:16px">管理后台登录</div>
      <div class="form-group">
        <label class="form-label">用户名</label>
        <input class="form-input" id="admin-login-user" placeholder="管理员用户名" autocomplete="username">
      </div>
      <div class="form-group">
        <label class="form-label">密码</label>
        <input class="form-input" type="password" id="admin-login-pwd" placeholder="管理员密码" autocomplete="current-password">
      </div>
      <button class="btn btn-primary btn-block" id="btn-admin-login">登录</button>
    </div>`;

  document.getElementById('btn-admin-login').addEventListener('click', handleLogin);
  document.getElementById('admin-login-pwd').addEventListener('keydown', (e) => { if (e.key === 'Enter') handleLogin(); });
}

async function handleLogin() {
  const user = document.getElementById('admin-login-user').value.trim();
  const pwdVal = document.getElementById('admin-login-pwd').value.trim();
  if (!user || !pwdVal) { toast('请输入用户名和密码'); return; }
  try {
    await api.login(user, pwdVal);
    sessionStorage.setItem('bb_admin_auth', '1');
    sessionStorage.setItem('bb_admin_user', user);
    sessionStorage.setItem('bb_admin_pwd', pwdVal);
    render(document.getElementById('app'));
  } catch (e) { toast(e.message || '登录失败'); }
}

async function renderTab(tab) {
  const el = document.getElementById('admin-content');
  if (tab === 'team') await renderTeam(el);
  else if (tab === 'games') await renderGames(el);
  else if (tab === 'password') await renderPassword(el);
}

// --- 球队管理 ---

async function renderTeam(el) {
  el.innerHTML = `
    <div id="admin-honors"></div>
    <div id="admin-players"></div>
  `;
  loadHonorsAdmin();
  loadPlayersAdmin();
}

async function loadHonorsAdmin() {
  const el = document.getElementById('admin-honors');
  try {
    const honors = await api.getHonors();
    const parseDate = (s) => {
      const m = s.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
      return m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(0);
    };
    const sortedHonors = [...honors].sort((a, b) => parseDate(b.content) - parseDate(a.content));
    el.innerHTML = `
      <div class="card" style="padding:12px 14px;margin-bottom:10px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <span style="font-weight:700;font-size:.9rem">🏆 球队荣誉</span>
          <button class="btn btn-sm btn-primary" id="btn-add-honor">+ 添加</button>
        </div>
        ${sortedHonors.length === 0 ? '<div style="color:var(--text-muted);font-size:.85rem;text-align:center;padding:10px">暂无荣誉记录</div>' : ''}
        ${sortedHonors.map(r => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:4px 0;border-bottom:1px solid #f3f4f6;font-size:.85rem">
            <span style="flex:1">🏅 ${h(r.content)}</span>
            <button class="edit-honor-btn" data-id="${r.id}" data-content="${h(r.content)}" style="background:none;border:none;color:var(--primary);cursor:pointer;font-size:.75rem;margin-right:8px">编辑</button>
            <button class="del-honor-btn" data-id="${r.id}" style="background:none;border:none;color:#ccc;cursor:pointer;font-size:.85rem">✕</button>
          </div>
        `).join('')}
      </div>`;
    el.querySelectorAll('.edit-honor-btn').forEach(btn => {
      btn.addEventListener('click', () => showHonorModal({ id: btn.dataset.id, content: btn.dataset.content }));
    });
    el.querySelectorAll('.del-honor-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!confirm('确定删除这条荣誉？')) return;
        api.deleteHonor(btn.dataset.id, pwd()).then(() => {
          toast('已删除');
          loadHonorsAdmin();
        }).catch(e => toast(e.message));
      });
    });
    document.getElementById('btn-add-honor').addEventListener('click', () => showHonorModal(null));
  } catch (e) { el.innerHTML = '<div class="empty"><p>加载失败</p></div>'; }
}

function showHonorModal(existing) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content">
      <div class="modal-title">${existing ? '修改荣誉' : '添加荣誉'}</div>
      <div class="form-group">
        <label class="form-label">荣誉内容 *</label>
        <input class="form-input" id="honor-content" value="${existing ? h(existing.content) : ''}" placeholder="如：2026 6.20 深圳市小篮球联赛-季军">
      </div>
      <button class="btn btn-primary btn-block" id="btn-save-honor">保存</button>
      <button class="btn btn-sm btn-block" style="margin-top:8px;color:var(--text-muted)" id="btn-cancel-honor">取消</button>
    </div>`;
  document.body.appendChild(overlay);
  lockBody();

  document.getElementById('btn-save-honor').addEventListener('click', async () => {
    const content = document.getElementById('honor-content').value.trim();
    if (!content) { toast('请输入内容'); return; }
    try {
      if (existing) await api.updateHonor(existing.id, content, pwd());
      else await api.addHonor(content, pwd());
      overlay.remove(); unlockBody();
      toast('已保存');
      loadHonorsAdmin();
    } catch (e) { toast(e.message); }
  });

  document.getElementById('btn-cancel-honor').addEventListener('click', () => { overlay.remove(); unlockBody(); });
  overlay.addEventListener('click', (e) => { if (e.target === overlay) { overlay.remove(); unlockBody(); } });
}

async function loadPlayersAdmin() {
  const el = document.getElementById('admin-players');
  try {
    const players = await api.getPlayers();
    el.innerHTML = `
      <div class="card" style="padding:12px 14px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <span style="font-weight:700;font-size:.9rem">👥 队员管理</span>
          <div style="display:flex;gap:6px">
            <button class="btn btn-sm btn-outline" id="btn-set-order">排序</button>
            <button class="btn btn-sm btn-primary" id="btn-add-player">+ 添加球员</button>
          </div>
        </div>
        ${players.length === 0 ? '<div style="color:var(--text-muted);font-size:.85rem;text-align:center;padding:10px">暂无球员</div>' : ''}
        ${players.map(p => `
          <div class="admin-row">
            <span style="flex:1;min-width:0">
              <span style="font-weight:700">#${p.number}</span> ${h(p.name)}
              ${p.active === 0 ? '<span class="departed-tag">离队</span>' : ''}
            </span>
            <button class="edit-player-btn" data-id="${p.id}" data-number="${p.number}" data-name="${h(p.name)}" style="background:none;border:none;color:var(--primary);cursor:pointer;font-size:.75rem">编辑</button>
            <button class="toggle-player-btn" data-id="${p.id}" data-active="${p.active}" style="background:none;border:none;color:${p.active === 1 ? '#f59e0b' : '#16a34a'};cursor:pointer;font-size:.75rem">${p.active === 1 ? '离队' : '归队'}</button>
            <button class="del-player-btn" data-id="${p.id}" style="background:none;border:none;color:#ccc;cursor:pointer;font-size:.85rem">✕</button>
          </div>
        `).join('')}
      </div>`;

    document.getElementById('btn-add-player').addEventListener('click', () => showPlayerModal(null));
    document.getElementById('btn-set-order').addEventListener('click', () => showOrderModal());
    el.querySelectorAll('.edit-player-btn').forEach(btn => {
      btn.addEventListener('click', () => showPlayerModal({ id: btn.dataset.id, number: btn.dataset.number, name: btn.dataset.name }));
    });
    el.querySelectorAll('.toggle-player-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const newActive = parseInt(btn.dataset.active) === 1 ? 0 : 1;
        try {
          await api.updatePlayer(btn.dataset.id, { active: newActive, password: pwd() });
          toast(newActive === 0 ? '已设为离队' : '已归队');
          loadPlayersAdmin();
        } catch (e) { toast(e.message); }
      });
    });
    el.querySelectorAll('.del-player-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('确定删除该球员？其历史数据也将一并删除。')) return;
        try {
          await api.deletePlayer(btn.dataset.id, pwd());
          toast('已删除');
          loadPlayersAdmin();
        } catch (e) { toast(e.message); }
      });
    });
  } catch (e) { el.innerHTML = '<div class="empty"><p>加载失败</p></div>'; }
}

function showPlayerModal(existing) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content">
      <div class="modal-title">${existing ? '编辑球员' : '添加球员'}</div>
      <div class="form-group">
        <label class="form-label">球衣号码 *</label>
        <input class="form-input" id="player-number" type="number" min="0" value="${existing ? existing.number : ''}" placeholder="如 8">
      </div>
      <div class="form-group">
        <label class="form-label">球员姓名 *</label>
        <input class="form-input" id="player-name" value="${existing ? h(existing.name) : ''}" placeholder="如 张三" autocomplete="off">
      </div>
      <button class="btn btn-primary btn-block" id="btn-save-player">保存</button>
      <button class="btn btn-sm btn-block" style="margin-top:8px;color:var(--text-muted)" id="btn-cancel-player">取消</button>
    </div>`;
  document.body.appendChild(overlay);
  lockBody();

  document.getElementById('btn-save-player').addEventListener('click', async () => {
    const number = parseInt(document.getElementById('player-number').value);
    const name = document.getElementById('player-name').value.trim();
    if (!name || isNaN(number)) { toast('请填写号码和姓名'); return; }
    try {
      if (existing) {
        await api.updatePlayer(existing.id, { number, name, password: pwd() });
      } else {
        await api.createPlayer({ number, name, password: pwd() });
      }
      overlay.remove(); unlockBody();
      toast('已保存');
      loadPlayersAdmin();
    } catch (e) { toast(e.message); }
  });

  document.getElementById('btn-cancel-player').addEventListener('click', () => { overlay.remove(); unlockBody(); });
  overlay.addEventListener('click', (e) => { if (e.target === overlay) { overlay.remove(); unlockBody(); } });
}

async function showOrderModal() {
  let players;
  try { players = await api.getPlayers(); } catch (e) { toast('加载失败'); return; }
  let ordered = [...players].sort((a, b) => {
    const ao = a.sort_order ?? 9999, bo = b.sort_order ?? 9999;
    return ao - bo || a.number - b.number;
  });

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content">
      <div class="modal-title">设置默认排序</div>
      <p style="font-size:.75rem;color:var(--text-muted);text-align:center;margin-bottom:10px">记录比赛时球员的默认顺序，记录员可随时临时调整</p>
      <div id="order-list"></div>
      <button class="btn btn-primary btn-block" id="btn-save-order" style="margin-top:12px">保存排序</button>
      <button class="btn btn-sm btn-block" style="margin-top:8px;color:var(--text-muted)" id="btn-cancel-order">取消</button>
    </div>`;
  document.body.appendChild(overlay);
  lockBody();

  const listEl = overlay.querySelector('#order-list');

  function renderList() {
    listEl.innerHTML = ordered.map((p, i) => `
      <div class="admin-row">
        <span style="flex:1;min-width:0">#${p.number} ${h(p.name)}${p.active === 0 ? ' <span class="departed-tag">离队</span>' : ''}</span>
        <button class="order-btn" data-d="-1" ${i === 0 ? 'disabled' : ''}>↑</button>
        <button class="order-btn" data-d="1" ${i === ordered.length - 1 ? 'disabled' : ''}>↓</button>
      </div>
    `).join('');
  }

  function syncButtons() {
    listEl.querySelectorAll('.admin-row').forEach((row, idx) => {
      row.querySelector('.order-btn[data-d="-1"]').disabled = idx === 0;
      row.querySelector('.order-btn[data-d="1"]').disabled = idx === ordered.length - 1;
    });
  }

  listEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.order-btn');
    if (!btn || btn.disabled) return;
    const d = parseInt(btn.dataset.d);
    const row = btn.closest('.admin-row');
    const rows = listEl.querySelectorAll('.admin-row');
    const i = Array.from(rows).indexOf(row);
    const j = i + d;
    if (j < 0 || j >= ordered.length) return;
    [ordered[i], ordered[j]] = [ordered[j], ordered[i]];
    if (d === 1) rows[j].after(row);
    else rows[j].before(row);
    syncButtons();
  });

  overlay.querySelector('#btn-save-order').addEventListener('click', async () => {
    try {
      await api.setPlayerOrder(ordered.map(p => p.id), pwd());
      overlay.remove(); unlockBody();
      toast('排序已保存');
    } catch (e) { toast(e.message); }
  });

  overlay.querySelector('#btn-cancel-order').addEventListener('click', () => { overlay.remove(); unlockBody(); });
  overlay.addEventListener('click', (e) => { if (e.target === overlay) { overlay.remove(); unlockBody(); } });

  renderList();
}

// --- 比赛管理 ---

async function renderGames(el) {
  el.innerHTML = `
    <div style="margin-bottom:10px">
      <button class="btn btn-primary btn-block" id="btn-add-game">+ 添加比赛</button>
    </div>
    <div id="admin-games-list"></div>
  `;
  document.getElementById('btn-add-game').addEventListener('click', showNewGameModal);
  loadGamesAdmin();
}

async function loadGamesAdmin() {
  const el = document.getElementById('admin-games-list');
  try {
    const games = await api.getGames();
    if (games.length === 0) {
      el.innerHTML = '<div class="empty"><p>暂无比赛</p></div>';
      return;
    }
    el.innerHTML = `
      <div class="card" style="padding:8px 12px">
        <div style="font-size:.8rem;color:var(--text-muted);margin-bottom:6px">共 ${games.length} 场比赛</div>
        ${games.map(g => {
          const score = g.status === 'finished' && g.our_score != null && g.opponent_score != null
            ? `<span style="font-weight:800;margin-left:6px">${g.our_score} : ${g.opponent_score}</span>` : '';
          const status = g.status === 'finished'
            ? '<span style="font-size:.72rem;color:#16a34a;margin-left:6px">已结束</span>'
            : '<span style="font-size:.72rem;color:#f97316;margin-left:6px">进行中</span>';
          return `
            <div class="admin-row">
              <a href="#/game/${g.id}" style="flex:1;min-width:0;text-decoration:none;color:inherit">
                <span>${g.game_date} vs ${h(g.opponent)}</span>${status}${score}
              </a>
              <button class="btn btn-sm btn-outline edit-game-btn" data-id="${g.id}">编辑</button>
            </div>`;
        }).join('')}
      </div>`;

    el.querySelectorAll('.edit-game-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        sessionStorage.setItem('bb_admin_edit', btn.dataset.id);
        navigate(`/game/${btn.dataset.id}`);
      });
    });
  } catch (e) { el.innerHTML = '<div class="empty"><p>加载失败</p></div>'; }
}

function showNewGameModal() {
  const today = new Date().toISOString().slice(0, 10);
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content">
      <div class="modal-title">新建比赛</div>
      <div class="form-group">
        <label class="form-label">对手名称 *</label>
        <input class="form-input" id="new-opponent" placeholder="如：育才四小" autocomplete="off">
      </div>
      <div class="form-group">
        <label class="form-label">比赛日期 *</label>
        <div class="form-date-wrap"><input class="form-input" type="date" id="new-date" value="${today}"></div>
      </div>
      <div class="form-group">
        <label class="form-label">开始时间</label>
        <div class="form-date-wrap"><input class="form-input" type="time" id="new-time" placeholder="选填"></div>
      </div>
      <div class="form-group">
        <label class="form-label">比赛地点</label>
        <input class="form-input" id="new-location" placeholder="选填" autocomplete="off">
      </div>
      <div class="form-group">
        <label class="form-label">备注</label>
        <input class="form-input" id="new-notes" placeholder="如：决赛、友谊赛（选填）" autocomplete="off">
      </div>
      <button class="btn btn-primary btn-block" id="btn-submit-game">创建比赛</button>
      <button class="btn btn-outline btn-block" style="margin-top:8px" id="btn-cancel-game">取消</button>
    </div>`;
  document.body.appendChild(overlay);
  lockBody();

  document.getElementById('btn-submit-game').addEventListener('click', async () => {
    const opponent = document.getElementById('new-opponent').value.trim();
    const dateVal = document.getElementById('new-date').value;
    const timeVal = document.getElementById('new-time').value;
    const location = document.getElementById('new-location').value.trim();
    const notes = document.getElementById('new-notes').value.trim();
    if (!opponent) { toast('请输入对手名称'); return; }
    if (!dateVal) { toast('请选择比赛日期'); return; }
    const game_date = timeVal ? `${dateVal} ${timeVal}` : dateVal;
    try {
      await api.createGame({ opponent, game_date, location, notes, password: pwd() });
      overlay.remove(); unlockBody();
      toast('比赛已创建');
      loadGamesAdmin();
    } catch (e) { toast('创建失败: ' + e.message); }
  });

  document.getElementById('btn-cancel-game').addEventListener('click', () => { overlay.remove(); unlockBody(); });
  overlay.addEventListener('click', (e) => { if (e.target === overlay) { overlay.remove(); unlockBody(); } });
}

// --- 密码管理 ---

async function renderPassword(el) {
  el.innerHTML = '<div id="admin-password"></div>';
  const box = document.getElementById('admin-password');
  try {
    const [rc, ac] = await Promise.all([api.getRecorderCode(), api.getAdminConfig()]);
    box.innerHTML = `
      <div class="card" style="padding:12px 14px;margin-bottom:10px">
        <div style="font-weight:700;font-size:.9rem;margin-bottom:8px">🔑 记录员密码（记录码）</div>
        <div style="font-size:.8rem;color:var(--text-muted);margin-bottom:8px">当前记录码：${h(rc.code)}</div>
        <div class="form-group">
          <label class="form-label">新记录码（4 位数字）</label>
          <input class="form-input" id="new-recorder-code" maxlength="4" inputmode="numeric" pattern="[0-9]*" placeholder="如 8888">
        </div>
        <button class="btn btn-primary btn-sm" id="btn-save-recorder-code">保存记录码</button>
      </div>
      <div class="card" style="padding:12px 14px">
        <div style="font-weight:700;font-size:.9rem;margin-bottom:8px">👤 管理员账号</div>
        <div class="form-group">
          <label class="form-label">当前密码 *</label>
          <input class="form-input" type="password" id="cur-admin-pwd" placeholder="输入当前管理员密码" autocomplete="current-password">
        </div>
        <div class="form-group">
          <label class="form-label">新用户名</label>
          <input class="form-input" id="new-admin-user" value="${h(ac.username)}" autocomplete="off">
        </div>
        <div class="form-group">
          <label class="form-label">新密码（留空则不修改）</label>
          <input class="form-input" type="password" id="new-admin-pwd" placeholder="留空则不改密码" autocomplete="new-password">
        </div>
        <button class="btn btn-primary btn-sm" id="btn-save-admin">保存管理员账号</button>
      </div>`;

    document.getElementById('btn-save-recorder-code').addEventListener('click', async () => {
      const code = document.getElementById('new-recorder-code').value.trim();
      if (!/^\d{4}$/.test(code)) { toast('请输入 4 位数字记录码'); return; }
      try {
        await api.setRecorderCode(code, pwd());
        toast('记录码已更新');
        renderPassword(el);
      } catch (e) { toast(e.message); }
    });

    document.getElementById('btn-save-admin').addEventListener('click', async () => {
      const cur = document.getElementById('cur-admin-pwd').value.trim();
      const username = document.getElementById('new-admin-user').value.trim();
      const password = document.getElementById('new-admin-pwd').value;
      if (!cur) { toast('请输入当前密码'); return; }
      if (!username) { toast('请输入用户名'); return; }
      try {
        await api.setAdminConfig(cur, username, password);
        sessionStorage.setItem('bb_admin_user', username);
        if (password) sessionStorage.setItem('bb_admin_pwd', password);
        toast('管理员账号已更新');
        renderPassword(el);
      } catch (e) { toast(e.message); }
    });
  } catch (e) { box.innerHTML = '<div class="empty"><p>加载失败</p></div>'; }
}

function h(str) { return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
