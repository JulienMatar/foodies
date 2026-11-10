// Shared UI pieces for every page: icons, nav menu, currency toggle,
// toasts, scroll reveal and small HTML helpers.

import { getRates, getMe, login, register, logout, googleAvailable } from './api.js';
import { DISHES as DISH_PHOTOS, CITIES as CITY_PHOTOS, PRINTS } from './credits.js';

export const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- HTML helpers ----------

// escapes text before putting it in innerHTML (dish names come from the database)
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const ICON_PATHS = {
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  heart: '<path d="M12 20s-7.2-4.4-9.3-9.1A5 5 0 0 1 12 6.2a5 5 0 0 1 9.3 4.7C19.2 15.6 12 20 12 20z"/>',
  send: '<path d="M21 3 10.5 13.5"/><path d="M21 3 14.5 21l-4-7.5L3 9.5z"/>',
  leaf: '<path d="M5 20c0-9.5 5.5-15 15-15 0 9.5-5.5 15-15 15z"/><path d="M5 20 13.5 11.5"/>',
  chat: '<path d="M20.5 12a8.5 8.5 0 0 1-12.3 7.6L3.5 20.5l1-4.4A8.5 8.5 0 1 1 20.5 12z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/>',
  cloud: '<path d="M7.5 18.5h9.5a4 4 0 0 0 .5-8 6 6 0 0 0-11.5 1.3 3.4 3.4 0 0 0 1.5 6.7z"/>',
  calendar: '<rect x="4" y="5" width="16" height="15" rx="2.5"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  alert: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5v.01"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.5v.01"/>',
  pin: '<path d="M12 21s-6.5-6.2-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 14.8 12 21 12 21z"/><circle cx="12" cy="9.8" r="2.4"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
};

export function icon(name, className = 'icon') {
  return `<svg class="${className}" viewBox="0 0 24 24" aria-hidden="true">${ICON_PATHS[name] || ''}</svg>`;
}

// ---------- pictures ----------
// dishes and cities are real photographs in img/photos/, credited in credits.js.
// a dish added later without a photo shows a plain "no photo yet" box.

export function dishImg(dish, className = 'dish-img') {
  const photo = dish.slug && DISH_PHOTOS[dish.slug];
  if (!photo) return `<span class="no-photo ${className}">No photo yet</span>`;
  return `<img class="${className}" src="img/photos/dishes/${photo.file}" alt="Photo of ${esc(dish.name_en)}" loading="lazy" width="1200" height="900">`;
}

// the photo of a city, or nothing if we have none
export function cityImg(slug, alt, className = 'city-img') {
  const photo = slug && CITY_PHOTOS[slug];
  if (!photo) return '';
  return `<img class="${className}" src="img/photos/cities/${photo.file}" alt="${esc(alt)}" loading="lazy" width="1200" height="900">`;
}

// "Photo: author, license" under a picture (most free licenses ask for it)
export function photoCredit(kind, slug) {
  const photo = (kind === 'city' ? CITY_PHOTOS : DISH_PHOTOS)[slug];
  if (!photo) return '';
  return `<p class="credit">Photo: ${esc(photo.author)}, <a href="${esc(photo.source)}" target="_blank" rel="noopener">${esc(photo.license)}</a></p>`;
}

// the full list in the footer of every page
function renderCredits() {
  const list = document.getElementById('creditList');
  if (!list) return;
  const line = (what, c) => `<li>${what}: ${esc(c.author)}, <a href="${esc(c.source)}" target="_blank" rel="noopener">${esc(c.license)}</a></li>`;
  const name = (slug) => capitalize(slug.replace(/-/g, ' '));
  list.innerHTML = [
    ...Object.values(PRINTS).map((p) => line(esc(p.title), p)),
    ...Object.entries(CITY_PHOTOS).map(([slug, c]) => line(`${esc(name(slug))} (photo)`, c)),
    ...Object.entries(DISH_PHOTOS).map(([slug, c]) => line(`${esc(name(slug))} (photo)`, c)),
  ].join('');
}

// the Arabic name, written in calligraphy
export const arabic = (text, className = 'ar') => (text ? `<span class="${className}" lang="ar" dir="rtl">${esc(text)}</span>` : '');

// ---------- diet labels ----------
// built from the dish columns: is_vegan, is_vegetarian, is_gluten_free, allergens, meat, served_raw

const MEAT_LABEL = { lamb: 'Lamb', beef: 'Beef', chicken: 'Chicken', fish: 'Fish' };

// [{ label, kind }] kind = good (green), info (beige), warn (red)
export function dietTags(dish) {
  const tags = [];
  const has = (a) => (dish.allergens || []).includes(a);
  if (dish.is_vegan) tags.push({ label: 'Vegan', kind: 'good' });
  else if (dish.is_vegetarian) tags.push({ label: 'Vegetarian', kind: 'good' });
  if (dish.is_gluten_free) tags.push({ label: 'Gluten-free', kind: 'good' });
  if (!has('dairy') && !dish.is_vegan) tags.push({ label: 'Dairy-free', kind: 'good' });
  if (MEAT_LABEL[dish.meat]) tags.push({ label: MEAT_LABEL[dish.meat], kind: 'info' });
  if (dish.served_raw) tags.push({ label: 'Served raw', kind: 'warn' });
  for (const a of ['nuts', 'sesame', 'dairy', 'eggs']) if (has(a)) tags.push({ label: `Contains ${a}`, kind: 'warn' });
  return tags;
}

export function dietBadges(dish, limit = Infinity) {
  const tags = dietTags(dish);
  const shown = tags.slice(0, limit).map((t) => `<span class="tag tag-${t.kind}">${esc(t.label)}</span>`).join('');
  const more = tags.length > limit ? `<span class="tag tag-info">+${tags.length - limit}</span>` : '';
  return `<span class="tags">${shown}${more}</span>`;
}

export const priceLevel = (n) => '$'.repeat(n || 1);
export const capitalize = (s) => (s ? s[0].toUpperCase() + s.slice(1) : '');

export function styleBadge(style) {
  return `<span class="pill style-badge style-${esc(style)}">${esc(capitalize(style))}</span>`;
}

export function stars(rating) {
  const full = Math.round(rating);
  let svgs = '';
  for (let i = 1; i <= 5; i++) {
    svgs += `<svg class="star${i <= full ? ' on' : ''}" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 16.9l-5.3 2.7 1-5.8-4.2-4.1 5.9-.9z"/></svg>`;
  }
  if (!rating) return '<span class="stars"><span class="stars-num">No reviews yet</span></span>';
  return `<span class="stars" role="img" aria-label="Rated ${rating} out of 5">${svgs}<span class="stars-num" aria-hidden="true">${rating.toFixed(1)}</span></span>`;
}

// tradition score 1 (very modern) .. 5 (very traditional) as a 0-100% position
export const traditionPos = (score) => ((score - 1) / 4) * 100;

// ---------- the menu (which restaurant serves which dish) ----------

// the cheapest price of a dish among the places that have it today, or null
export function lowestPrice(menu, dishId) {
  const prices = menu.filter((m) => m.dish_id === dishId && m.available).map((m) => m.price_usd);
  return prices.length ? Math.min(...prices) : null;
}

export const placesServing = (menu, dishId) => menu.filter((m) => m.dish_id === dishId && m.available).length;

// a dish card, used on the dishes page and the favorites page
export function dishCard(d, menu = []) {
  const from = lowestPrice(menu, d.id);
  return `
    <a class="card reveal" href="dish.html?id=${d.id}">
      <div class="frame arch">${dishImg(d)}</div>
      <div class="card-body">
        <div class="card-top">
          <h3>${esc(d.name_en)}</h3>
          ${from !== null ? `<span class="price-from">from ${price(from)}</span>` : ''}
        </div>
        ${arabic(d.name_ar)}
        <p class="desc">${esc(d.description)}</p>
        ${dietBadges(d, 3)}
      </div>
    </a>`;
}

// empty / error box with one button (data-action says what the button does)
export function emptyState(title, text, label, action) {
  return `
    <div class="empty">
      <h3>${esc(title)}</h3>
      <p>${esc(text)}</p>
      <button class="btn btn-ghost" type="button" data-action="${action}">${esc(label)}</button>
    </div>`;
}

// ---------- currency ----------
// every price is written as <span data-usd="4.5">; the toggle rewrites all of them

const CUR_KEY = 'foodies.currency';
let rates = { USD: 1, LBP: 89500, EUR: 0.92 };
let currency = 'USD';
try {
  currency = localStorage.getItem(CUR_KEY) || 'USD';
} catch {
  // storage blocked: keep USD
}

export function formatPrice(usd) {
  const n = Number(usd);
  if (currency === 'LBP') return `${(Math.round((n * rates.LBP) / 1000) * 1000).toLocaleString('en-US')} LBP`;
  if (currency === 'EUR') return `€${(n * rates.EUR).toFixed(2)}`;
  return `$${Number.isInteger(n) ? n : n.toFixed(2)}`;
}

export const price = (usd) => `<span data-usd="${usd}">${formatPrice(usd)}</span>`;

export function applyPrices(root = document) {
  root.querySelectorAll('[data-usd]').forEach((el) => {
    el.textContent = formatPrice(el.dataset.usd);
  });
}

export async function initCurrency() {
  try {
    rates = await getRates();
  } catch {
    // keep the default rates
  }

  const buttons = document.querySelectorAll('.seg [data-cur]');
  const sync = () => buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cur === currency)));
  buttons.forEach((b) => b.addEventListener('click', () => {
    currency = b.dataset.cur;
    try { localStorage.setItem(CUR_KEY, currency); } catch { /* not remembered */ }
    sync();
    applyPrices();
  }));
  sync();
  applyPrices();
}

// ---------- nav ----------

export function initNav() {
  const nav = document.getElementById('nav');
  const btn = nav?.querySelector('.menu-btn');

  if (btn) {
    const setOpen = (open) => {
      nav.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', String(open));
      btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      btn.innerHTML = icon(open ? 'close' : 'menu');
    };
    btn.addEventListener('click', () => setOpen(!nav.classList.contains('open')));
    nav.querySelectorAll('.nav-links a').forEach((a) => a.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && nav.classList.contains('open')) {
        setOpen(false);
        btn.focus();
      }
    });
  }

  initAccount();
  renderCredits();
}

// ---------- account: who is logged in, the nav buttons, the sign-in dialog ----------

let userPromise; // asked to the server once per page

// the logged-in user { id, name, email, role }, or null
export function getUser() {
  userPromise ??= getMe();
  return userPromise;
}

// saves the new user, redraws the nav and tells the page (it listens to 'foodies:user')
function setUser(user) {
  userPromise = Promise.resolve(user);
  renderAccount(user);
  document.dispatchEvent(new CustomEvent('foodies:user', { detail: user }));
}

function renderAccount(user) {
  const box = document.getElementById('account');
  if (!box) return;
  box.innerHTML = user
    ? `<a class="btn btn-ghost btn-sm" href="favorites.html" title="My favorites">${icon('heart', 'icon icon-sm')}${esc(user.name.split(' ')[0])}</a>
       <button class="btn btn-cream btn-sm" type="button" data-signout>Sign out</button>`
    : '<button class="btn btn-cream btn-sm" type="button" data-signin>Sign in</button>';
}

async function initAccount() {
  const box = document.getElementById('account');
  if (!box) return;

  box.addEventListener('click', async (e) => {
    if (e.target.closest('[data-signin]')) openSignIn();
    if (e.target.closest('[data-signout]')) {
      try {
        await logout();
      } catch {
        // the cookie was already gone: we are logged out anyway
      }
      setUser(null);
      toast('You are signed out. See you soon!', 'info');
    }
  });

  renderAccount(await getUser());
}

let dialog;
let resolveDialog; // resolves the promise returned by openSignIn() when the dialog closes
let dialogUser = null;

// opens the sign-in dialog; the promise gives the user once logged in, or null if it was closed.
// note: an optional sentence saying why we ask (e.g. "Sign in to save favorites")
export function openSignIn(note = '') {
  dialog ??= buildDialog();
  dialogUser = null;
  setMode('login');
  dialog.querySelector('[data-note]').textContent = note;
  dialog.querySelector('[data-note]').hidden = !note;
  dialog.showModal();
  dialog.querySelector('input[name="email"]').focus();
  return new Promise((resolve) => { resolveDialog = resolve; });
}

function buildDialog() {
  const el = document.createElement('dialog');
  el.className = 'modal';
  el.setAttribute('aria-labelledby', 'authTitle');
  el.innerHTML = `
    <form class="modal-card" novalidate>
      <button class="icon-btn modal-x" type="button" data-close aria-label="Close">${icon('close')}</button>
      <p class="eyebrow">Your Foodies account</p>
      <h2 id="authTitle">Welcome back.</h2>
      <p class="modal-note" data-note hidden></p>
      <div class="seg auth-tabs" role="group" aria-label="Sign in or create an account">
        <button type="button" data-mode="login">Sign in</button>
        <button type="button" data-mode="register">Create account</button>
      </div>
      <label class="input-field" data-register-only>
        <span>Name</span>
        <input name="name" autocomplete="name" maxlength="100">
      </label>
      <label class="input-field">
        <span>Email</span>
        <input name="email" type="email" autocomplete="email" maxlength="255">
      </label>
      <label class="input-field">
        <span>Password</span>
        <input name="password" type="password" maxlength="72">
      </label>
      <p class="form-error" role="alert" hidden></p>
      <button class="btn btn-primary" type="submit" data-submit>Sign in</button>
      <a class="btn btn-ghost" href="/api/auth/google" data-google hidden>Continue with Google</a>
    </form>`;
  document.body.append(el);

  el.querySelector('[data-close]').addEventListener('click', () => el.close());
  // a click on the dark backdrop (outside the card) closes it too
  el.addEventListener('click', (e) => { if (e.target === el) el.close(); });
  el.addEventListener('close', () => resolveDialog?.(dialogUser));
  el.querySelector('.auth-tabs').addEventListener('click', (e) => {
    const tab = e.target.closest('[data-mode]');
    if (tab) setMode(tab.dataset.mode);
  });
  el.querySelector('form').addEventListener('submit', submitAuth);

  // only show the Google button when the server has it set up
  googleAvailable().then((ok) => { el.querySelector('[data-google]').hidden = !ok; });
  return el;
}

let mode = 'login';

function setMode(next) {
  mode = next;
  const isRegister = mode === 'register';
  dialog.querySelectorAll('[data-mode]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
  dialog.querySelector('[data-register-only]').hidden = !isRegister;
  dialog.querySelector('#authTitle').textContent = isRegister ? 'Pull up a chair.' : 'Welcome back.';
  dialog.querySelector('[data-submit]').textContent = isRegister ? 'Create my account' : 'Sign in';
  dialog.querySelector('input[name="password"]').autocomplete = isRegister ? 'new-password' : 'current-password';
  showError('');
}

function showError(message) {
  const box = dialog.querySelector('.form-error');
  box.textContent = message;
  box.hidden = !message;
}

async function submitAuth(e) {
  e.preventDefault();
  const form = e.target;
  // form.elements (not form.name: that is the form's own name attribute)
  const fields = form.elements;
  const name = fields.name.value.trim();
  const email = fields.email.value.trim();
  const password = fields.password.value;

  // quick checks here; the server checks everything again
  if (mode === 'register' && !name) return showError('Tell us your name.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showError('That email does not look right.');
  if (mode === 'register' && password.length < 8) return showError('Use at least 8 characters for the password.');
  if (!password) return showError('Type your password.');

  const button = form.querySelector('[data-submit]');
  button.disabled = true;
  try {
    const user = mode === 'register' ? await register(name, email, password) : await login(email, password);
    dialogUser = user;
    form.reset();
    dialog.close();
    setUser(user);
    toast(mode === 'register' ? `Welcome to Foodies, ${user.name}!` : `Welcome back, ${user.name}!`, 'info');
  } catch (err) {
    showError(err.message);
  } finally {
    button.disabled = false;
  }
}

// ---------- toasts ----------

let toastHost;

export function toast(message, type = 'error') {
  if (!toastHost) {
    toastHost = document.createElement('div');
    toastHost.className = 'toast-host';
    document.body.append(toastHost);
  }

  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.setAttribute('role', type === 'error' ? 'alert' : 'status');
  el.innerHTML = `${icon(type === 'error' ? 'alert' : 'info')}<span></span><button class="toast-x" type="button" aria-label="Dismiss">${icon('close', 'icon icon-sm')}</button>`;
  el.querySelector('span').textContent = message;

  const remove = () => el.remove();
  el.querySelector('.toast-x').addEventListener('click', remove);
  setTimeout(remove, 6000);
  toastHost.append(el);
}

// ---------- scroll reveal ----------
// .reveal elements fade and slide up when they enter the screen, 60ms apart

let observer;

export function reveal(root = document) {
  const items = root.querySelectorAll('.reveal:not(.in)');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('in'));
    return;
  }

  observer ??= new IntersectionObserver((entries) => {
    entries.filter((e) => e.isIntersecting).forEach((entry, i) => {
      entry.target.style.setProperty('--d', `${i * 60}ms`);
      entry.target.classList.add('in');
      observer.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -40px 0px', threshold: 0.08 });

  items.forEach((el) => observer.observe(el));
}

// adds .in to an element once, when it enters the screen (used for the tradition dots)
export function onEnter(el, callback, threshold = 0.2) {
  if (reduceMotion || !('IntersectionObserver' in window)) {
    callback();
    return;
  }
  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      callback();
      io.disconnect();
    }
  }, { threshold });
  io.observe(el);
}
