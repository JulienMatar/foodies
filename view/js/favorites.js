// My favorites page: the dishes the logged-in user saved (GET /api/favorites)

import * as api from './api.js';
import {
  initNav, initCurrency, toast, reveal, getUser, openSignIn,
  esc, icon, dishImg, arabic, dietBadges,
} from './ui.js';

const $ = (id) => document.getElementById(id);

let favorites = [];

async function load() {
  const grid = $('favGrid');
  const user = await getUser();

  if (!user) {
    grid.setAttribute('aria-busy', 'false');
    $('favLead').textContent = 'Sign in to see the dishes you saved.';
    grid.innerHTML = `
      <div class="empty">
        <h3>Your favorites live in your account.</h3>
        <p>Sign in, then tap the heart on any dish to keep it here.</p>
        <button class="btn btn-primary" type="button" data-signin-page>Sign in</button>
      </div>`;
    return;
  }

  try {
    favorites = await api.getFavorites();
    $('favLead').textContent = `The dishes you saved, ${user.name.split(' ')[0]}. The last one comes first.`;
    render();
  } catch (err) {
    toast(err.message);
    grid.innerHTML = `<div class="empty"><h3>We couldn't load your favorites.</h3><p>${esc(err.message)}</p></div>`;
  }
}

function render() {
  const grid = $('favGrid');
  grid.setAttribute('aria-busy', 'false');

  if (!favorites.length) {
    grid.innerHTML = `
      <div class="empty">
        <h3>Nothing saved yet.</h3>
        <p>Open a dish and tap “Add to favorites” to keep it here.</p>
        <a class="btn btn-primary" href="dishes.html">Browse the dishes</a>
      </div>`;
    return;
  }

  grid.innerHTML = favorites.map((d) => `
    <div class="fav-item reveal">
      <a class="card" href="dish.html?id=${d.id}">
        <div class="frame arch">${dishImg(d)}</div>
        <div class="card-body">
          <h3>${esc(d.name_en)}</h3>
          ${arabic(d.name_ar)}
          <p class="desc">${esc(d.description)}</p>
          ${dietBadges(d, 3)}
        </div>
      </a>
      <button class="btn btn-ghost btn-sm fav-remove" type="button" data-remove="${d.id}">${icon('close', 'icon icon-sm')}Remove</button>
    </div>`).join('');
  reveal(grid);
}

$('favGrid').addEventListener('click', async (e) => {
  if (e.target.closest('[data-signin-page]')) {
    if (await openSignIn()) load();
    return;
  }

  const btn = e.target.closest('[data-remove]');
  if (!btn) return;
  const id = Number(btn.dataset.remove);
  const dish = favorites.find((d) => d.id === id);
  btn.disabled = true;
  try {
    await api.removeFavorite(id);
  } catch (err) {
    // 404 = already removed: show the list without it anyway
    if (err.status !== 404) {
      toast(err.message);
      btn.disabled = false;
      return;
    }
  }
  favorites = favorites.filter((d) => d.id !== id);
  toast(`${dish.name_en} removed from your favorites.`, 'info');
  render();
});

// signing in or out from the nav reloads the list
document.addEventListener('foodies:user', load);

initNav();
initCurrency();
load();
