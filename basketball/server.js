const express = require('express');
const db = require('./db');

db.init();

const app = express();
app.use(express.json());

// Serve static files for local dev (in production nginx handles this)
app.use('/basketball', express.static('public'));

const API = '/basketball/api';

// --- Players ---

app.get(`${API}/players`, (_req, res) => {
  res.json(db.getAllPlayers());
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
  const { opponent, game_date, location, notes } = req.body;
  if (!opponent || !game_date) {
    return res.status(400).json({ error: 'opponent and game_date are required' });
  }
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
  const game = db.updateGame(Number(req.params.id), { our_score, opponent_score, status, recorder_name, opponent, game_date, location, notes });
  if (!game) return res.status(404).json({ error: 'Game not found' });
  res.json(game);
});

app.delete(`${API}/games/:id`, (req, res) => {
  db.deleteGame(Number(req.params.id));
  res.json({ ok: true });
});

// --- Recorder ---

app.get(`${API}/config/recorder-code`, (_req, res) => {
  res.json({ code: db.getRecorderCode() });
});

app.put(`${API}/config/recorder-code`, (req, res) => {
  const { code } = req.body;
  if (!code || !/^\d{4}$/.test(code)) {
    return res.status(400).json({ error: 'code must be a 4-digit string' });
  }
  db.setRecorderCode(code);
  res.json({ code });
});

app.get(`${API}/config/admin-password`, (_req, res) => {
  res.json({ password: db.getAdminPassword() });
});

app.put(`${API}/config/admin-password`, (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'password is required' });
  db.setAdminPassword(password);
  res.json({ password });
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
  // Only set recorder_name on first claim; preserve original recorder on takeover
  if (!currentRecorder) {
    db.updateGame(Number(req.params.id), { recorder_name: name });
  }
  res.json({ ok: true, replaced: currentRecorder || null });
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
