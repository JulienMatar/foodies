// Restaurants page: the tradition meter. Every place on a line from very modern to pure heritage,
// and a map of where they are. ?region=id (from the road trip page) shows only that city.
// "Near me" asks the browser for the position, then GET /api/restaurants?near=lat,lng sorts by distance.

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
let me = null;     // { lat, lng } once "Near me" was used

// ---------- the map (Leaflet, loaded in restaurants.html) ----------

const LEBANON = [33.85, 35.86];
let map = null;
let pins = null; // a layer group with every marker, cleared before drawing again

function initMap() {
  if (!window.L) return; // the CDN could not be reached: the page still works without the map
  map = L.map('map', { scrollWheelZoom: false }).setView(LEBANON, 8);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '© OpenStreetMap',
  }).addTo(map);
  pins = L.layerGroup().addTo(map);
}

function drawMap(list) {
  if (!map) return;
  pins.clearLayers();
  const points = [];

  for (const r of list) {
    if (r.lat == null) continue;
    const pin = L.divIcon({ className: '', html: `<span class="map-pin ${r.style}"></span>`, iconSize: [18, 18] });
    // esc(): the names come from the database, the popup is HTML
    L.marker([r.lat, r.lng], { icon: pin, title: r.name })
      .bindPopup(`<strong>${esc(r.name)}</strong><br>${esc(r.region)} · ${esc(capitalize(r.style))} · ${priceLevel(r.price_level)}
        ${r.distance_km != null ? `<br><span class="distance">${r.distance_km} km from you</span>` : ''}
        <br><a href="restaurant.html?id=${r.id}">See the menu →</a>`)
      .addTo(pins);
    points.push([r.lat, r.lng]);
  }

  if (me) {
    L.marker([me.lat, me.lng], { icon: L.divIcon({ className: '', html: '<span class="map-pin me"></span>', iconSize: [18, 18] }), title: 'You are here' }).addTo(pins);
    points.push([me.lat, me.lng]);
  }
  if (points.length) map.fitBounds(points, { padding: [30, 30], maxZoom: 13 });
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
    <article class="trad-row reveal">
      <div class="trad-thumb">${cityImg(CITIES[r.region]?.slug, '')}</div>
      <div>
        <h3><a href="restaurant.html?id=${r.id}">${esc(r.name)}</a></h3>
        <p class="trad-meta">${esc(r.region)} · ${esc(capitalize(r.style))} · ${priceLevel(r.price_level)}${r.distance_km != null ? ` · <span class="distance">${r.distance_km} km</span>` : ''}</p>
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
  drawMap(shown);
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
initMap();
load();
