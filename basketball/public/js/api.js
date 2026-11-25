const BASE = '/basketball/api';
const TOKEN_KEY = 'bb_site_token';

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setSiteToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearSiteToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function hasSiteToken() {
  return !!getToken();
}

// Redirect to unlock page, preserving current hash for return navigation.
function redirectToUnlock() {
  clearSiteToken();
  const current = window.location.hash.slice(1) || '/';
  if (current !== '/unlock') {
    sessionStorage.setItem('bb_unlock_redirect', current);
  }
  if (window.location.hash !== '#/unlock') {
    window.location.hash = '/unlock';
  }
}

async function request(url, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(BASE + url, {
    ...options,
    headers,
  });

  // 401 = token missing/expired → kick to unlock page
  if (res.status === 401) {
    redirectToUnlock();
    throw new Error('需要访问密码');
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  // Site access auth
  authSite: (password) => request('/auth/site', { method: 'POST', body: JSON.stringify({ password }) }),
  checkSiteToken: () => request('/auth/site/check'),

  // Players
  getPlayers: () => request('/players'),
  createPlayer: (data) => request('/players', { method: 'POST', body: JSON.stringify(data) }),
  updatePlayer: (id, data) => request(`/players/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePlayer: (id, password) => request(`/players/${id}`, { method: 'DELETE', body: JSON.stringify({ password }) }),
  setPlayerOrder: (order, password) => request('/players/order', { method: 'PUT', body: JSON.stringify({ order, password }) }),
  getPlayerStats: (id) => request(`/players/${id}/stats`),

  // Games
  getGames: () => request('/games'),
  createGame: (data) => request('/games', { method: 'POST', body: JSON.stringify(data) }),
  getGame: (id) => request(`/games/${id}`),
  updateGame: (id, data) => request(`/games/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteGame: (id, password) => request(`/games/${id}`, { method: 'DELETE', body: JSON.stringify({ password }) }),
  addPlayerToGame: (gameId, playerId, password) => request(`/games/${gameId}/players/${playerId}`, { method: 'POST', body: JSON.stringify({ password }) }),
  removePlayerFromGame: (gameId, playerId, password) => request(`/games/${gameId}/players/${playerId}`, { method: 'DELETE', body: JSON.stringify({ password }) }),

  // Recorder
  getRecorderCode: () => request('/config/recorder-code'),
  setRecorderCode: (code, password) => request('/config/recorder-code', { method: 'PUT', body: JSON.stringify({ code, password }) }),
  claimRecorder: (gameId, code, name) => request(`/games/${gameId}/claim`, {
    method: 'POST', body: JSON.stringify({ code, name }),
  }),

  // Admin
  login: (username, password) => request('/auth/admin', { method: 'POST', body: JSON.stringify({ username, password }) }),
  getAdminConfig: () => request('/config/admin'),
  setAdminConfig: (currentPassword, username, password) => request('/config/admin', { method: 'PUT', body: JSON.stringify({ currentPassword, username, password }) }),

  // Site password (admin)
  getSitePassword: (adminPassword) => request('/config/site-password/get', { method: 'POST', body: JSON.stringify({ password: adminPassword }) }),
  setSitePassword: (currentPassword, newPassword) => request('/config/site-password', { method: 'PUT', body: JSON.stringify({ currentPassword, newPassword }) }),

  // Stats
  updateStat: (gameId, playerId, field, delta) => request(`/games/${gameId}/stats/${playerId}`, {
    method: 'PUT', body: JSON.stringify({ field, delta }),
  }),

  // Leaderboard
  getLeaderboard: (type) => request(`/leaderboard?type=${type}`),

  // Dashboard
  getDashboard: () => request('/dashboard'),

  // Honors
  getHonors: () => request('/honors'),
  addHonor: (content, password) => request('/honors', { method: 'POST', body: JSON.stringify({ content, password }) }),
  updateHonor: (id, content, password) => request(`/honors/${id}`, { method: 'PUT', body: JSON.stringify({ content, password }) }),
  deleteHonor: (id, password) => request(`/honors/${id}`, { method: 'DELETE', body: JSON.stringify({ password }) }),
};
