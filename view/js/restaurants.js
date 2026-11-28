// Restaurants page: the tradition meter. Every place on a line from very modern to pure heritage,
// and a Google map of where they are. ?region=id (from the road trip page) shows only that city.
// "Near me" asks the browser for the position, then GET /api/restaurants?near=lat,lng sorts by distance.
// each restaurant has "Show on map" (moves the map to it) and "Directions" (opens the route in Google Maps).

import * as api from './api.js';
import { CITIES } from './heritage.js';
import {
  initNav, initCurrency, toast, reveal, reduceMotion,
  esc, icon, priceLevel, capitalize, stars, traditionPos, cityImg,
  directionsUrl, mapEmbedUrl,
} from './ui.js';

const $ = (id) => document.getElementById(id);

let restaurants = [];
let sort = 'authentic';
let region = null; // { id, name } when the page was opened from a city
let me = null;     // { lat, lng } once "Near me" was used

// ---------- the map (Google Maps, in an <iframe>) ----------

let onMap = null; // id of the restaurant the map shows

// moves the map to a restaurant: the pin comes from its lat,lng in the database
function showOnMap(r, scroll = false) {
  onMap = r.id;
  $('map').src = mapEmbedUrl(r);
  $('mapCaption').textContent = `On the map: ${r.name}, ${r.address || r.region}${r.lat == null ? ' (exact spot not known, searched by address)' : ''}.`;
  $('mapDirections').href = directionsUrl(r, me);
  $('mapDirections').hidden = false;
  document.querySelectorAll('.trad-row').forEach((row) => row.classList.toggle('on-map', Number(row.dataset.id) === r.id));
  if (scroll) $('map').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
}

// ---------- the list ----------

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
    <article class="trad-row reveal${r.id === onMap ? ' on-map' : ''}" data-id="${r.id}">
      <div class="trad-thumb">${cityImg(CITIES[r.region]?.slug, '')}</div>
      <div>
        <h3><a href="restaurant.html?id=${r.id}">${esc(r.name)}</a></h3>
        <p class="trad-meta">${esc(r.region)} · ${esc(capitalize(r.style))} · ${priceLevel(r.price_level)}${r.distance_km != null ? ` · <span class="distance">${r.distance_km} km</span>` : ''}</p>
        <p class="trad-links">
          <button class="link-btn" type="button" data-map="${r.id}">${icon('pin', 'icon icon-sm')}Show on map</button>
          <a href="${esc(directionsUrl(r, me))}" target="_blank" rel="noopener">${icon('arrow', 'icon icon-sm')}Directions</a>
        </p>
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

  // the map shows the first restaurant of the list (the closest one after "Near me"),
  // unless the visitor picked one that is still in the list
  const keep = shown.find((r) => r.id === onMap);
  const first = api.sortRestaurants(shown, sort)[0];
  if (keep) showOnMap(keep);
  else if (first) showOnMap(first);
}

function setSort(value) {
  sort = value;
  $('tradSort').querySelectorAll('[data-sort]').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.sort === value)));
  render();
}

$('tradSort').addEventListener('click', (e) => {
  const chip = e.target.closest('[data-sort]');
  if (chip && restaurants.length) setSort(chip.dataset.sort);
});

// "Show on map" on a restaurant
$('tradList').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-map]');
  if (!btn) return;
  const r = restaurants.find((x) => x.id === Number(btn.dataset.map));
  if (r) showOnMap(r, true);
});

$('tradFilter').addEventListener('click', (e) => {
  if (!e.target.closest('[data-clear-region]')) return;
  region = null;
  history.replaceState(null, '', 'restaurants.html');
  render();
});

// "Near me": the browser asks the visitor first; the position is only sent to our API, never saved
$('nearMe').addEventListener('click', () => {
  if (!navigator.geolocation) return toast('Your browser cannot share its location');
  const btn = $('nearMe');
  btn.disabled = true;

  navigator.geolocation.getCurrentPosition(async ({ coords }) => {
    try {
      me = { lat: coords.latitude, lng: coords.longitude };
      restaurants = await api.getRestaurantsNear(me.lat, me.lng);
      $('tradSort').querySelector('[data-sort="nearest"]').hidden = false;
      onMap = null; // show the closest one
      setSort('nearest');
      toast(`The closest one is ${restaurants[0].name}, ${restaurants[0].distance_km} km away`, 'info');
    } catch (err) {
      toast(err.message);
    } finally {
      btn.disabled = false;
    }
  }, () => {
    btn.disabled = false;
    toast('We could not get your location. Allow it in your browser and try again');
  }, { timeout: 10000 });
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
