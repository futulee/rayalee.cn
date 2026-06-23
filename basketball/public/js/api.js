const BASE = '/basketball/api';

async function request(url, options = {}) {
  const res = await fetch(BASE + url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  // Players
  getPlayers: () => request('/players'),
  getPlayerStats: (id) => request(`/players/${id}/stats`),

  // Games
  getGames: () => request('/games'),
  createGame: (data) => request('/games', { method: 'POST', body: JSON.stringify(data) }),
  getGame: (id) => request(`/games/${id}`),
  updateGame: (id, data) => request(`/games/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteGame: (id) => request(`/games/${id}`, { method: 'DELETE' }),

  // Recorder
  getRecorderCode: () => request('/config/recorder-code'),
  setRecorderCode: (code) => request('/config/recorder-code', { method: 'PUT', body: JSON.stringify({ code }) }),
  getAdminPassword: () => request('/config/admin-password'),
  setAdminPassword: (password) => request('/config/admin-password', { method: 'PUT', body: JSON.stringify({ password }) }),
  claimRecorder: (gameId, code, name) => request(`/games/${gameId}/claim`, {
    method: 'POST', body: JSON.stringify({ code, name }),
  }),

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
  deleteHonor: (id, password) => request(`/honors/${id}`, { method: 'DELETE', body: JSON.stringify({ password }) }),
};
