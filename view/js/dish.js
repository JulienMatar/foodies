// Dish page (dish.html?id=3): the dish, what is in it, the diets it fits, and the restaurants that make it

import * as api from './api.js';
import { CITIES } from './heritage.js';
import {
  initNav, initCurrency, toast, reveal, getUser, openSignIn,
  esc, icon, price, priceLevel, styleBadge, stars, traditionPos, dishImg, cityImg, arabic, photoCredit,
} from './ui.js';

const $ = (id) => document.getElementById(id);

const WEATHER = {
  hot: ['sun', 'Best on hot days'],
  cold: ['cloud', 'Best on cold days'],
  any: ['calendar', 'Good any day'],
};

const MEAT = { none: 'None', lamb: 'Lamb', beef: 'Beef', chicken: 'Chicken', fish: 'Fish' };

let makers = [];
let currentDish = null;

// is this dish in the logged-in user's favorites? (false when nobody is logged in)
async function isFavorite(dishId) {
  if (!(await getUser())) return false;
  try {
    const favorites = await api.getFavorites();
    return favorites.some((d) => d.id === dishId);
  } catch {
    return false;
  }
}

async function load() {
  const id = Number(new URLSearchParams(location.search).get('id'));
  if (!Number.isInteger(id) || id <= 0) {
    notFound('That link is missing a dish.');
    return;
  }

  try {
    const [dish, list, fav] = await Promise.all([api.getDish(id), api.getDishMakers(id), isFavorite(id)]);
    makers = list;
    currentDish = dish;
    renderDish(dish, fav);
    renderMakers('authentic');
  } catch (err) {
    toast(err.message);
    notFound(err.message);
  }
}

// one line of the diet panel: yes (green), no (grey) or watch out (red)
function dietRow(label, value, kind) {
  return `<li><span>${esc(label)}</span><span class="${kind}">${esc(value)}</span></li>`;
}

function dietPanel(d) {
  const has = (a) => (d.allergens || []).includes(a);
  const yesNo = (ok) => (ok ? ['Yes', 'yes'] : ['No', 'no']);
  const contains = (a) => (has(a) ? ['Contains', 'warn'] : ['None', 'yes']);
  const rows = [
    ['Vegan', ...yesNo(d.is_vegan)],
    ['Vegetarian', ...yesNo(d.is_vegetarian)],
    ['Gluten-free', ...yesNo(d.is_gluten_free)],
    ['Meat or fish', MEAT[d.meat] || d.meat, d.meat === 'none' ? 'yes' : 'no'],
    ['Dairy', ...contains('dairy')],
    ['Nuts', ...contains('nuts')],
    ['Sesame', ...contains('sesame')],
    ['Eggs', ...contains('eggs')],
    ['Fish', ...contains('fish')],
  ];
  return rows.map(([label, value, kind]) => dietRow(label, value, kind)).join('');
}

function renderDish(dish, fav) {
  document.title = `${dish.name_en} · Foodies`;
  $('crumbs').insertAdjacentHTML('beforeend', `
    <li><a href="dishes.html">${esc(dish.category)}</a></li>
    <li><span aria-current="page">${esc(dish.name_en)}</span></li>`);

  const open = makers.filter((m) => m.available);
  const prices = open.map((m) => m.price_usd);
  const regions = [...new Set(open.map((m) => m.region))];
  const [weatherIcon, weatherText] = WEATHER[dish.weather] || WEATHER.any;

  let range = '—';
  if (prices.length) {
    const lo = Math.min(...prices);
    const hi = Math.max(...prices);
    range = lo === hi ? price(lo) : `${price(lo)} – ${price(hi)}`;
  }

  const hero = $('dishHero');
  hero.setAttribute('aria-busy', 'false');
  hero.innerHTML = `
    <figure class="dish-art">
      <div class="mount"><div class="photo">${dishImg(dish, 'dish-img')}</div></div>
      ${arabic(dish.name_ar)}
      ${photoCredit('dish', dish.slug)}
    </figure>
    <div class="dish-info">
      <div class="pills">
        <span class="pill">${esc(dish.category)}</span>
        <span class="pill">${icon(weatherIcon, 'icon icon-sm')}${weatherText}</span>
        ${dish.first_timer ? '<span class="pill pill-gold">Great first try</span>' : ''}
      </div>
      <h1>${esc(dish.name_en)}</h1>
      <p class="lead">${esc(dish.description)}</p>
      <dl class="stats">
        <div><dt>Served at</dt><dd>${open.length} ${open.length === 1 ? 'place' : 'places'}</dd></div>
        <div><dt>Price range</dt><dd>${range}</dd></div>
        <div><dt>Regions</dt><dd>${regions.length ? esc(regions.join(', ')) : '—'}</dd></div>
      </dl>
      ${dish.served_raw ? `<p class="raw-warning">${icon('alert')}<span>This dish is served raw. Skip it if you are pregnant or avoid raw meat or fish.</span></p>` : ''}
      ${dish.good_to_know ? `<p class="tip"><span><strong>Good to know:</strong> ${esc(dish.good_to_know)}</span></p>` : ''}
      <div class="facts">
        <section class="fact-box" aria-labelledby="ingTitle">
          <h2 id="ingTitle">What's in it</h2>
          <ul class="ing">${(dish.ingredients || []).map((i) => `<li>${esc(i)}</li>`).join('') || '<li>Ask the restaurant</li>'}</ul>
        </section>
        <section class="fact-box" aria-labelledby="dietTitle">
          <h2 id="dietTitle">Diet and allergies</h2>
          <ul class="diet-list">${dietPanel(dish)}</ul>
        </section>
      </div>
      <div class="actions">
        <button class="btn btn-ghost fav" id="fav" type="button" aria-pressed="${fav}">
          ${icon('heart')}<span>${fav ? 'Saved to favorites' : 'Add to favorites'}</span>
        </button>
        <a class="btn btn-primary" href="#makers">Where to eat it ${icon('arrow')}</a>
      </div>
    </div>`;

  $('fav').addEventListener('click', () => toggleFavorite(dish));
}

function setFavButton(on) {
  $('fav').setAttribute('aria-pressed', String(on));
  $('fav').querySelector('span').textContent = on ? 'Saved to favorites' : 'Add to favorites';
}

// favorites are saved in the database, so the user has to be logged in
async function toggleFavorite(dish) {
  if (!(await getUser())) {
    const user = await openSignIn(`Sign in to save ${dish.name_en} to your favorites.`);
    if (!user) return; // the dialog was closed
    // the dish may already be one of this user's favorites
    if (await isFavorite(dish.id)) {
      setFavButton(true);
      return;
    }
  }

  const on = $('fav').getAttribute('aria-pressed') !== 'true';
  const button = $('fav');
  button.disabled = true;
  try {
    if (on) await api.addFavorite(dish.id);
    else await api.removeFavorite(dish.id);
    setFavButton(on);
    toast(on ? `${dish.name_en} saved to your favorites.` : `${dish.name_en} removed from your favorites.`, 'info');
  } catch (err) {
    // 409 = it was already saved, 404 = it was already removed (e.g. from another tab)
    if (err.status === 409 || err.status === 404) setFavButton(on);
    else toast(err.message);
  } finally {
    button.disabled = false;
  }
}

// signing in or out from the nav updates the heart
document.addEventListener('foodies:user', async () => {
  if (currentDish && $('fav')) setFavButton(await isFavorite(currentDish.id));
});

function renderMakers(sort) {
  const list = $('makerList');
  list.setAttribute('aria-busy', 'false');

  if (!makers.length) {
    list.innerHTML = `
      <div class="empty">
        <h3>Nobody makes it yet.</h3>
        <p>No restaurant has this dish on its menu so far.</p>
        <a class="btn btn-ghost" href="dishes.html">See other dishes</a>
      </div>`;
    return;
  }

  // places where the dish is off the menu always go last
  const sorted = api.sortRestaurants(makers, sort).sort((a, b) => Number(b.available) - Number(a.available));
  list.innerHTML = sorted.map((r) => `
    <a class="maker reveal${r.available ? '' : ' off'}" href="restaurant.html?id=${r.id}">
      <span class="maker-thumb">${cityImg(CITIES[r.region]?.slug, '')}</span>
      <div class="maker-main">
        <h3>${esc(r.name)}</h3>
        <p class="meta">${esc(r.address || r.region)} · ${priceLevel(r.price_level)}</p>
      </div>
      <div class="maker-tags">
        ${styleBadge(r.style)}
        <div class="mini">
          <div class="mini-track" role="img" aria-label="Tradition score ${r.tradition} out of 5"><span style="--pos:${traditionPos(r.tradition)}%"></span></div>
          <span class="mini-label" aria-hidden="true">Tradition ${r.tradition}/5</span>
        </div>
        ${stars(r.rating)}
      </div>
      <div class="maker-price">
        <div class="price-big">${price(r.price_usd)}</div>
        ${r.available ? '' : '<span class="off-note">Off the menu today</span>'}
      </div>
    </a>`).join('');
  reveal(list);
}

$('makerSort').addEventListener('click', (e) => {
  const chip = e.target.closest('[data-sort]');
  if (!chip) return;
  $('makerSort').querySelectorAll('[data-sort]').forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
  renderMakers(chip.dataset.sort);
});

// last, so every listener above is attached before load() can remove the sections
initNav();
initCurrency();
load();

function notFound(message) {
  $('dishHero').outerHTML = `
    <section class="not-found">
      <div class="empty">
        <h3>We couldn't find that dish.</h3>
        <p>${esc(message)}</p>
        <a class="btn btn-primary" href="dishes.html">See all dishes</a>
      </div>
    </section>`;
  $('makers').remove();
}
