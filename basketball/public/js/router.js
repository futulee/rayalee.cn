const routes = {};
let currentCleanup = null;

export function route(path, handler) {
  routes[path] = handler;
}

export function navigate(hash) {
  const current = window.location.hash.slice(1) || '/';
  if (current !== hash) {
    sessionStorage.setItem('bb_referrer', current);
  }
  window.location.hash = hash;
}

export function getReferrer() {
  return sessionStorage.getItem('bb_referrer') || '/games';
}

export function clearReferrer() {
  sessionStorage.removeItem('bb_referrer');
}

export function start() {
  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}

function handleRoute() {
  const hash = window.location.hash.slice(1) || '/';

  // 站点访问门禁：无 token 且非管理员已登录时，跳转到密码输入页。
  // /unlock 自身不拦截，避免死循环。
  const adminAuthed = sessionStorage.getItem('bb_admin_auth') === '1';
  const hasToken = !!localStorage.getItem('bb_site_token');
  if (!adminAuthed && !hasToken && hash !== '/unlock') {
    sessionStorage.setItem('bb_unlock_redirect', hash);
    if (window.location.hash !== '#/unlock') {
      window.location.hash = '/unlock';
    } else {
      renderUnlockFallback();
    }
    return;
  }

  if (currentCleanup) currentCleanup();

  // 切换路由时清理残留的 modal overlay 和 body scroll lock，
  // 避免在 modal 打开状态下跳路由导致 body 被 position:fixed 锢死无法滚动
  document.querySelectorAll('.modal-overlay').forEach(el => el.remove());
  document.body.style.overflow = '';
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.width = '';

  const main = document.getElementById('app');
  main.innerHTML = '';

  // Match static routes first, then parameterized
  for (const [pattern, handler] of Object.entries(routes)) {
    const match = matchRoute(pattern, hash);
    if (match) {
      currentCleanup = handler(main, match.params) || null;
      return;
    }
  }

  // 404
  main.innerHTML = `<div class="empty"><div class="icon">🏀</div><p>页面未找到</p></div>`;
}

// Fallback: if user is already at #/unlock but no token, ensure the unlock page renders.
// Handles direct loads on #/unlock and re-entries from the gate above.
async function renderUnlockFallback() {
  const main = document.getElementById('app');
  main.innerHTML = '';
  const mod = await import('./pages/unlock.js?v=39');
  mod.render(main);
}

function matchRoute(pattern, hash) {
  const patternParts = pattern.split('/');
  const hashParts = hash.split('/');

  if (patternParts.length !== hashParts.length) return null;

  const params = {};
  for (let i = 0; i < patternParts.length; i++) {
    const pp = patternParts[i];
    const hp = hashParts[i];
    if (pp.startsWith(':')) {
      params[pp.slice(1)] = hp;
    } else if (pp !== hp) {
      return null;
    }
  }
  return { params };
}
