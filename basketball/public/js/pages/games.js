import { api } from '../api.js?v=36';
import { navigate } from '../router.js?v=32';
import { setPageTitle } from '../share.js?v=31';

export async function render(main) {
  setPageTitle('比赛列表');
  document.getElementById('breadcrumb-trail').innerHTML = '<a href="#/">篮球生活</a> <span class="sep">›</span> <span class="current">比赛列表</span>';

  main.innerHTML = `<div id="games-list"></div>`;

  await loadGames();
}

async function loadGames() {
  const list = document.getElementById('games-list');
  try {
    const games = await api.getGames();
    if (games.length === 0) {
      list.innerHTML = `<div class="empty"><div class="icon">🏀</div><p>还没有比赛记录</p></div>`;
      return;
    }
    list.innerHTML = games.map(g => gameCard(g)).join('');
    list.querySelectorAll('.game-card').forEach(el => {
      el.addEventListener('click', () => navigate(`/game/${el.dataset.id}`));
    });
  } catch (e) {
    list.innerHTML = `<div class="empty"><p>加载失败: ${e.message}</p></div>`;
  }
}

function gameCard(g) {
  const ourForShow = g.our_score != null ? g.our_score : g.computed_our_score;
  const our = ourForShow != null ? ourForShow : '--';
  const opp = g.opponent_score ?? '--';
  let resultTag = '';
  if (g.status === 'finished' && ourForShow != null && g.opponent_score != null) {
    if (ourForShow > g.opponent_score) resultTag = '<span class="score-tag score-win">胜</span>';
    else if (ourForShow < g.opponent_score) resultTag = '<span class="score-tag score-loss">负</span>';
    else resultTag = '<span class="score-tag score-draw">平</span>';
  }
  let statusTag = '';
  if (g.status === 'live') {
    const today = new Date().toISOString().slice(0, 10);
    const datePart = (g.game_date || '').slice(0, 10);
    if (datePart > today) {
      statusTag = '<span style="color:#3b82f6;font-size:.75rem;font-weight:600">◷ 即将开始</span>';
    } else if (datePart === today) {
      statusTag = '<span style="color:#f97316;font-size:.75rem;font-weight:600">● 进行中</span>';
    } else {
      statusTag = '<span style="color:#f97316;font-size:.75rem;font-weight:600">● 进行中</span>';
    }
  }

  return `
    <div class="card game-card" data-id="${g.id}">
      <div class="card-row">
        <div>
          <div style="font-size:.8rem;color:var(--text-muted)">${g.game_date}</div>
          <div style="font-weight:700;font-size:1rem">深圳湾女篮 vs ${h(g.opponent)} ${resultTag} ${statusTag}</div>
          ${g.recorder_name ? `<div style="font-size:.75rem;color:var(--text-muted)">记录: ${h(g.recorder_name)}</div>` : ''}
          ${g.location ? `<div style="font-size:.75rem;color:var(--text-muted)">📍 ${h(g.location)}</div>` : ''}
          ${g.notes ? `<div style="font-size:.72rem;color:#f97316;font-weight:600">🏷️ ${h(g.notes)}</div>` : ''}
        </div>
        <div style="font-size:1.4rem;font-weight:800;text-align:right">
          ${our} : ${opp}
        </div>
      </div>
    </div>`;
}

function h(str) { return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
