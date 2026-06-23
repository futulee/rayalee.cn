import { api } from '../api.js?v=31';
import { generateLeaderboardImage, toast, setPageTitle, lockBody, unlockBody } from '../share.js?v=31';
import { navigate } from '../router.js?v=31';

let currentType = 'points';
let currentData = [];

export async function render(main) {
  setPageTitle('Raya 篮球生活 - 排行榜');
  document.getElementById('breadcrumb-trail').innerHTML = '<a href="#/">篮球生活</a> <span class="sep">›</span> <span class="current">排行榜</span>';

  main.innerHTML = `
    <div class="tabs">
      <div class="tab active" data-type="points">总得分</div>
      <div class="tab" data-type="steals">抢断</div>
      <div class="tab" data-type="rebounds">篮板</div>
    </div>
    <div id="lb-content"></div>
    <div style="text-align:center;padding:16px">
      <button class="btn btn-outline btn-sm" id="btn-share-img">📸 生成分享图片</button>
    </div>
    <div id="share-img-modal" class="modal-overlay" style="display:none"></div>
  `;

  // Tab switching
  main.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', async () => {
      main.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentType = tab.dataset.type;
      await loadLeaderboard();
    });
  });

  document.getElementById('btn-share-img').addEventListener('click', async () => {
    try {
      const imgData = await generateLeaderboardImage(currentData, currentType);
      showShareImageModal(imgData);
    } catch (e) { toast('生成图片失败'); }
  });

  await loadLeaderboard();
}

async function loadLeaderboard() {
  const content = document.getElementById('lb-content');
  try {
    currentData = await api.getLeaderboard(currentType);
    if (currentData.length === 0) {
      content.innerHTML = '<div class="empty"><p>暂无数据</p></div>';
      return;
    }
    content.innerHTML = currentData.map((p, i) => lbRow(p, i)).join('');
    content.querySelectorAll('.lb-row').forEach(el => {
      el.addEventListener('click', () => navigate(`/player/${el.dataset.id}`));
    });
  } catch (e) {
    content.innerHTML = `<div class="empty"><p>加载失败</p></div>`;
  }
}

function lbRow(p, i) {
  const rankClass = i < 3 ? ` r${i + 1}` : '';
  return `
    <div class="lb-row" data-id="${p.id}">
      <div class="lb-rank${rankClass}">${i + 1}</div>
      <div class="lb-num">${p.number}</div>
      <div class="lb-name">${h(p.name)}</div>
      <div style="font-size:.75rem;color:var(--text-muted);min-width:40px;text-align:right">${p.games_played}场</div>
      <div class="lb-total">${p.total}</div>
    </div>`;
}

function showShareImageModal(imgData) {
  const modal = document.getElementById('share-img-modal');
  modal.style.display = 'flex';
  lockBody();
  modal.innerHTML = `
    <div class="modal-content share-img-container">
      <div class="modal-title">${typeLabel(currentType)} - 分享图片</div>
      <img src="${imgData}" style="width:100%;border-radius:8px" alt="排行榜">
      <p style="font-size:.8rem;color:var(--text-muted);margin-top:8px">长按图片保存到相册，分享到朋友圈</p>
      <button class="btn btn-primary btn-block" id="btn-close-img">关闭</button>
    </div>
  `;
  document.getElementById('btn-close-img').addEventListener('click', () => { modal.style.display = 'none'; unlockBody(); });
  modal.addEventListener('click', (e) => { if (e.target === modal) { modal.style.display = 'none'; unlockBody(); } });
}

function typeLabel(t) {
  return { points: '得分榜', steals: '抢断榜', assists: '助攻榜', rebounds: '篮板榜' }[t] || '';
}

function h(str) { return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
