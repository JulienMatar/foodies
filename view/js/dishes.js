// Dishes page: every dish, with a search box, a region list, categories and diet filters.
// The search on the home page opens this page with ?q= and ?region= in the address.

import * as api from './api.js';
import { initNav, initCurrency, toast, reveal, esc, dishCard, emptyState } from './ui.js';

const $ = (id) => document.getElementById(id);

const params = new URLSearchParams(location.search);
const state = { category: 'all', diet: new Set(), q: (params.get('q') || '').toLowerCase(), region: params.get('region') || '' };
let dishes = [];
let menu = [];
let restaurants = [];

$('q').value = params.get('q') || '';

// ---------- filters ----------

$('cats').addEventListener('click', (e) => {
  const chip = e.target.closest('[data-cat]');
  if (!chip) return;
  state.category = chip.dataset.cat;
  $('cats').querySelectorAll('[data-cat]').forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
  renderGrid();
});

// the diet chips can be combined: "vegan" + "no sesame"
$('diet').addEventListener('click', (e) => {
  const chip = e.target.closest('[data-diet]');
  if (!chip) return;
  const key = chip.dataset.diet;
  if (state.diet.has(key)) state.diet.delete(key);
  else state.diet.add(key);
  chip.setAttribute('aria-pressed', String(state.diet.has(key)));
  renderGrid();
});

$('q').addEventListener('input', () => {
  state.q = $('q').value.trim().toLowerCase();
  renderGrid();
});

$('region').addEventListener('change', () => {
  state.region = $('region').value;
  renderGrid();
});

// the list already updates while typing: Enter does nothing more
$('searchForm').addEventListener('submit', (e) => e.preventDefault());

function clearFilters() {
  Object.assign(state, { category: 'all', diet: new Set(), q: '', region: '' });
  $('q').value = '';
  $('region').value = '';
  $('diet').querySelectorAll('[data-diet]').forEach((c) => c.setAttribute('aria-pressed', 'false'));
  $('cats').querySelectorAll('[data-cat]').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.cat === 'all')));
  renderGrid();
}

const has = (d, allergen) => (d.allergens || []).includes(allergen);
const DIET_TESTS = {
  vegan: (d) => d.is_vegan,
  vegetarian: (d) => d.is_vegetarian,
  gluten_free: (d) => d.is_gluten_free,
  no_nuts: (d) => !has(d, 'nuts'),
  no_sesame: (d) => !has(d, 'sesame'),
  no_dairy: (d) => !has(d, 'dairy'),
  no_raw: (d) => !d.served_raw,
};

function servedInRegion(dishId, regionId) {
  return menu.some((m) => m.dish_id === dishId && m.available
    && restaurants.find((r) => r.id === m.restaurant_id)?.region_id === regionId);
}

function filteredDishes() {
  return dishes.filter((d) => {
    if (state.category !== 'all' && String(d.category_id) !== state.category) return false;
    for (const key of state.diet) if (!DIET_TESTS[key](d)) return false;
    if (state.region && !servedInRegion(d.id, Number(state.region))) return false;
    if (state.q) {
      const text = [d.name_en, d.name_ar, d.description, d.category, ...(d.ingredients || [])].join(' ').toLowerCase();
      if (!text.includes(state.q)) return false;
    }
    return true;
  });
}

// ---------- render ----------

function renderGrid() {
  const grid = $('grid');
  const list = filteredDishes();
  grid.setAttribute('aria-busy', 'false');
  $('count').textContent = `${list.length} ${list.length === 1 ? 'dish' : 'dishes'}`;

  if (!list.length) {
    grid.innerHTML = emptyState('No dishes match.', 'Try another category or diet, or clear the filters.', 'Clear filters', 'clear');
    return;
  }
  grid.innerHTML = list.map((d) => dishCard(d, menu)).join('');
  reveal(grid);
}

function renderSkeleton() {
  const card = `
    <div class="card skel-card" aria-hidden="true">
      <div class="frame skel"></div>
      <div class="card-body"><div class="skel skel-line big w60"></div><div class="skel skel-line w100"></div><div class="skel skel-line w40"></div></div>
    </div>`;
  $('grid').innerHTML = card.repeat(8);
}

$('grid').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  if (btn.dataset.action === 'clear') clearFilters();
  else location.reload();
});

async function load() {
  try {
    const [d, categories, regions, m, r] = await Promise.all([
      api.getDishes(), api.getCategories(), api.getRegions(), api.getMenu(), api.getRestaurantsWithScores(),
    ]);
    dishes = d;
    menu = m;
    restaurants = r;

    $('region').insertAdjacentHTML('beforeend', regions.map((x) => `<option value="${x.id}">${esc(x.name)}</option>`).join(''));
    $('region').value = state.region;
    // a region id that does not exist (an old link): show all regions
    if ($('region').value !== state.region) state.region = '';

    const all = [{ id: 'all', name: 'All' }, ...categories];
    $('cats').innerHTML = all.map((c) => `
      <button class="chip" type="button" data-cat="${c.id}" aria-pressed="${String(c.id) === state.category}">${esc(c.name)}</button>`).join('');

    renderGrid();
  } catch (err) {
    toast(err.message);
    $('grid').setAttribute('aria-busy', 'false');
    $('grid').innerHTML = emptyState("We couldn't load the dishes.", err.message, 'Try again', 'retry');
  }
}

initNav();
initCurrency();
renderSkeleton();
load();
