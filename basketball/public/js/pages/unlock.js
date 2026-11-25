import { api, setSiteToken } from '../api.js?v=39';
import { setPageTitle, toast } from '../share.js?v=33';

export async function render(main) {
  // If already authed, bounce to originally requested page or home.
  const adminAuthed = sessionStorage.getItem('bb_admin_auth') === '1';
  if (adminAuthed) {
    returnToTarget();
    return;
  }

  setPageTitle('访问密码 · 篮球生活');
  document.getElementById('breadcrumb-trail').innerHTML = '<a href="#/">篮球生活</a> <span class="sep">›</span> <span class="current">访问密码</span>';

  main.innerHTML = `
    <div class="card" style="padding:24px 20px;margin-top:20px">
      <div style="text-align:center;font-size:2.4rem;margin-bottom:8px">🏀</div>
      <div style="font-weight:700;text-align:center;font-size:1.05rem;margin-bottom:4px">Raya 篮球生活</div>
      <div style="text-align:center;font-size:.78rem;color:var(--text-muted);margin-bottom:18px">请输入访问密码以查看站点内容</div>
      <div class="form-group">
        <input class="form-input" type="password" id="unlock-pwd" placeholder="访问密码" autocomplete="current-password" style="text-align:center;font-size:1rem">
      </div>
      <button class="btn btn-primary btn-block" id="btn-unlock">进入</button>
      <div style="text-align:center;margin-top:14px;font-size:.72rem;color:var(--text-muted)">密码由管理员分发，30 天内无需重输</div>
    </div>`;

  const pwdInput = document.getElementById('unlock-pwd');
  pwdInput.focus();

  const submit = async () => {
    const pwd = pwdInput.value.trim();
    if (!pwd) { toast('请输入访问密码'); return; }
    const btn = document.getElementById('btn-unlock');
    btn.disabled = true;
    btn.textContent = '验证中…';
    try {
      const data = await api.authSite(pwd);
      setSiteToken(data.token);
      toast('已解锁');
      returnToTarget();
    } catch (e) {
      btn.disabled = false;
      btn.textContent = '进入';
      pwdInput.select();
      toast(e.message || '密码错误');
    }
  };

  document.getElementById('btn-unlock').addEventListener('click', submit);
  pwdInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
}

function returnToTarget() {
  const redirect = sessionStorage.getItem('bb_unlock_redirect') || '/';
  sessionStorage.removeItem('bb_unlock_redirect');
  window.location.hash = '#' + redirect;
}
