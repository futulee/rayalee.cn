import { route, start } from './router.js?v=31';
import { render as homePage } from './pages/home.js?v=31';
import { render as gamesPage } from './pages/games.js?v=31';
import { render as gameLivePage, cleanup as gameLiveCleanup } from './pages/game-live.js?v=31';
import { render as leaderboardPage } from './pages/leaderboard.js?v=31';
import { render as playerPage } from './pages/player.js?v=31';
import { render as adminPage } from './pages/admin.js?v=31';

route('/', (main) => { showBottomNav(true, 'home'); homePage(main); });
route('/games', (main) => { showBottomNav(true, 'games'); gamesPage(main); });
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
route('/admin', (main) => {
  showBottomNav(false);
  adminPage(main);
});

function showBottomNav(show, active) {
  const nav = document.getElementById('bottom-nav');
  if (!nav) return;
  nav.style.display = show ? 'flex' : 'none';
  if (active) {
    nav.querySelectorAll('.bn-item').forEach(b => b.classList.remove('active'));
    const map = { home: '#nav-home', games: '#nav-games', lb: '#nav-lb' };
    const btn = nav.querySelector(map[active]);
    if (btn) btn.classList.add('active');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('nav-home')?.addEventListener('click', () => { window.location.hash = '#/'; });
  document.getElementById('nav-games')?.addEventListener('click', () => { window.location.hash = '#/games'; });
  document.getElementById('nav-lb')?.addEventListener('click', () => { window.location.hash = '#/leaderboard'; });
});

start();
