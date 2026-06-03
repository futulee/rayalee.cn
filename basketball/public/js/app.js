import { route, start } from './router.js';
import { render as gamesPage } from './pages/games.js';
import { render as gameLivePage, cleanup as gameLiveCleanup } from './pages/game-live.js';
import { render as leaderboardPage } from './pages/leaderboard.js';
import { render as playerPage } from './pages/player.js';

route('/', (main) => { showBottomNav(true, 'games'); gamesPage(main); });
route('/leaderboard', (main) => { showBottomNav(true, 'lb'); leaderboardPage(main); });
route('/game/:id', (main, params) => {
  showBottomNav(false);
  const cleanup = gameLiveCleanup;
  gameLivePage(main, params);
  return cleanup;
});
route('/player/:id', (main, params) => {
  showBottomNav(false);
  playerPage(main, params);
});

function showBottomNav(show, active) {
  const nav = document.getElementById('bottom-nav');
  if (!nav) return;
  nav.style.display = show ? 'flex' : 'none';
  if (active) {
    nav.querySelectorAll('.bn-item').forEach(b => b.classList.remove('active'));
    const activeBtn = active === 'games' ? nav.querySelector('#nav-games') : nav.querySelector('#nav-lb');
    if (activeBtn) activeBtn.classList.add('active');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('nav-games')?.addEventListener('click', () => {
    window.location.hash = '#/';
  });
  document.getElementById('nav-lb')?.addEventListener('click', () => {
    window.location.hash = '#/leaderboard';
  });
});

start();
