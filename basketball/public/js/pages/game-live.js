import { api } from '../api.js?v=31';
import { toast, setPageTitle, lockBody, unlockBody, generateGameImage } from '../share.js?v=31';

let gameId, isRecorder = false, pollTimer = null;
let claimName = '';
let lastStateKey = '';

export async function render(main, params) {
  gameId = params.id;
  isRecorder = false;
  claimName = '';
  lastStateKey = '';

  document.getElementById('breadcrumb-trail').innerHTML = '<a href="#/">篮球生活</a> <span class="sep">›</span> <span class="current">比赛详情</span>';

  main.innerHTML = `
    <div id="score-header" class="score-header"></div>
    <div id="claim-area"></div>
    <div id="players-area"></div>
    <div id="game-footer"></div>
  `;

  // Restore recorder state from localStorage
  restoreRecorder();

  await refreshData();
  pollTimer = setInterval(refreshData, 5000);
}

export function cleanup() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}

async function refreshData() {
  try {
    const game = await api.getGame(gameId);
    const stateKey = `${isRecorder}|${game.recorder_name}|${game.status}`;

    // Always update score header and player stats (no inputs)
    renderScoreHeader(game);
    renderPlayers(game);

    // Only re-render claim/mode/footer when state changes (they contain inputs)
    if (stateKey !== lastStateKey) {
      lastStateKey = stateKey;
      renderClaimArea(game);
      renderFooter(game);
    }
  } catch (e) { /* retry next poll */ }
}

function renderScoreHeader(game) {
  const ourScore = computeOurScore(game.stats);
  const oppScore = game.opponent_score;
  let resultTag = '';
  let shareText = '';

  if (game.status === 'finished' && game.our_score != null && oppScore != null) {
    if (game.our_score > oppScore) resultTag = '<span class="score-tag score-win">胜</span>';
    else if (game.our_score < oppScore) resultTag = '<span class="score-tag score-loss">负</span>';
    else resultTag = '<span class="score-tag score-draw">平</span>';
    shareText = `${game.opponent} ${game.our_score}:${oppScore} ${game.our_score > oppScore ? '胜' : game.our_score < oppScore ? '负' : '平'}`;
  }

  const header = document.getElementById('score-header');
  const metaLine = [game.game_date, game.location].filter(Boolean).join(' · ');
  let statusBadge = '';
  if (game.status === 'live') {
    const today = new Date().toISOString().slice(0, 10);
    if (game.game_date > today) {
      statusBadge = '<div style="font-size:.8rem;margin-top:4px"><span style="background:#dbeafe;color:#2563eb;padding:2px 10px;border-radius:10px;font-weight:600">即将开始</span></div>';
    } else if (game.game_date === today) {
      statusBadge = '<div style="font-size:.8rem;margin-top:4px"><span style="background:#ffedd5;color:#f97316;padding:2px 10px;border-radius:10px;font-weight:600">● 进行中</span></div>';
    }
  }
  header.innerHTML = `
    ${metaLine ? `<div style="font-size:.75rem;opacity:.7;margin-bottom:4px">${h(metaLine)}</div>` : ''}
    <div class="vs">深圳湾女篮 vs ${h(game.opponent)}</div>
    ${game.notes ? `<div style="font-size:.8rem;margin-top:4px;color:#fbbf24;font-weight:600">🔴 ${h(game.notes)}</div>` : ''}
    ${resultTag ? `<div style="margin:6px 0">${resultTag}</div>` : ''}
    ${statusBadge}
    <div class="scores">${game.our_score ?? ourScore} : ${oppScore ?? '--'}</div>
    <div class="recorder">${game.recorder_name ? '记录员: ' + h(game.recorder_name) : '暂无记录员'}</div>
  `;
  const shareScore = game.our_score ?? ourScore;
  const shareTitle = `深圳湾女篮 vs ${game.opponent} ${shareScore}:${oppScore ?? '--'}`;
  header.dataset.shareTitle = shareTitle;
  header.dataset.shareText = shareText || `深圳湾女篮 vs ${game.opponent}，比分 ${shareScore}:${oppScore ?? '--'}，来查看详细技术统计`;
  setPageTitle(shareTitle);

  // Also update footer score input without re-rendering entire footer
  const ourInput = document.getElementById('edit-our-score');
  if (ourInput && game.our_score == null) {
    ourInput.value = ourScore;
  }
}

function renderClaimArea(game) {
  const el = document.getElementById('claim-area');
  if (isRecorder) {
    el.innerHTML = `
      <div class="claim-bar" style="justify-content:center;align-items:center;gap:12px">
        <span style="font-weight:600;color:var(--primary)">正在记录: ${h(claimName)}</span>
        <button class="btn btn-outline btn-sm" id="btn-release">退出记录</button>
      </div>`;
    document.getElementById('btn-release').addEventListener('click', () => {
      isRecorder = false;
      claimName = '';
      lastStateKey = '';
      clearRecorder();
      toast('已退出记录员模式');
      refreshData();
    });
  } else if (game.status === 'finished') {
    el.innerHTML = '';
  } else {
    el.innerHTML = `
      <div class="claim-bar">
        <input type="text" id="claim-name-input" placeholder="你的名字" maxlength="20" style="max-width:100px" autocomplete="off">
        <input type="password" id="claim-code-input" placeholder="记录码" maxlength="4" inputmode="numeric" pattern="[0-9]*" style="max-width:80px" autocomplete="off">
        <button class="btn btn-primary btn-sm" id="btn-claim">开始记录</button>
      </div>`;
    document.getElementById('btn-claim').addEventListener('click', handleClaim);
  }
}

function renderPlayers(game) {
  const el = document.getElementById('players-area');
  if (isRecorder) {
    // Stable order by jersey number while recording
    const sorted = [...game.stats].sort((a, b) => a.number - b.number);
    el.innerHTML = sorted.map(s => recorderPlayerCard(s)).join('');
    el.querySelectorAll('.stat-btn').forEach(btn => {
      btn.addEventListener('click', handleStatClick);
    });
  } else {
    // Sort by points for viewers
    const sorted = [...game.stats].sort((a, b) => {
      const ptsA = a.pts_2pt * 2 + a.pts_3pt * 3 + a.pts_1pt;
      const ptsB = b.pts_2pt * 2 + b.pts_3pt * 3 + b.pts_1pt;
      return ptsB - ptsA;
    });
    el.innerHTML = sorted.map(s => viewerPlayerCard(s)).join('');
  }
}

function renderFooter(game) {
  const footer = document.getElementById('game-footer');
  const ourScore = computeOurScore(game.stats);

  if (isRecorder) {
    const isFinished = game.status === 'finished';
    footer.innerHTML = `
      <div class="form-group" style="margin-bottom:10px">
        <label class="form-label">比赛信息</label>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <input class="form-input" id="edit-opponent" value="${h(game.opponent)}" placeholder="对手" style="flex:2;min-width:120px" autocomplete="off">
          <div class="form-date-wrap" style="flex:1;min-width:120px"><input class="form-input" type="date" id="edit-date" value="${game.game_date}" style="width:100%"></div>
        </div>
        <input class="form-input" id="edit-location" value="${h(game.location || '')}" placeholder="比赛地点（选填）" style="margin-top:6px" autocomplete="off">
        <input class="form-input" id="edit-notes" value="${h(game.notes || '')}" placeholder="备注（选填，如：决赛）" style="margin-top:6px" autocomplete="off">
        <button class="btn btn-sm btn-outline" id="btn-save-info" style="margin-top:6px">保存信息</button>
      </div>
      <div class="score-editor">
        <span style="font-weight:600">我方:</span>
        <input type="number" id="edit-our-score" value="${game.our_score ?? ourScore}" min="0" autocomplete="off">
        <span class="sep">:</span>
        <span style="font-weight:600">对手:</span>
        <input type="number" id="edit-opp-score" value="${game.opponent_score ?? ''}" min="0" placeholder="--" autocomplete="off">
        <button class="btn btn-sm btn-primary" id="btn-save-scores">更新比分</button>
      </div>
      <div style="text-align:center;padding:8px 0 16px">
        ${isFinished
          ? '<span style="font-size:.8rem;color:var(--text-muted)">本场已结束，可修改数据</span>'
          : '<button class="btn btn-outline btn-sm" id="btn-finish-game">结束比赛</button>'}
        <button class="btn btn-danger btn-sm" id="btn-delete-game" style="margin-left:8px">删除比赛</button>
        <button class="btn btn-outline btn-sm" id="btn-game-share-img" style="margin-left:8px">📸 分享图片</button>
      </div>
      <div id="game-share-img-modal" class="modal-overlay" style="display:none"></div>`;

    document.getElementById('btn-save-info').addEventListener('click', async () => {
      const opponent = document.getElementById('edit-opponent').value.trim();
      const game_date = document.getElementById('edit-date').value;
      const location = document.getElementById('edit-location').value.trim();
      const notes = document.getElementById('edit-notes').value.trim();
      if (!opponent || !game_date) { toast('对手和日期不能为空'); return; }
      try {
        await api.updateGame(gameId, { opponent, game_date, location, notes });
        toast('比赛信息已更新');
        refreshData();
      } catch (e) { toast('更新失败'); }
    });

    document.getElementById('btn-save-scores').addEventListener('click', async () => {
      const our = parseInt(document.getElementById('edit-our-score').value) || 0;
      const opp = document.getElementById('edit-opp-score').value;
      try {
        await api.updateGame(gameId, {
          our_score: our,
          opponent_score: opp !== '' ? parseInt(opp) : null,
        });
        toast('比分已更新');
        refreshData();
      } catch (e) { toast('更新失败'); }
    });

    const finishBtn = document.getElementById('btn-finish-game');
    if (finishBtn) finishBtn.addEventListener('click', async () => {
      if (!confirm('确认结束本场比赛？')) return;
      const ourVal = document.getElementById('edit-our-score').value;
      const oppVal = document.getElementById('edit-opp-score').value;
      try {
        await api.updateGame(gameId, {
          status: 'finished',
          our_score: parseInt(ourVal) || computeOurScore(game.stats),
          opponent_score: oppVal !== '' ? parseInt(oppVal) : game.opponent_score,
        });
        isRecorder = false;
        lastStateKey = '';
        clearRecorder();
        toast('比赛已结束');
        refreshData();
      } catch (e) { toast('操作失败'); }
    });

    document.getElementById('btn-delete-game').addEventListener('click', () => confirmDeleteGame());

    document.getElementById('btn-game-share-img').addEventListener('click', () => showGameShareModal());

  } else if (game.status === 'finished') {
    footer.innerHTML = `
      <div style="text-align:center;padding:16px">
        <button class="btn btn-outline btn-sm" id="btn-edit-game">编辑比赛</button>
        <button class="btn btn-danger-outline btn-sm" id="btn-delete-game" style="margin-left:8px">删除比赛</button>
        <button class="btn btn-outline btn-sm" id="btn-game-share-img" style="margin-left:8px">📸 分享图片</button>
      </div>
      <div id="game-share-img-modal" class="modal-overlay" style="display:none"></div>`;
    document.getElementById('btn-edit-game').addEventListener('click', () => {
      showEditModal();
    });
    document.getElementById('btn-delete-game').addEventListener('click', () => confirmDeleteGame());
    document.getElementById('btn-game-share-img').addEventListener('click', () => showGameShareModal());
  } else {
    footer.innerHTML = `
      <div style="text-align:center;padding:16px">
        <button class="btn btn-outline btn-sm" id="btn-edit-game">编辑比赛</button>
        <button class="btn btn-outline btn-sm" id="btn-game-share-img" style="margin-left:8px">📸 分享图片</button>
        <button class="btn btn-danger-outline btn-sm" id="btn-delete-game" style="margin-left:8px">删除比赛</button>
      </div>
      <div id="game-share-img-modal" class="modal-overlay" style="display:none"></div>`;
    document.getElementById('btn-edit-game').addEventListener('click', () => {
      showEditModal();
    });
    document.getElementById('btn-game-share-img').addEventListener('click', () => showGameShareModal());
    document.getElementById('btn-delete-game').addEventListener('click', () => confirmDeleteGame());
  }
}

function recorderPlayerCard(s) {
  const pts = s.pts_2pt * 2 + s.pts_3pt * 3 + s.pts_1pt;
  return `
    <div class="player-card" data-player-id="${s.player_id}">
      <a href="#/player/${s.player_id}" class="pinfo" style="text-decoration:none;color:inherit">
        <div class="pnum">${s.number}</div>
        <div class="pname">${h(s.name)}</div>
        <div style="font-size:.8rem;font-weight:700;color:var(--primary)">${pts}分</div>
      </a>
      <div class="stats-grid">
        ${statBtn(s.player_id, 'pts_2pt', '2分', s.pts_2pt)}
        ${statBtn(s.player_id, 'pts_3pt', '3分', s.pts_3pt)}
        ${statBtn(s.player_id, 'pts_1pt', '罚篮', s.pts_1pt)}
        ${statBtn(s.player_id, 'steals', '抢断', s.steals)}
        ${statBtn(s.player_id, 'rebounds', '篮板', s.rebounds)}
      </div>
    </div>`;
}

function statBtn(playerId, field, label, value) {
  const scored = value > 0 ? ' scored' : '';
  return `
    <div class="stat-btn${scored}" data-player="${playerId}" data-field="${field}">
      <div class="stat-main">
        <span class="slbl">${label}</span>
        <span class="sval">${value}</span>
      </div>
      <div class="stat-minus" data-player="${playerId}" data-field="${field}">−</div>
    </div>`;
}

function viewerPlayerCard(s) {
  const pts = s.pts_2pt * 2 + s.pts_3pt * 3 + s.pts_1pt;
  return `
    <div class="player-card-compact">
      <a href="#/player/${s.player_id}" style="text-decoration:none;color:inherit;display:flex;align-items:center;gap:4px">
        <div class="pnum">${s.number}</div>
        <div class="pname">${h(s.name)}</div>
      </a>
      <div class="pstats">
        <span>${pts}分</span>
        <span>2pt:${s.pts_2pt}</span>
        <span>3pt:${s.pts_3pt}</span>
        <span>罚:${s.pts_1pt}</span>
        <span>断:${s.steals}</span>
        <span>板:${s.rebounds}</span>
      </div>
    </div>`;
}

async function handleStatClick(e) {
  e.preventDefault();
  e.stopPropagation();
  const target = e.target;

  // Find the stat-btn container
  const statBtn = target.closest('.stat-btn');
  if (!statBtn) return;

  const playerId = parseInt(statBtn.dataset.player);
  const field = statBtn.dataset.field;

  // Check if click was on the minus area
  const isMinus = target.closest('.stat-minus');
  const delta = isMinus ? -1 : 1;

  try {
    const stat = await api.updateStat(gameId, playerId, field, delta);
    const valEl = statBtn.querySelector('.sval');
    if (valEl) {
      valEl.textContent = stat[field];
      if (stat[field] > 0) statBtn.classList.add('scored');
      else statBtn.classList.remove('scored');
    }
    updatePlayerPoints(playerId, stat);
    refreshData();
  } catch (e) {
    toast('操作失败');
  }
}

function confirmDeleteGame() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'delete-confirm-modal';
  overlay.innerHTML = `
    <div class="modal-content">
      <div class="modal-title">确认删除比赛</div>
      <p style="text-align:center;color:var(--danger);margin-bottom:12px;font-size:.9rem">此操作不可恢复，所有数据将丢失</p>
      <div class="form-group">
        <label class="form-label">请输入管理员密码</label>
        <input class="form-input" type="password" id="delete-code-input" placeholder="管理员密码" maxlength="12" autocomplete="off">
      </div>
      <button class="btn btn-danger btn-block" id="btn-delete-confirm">确认删除</button>
      <button class="btn btn-sm btn-block" style="margin-top:8px;color:var(--text-muted)" id="btn-delete-cancel">取消</button>
    </div>
  `;
  document.body.appendChild(overlay);
  lockBody();
  setTimeout(() => document.getElementById('delete-code-input')?.focus(), 300);

  document.getElementById('btn-delete-confirm').addEventListener('click', async () => {
    const code = document.getElementById('delete-code-input').value.trim();
    if (!code) { toast('请输入管理员密码'); return; }
    try {
      const { password: serverPwd } = await api.getAdminPassword();
      if (code !== serverPwd) { toast('管理员密码错误'); return; }
      await api.deleteGame(gameId);
      overlay.remove(); unlockBody();
      toast('已删除');
      clearInterval(pollTimer);
      window.location.hash = '#/';
    } catch (e) { toast('删除失败'); }
  });

  document.getElementById('btn-delete-cancel').addEventListener('click', () => { overlay.remove(); unlockBody(); });
  overlay.addEventListener('click', (e) => { if (e.target === overlay) { overlay.remove(); unlockBody(); } });
}

async function showGameShareModal() {
  try {
    const game = await api.getGame(gameId);
    const imgData = await generateGameImage(game);
    const modal = document.getElementById('game-share-img-modal');
    if (!modal) return;
    modal.style.display = 'flex';
    lockBody();
    modal.innerHTML = `
      <div class="modal-content share-img-container">
        <div class="modal-title">比赛数据 - 分享图片</div>
        <img src="${imgData}" style="width:100%;border-radius:8px" alt="比赛数据">
        <p style="font-size:.8rem;color:var(--text-muted);margin-top:8px">长按图片保存到相册，分享到朋友圈</p>
        <button class="btn btn-primary btn-block" id="btn-close-game-img">关闭</button>
      </div>`;
    document.getElementById('btn-close-game-img').addEventListener('click', () => { modal.style.display = 'none'; unlockBody(); });
    modal.addEventListener('click', (e) => { if (e.target === modal) { modal.style.display = 'none'; unlockBody(); } });
  } catch (e) { toast('生成图片失败'); }
}

async function showEditModal() {
  // Check if finished game requires admin password
  let requireAdmin = false;
  try {
    const game = await api.getGame(gameId);
    requireAdmin = game.status === 'finished';
  } catch (e) { /* ignore */ }

  const codeLabel = requireAdmin ? '管理员密码' : '记录码';
  const codePlaceholder = requireAdmin ? '输入管理员密码' : '4位记录码';

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'edit-modal';
  overlay.innerHTML = `
    <div class="modal-content">
      <div class="modal-title">编辑比赛数据</div>
      <div class="form-group">
        <label class="form-label">你的名字</label>
        <input class="form-input" id="edit-name-input" placeholder="输入你的名字" maxlength="20" autocomplete="off">
      </div>
      <div class="form-group">
        <label class="form-label">${codeLabel}</label>
        <input class="form-input" type="password" id="edit-code-input" placeholder="${codePlaceholder}" maxlength="12" autocomplete="off">
      </div>
      <button class="btn btn-primary btn-block" id="btn-edit-confirm">确认编辑</button>
      <button class="btn btn-sm btn-block" style="margin-top:8px;color:var(--text-muted)" id="btn-edit-cancel">取消</button>
    </div>
  `;
  document.body.appendChild(overlay);
  lockBody();

  document.getElementById('btn-edit-confirm').addEventListener('click', async () => {
    const name = document.getElementById('edit-name-input').value.trim();
    const code = document.getElementById('edit-code-input').value.trim();
    if (!code || !name) { toast('请输入信息'); return; }

    try {
      if (requireAdmin) {
        const { password: serverPwd } = await api.getAdminPassword();
        if (code !== serverPwd) { toast('管理员密码错误'); return; }
      } else {
        const { code: serverCode } = await api.getRecorderCode();
        if (code !== serverCode) { toast('记录码错误'); return; }
      }

      const currentGame = await api.getGame(gameId);
      const currentRecorder = currentGame.recorder_name;
      if (currentRecorder && currentRecorder !== name) {
        if (!confirm(`当前由 ${currentRecorder} 记录中，是否接管？`)) return;
      }
      await api.claimRecorder(gameId, code, name);
      claimName = name;
      isRecorder = true;
      lastStateKey = '';
      saveRecorder();
      toast(currentRecorder ? `已接管记录 (原: ${currentRecorder})` : `已开始编辑`);
      overlay.remove(); unlockBody();
      refreshData();
    } catch (e) {
      toast(e.message || '验证失败');
    }
  });

  document.getElementById('btn-edit-cancel').addEventListener('click', () => { overlay.remove(); unlockBody(); });
  overlay.addEventListener('click', (e) => { if (e.target === overlay) { overlay.remove(); unlockBody(); } });

  // Focus name input
  setTimeout(() => document.getElementById('edit-name-input')?.focus(), 300);
}

async function handleClaim() {
  const code = document.getElementById('claim-code-input').value.trim();
  const name = document.getElementById('claim-name-input').value.trim();
  if (!code || !name) { toast('请输入记录码和你的名字'); return; }

  try {
    const currentGame = await api.getGame(gameId);
    const currentRecorder = currentGame.recorder_name;

    if (currentRecorder && currentRecorder !== name) {
      if (!confirm(`当前由 ${currentRecorder} 记录中，是否接管？`)) return;
    }

    await api.claimRecorder(gameId, code, name);
    claimName = name;
    isRecorder = true;
    lastStateKey = '';
    saveRecorder();
    toast(currentRecorder ? `已接管记录 (原: ${currentRecorder})` : `已开始记录 (${name})`);
    refreshData();
  } catch (e) {
    toast(e.message || '认领失败');
  }
}

function updatePlayerPoints(playerId, stat) {
  const card = document.querySelector(`.player-card[data-player-id="${playerId}"]`);
  if (!card) return;
  const pts = stat.pts_2pt * 2 + stat.pts_3pt * 3 + stat.pts_1pt;
  const ptsEl = card.querySelector('.pinfo div:last-child');
  if (ptsEl) ptsEl.textContent = pts + '分';
}

function computeOurScore(stats) {
  return stats.reduce((sum, s) => sum + s.pts_2pt * 2 + s.pts_3pt * 3 + s.pts_1pt, 0);
}

// --- Session storage for recorder memory ---

function saveRecorder() {
  localStorage.setItem('bb_recorder_name', claimName);
  localStorage.setItem('bb_recorder_gameId', gameId);
}

function clearRecorder() {
  localStorage.removeItem('bb_recorder_name');
  localStorage.removeItem('bb_recorder_gameId');
}

function restoreRecorder() {
  const savedName = localStorage.getItem('bb_recorder_name');
  const savedGameId = localStorage.getItem('bb_recorder_gameId');
  if (savedName && savedGameId === gameId) {
    claimName = savedName;
    isRecorder = true;
    lastStateKey = '';
  }
}

function h(str) { return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
