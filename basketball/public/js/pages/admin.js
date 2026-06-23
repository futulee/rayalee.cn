import { api } from '../api.js?v=31';
import { navigate } from '../router.js?v=31';
import { setPageTitle, toast, lockBody, unlockBody } from '../share.js?v=31';

let authed = false;

export async function render(main) {
  setPageTitle('球队管理');
  document.getElementById('breadcrumb-trail').innerHTML = '<a href="#/">篮球生活</a> <span class="sep">›</span> <span class="current">球队管理</span>';

  if (!authed) {
    main.innerHTML = `
      <div class="card" style="padding:20px;text-align:center">
        <div style="font-size:2rem;margin-bottom:10px">🔐</div>
        <div style="font-weight:700;margin-bottom:12px">球队管理</div>
        <input class="form-input" type="password" id="admin-login-pwd" placeholder="请输入管理员密码" autocomplete="off" style="text-align:center;margin-bottom:10px">
        <button class="btn btn-primary btn-block" id="btn-admin-login">进入管理</button>
      </div>`;
    document.getElementById('btn-admin-login').addEventListener('click', async () => {
      const pwd = document.getElementById('admin-login-pwd').value.trim();
      if (!pwd) { toast('请输入密码'); return; }
      try {
        const { password } = await api.getAdminPassword();
        if (pwd !== password) { toast('密码错误'); return; }
        authed = true;
        render(main);
      } catch (e) { toast('验证失败'); }
    });
    return;
  }

  main.innerHTML = `
    <div id="admin-honors"></div>
    <div id="admin-games"></div>
  `;
  loadHonorsAdmin();
  loadGamesAdmin();
}

async function loadHonorsAdmin() {
  const el = document.getElementById('admin-honors');
  try {
    const honors = await api.getHonors();
    el.innerHTML = `
      <div class="card" style="padding:12px 14px;margin-bottom:10px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <span style="font-weight:700;font-size:.9rem">🏆 球队荣誉</span>
          <button class="btn btn-sm btn-primary" id="btn-add-honor">+ 添加</button>
        </div>
        ${honors.length === 0 ? '<div style="color:var(--text-muted);font-size:.85rem;text-align:center;padding:10px">暂无荣誉记录</div>' : ''}
        ${honors.map(h => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:4px 0;border-bottom:1px solid #f3f4f6;font-size:.85rem">
            <span>🏅 ${h(h.content)}</span>
            <button class="del-honor-btn" data-id="${h.id}" style="background:none;border:none;color:#ccc;cursor:pointer;font-size:.85rem">✕</button>
          </div>
        `).join('')}
      </div>`;
    el.querySelectorAll('.del-honor-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!confirm('确定删除这条荣誉？')) return;
        const { password } = api; // won't work, need to ask for password
        const pwd = prompt('请输入管理员密码确认删除：');
        if (!pwd) return;
        api.deleteHonor(btn.dataset.id, pwd).then(() => {
          toast('已删除');
          loadHonorsAdmin();
        }).catch(e => toast(e.message));
      });
    });
    document.getElementById('btn-add-honor').addEventListener('click', () => {
      const content = prompt('请输入荣誉内容：');
      if (!content) return;
      const pwd = prompt('请输入管理员密码：');
      if (!pwd) return;
      api.addHonor(content, pwd).then(() => {
        toast('已添加');
        loadHonorsAdmin();
      }).catch(e => toast(e.message));
    });
  } catch (e) { el.innerHTML = '<div class="empty"><p>加载失败</p></div>'; }
}

async function loadGamesAdmin() {
  const el = document.getElementById('admin-games');
  try {
    const games = await api.getGames();
    el.innerHTML = `
      <div class="card" style="padding:12px 14px">
        <div style="font-weight:700;font-size:.9rem;margin-bottom:8px">📋 比赛管理</div>
        <div style="font-size:.8rem;color:var(--text-muted);margin-bottom:8px">共 ${games.length} 场比赛</div>
        ${games.map(g => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f3f4f6;font-size:.82rem">
            <div style="flex:1">
              <a href="#/game/${g.id}" style="color:var(--text);text-decoration:none">
                ${g.game_date} 深圳湾女篮 vs ${h(g.opponent)}
                <span style="font-size:.7rem;color:${g.status==='finished'?'#16a34a':'#f97316'}">${g.status==='finished'?'已结束':'进行中'}</span>
              </a>
            </div>
            <button class="del-game-btn" data-id="${g.id}" style="background:none;border:none;color:#ccc;cursor:pointer;font-size:.85rem">✕</button>
          </div>
        `).join('')}
      </div>`;
    el.querySelectorAll('.del-game-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!confirm('确定删除这场比赛？数据不可恢复！')) return;
        const pwd = prompt('请输入管理员密码确认删除：');
        if (!pwd) return;
        api.getAdminPassword().then(({ password }) => {
          if (pwd !== password) { toast('密码错误'); return; }
          return api.deleteGame(btn.dataset.id);
        }).then(() => {
          toast('已删除');
          loadGamesAdmin();
        }).catch(e => toast(e.message || '删除失败'));
      });
    });
  } catch (e) { el.innerHTML = '<div class="empty"><p>加载失败</p></div>'; }
}

function h(str) { return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
