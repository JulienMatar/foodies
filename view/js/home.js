// Home page: the search (it opens the dishes page) and the dish of the day

import * as api from './api.js';
import {
  initNav, initCurrency, toast, reveal,
  esc, icon, price, dishImg, arabic, dietBadges, lowestPrice, placesServing,
} from './ui.js';

const $ = (id) => document.getElementById(id);

// the search form is a normal GET form: it opens dishes.html?q=...&region=...
// we only drop the empty fields so the address stays short
$('searchForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const params = new URLSearchParams();
  if ($('q').value.trim()) params.set('q', $('q').value.trim());
  if ($('region').value) params.set('region', $('region').value);
  const query = params.toString();
  location.href = `dishes.html${query ? `?${query}` : ''}`;
});

async function load() {
  try {
    const [dishes, regions, menu] = await Promise.all([api.getDishes(), api.getRegions(), api.getMenu()]);
    $('region').insertAdjacentHTML('beforeend', regions.map((r) => `<option value="${r.id}">${esc(r.name)}</option>`).join(''));
    await loadDishOfTheDay(dishes, menu);
  } catch (err) {
    toast(err.message);
    $('dotd').innerHTML = '';
    $('dotd').setAttribute('aria-busy', 'false');
  }
}

// a dish that suits today's weather in Beirut
async function loadDishOfTheDay(dishes, menu) {
  const box = $('dotd');
  try {
    const { dish_id: id, weather } = await api.getDishOfTheDay();
    const dish = dishes.find((d) => d.id === id) || dishes[0];
    if (!dish) {
      box.innerHTML = '';
      return;
    }
    const from = lowestPrice(menu, dish.id);
    const places = placesServing(menu, dish.id);
    const weatherIcon = Number(weather.temp_c) < 20 ? 'cloud' : 'sun';

    box.innerHTML = `
      <a class="dotd reveal" href="dish.html?id=${dish.id}">
        <div class="frame arch">${dishImg(dish)}</div>
        <div class="dotd-body">
          <p class="eyebrow">Dish of the day <span class="ar" lang="ar" dir="rtl">طبق اليوم</span></p>
          <span class="pill">${icon(weatherIcon, 'icon icon-sm')}${esc(weather.city)} · ${esc(weather.temp_c)}°C · ${esc(weather.label)}</span>
          <h2>${esc(dish.name_en)} ${arabic(dish.name_ar)}</h2>
          <p class="desc">${esc(dish.description)}</p>
          ${dietBadges(dish, 3)}
          <p class="dotd-foot">${places} ${places === 1 ? 'place' : 'places'}${from !== null ? ` · from ${price(from)}` : ''} ${icon('arrow')}</p>
        </div>
      </a>`;
    reveal(box);
  } catch (err) {
    box.innerHTML = '';
    toast(err.message);
  } finally {
    box.setAttribute('aria-busy', 'false');
  }
}

initNav();
initCurrency();
load();
