// Restaurant page (restaurant.html?id=1): the restaurant, its scores, its menu and its reviews.
// Logged-in users can write one review per restaurant, then edit or delete it.
// Admins can delete any review.

import * as api from './api.js';
import { CITIES } from './heritage.js';
import {
  initNav, initCurrency, toast, reveal, getUser, openSignIn,
  esc, icon, price, priceLevel, styleBadge, stars, traditionPos, dishImg, cityImg, arabic, photoCredit,
} from './ui.js';

const $ = (id) => document.getElementById(id);
const restaurantId = Number(new URLSearchParams(location.search).get('id'));

let reviews = [];
let user = null;

const formatDate = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

async function load() {
  if (!Number.isInteger(restaurantId) || restaurantId <= 0) {
    notFound('That link is missing a restaurant.');
    return;
  }

  try {
    const [restaurant, list, me] = await Promise.all([
      api.getRestaurant(restaurantId), api.getReviews(restaurantId), getUser(),
    ]);
    reviews = list;
    user = me;
    renderHero(restaurant);
    renderMenu(restaurant.menu);
    renderReviews();
  } catch (err) {
    toast(err.message);
    notFound(err.message);
  }
}

// ---------- hero: name, details and the score card ----------

function renderHero(r) {
  document.title = `${r.name} · Foodies`;
  if (!$('crumbs').querySelector('[aria-current]')) {
    $('crumbs').insertAdjacentHTML('beforeend', `<li><span aria-current="page">${esc(r.name)}</span></li>`);
  }

  const rating = r.avg_rating ?? 0;
  const tradition = r.tradition_score;
  const count = r.review_count;
  const map = r.lat != null ? `https://www.openstreetmap.org/?mlat=${r.lat}&mlon=${r.lng}#map=17/${r.lat}/${r.lng}` : null;
  const city = CITIES[r.region];

  // the drawing of the restaurant's city on top of the page
  if (city && !$('restBanner').innerHTML) {
    $('restBanner').innerHTML = `
      <figure class="rest-banner">
        ${cityImg(city.slug, `Photo of ${r.region}: ${city.landmark}`)}
        <figcaption class="place">${icon('pin', 'icon icon-sm')}${esc(r.region)} ${arabic(city.ar)} · ${esc(city.landmark)}</figcaption>
        ${photoCredit('city', city.slug)}
      </figure>`;
  }

  const hero = $('restHero');
  hero.setAttribute('aria-busy', 'false');
  hero.innerHTML = `
    <div class="rest-info">
      <div class="pills">
        ${styleBadge(r.style)}
        <span class="pill">${esc(r.region)}</span>
        <span class="pill">${priceLevel(r.price_level)}</span>
      </div>
      <h1>${esc(r.name)}</h1>
      <p class="lead">${esc(r.address || r.region)}${r.phone ? ` · <a href="tel:${esc(r.phone.replace(/\s/g, ''))}">${esc(r.phone)}</a>` : ''}</p>
      ${city ? `<p class="rest-story">${esc(city.story)}</p>` : ''}
      ${map ? `<a class="btn btn-ghost" href="${map}" target="_blank" rel="noopener">${icon('pin')}See it on the map</a>` : ''}
    </div>
    <aside class="score-card" aria-label="Scores from diners">
      <div class="score-top">
        <span class="score-big">${rating ? rating.toFixed(1) : '–'}</span>
        <div>
          ${stars(rating)}
          <p class="score-count">${count} ${count === 1 ? 'review' : 'reviews'}</p>
        </div>
      </div>
      <div class="score-trad">
        <div class="score-label"><span>Tradition</span><strong>${tradition ? `${tradition.toFixed(1)} / 5` : 'not rated yet'}</strong></div>
        <div class="mini-track" role="img" aria-label="Tradition score ${tradition ?? 'not rated'} out of 5">
          <span style="--pos:${tradition ? traditionPos(tradition) : 0}%"></span>
        </div>
        <div class="score-ends" aria-hidden="true"><span>Modern</span><span>Heritage</span></div>
      </div>
    </aside>`;
}

// ---------- menu ----------

function renderMenu(menu) {
  const list = $('menuList');
  list.setAttribute('aria-busy', 'false');

  if (!menu.length) {
    list.innerHTML = '<div class="empty"><h3>No menu yet.</h3><p>This place has not listed any dishes so far.</p></div>';
    return;
  }

  // available dishes first
  const sorted = [...menu].sort((a, b) => Number(b.available) - Number(a.available));
  list.innerHTML = sorted.map((m) => `
    <a class="menu-row reveal${m.available ? '' : ' off'}" href="dish.html?id=${m.dish_id}">
      ${dishImg({ slug: m.slug, name_en: m.name_en }, 'thumb')}
      <div>
        <h3>${esc(m.name_en)} ${arabic(m.name_ar)}</h3>
        <p class="meta">
          <span>${esc(m.category)}</span>
          ${m.is_vegan ? '<span class="veg">Vegan</span>' : m.is_vegetarian ? '<span class="veg">Vegetarian</span>' : ''}
          ${m.available ? '' : '<span>Off the menu today</span>'}
        </p>
      </div>
      <span class="menu-price">${price(m.price_usd)}</span>
    </a>`).join('');
  reveal(list);
}

// ---------- reviews ----------

const myReview = () => (user ? reviews.find((r) => r.user_id === user.id) : null);

function renderReviews() {
  const list = $('reviewList');
  list.setAttribute('aria-busy', 'false');

  // one review per user: the button only shows when this user has none yet
  $('writeReview').hidden = Boolean(myReview()) || Boolean($('reviewFormBox').innerHTML);

  if (!reviews.length) {
    list.innerHTML = `
      <div class="empty">
        <h3>No reviews yet.</h3>
        <p>Been here? Tell everyone how close it is to Teta's cooking.</p>
      </div>`;
    return;
  }

  list.innerHTML = reviews.map((r) => {
    const mine = user && r.user_id === user.id;
    const canDelete = mine || user?.role === 'admin';
    return `
      <article class="review reveal${mine ? ' mine' : ''}">
        <div class="review-top">
          <span class="review-author">${esc(r.author)}${mine ? ' <span class="pill">You</span>' : ''}</span>
          ${stars(r.rating)}
          <span class="pill">Tradition ${r.tradition_rating}/5</span>
          <span class="review-date">${formatDate(r.created_at)}${r.updated_at ? ' · edited' : ''}</span>
        </div>
        ${r.comment ? `<p class="comment">${esc(r.comment)}</p>` : ''}
        ${mine || canDelete ? `
          <div class="review-actions">
            ${mine ? `<button class="btn btn-ghost btn-sm" type="button" data-edit="${r.id}">Edit</button>` : ''}
            ${canDelete ? `<button class="btn btn-ghost btn-sm" type="button" data-delete="${r.id}">Delete</button>` : ''}
          </div>` : ''}
      </article>`;
  }).join('');
  reveal(list);
}

// the star picker and the tradition chips are radio buttons, so they work with the keyboard too
function reviewForm(review) {
  const rating = review?.rating ?? 0;
  const tradition = review?.tradition_rating ?? 0;
  const starInputs = [5, 4, 3, 2, 1].map((n) => `
    <input type="radio" name="rating" id="rate${n}" value="${n}"${n === rating ? ' checked' : ''}>
    <label for="rate${n}" title="${n} out of 5"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 16.9l-5.3 2.7 1-5.8-4.2-4.1 5.9-.9z"/></svg><span class="sr-only">${n} stars</span></label>`).join('');
  const tradInputs = [1, 2, 3, 4, 5].map((n) => `
    <label class="pick"><input type="radio" name="tradition" value="${n}"${n === tradition ? ' checked' : ''}><span class="chip">${n}</span></label>`).join('');

  return `
    <form class="review-form" id="reviewForm" data-id="${review?.id ?? ''}" novalidate>
      <h3>${review ? 'Edit your review' : 'Write a review'}</h3>
      <fieldset>
        <legend>Your rating</legend>
        <div class="star-pick">${starInputs}</div>
      </fieldset>
      <fieldset>
        <legend>How traditional is it?</legend>
        <div class="pick-row">
          <span class="pick-end">Modern</span>${tradInputs}<span class="pick-end">Heritage</span>
        </div>
      </fieldset>
      <label class="input-field">
        <span>Comment (optional)</span>
        <textarea name="comment" maxlength="1000" rows="4" placeholder="What did you eat? Would you go back?">${esc(review?.comment ?? '')}</textarea>
      </label>
      <p class="form-error" role="alert" hidden></p>
      <div class="actions">
        <button class="btn btn-primary" type="submit">${review ? 'Save changes' : 'Post review'}</button>
        <button class="btn btn-ghost" type="button" data-cancel>Cancel</button>
      </div>
    </form>`;
}

function openForm(review) {
  $('reviewFormBox').innerHTML = reviewForm(review);
  $('writeReview').hidden = true;
  const form = $('reviewForm');
  form.addEventListener('submit', submitReview);
  form.querySelector('[data-cancel]').addEventListener('click', closeForm);
  form.scrollIntoView({ block: 'center' });
  form.querySelector('input[name="rating"]').focus();
}

function closeForm() {
  $('reviewFormBox').innerHTML = '';
  renderReviews();
}

async function submitReview(e) {
  e.preventDefault();
  const form = e.target;
  const error = form.querySelector('.form-error');
  const rating = Number(form.querySelector('input[name="rating"]:checked')?.value);
  const tradition = Number(form.querySelector('input[name="tradition"]:checked')?.value);
  const comment = form.elements.comment.value.trim();

  const fail = (message) => { error.textContent = message; error.hidden = false; };
  if (!rating) return fail('Pick a rating from 1 to 5 stars.');
  if (!tradition) return fail('Pick how traditional it is, from 1 (modern) to 5 (heritage).');

  const body = { rating, tradition_rating: tradition, comment: comment || null };
  const id = Number(form.dataset.id);
  const button = form.querySelector('[type="submit"]');
  button.disabled = true;
  try {
    if (id) await api.updateReview(id, body);
    else await api.createReview(restaurantId, body);
    toast(id ? 'Your review is updated.' : 'Thanks! Your review is posted.', 'info');
    $('reviewFormBox').innerHTML = '';
    await refresh();
  } catch (err) {
    if (err.status === 401) {
      user = null;
      fail('Your session ended. Sign in again, then post.');
    } else {
      fail(err.message);
    }
  } finally {
    button.disabled = false;
  }
}

// asks the server again for the reviews and the new scores
async function refresh() {
  const [restaurant, list] = await Promise.all([api.getRestaurant(restaurantId, true), api.getReviews(restaurantId)]);
  reviews = list;
  renderHero(restaurant);
  renderReviews();
}

$('writeReview').addEventListener('click', async () => {
  if (!user) {
    user = await openSignIn('Sign in to write a review.');
    if (!user) return;
    renderReviews();
    // this user may have reviewed this place already: edit that one instead
    if (myReview()) {
      openForm(myReview());
      return;
    }
  }
  openForm(null);
});

$('reviewList').addEventListener('click', async (e) => {
  const edit = e.target.closest('[data-edit]');
  const del = e.target.closest('[data-delete]');

  if (edit) openForm(reviews.find((r) => r.id === Number(edit.dataset.edit)));

  if (del) {
    if (!confirm('Delete this review? This cannot be undone.')) return;
    try {
      await api.deleteReview(Number(del.dataset.delete));
      toast('The review is deleted.', 'info');
      $('reviewFormBox').innerHTML = '';
      await refresh();
    } catch (err) {
      toast(err.message);
    }
  }
});

// signing in or out from the nav shows or hides the Edit / Delete buttons
document.addEventListener('foodies:user', (e) => {
  user = e.detail;
  $('reviewFormBox').innerHTML = '';
  if ($('reviewList')) renderReviews();
});

// last, so every listener above is attached before load() can remove the sections
initNav();
initCurrency();
load();

function notFound(message) {
  $('restHero').outerHTML = `
    <section class="not-found">
      <div class="empty">
        <h3>We couldn't find that restaurant.</h3>
        <p>${esc(message)}</p>
        <a class="btn btn-primary" href="restaurants.html">See all restaurants</a>
      </div>
    </section>`;
  $('menuSec').remove();
  $('reviewsSec').remove();
}
