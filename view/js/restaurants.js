// Restaurants page: the tradition meter. Every place on a line from very modern to pure heritage.
// ?region=id (from the road trip page) shows only that city.

import * as api from './api.js';
import { CITIES } from './heritage.js';
import {
  initNav, initCurrency, toast, reveal,
  esc, icon, priceLevel, capitalize, stars, traditionPos, cityImg,
} from './ui.js';

const $ = (id) => document.getElementById(id);

let restaurants = [];
let sort = 'authentic';
let region = null; // { id, name } when the page was opened from a city

function render() {
  const list = $('tradList');
  list.setAttribute('aria-busy', 'false');

  const filter = $('tradFilter');
  filter.hidden = !region;
  if (region) {
    filter.innerHTML = `${icon('pin', 'icon icon-sm')}Showing ${esc(region.name)} <button class="chip" type="button" data-clear-region>Show all ${icon('close', 'icon icon-sm')}</button>`;
  }

  const shown = region ? restaurants.filter((r) => r.region_id === region.id) : restaurants;
  list.innerHTML = api.sortRestaurants(shown, sort).map((r) => `
    <article class="trad-row reveal">
      <div class="trad-thumb">${cityImg(CITIES[r.region]?.slug, '')}</div>
      <div>
        <h3><a href="restaurant.html?id=${r.id}">${esc(r.name)}</a></h3>
        <p class="trad-meta">${esc(r.region)} · ${esc(capitalize(r.style))} · ${priceLevel(r.price_level)}</p>
      </div>
      <div class="meter">
        <div class="track" role="img" aria-label="Tradition score ${r.tradition} out of 5">
          <span class="dot${r.tradition >= 4 ? ' high' : ''}" style="--pos:${traditionPos(r.tradition)}%"></span>
        </div>
        <div class="track-labels" aria-hidden="true"><span>← Modern</span><span>Heritage →</span></div>
      </div>
      <div class="trad-rating">
        ${stars(r.rating)}
        <span class="reviews">${r.reviews} ${r.reviews === 1 ? 'review' : 'reviews'}</span>
      </div>
    </article>`).join('');
  reveal(list);
}

$('tradSort').addEventListener('click', (e) => {
  const chip = e.target.closest('[data-sort]');
  if (!chip || !restaurants.length) return;
  sort = chip.dataset.sort;
  $('tradSort').querySelectorAll('[data-sort]').forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
  render();
});

$('tradFilter').addEventListener('click', (e) => {
  if (!e.target.closest('[data-clear-region]')) return;
  region = null;
  history.replaceState(null, '', 'restaurants.html');
  render();
});

async function load() {
  try {
    const [list, regions] = await Promise.all([api.getRestaurantsWithScores(), api.getRegions()]);
    restaurants = list;
    const wanted = Number(new URLSearchParams(location.search).get('region'));
    region = regions.find((r) => r.id === wanted) || null;
    render();
    // the list is at the top of the page: let the dots slide to their place once it is drawn
    setTimeout(() => $('restaurants').classList.add('in'), 80);
  } catch (err) {
    toast(err.message);
    $('tradList').setAttribute('aria-busy', 'false');
    $('tradList').innerHTML = `<div class="empty"><h3>We couldn't load the restaurants.</h3><p>${esc(err.message)}</p></div>`;
  }
}

initNav();
initCurrency();
load();
