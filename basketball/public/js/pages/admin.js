import { api } from '../api.js?v=31';
import { navigate } from '../router.js?v=31';
import { setPageTitle, toast, lockBody, unlockBody } from '../share.js?v=31';

let authed = sessionStorage.getItem('bb_admin_auth') === '1';
let adminPwd = sessionStorage.getItem('bb_admin_pwd') || '';

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
        adminPwd = pwd;
        sessionStorage.setItem('bb_admin_auth', '1');
        sessionStorage.setItem('bb_admin_pwd', pwd);
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
      btn.addEventListener('click', () => {
        const newContent = prompt('修改荣誉内容：', btn.dataset.content);
        if (!newContent) return;
        api.updateHonor(btn.dataset.id, newContent, adminPwd).then(() => {
          toast('已修改');
          loadHonorsAdmin();
        }).catch(e => toast(e.message));
      });
    });
    el.querySelectorAll('.del-honor-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!confirm('确定删除这条荣誉？')) return;
        api.deleteHonor(btn.dataset.id, adminPwd).then(() => {
          toast('已删除');
          loadHonorsAdmin();
        }).catch(e => toast(e.message));
      });
    });
    document.getElementById('btn-add-honor').addEventListener('click', () => {
      const content = prompt('请输入荣誉内容：');
      if (!content) return;
      api.addHonor(content, adminPwd).then(() => {
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
          <div style="padding:6px 0;border-bottom:1px solid #f3f4f6;font-size:.82rem">
            <a href="#/game/${g.id}" style="color:var(--text);text-decoration:none">
              ${g.game_date} 深圳湾女篮 vs ${h(g.opponent)}
              <span style="font-size:.7rem;color:${g.status==='finished'?'#16a34a':'#f97316'}">${g.status==='finished'?'已结束':'进行中'}</span>
            </a>
          </div>
        `).join('')}
        <div style="text-align:center;padding-top:10px">
          <a href="#/games" class="btn btn-primary btn-sm">+ 添加比赛</a>
        </div>
      </div>`;
  } catch (e) { el.innerHTML = '<div class="empty"><p>加载失败</p></div>'; }
}

function h(str) { return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
