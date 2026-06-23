import { api } from '../api.js?v=31';
import { setPageTitle, generatePlayerImage, toast, lockBody, unlockBody } from '../share.js?v=31';
import { navigate } from '../router.js?v=31';

export async function render(main, params) {
  const playerId = params.id;
  document.getElementById('breadcrumb-trail').innerHTML = '<a href="#/">篮球生活</a> <span class="sep">›</span> <span class="current">球员详情</span>';

  main.innerHTML = '<div class="empty"><p>加载中...</p></div>';

  try {
    const data = await api.getPlayerStats(playerId);
    // Get player info from first game stat or from players list
    const players = await api.getPlayers();
    const player = players.find(p => p.id === parseInt(playerId));
    if (!player) {
      main.innerHTML = '<div class="empty"><p>球员未找到</p></div>';
      return;
    }

    setPageTitle(`${player.name} #${player.number} - Raya 篮球生活`);

    const t = data.totals;
    const gp = t.games_played || 1;
    const totalPts = totalPoints(t);

    main.innerHTML = `
      <div class="pd-header">
        <div class="pd-num">#${player.number}</div>
        <div class="pd-name">${h(player.name)}</div>
      </div>
      <div class="pd-stats">
        ${statCard('总得分', totalPts)}
        ${statCard('场均得分', (totalPts / gp).toFixed(1))}
        ${statCard('总篮板', t.total_rebounds)}
        ${statCard('场均篮板', (t.total_rebounds / gp).toFixed(1))}
        ${statCard('总抢断', t.total_steals)}
        ${statCard('比赛场次', gp)}
        ${statCard('两分球', t.total_2pt)}
        ${statCard('三分球', t.total_3pt)}
        ${statCard('罚篮', t.total_1pt)}
      </div>
      <div style="text-align:center;padding:10px 0">
        <button class="btn btn-outline btn-sm" id="btn-player-share-img">📸 生成分享图片</button>
      </div>
      <h3 style="margin:20px 0 10px;font-size:.95rem">最近比赛</h3>
      <div id="player-games"></div>
      <div id="share-img-modal" class="modal-overlay" style="display:none"></div>
    `;

    document.getElementById('btn-player-share-img').addEventListener('click', async () => {
      try {
        const imgData = await generatePlayerImage(player, data.totals, data.games);
        showPlayerShareModal(imgData);
      } catch (e) { toast('生成图片失败'); }
    });

    const gameList = document.getElementById('player-games');
    if (data.games.length === 0) {
      gameList.innerHTML = '<div class="empty"><p>暂无比赛记录</p></div>';
    } else {
      gameList.innerHTML = data.games.map(g => `
        <div class="card" style="cursor:pointer" data-game-id="${g.id}">
          <div class="card-row">
            <div>
              <div style="font-weight:700">${h(g.opponent)}</div>
              <div style="font-size:.8rem;color:var(--text-muted)">${g.game_date}</div>
            </div>
            <div style="text-align:right">
              <div style="font-weight:700">${g.our_score ?? '--'} : ${g.opponent_score ?? '--'}</div>
              <div style="font-size:.8rem;color:var(--primary)">
                ${g.pts_2pt * 2 + g.pts_3pt * 3 + g.pts_1pt}分
                ${g.pts_2pt ? ` 2pt:${g.pts_2pt}` : ''}
                ${g.pts_3pt ? ` 3pt:${g.pts_3pt}` : ''}
                ${g.pts_1pt ? ` 罚:${g.pts_1pt}` : ''}
              </div>
            </div>
          </div>
        </div>
      `).join('');

      gameList.querySelectorAll('.card').forEach(el => {
        el.addEventListener('click', () => navigate(`/game/${el.dataset.gameId}`));
      });
    }
  } catch (e) {
    main.innerHTML = `<div class="empty"><p>加载失败: ${e.message}</p></div>`;
  }
}

function statCard(label, value) {
  return `<div class="pd-stat-card"><div class="val">${value}</div><div class="lbl">${label}</div></div>`;
}

function totalPoints(t) {
  return (t.total_2pt || 0) * 2 + (t.total_3pt || 0) * 3 + (t.total_1pt || 0);
}

function showPlayerShareModal(imgData) {
  const modal = document.getElementById('share-img-modal');
  modal.style.display = 'flex';
  lockBody();
  modal.innerHTML = `
    <div class="modal-content share-img-container">
      <div class="modal-title">球员数据 - 分享图片</div>
      <img src="${imgData}" style="width:100%;border-radius:8px" alt="球员数据">
      <p style="font-size:.8rem;color:var(--text-muted);margin-top:8px">长按图片保存到相册，分享到朋友圈</p>
      <button class="btn btn-primary btn-block" id="btn-close-player-img">关闭</button>
    </div>
  `;
  document.getElementById('btn-close-player-img').addEventListener('click', () => { modal.style.display = 'none'; unlockBody(); });
  modal.addEventListener('click', (e) => { if (e.target === modal) { modal.style.display = 'none'; unlockBody(); } });
}

function h(str) { return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
