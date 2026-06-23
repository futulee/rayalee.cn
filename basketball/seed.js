const db = require('./db');

db.init();

const players = [
  [3, '郭可遇'],
  [5, '甘舒瑀'],
  [6, '许乐馨'],
  [7, '任一允'],
  [8, '蔡祎君'],
  [9, '杨康佳'],
  [11, '李丛雅'],
  [12, '李彦昕'],
  [14, '王安琪'],
  [15, '陈以乔'],
  [16, '周一言'],
  [18, '刘羿菲'],
  [21, '甘舒涵'],
  [24, '王潇雅'],
];

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const sqlite = new Database(path.join(DATA_DIR, 'basketball.db'));

const existing = sqlite.prepare('SELECT COUNT(*) as cnt FROM players').get();
if (existing.cnt > 0) {
  console.log(`已有 ${existing.cnt} 名球员，跳过种子数据。如需重置请删除 data/basketball.db`);
  process.exit(0);
}

const insert = sqlite.prepare('INSERT INTO players (number, name) VALUES (?, ?)');
for (const [number, name] of players) {
  insert.run(number, name);
}

console.log(`已写入 ${players.length} 名球员初始数据`);
process.exit(0);
