import { api } from '../api.js?v=37';
import { toast, setPageTitle, lockBody, unlockBody, generateGameImage } from '../share.js?v=32';
import { navigate, getReferrer } from '../router.js?v=32';

let gameId, isRecorder = false, isAdmin = false, pollTimer = null;
let claimName = '';
let lastStateKey = '';
let viewerSort = 'points'; // 'points' | 'steals' | 'rebounds'
let pinnedPlayers = new Set();

export async function render(main, params) {
  gameId = params.id;
  isRecorder = false;
  isAdmin = false;
  claimName = '';
  lastStateKey = '';
  viewerSort = 'points';
  pinnedPlayers = new Set(JSON.parse(localStorage.getItem(`bb_pins_${gameId}`) || '[]'));

  document.getElementById('breadcrumb-trail').innerHTML = '<a href="#/">篮球生活</a> <span class="sep">›</span> <span class="current">比赛详情</span>';

  main.innerHTML = `
    <div style="padding:6px 0"><a href="#" id="btn-back-ref" style="font-size:.85rem;color:var(--primary);text-decoration:none">‹ 返回</a></div>
    <div id="score-header" class="score-header"></div>
    <div id="claim-area"></div>
    <div id="players-area"></div>
    <div id="game-footer"></div>
  `;

  const backBtn = document.getElementById('btn-back-ref');
  if (backBtn) {
    backBtn.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(getReferrer());
    });
  }

  // Restore recorder state from localStorage
  restoreRecorder();

  // Admin edit mode: entered from admin backend
  if (sessionStorage.getItem('bb_admin_auth') === '1' && sessionStorage.getItem('bb_admin_edit') === gameId) {
    sessionStorage.removeItem('bb_admin_edit');
    isRecorder = true;
    isAdmin = true;
    claimName = sessionStorage.getItem('bb_admin_user') || '管理员';
    lastStateKey = '';
  }

  await refreshData();
  pollTimer = setInterval(refreshData, 5000);
}

export function cleanup() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}

async function refreshData() {
  try {
    const game = await api.getGame(gameId);
    const stateKey = `${isRecorder}|${isAdmin}|${game.recorder_name}|${game.status}`;

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
  const displayOur = game.our_score != null ? game.our_score : (ourScore > 0 ? ourScore : '--');
  const displayOpp = oppScore != null ? oppScore : '--';
  let resultTag = '';
  let shareText = '';

  if (game.status === 'finished' && game.our_score != null && oppScore != null) {
    if (game.our_score > oppScore) resultTag = '<span class="score-tag score-win">胜</span>';
    else if (game.our_score < oppScore) resultTag = '<span class="score-tag score-loss">负</span>';
    else resultTag = '<span class="score-tag score-draw">平</span>';
    shareText = `${game.opponent} ${game.our_score}:${oppScore} ${game.our_score > oppScore ? '胜' : game.our_score < oppScore ? '负' : '平'}`;
  }

  const header = document.getElementById('score-header');
  const datePart = (game.game_date || '').slice(0, 10);
  const metaLine = [game.game_date, game.location].filter(Boolean).join(' · ');
  let statusBadge = '';
  if (game.status === 'live') {
    const today = new Date().toISOString().slice(0, 10);
    if (datePart > today) {
      statusBadge = '<div style="font-size:.8rem;margin-top:4px"><span style="background:#dbeafe;color:#2563eb;padding:2px 10px;border-radius:10px;font-weight:600">即将开始</span></div>';
    } else if (datePart === today) {
      statusBadge = '<div style="font-size:.8rem;margin-top:4px"><span style="background:#ffedd5;color:#f97316;padding:2px 10px;border-radius:10px;font-weight:600">● 进行中</span></div>';
    }
  }
  header.innerHTML = `
    ${metaLine ? `<div style="font-size:.75rem;opacity:.7;margin-bottom:4px">${h(metaLine)}</div>` : ''}
    <div class="vs">深圳湾女篮 vs ${h(game.opponent)}</div>
    ${game.notes ? `<div style="font-size:.8rem;margin-top:4px;color:#fbbf24;font-weight:600">🏷️ ${h(game.notes)}</div>` : ''}
    ${resultTag ? `<div style="margin:6px 0">${resultTag}</div>` : ''}
    ${statusBadge}
    <div class="scores">${displayOur} : ${displayOpp}</div>
    <div class="recorder">${game.recorder_name ? '记录员: ' + h(game.recorder_name) : '暂无记录员'}</div>
  `;
  const shareScore = displayOur;
  const shareTitle = `深圳湾女篮 vs ${game.opponent} ${shareScore}:${displayOpp}`;
  header.dataset.shareTitle = shareTitle;
  header.dataset.shareText = shareText || `深圳湾女篮 vs ${game.opponent}，比分 ${shareScore}:${displayOpp}，来查看详细技术统计`;
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
      <div class="claim-bar" style="align-items:center;gap:12px">
        ${pinnedPlayers.size > 0 ? '<a href="#" id="btn-reset-sort" style="font-size:.65rem;color:var(--text-muted);text-decoration:none;display:inline-block;width:2em;line-height:1.15;word-break:break-all;flex-shrink:0">默认排序</a>' : ''}
        <span style="flex:1;text-align:center;font-weight:600;color:var(--primary)">正在记录: ${h(claimName)}</span>
        <button class="btn btn-outline btn-sm" id="btn-release">退出记录</button>
      </div>`;
    const resetBtn = document.getElementById('btn-reset-sort');
    if (resetBtn) {
      resetBtn.addEventListener('click', (e) => {
        e.preventDefault();
        pinnedPlayers.clear();
        localStorage.removeItem(`bb_pins_${gameId}`);
        refreshData();
      });
    }
    document.getElementById('btn-release').addEventListener('click', () => {
      isRecorder = false;
      isAdmin = false;
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

function togglePin(playerId) {
  if (pinnedPlayers.has(playerId)) { pinnedPlayers.delete(playerId); }
  else { pinnedPlayers.add(playerId); }
  localStorage.setItem(`bb_pins_${gameId}`, JSON.stringify([...pinnedPlayers]));
}

function renderPlayers(game) {
  const el = document.getElementById('players-area');
  if (isRecorder) {
    const sorted = [...game.stats].sort((a, b) => {
      const aPin = pinnedPlayers.has(a.player_id) ? 0 : 1;
      const bPin = pinnedPlayers.has(b.player_id) ? 0 : 1;
      if (aPin !== bPin) return aPin - bPin;
      const ao = a.sort_order ?? 9999;
      const bo = b.sort_order ?? 9999;
      return ao - bo || a.number - b.number;
    });
    el.innerHTML = sorted.map(s => recorderPlayerCard(s)).join('');
    el.querySelectorAll('.stat-btn').forEach(btn => {
      btn.addEventListener('click', handleStatClick);
    });
    el.querySelectorAll('.pin-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        const pid = parseInt(btn.dataset.player);
        togglePin(pid);
        refreshData();
      });
    });
  } else {
    const sorted = [...game.stats].sort((a, b) => {
      if (viewerSort === 'steals') return b.steals - a.steals;
      if (viewerSort === 'rebounds') return b.rebounds - a.rebounds;
      return (b.pts_2pt*2 + b.pts_3pt*3 + b.pts_1pt) - (a.pts_2pt*2 + a.pts_3pt*3 + a.pts_1pt);
    });
    el.innerHTML = `
      <div style="display:flex;gap:4px;margin-bottom:8px;font-size:.75rem">
        <button class="sort-tab${viewerSort==='points'?' active':''}" id="sort-points">总分</button>
        <button class="sort-tab${viewerSort==='steals'?' active':''}" id="sort-steals">抢断</button>
        <button class="sort-tab${viewerSort==='rebounds'?' active':''}" id="sort-rebounds">篮板</button>
      </div>
      ${sorted.map(s => viewerPlayerCard(s)).join('')}`;
    document.getElementById('sort-points')?.addEventListener('click', () => { viewerSort='points'; refreshData(); });
    document.getElementById('sort-steals')?.addEventListener('click', () => { viewerSort='steals'; refreshData(); });
    document.getElementById('sort-rebounds')?.addEventListener('click', () => { viewerSort='rebounds'; refreshData(); });
  }
}

function renderFooter(game) {
  const footer = document.getElementById('game-footer');
  const ourScore = computeOurScore(game.stats);

  if (isRecorder) {
    const isFinished = game.status === 'finished';
    const infoFormHtml = isAdmin ? `
      <div class="form-group" style="margin-bottom:10px">
        <label class="form-label">比赛信息</label>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <input class="form-input" id="edit-opponent" value="${h(game.opponent)}" placeholder="对手" style="flex:2;min-width:120px" autocomplete="off">
          <div class="form-date-wrap" style="flex:1;min-width:120px"><input class="form-input" type="date" id="edit-date" value="${(game.game_date || '').slice(0, 10)}" style="width:100%"></div>
          <div class="form-date-wrap" style="flex:1;min-width:100px"><input class="form-input" type="time" id="edit-time" value="${(game.game_date || '').slice(11, 16)}" placeholder="选填" style="width:100%"></div>
        </div>
        <input class="form-input" id="edit-location" value="${h(game.location || '')}" placeholder="比赛地点（选填）" style="margin-top:6px" autocomplete="off">
        <input class="form-input" id="edit-notes" value="${h(game.notes || '')}" placeholder="备注（选填，如：决赛）" style="margin-top:6px" autocomplete="off">
        <input class="form-input" id="edit-recorder" value="${h(game.recorder_name || '')}" placeholder="记录员（可修改）" style="margin-top:6px" autocomplete="off">
        <button class="btn btn-sm btn-outline" id="btn-save-info" style="margin-top:6px">保存信息</button>
        <button class="btn btn-sm btn-outline" id="btn-open-roster" style="margin-top:6px">👥 参赛名单管理</button>
      </div>
      <div id="roster-modal" class="modal-overlay" style="display:none"></div>` : '';
    footer.innerHTML = `
      ${infoFormHtml}
      <div class="score-editor">
        <span style="font-weight:600">我方:</span>
        <input type="number" id="edit-our-score" value="${game.our_score ?? ourScore}" min="0" ${isFinished ? '' : 'readonly'} autocomplete="off">
        <span class="sep">:</span>
        <span style="font-weight:600">对手:</span>
        <input type="number" id="edit-opp-score" value="${game.opponent_score ?? ''}" min="0" placeholder="--" autocomplete="off">
        <button class="btn btn-sm btn-primary" id="btn-save-scores">更新比分</button>
      </div>
      <div style="text-align:center;padding:8px 0 16px">
        ${isFinished
          ? '<span style="font-size:.8rem;color:var(--text-muted)">本场已结束，可修改数据</span>'
          : '<button class="btn btn-outline btn-sm" id="btn-finish-game">结束比赛</button>'}
        ${isAdmin ? '<button class="btn btn-danger btn-sm" id="btn-delete-game" style="margin-left:8px">删除比赛</button>' : ''}
        <button class="btn btn-outline btn-sm" id="btn-game-share-img" style="margin-left:8px">📸 分享图片</button>
      </div>
      <div id="game-share-img-modal" class="modal-overlay" style="display:none"></div>`;

    const saveInfoBtn = document.getElementById('btn-save-info');
    if (saveInfoBtn) {
      saveInfoBtn.addEventListener('click', async () => {
        const opponent = document.getElementById('edit-opponent').value.trim();
        const dateVal = document.getElementById('edit-date').value;
        const timeVal = document.getElementById('edit-time').value;
        const location = document.getElementById('edit-location').value.trim();
        const notes = document.getElementById('edit-notes').value.trim();
        const recorder_name = document.getElementById('edit-recorder').value.trim();
        if (!opponent || !dateVal) { toast('对手和日期不能为空'); return; }
        const game_date = timeVal ? `${dateVal} ${timeVal}` : dateVal;
        try {
          await api.updateGame(gameId, { opponent, game_date, location, notes, recorder_name });
          toast('比赛信息已更新');
          refreshData();
        } catch (e) { toast('更新失败'); }
      });
      if (isAdmin) {
        const rosterBtn = document.getElementById('btn-open-roster');
        if (rosterBtn) rosterBtn.addEventListener('click', () => openRosterModal(game));
      }
    }

    document.getElementById('btn-save-scores').addEventListener('click', async () => {
      const opp = document.getElementById('edit-opp-score').value;
      const payload = { opponent_score: opp !== '' ? parseInt(opp) : null };
      if (isFinished) {
        const our = parseInt(document.getElementById('edit-our-score').value);
        if (!isNaN(our)) payload.our_score = our;
      }
      try {
        await api.updateGame(gameId, payload);
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
          ...(isAdmin ? {} : { recorder_name: claimName }),
        });
        isRecorder = false;
        isAdmin = false;
        lastStateKey = '';
        clearRecorder();
        toast('比赛已结束');
        refreshData();
      } catch (e) { toast('操作失败'); }
    });

    const deleteBtn = document.getElementById('btn-delete-game');
    if (deleteBtn) deleteBtn.addEventListener('click', () => {
      const scoreLabel = game.our_score != null ? `（${game.our_score}:${game.opponent_score}）` : '';
      if (!confirm(`确定删除「${game.game_date} vs ${game.opponent}」${scoreLabel}？\n此操作不可恢复，所有数据将丢失。`)) return;
      const adminPwd = sessionStorage.getItem('bb_admin_pwd') || '';
      api.deleteGame(gameId, adminPwd).then(() => {
        toast('已删除');
        clearInterval(pollTimer);
        clearRecorder();
        window.location.hash = '#/';
      }).catch(e => toast('删除失败: ' + e.message));
    });

    document.getElementById('btn-game-share-img').addEventListener('click', () => showGameShareModal());

  } else if (game.status === 'finished') {
    footer.innerHTML = `
      <div style="text-align:center;padding:16px">
        <button class="btn btn-outline btn-sm" id="btn-game-share-img">📸 分享图片</button>
      </div>
      <div id="game-share-img-modal" class="modal-overlay" style="display:none"></div>`;
    document.getElementById('btn-game-share-img').addEventListener('click', () => showGameShareModal());
  } else {
    footer.innerHTML = `
      <div style="text-align:center;padding:16px">
        <button class="btn btn-outline btn-sm" id="btn-game-share-img">📸 分享图片</button>
      </div>
      <div id="game-share-img-modal" class="modal-overlay" style="display:none"></div>`;
    document.getElementById('btn-game-share-img').addEventListener('click', () => showGameShareModal());
  }
}

async function openRosterModal() {
  const modal = document.getElementById('roster-modal');
  if (!modal) return;
  modal.style.display = 'flex';
  lockBody();
  modal.innerHTML = `
    <div class="modal-content" style="max-height:80vh;overflow-y:auto">
      <div class="modal-title">👥 参赛名单</div>
      <div id="roster-body" style="font-size:.75rem;color:var(--text-muted);text-align:center;padding:10px">加载中...</div>
      <button class="btn btn-sm btn-block" style="margin-top:10px;color:var(--text-muted)" id="btn-close-roster">关闭</button>
    </div>`;
  document.getElementById('btn-close-roster').addEventListener('click', closeRosterModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeRosterModal(); }, { once: true });
  await refreshRosterModal();
}

function closeRosterModal() {
  const modal = document.getElementById('roster-modal');
  if (modal) { modal.style.display = 'none'; modal.innerHTML = ''; }
  unlockBody();
  refreshData();
}

async function refreshRosterModal() {
  const body = document.getElementById('roster-body');
  if (!body) return;
  let game, players;
  try {
    [game, players] = await Promise.all([api.getGame(gameId), api.getPlayers()]);
  } catch (e) { body.innerHTML = '<div>加载失败</div>'; return; }
  const inGame = new Map(game.stats.map(s => [s.player_id, s]));
  const sorted = [...players].sort((a, b) => (a.sort_order ?? 9999) - (b.sort_order ?? 9999) || a.number - b.number);
  const activeAbsent = sorted.filter(p => p.active === 1 && !inGame.has(p.id));
  const departedAbsent = sorted.filter(p => p.active === 0 && !inGame.has(p.id));
  const adminPwd = sessionStorage.getItem('bb_admin_pwd') || '';

  body.innerHTML = `
    <div style="font-size:.8rem;color:var(--text-muted);margin-bottom:6px">已参赛 <span style="color:var(--primary);font-weight:700">${inGame.size}</span> 人</div>
    <div id="roster-present">
      ${game.stats.length === 0 ? '<div style="font-size:.75rem;color:var(--text-muted);padding:4px 0">无</div>' : game.stats.map(s => `
        <div class="admin-row" data-pid="${s.player_id}">
          <span style="flex:1;min-width:0"><span style="font-weight:700">#${s.number}</span> ${h(s.name)}${s.active === 0 ? ' <span class="departed-tag">离队</span>' : ''}</span>
          <button class="btn btn-sm btn-outline roster-remove" data-pid="${s.player_id}" data-num="${s.number}" data-name="${h(s.name)}">移除</button>
        </div>
      `).join('')}
    </div>
    ${activeAbsent.length > 0 ? `
      <div style="font-size:.75rem;color:var(--text-muted);margin:8px 0 4px">未参赛 · 在队</div>
      <div id="roster-absent-active">
        ${activeAbsent.map(p => `
          <div class="admin-row" data-pid="${p.id}">
            <span style="flex:1;min-width:0"><span style="font-weight:700">#${p.number}</span> ${h(p.name)}</span>
            <button class="btn btn-sm btn-primary roster-add" data-pid="${p.id}">添加</button>
          </div>
        `).join('')}
      </div>` : ''}
    ${departedAbsent.length > 0 ? `
      <div style="font-size:.75rem;color:var(--text-muted);margin:8px 0 4px">未参赛 · 离队</div>
      <div id="roster-absent-departed">
        ${departedAbsent.map(p => `
          <div class="admin-row" data-pid="${p.id}">
            <span style="flex:1;min-width:0"><span style="font-weight:700">#${p.number}</span> ${h(p.name)} <span class="departed-tag">离队</span></span>
            <button class="btn btn-sm btn-primary roster-add" data-pid="${p.id}">添加</button>
          </div>
        `).join('')}
      </div>` : ''}`;

  body.querySelectorAll('.roster-remove').forEach(btn => {
    btn.addEventListener('click', async () => {
      const pid = parseInt(btn.dataset.pid);
      const label = `#${btn.dataset.num} ${btn.dataset.name}`;
      const scrollBefore = body.scrollTop;
      try {
        await api.removePlayerFromGame(gameId, pid, adminPwd);
        toast(`${label} 已移除`);
        await refreshRosterModal();
        body.scrollTop = scrollBefore;
      } catch (e) { toast(e.message || '移除失败'); }
    });
  });
  body.querySelectorAll('.roster-add').forEach(btn => {
    btn.addEventListener('click', async () => {
      const pid = parseInt(btn.dataset.pid);
      const scrollBefore = body.scrollTop;
      try {
        await api.addPlayerToGame(gameId, pid, adminPwd);
        toast('已添加');
        await refreshRosterModal();
        body.scrollTop = scrollBefore;
      } catch (e) { toast(e.message || '添加失败'); }
    });
  });
}

function recorderPlayerCard(s) {
  const pts = s.pts_2pt * 2 + s.pts_3pt * 3 + s.pts_1pt;
  const isPinned = pinnedPlayers.has(s.player_id);
  return `
    <div class="player-card" data-player-id="${s.player_id}">
      <button class="pin-btn" data-player="${s.player_id}" title="${isPinned?'取消置顶':'置顶到最前'}" style="background:none;border:none;cursor:pointer;font-size:.65rem;padding:0 3px;line-height:1;flex-shrink:0;color:${isPinned?'var(--primary)':'#ccc'}">${isPinned?'▼':'▲'}</button>
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
      <div class="pstats" style="font-size:.9rem">
        <span style="color:var(--primary);font-weight:800">${pts}分</span>
        <span>2pt:${s.pts_2pt}</span>
        <span>3pt:${s.pts_3pt}</span>
        <span>罚:${s.pts_1pt}</span>
        <span style="color:#2563eb;font-weight:700">断:${s.steals}</span>
        <span style="color:#ca8a04;font-weight:700">板:${s.rebounds}</span>
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

    const resp = await api.claimRecorder(gameId, code, name);
    claimName = name;
    isRecorder = true;
    isAdmin = resp.isAdmin;
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
  localStorage.setItem('bb_recorder_isAdmin', isAdmin ? '1' : '0');
}

function clearRecorder() {
  localStorage.removeItem('bb_recorder_name');
  localStorage.removeItem('bb_recorder_gameId');
  localStorage.removeItem('bb_recorder_isAdmin');
}

function restoreRecorder() {
  const savedName = localStorage.getItem('bb_recorder_name');
  const savedGameId = localStorage.getItem('bb_recorder_gameId');
  if (savedName && savedGameId === gameId) {
    claimName = savedName;
    isRecorder = true;
    isAdmin = localStorage.getItem('bb_recorder_isAdmin') === '1';
    lastStateKey = '';
  }
}

function h(str) { return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
