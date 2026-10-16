const express = require('express');
const path = require('path');
const fs = require('fs');
const db = require('./db');

db.init();

const app = express();
app.use(express.json());

// Serve static files for local dev (in production nginx handles this)
app.use('/basketball', express.static('public'));

const API = '/basketball/api';
const BACKUP_DIR = path.join(__dirname, 'data', 'backups');

function backupTimestamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

async function backupDatabase(reason) {
  try {
    if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const dest = path.join(BACKUP_DIR, `basketball-${backupTimestamp()}${reason ? '-' + reason : ''}.db`);
    await db.backup(dest);
    console.log(`[backup] ${reason || 'manual'} -> ${dest}`);
    pruneBackups();
    return dest;
  } catch (e) {
    console.error('[backup] failed:', e.message);
    return null;
  }
}

function pruneBackups() {
  try {
    const files = fs.readdirSync(BACKUP_DIR).filter((f) => f.endsWith('.db')).sort();
    while (files.length > 30) {
      const oldest = files.shift();
      fs.unlinkSync(path.join(BACKUP_DIR, oldest));
    }
  } catch (e) {}
}

// --- Players ---

app.get(`${API}/players`, (_req, res) => {
  res.json(db.getAllPlayers());
});

app.post(`${API}/players`, (req, res) => {
  const { number, name, password } = req.body;
  if (!name || number === undefined) {
    return res.status(400).json({ error: 'name and number are required' });
  }
  if (password !== db.getAdminPassword()) return res.status(403).json({ error: '密码错误' });
  const id = db.createPlayer({ number, name });
  res.status(201).json({ id });
});

app.put(`${API}/players/order`, (req, res) => {
  const { order, password } = req.body;
  if (password !== db.getAdminPassword()) return res.status(403).json({ error: '密码错误' });
  if (!Array.isArray(order)) return res.status(400).json({ error: 'order must be an array' });
  db.setPlayerOrder(order);
  res.json({ ok: true });
});

app.put(`${API}/players/:id`, (req, res) => {
  const { number, name, active, password } = req.body;
  if (password !== db.getAdminPassword()) return res.status(403).json({ error: '密码错误' });
  const player = db.updatePlayer(Number(req.params.id), { number, name, active });
  if (!player) return res.status(404).json({ error: 'Player not found' });
  res.json(player);
});

app.delete(`${API}/players/:id`, (req, res) => {
  const { password } = req.body;
  if (password !== db.getAdminPassword()) return res.status(403).json({ error: '密码错误' });
  db.deletePlayer(Number(req.params.id));
  res.json({ ok: true });
});

app.get(`${API}/players/:id/stats`, (req, res) => {
  const stats = db.getPlayerStats(Number(req.params.id));
  if (!stats.totals.games_played && !stats.games.length) {
    return res.status(404).json({ error: 'Player not found' });
  }
  res.json(stats);
});

// --- Games ---

app.get(`${API}/games`, (_req, res) => {
  res.json(db.getAllGames());
});

app.post(`${API}/games`, (req, res) => {
  const { opponent, game_date, location, notes, password } = req.body;
  if (!opponent || !game_date) {
    return res.status(400).json({ error: 'opponent and game_date are required' });
  }
  if (password !== db.getAdminPassword()) return res.status(403).json({ error: '密码错误' });
  const id = db.createGame({ opponent, game_date, location, notes });
  res.status(201).json({ id });
});

app.get(`${API}/games/:id`, (req, res) => {
  const game = db.getGame(Number(req.params.id));
  if (!game) return res.status(404).json({ error: 'Game not found' });
  res.json(game);
});

app.put(`${API}/games/:id`, (req, res) => {
  const { our_score, opponent_score, status, recorder_name, opponent, game_date, location, notes } = req.body;
  const gid = Number(req.params.id);
  const before = db.getGame(gid);
  const game = db.updateGame(gid, { our_score, opponent_score, status, recorder_name, opponent, game_date, location, notes });
  if (!game) return res.status(404).json({ error: 'Game not found' });
  if (status === 'finished' && before && before.status !== 'finished') {
    backupDatabase('finish'); // fire-and-forget
  }
  res.json(game);
});

app.delete(`${API}/games/:id`, async (req, res) => {
  const { password } = req.body;
  if (password !== db.getAdminPassword()) return res.status(403).json({ error: '密码错误' });
  const gid = Number(req.params.id);
  const g = db.getGame(gid);
  console.log(`[DELETE /games/${gid}] ${g ? `${g.game_date} ${g.opponent} ${g.status}` : 'not-found'} at ${new Date().toISOString()}`);
  const backupPath = await backupDatabase('pre-delete');
  if (!backupPath) return res.status(500).json({ error: '备份失败，已取消删除' });
  db.deleteGame(gid);
  res.json({ ok: true });
});

// --- Recorder ---

app.get(`${API}/config/recorder-code`, (_req, res) => {
  res.json({ code: db.getRecorderCode() });
});

app.put(`${API}/config/recorder-code`, (req, res) => {
  const { code, password } = req.body;
  if (!code || !/^\d{4}$/.test(code)) {
    return res.status(400).json({ error: 'code must be a 4-digit string' });
  }
  if (password !== db.getAdminPassword()) return res.status(403).json({ error: '密码错误' });
  db.setRecorderCode(code);
  res.json({ code });
});

app.post(`${API}/auth/admin`, (req, res) => {
  const { username, password } = req.body;
  if (username === db.getAdminUsername() && password === db.getAdminPassword()) {
    return res.json({ ok: true });
  }
  res.status(403).json({ error: '用户名或密码错误' });
});

app.get(`${API}/config/admin`, (_req, res) => {
  res.json({ username: db.getAdminUsername() });
});

app.put(`${API}/config/admin`, (req, res) => {
  const { currentPassword, username, password } = req.body;
  if (currentPassword !== db.getAdminPassword()) return res.status(403).json({ error: '当前密码错误' });
  if (!username) return res.status(400).json({ error: 'username is required' });
  db.setAdminUsername(username);
  if (password) db.setAdminPassword(password);
  res.json({ username: db.getAdminUsername() });
});

app.post(`${API}/games/:id/claim`, (req, res) => {
  const { code, name } = req.body;
  if (!code || !name) {
    return res.status(400).json({ error: 'code and name are required' });
  }
  if (code !== db.getRecorderCode() && code !== db.getAdminPassword()) {
    return res.status(403).json({ error: '密码错误' });
  }

  const game = db.getGame(Number(req.params.id));
  if (!game) return res.status(404).json({ error: 'Game not found' });

  const currentRecorder = game.recorder_name || '';
  const isAdmin = code === db.getAdminPassword();
  if (!isAdmin) {
    db.updateGame(Number(req.params.id), { recorder_name: name });
  }
  res.json({ ok: true, isAdmin, replaced: currentRecorder || null });
});

// --- Stats ---

app.put(`${API}/games/:gameId/stats/:playerId`, (req, res) => {
  const { field, delta } = req.body;
  if (!field || delta === undefined) {
    return res.status(400).json({ error: 'field and delta are required' });
  }
  const stat = db.updateStat(Number(req.params.gameId), Number(req.params.playerId), field, Number(delta));
  if (!stat) return res.status(400).json({ error: 'Invalid field or data' });
  res.json(stat);
});

// --- Dashboard ---

app.get(`${API}/dashboard`, (_req, res) => {
  res.json(db.getDashboard());
});

// --- Honors ---

app.get(`${API}/honors`, (_req, res) => {
  res.json(db.getHonors());
});

app.post(`${API}/honors`, (req, res) => {
  const { content, password } = req.body;
  if (!content) return res.status(400).json({ error: 'content required' });
  if (password !== db.getAdminPassword()) return res.status(403).json({ error: '密码错误' });
  const result = db.addHonor(content);
  res.status(201).json({ id: result.lastInsertRowid });
});

app.put(`${API}/honors/:id`, (req, res) => {
  const { content, password } = req.body;
  if (!content) return res.status(400).json({ error: 'content required' });
  if (password !== db.getAdminPassword()) return res.status(403).json({ error: '密码错误' });
  db.updateHonor(Number(req.params.id), content);
  res.json({ ok: true });
});

app.delete(`${API}/honors/:id`, (req, res) => {
  const { password } = req.body;
  if (password !== db.getAdminPassword()) return res.status(403).json({ error: '密码错误' });
  db.deleteHonor(Number(req.params.id));
  res.json({ ok: true });
});

// --- Leaderboard ---

app.get(`${API}/leaderboard`, (req, res) => {
  const type = req.query.type || 'points';
  res.json(db.getLeaderboard(type));
});

// --- Start ---

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Basketball API running on port ${PORT}`);
});
