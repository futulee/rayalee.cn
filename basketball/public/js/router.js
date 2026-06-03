const routes = {};
let currentCleanup = null;

export function route(path, handler) {
  routes[path] = handler;
}

export function navigate(hash) {
  window.location.hash = hash;
}

export function start() {
  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}

function handleRoute() {
  const hash = window.location.hash.slice(1) || '/';
  if (currentCleanup) currentCleanup();

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
