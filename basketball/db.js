const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'basketball.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function init() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      number INTEGER NOT NULL,
      name TEXT NOT NULL,
      active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      opponent TEXT NOT NULL,
      game_date TEXT NOT NULL,
      location TEXT DEFAULT '',
      our_score INTEGER,
      opponent_score INTEGER,
      recorder_name TEXT DEFAULT '',
      status TEXT DEFAULT 'live',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS game_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
      player_id INTEGER REFERENCES players(id),
      pts_2pt INTEGER DEFAULT 0,
      pts_3pt INTEGER DEFAULT 0,
      pts_1pt INTEGER DEFAULT 0,
      steals INTEGER DEFAULT 0,
      assists INTEGER DEFAULT 0,
      rebounds INTEGER DEFAULT 0,
      UNIQUE(game_id, player_id)
    );
  `);

  // Ensure default config exists
  const rc = db.prepare("SELECT value FROM config WHERE key = 'recorder_code'").get();
  if (!rc) {
    db.prepare("INSERT INTO config (key, value) VALUES ('recorder_code', '8888')").run();
  }
  const ap = db.prepare("SELECT value FROM config WHERE key = 'admin_password'").get();
  if (!ap) {
    db.prepare("INSERT INTO config (key, value) VALUES ('admin_password', '0514')").run();
  }
}

// --- Player queries ---

function getAllPlayers() {
  return db.prepare('SELECT * FROM players WHERE active = 1 ORDER BY number').all();
}

function getPlayerStats(playerId) {
  const totals = db.prepare(`
    SELECT
      COUNT(*) as games_played,
      COALESCE(SUM(gs.pts_2pt), 0) as total_2pt,
      COALESCE(SUM(gs.pts_3pt), 0) as total_3pt,
      COALESCE(SUM(gs.pts_1pt), 0) as total_1pt,
      COALESCE(SUM(gs.steals), 0) as total_steals,
      COALESCE(SUM(gs.assists), 0) as total_assists,
      COALESCE(SUM(gs.rebounds), 0) as total_rebounds
    FROM game_stats gs
    JOIN games g ON g.id = gs.game_id
    WHERE gs.player_id = ? AND g.status = 'finished'
  `).get(playerId);

  const games = db.prepare(`
    SELECT g.id, g.opponent, g.game_date, g.our_score, g.opponent_score,
           gs.pts_2pt, gs.pts_3pt, gs.pts_1pt, gs.steals, gs.assists, gs.rebounds
    FROM game_stats gs
    JOIN games g ON g.id = gs.game_id
    WHERE gs.player_id = ? AND g.status = 'finished'
    ORDER BY g.game_date DESC
  `).all(playerId);

  return { totals, games };
}

// --- Game queries ---

function getAllGames() {
  return db.prepare(`
    SELECT * FROM games ORDER BY game_date DESC, id DESC
  `).all();
}

function getGame(gameId) {
  const game = db.prepare('SELECT * FROM games WHERE id = ?').get(gameId);
  if (!game) return null;
  const stats = db.prepare(`
    SELECT gs.*, p.number, p.name
    FROM game_stats gs
    JOIN players p ON p.id = gs.player_id
    WHERE gs.game_id = ?
    ORDER BY p.number
  `).all(gameId);
  return { ...game, stats };
}

function createGame({ opponent, game_date, location }) {
  const result = db.prepare(`
    INSERT INTO games (opponent, game_date, location) VALUES (?, ?, ?)
  `).run(opponent, game_date, location || '');
  const gameId = result.lastInsertRowid;

  // Auto-create empty stats for all active players
  const players = getAllPlayers();
  const insertStats = db.prepare(`
    INSERT INTO game_stats (game_id, player_id) VALUES (?, ?)
  `);
  for (const p of players) {
    insertStats.run(gameId, p.id);
  }
  return gameId;
}

function updateGame(gameId, { our_score, opponent_score, status, recorder_name, opponent, game_date, location }) {
  const game = db.prepare('SELECT * FROM games WHERE id = ?').get(gameId);
  if (!game) return null;

  const updates = [];
  const values = [];
  if (our_score !== undefined) { updates.push('our_score = ?'); values.push(our_score); }
  if (opponent_score !== undefined) { updates.push('opponent_score = ?'); values.push(opponent_score); }
  if (status !== undefined) { updates.push('status = ?'); values.push(status); }
  if (recorder_name !== undefined) { updates.push('recorder_name = ?'); values.push(recorder_name); }
  if (opponent !== undefined) { updates.push('opponent = ?'); values.push(opponent); }
  if (game_date !== undefined) { updates.push('game_date = ?'); values.push(game_date); }
  if (location !== undefined) { updates.push('location = ?'); values.push(location); }
  if (updates.length === 0) return game;

  values.push(gameId);
  db.prepare(`UPDATE games SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  return db.prepare('SELECT * FROM games WHERE id = ?').get(gameId);
}

function deleteGame(gameId) {
  db.prepare('DELETE FROM games WHERE id = ?').run(gameId);
}

// --- Recorder claim ---

function getRecorderCode() {
  const row = db.prepare("SELECT value FROM config WHERE key = 'recorder_code'").get();
  return row ? row.value : '8888';
}

function setRecorderCode(code) {
  db.prepare("INSERT OR REPLACE INTO config (key, value) VALUES ('recorder_code', ?)").run(code);
}

function getAdminPassword() {
  const row = db.prepare("SELECT value FROM config WHERE key = 'admin_password'").get();
  return row ? row.value : '0514';
}

function setAdminPassword(pwd) {
  db.prepare("INSERT OR REPLACE INTO config (key, value) VALUES ('admin_password', ?)").run(pwd);
}

// --- Stats ---

function updateStat(gameId, playerId, field, delta) {
  const validFields = ['pts_2pt', 'pts_3pt', 'pts_1pt', 'steals', 'assists', 'rebounds'];
  if (!validFields.includes(field)) return null;

  db.prepare(`
    UPDATE game_stats
    SET ${field} = MAX(0, ${field} + ?)
    WHERE game_id = ? AND player_id = ?
  `).run(delta, gameId, playerId);

  return db.prepare(`
    SELECT * FROM game_stats WHERE game_id = ? AND player_id = ?
  `).get(gameId, playerId);
}

// --- Leaderboard ---

function getLeaderboard(type) {
  const validTypes = {
    points: '(gs.pts_2pt * 2 + gs.pts_3pt * 3 + gs.pts_1pt)',
    steals: 'gs.steals',
    assists: 'gs.assists',
    rebounds: 'gs.rebounds',
  };
  const expr = validTypes[type] || validTypes.points;

  return db.prepare(`
    SELECT p.id, p.number, p.name,
           COALESCE(SUM(${expr}), 0) as total,
           COALESCE(SUM(gs.pts_2pt), 0) as pts_2pt,
           COALESCE(SUM(gs.pts_3pt), 0) as pts_3pt,
           COALESCE(SUM(gs.pts_1pt), 0) as pts_1pt,
           COALESCE(SUM(gs.steals), 0) as steals,
           COALESCE(SUM(gs.assists), 0) as assists,
           COALESCE(SUM(gs.rebounds), 0) as rebounds,
           COUNT(gs.id) as games_played
    FROM players p
    LEFT JOIN game_stats gs ON p.id = gs.player_id
    LEFT JOIN games g ON g.id = gs.game_id
    WHERE p.active = 1 AND (g.status = 'finished' OR g.id IS NULL)
    GROUP BY p.id
    ORDER BY total DESC
  `).all();
}

module.exports = {
  init,
  getAllPlayers,
  getPlayerStats,
  getAllGames,
  getGame,
  createGame,
  updateGame,
  deleteGame,
  getRecorderCode,
  setRecorderCode,
  getAdminPassword,
  setAdminPassword,
  updateStat,
  getLeaderboard,
};
