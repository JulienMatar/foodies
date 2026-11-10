// Road trip page: the six stops and what to order there, then the six cities.
// "See the places" opens the restaurants page filtered on that city (?region=id).

import * as api from './api.js';
import { CITIES, ROAD } from './heritage.js';
import { initNav, initCurrency, toast, reveal, esc, icon, cityImg, arabic, photoCredit } from './ui.js';

const $ = (id) => document.getElementById(id);

// a region that is not on the road (a new one added later) goes last
const roadPosition = (name) => (ROAD.includes(name) ? ROAD.indexOf(name) : ROAD.length);

// the stops come from heritage.js, so they show even if the API is down
$('route').innerHTML = ROAD.map((name, i) => {
  const city = CITIES[name];
  return `
    <li class="stop">
      <span class="stop-dot" aria-hidden="true"></span>
      <p class="stop-n">Stop ${i + 1}</p>
      <p class="stop-city"><strong>${esc(name)}</strong>${arabic(city.ar)}</p>
      <p class="stop-plate">${esc(city.plate)}</p>
    </li>`;
}).join('');

async function loadCities() {
  const box = $('cities');
  try {
    const [regions, restaurants] = await Promise.all([api.getRegions(), api.getRestaurantsWithScores()]);
    const ordered = [...regions].sort((a, b) => roadPosition(a.name) - roadPosition(b.name));
    box.innerHTML = ordered.map((r) => {
      const city = CITIES[r.name] || {};
      const count = restaurants.filter((x) => x.region_id === r.id).length;
      const link = count
        ? `<a class="btn btn-ghost btn-sm" href="restaurants.html?region=${r.id}">${count === 1 ? 'See the place' : `See the ${count} places`} ${icon('arrow', 'icon icon-sm')}</a>`
        : '<span class="btn btn-ghost btn-sm" aria-disabled="true">No places yet</span>';
      return `
        <article class="city reveal">
          <figure>
            ${cityImg(city.slug, `Photo of ${r.name}: ${city.landmark || ''}`)}
            ${photoCredit('city', city.slug)}
          </figure>
          <h3>${esc(r.name)} ${arabic(city.ar)}</h3>
          ${city.landmark ? `<p class="landmark">${icon('pin', 'icon icon-sm')}${esc(city.landmark)}</p>` : ''}
          ${city.story ? `<p class="story">${esc(city.story)}</p>` : ''}
          ${city.taste ? `<p class="taste">${city.taste.map((t) => `<span>${esc(t)}</span>`).join('')}</p>` : ''}
          ${link}
        </article>`;
    }).join('');
    reveal(box);
  } catch (err) {
    toast(err.message);
    box.innerHTML = '';
  } finally {
    box.setAttribute('aria-busy', 'false');
  }
}

initNav();
initCurrency();
loadCities();
