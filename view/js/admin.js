// Admin dashboard: the numbers of the site and the questions asked to Teta
// (GET /api/admin/stats and GET /api/admin/chat-logs, both admin only)

import * as api from './api.js';
import { initNav, initCurrency, toast, getUser, openSignIn, esc } from './ui.js';

const $ = (id) => document.getElementById(id);
const body = $('adminBody');

let page = 1;

const DAY = new Intl.DateTimeFormat('en', { weekday: 'short' });
const WHEN = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

function message(title, text, button = '') {
  body.setAttribute('aria-busy', 'false');
  body.innerHTML = `<div class="empty"><h3>${esc(title)}</h3><p>${esc(text)}</p>${button}</div>`;
}

// a ranked list: [{ label, href, n }]
function rank(title, items, unit) {
  const rows = items.length
    ? items.map((i) => `<li><a href="${i.href}">${esc(i.label)}</a><span class="n">${i.n} ${i.n === 1 ? unit.replace(/s$/, '') : unit}</span></li>`).join('')
    : '<li>Nothing yet</li>';
  return `<section><h2>${title}</h2><ol class="rank">${rows}</ol></section>`;
}

function renderStats(s) {
  const c = s.counts;
  const most = Math.max(1, ...s.questions_per_day.map((d) => d.questions));
  const ai = s.chatbot.ai ? `AI on · ${esc(s.chatbot.model)}` : 'AI off · rules only';

  body.setAttribute('aria-busy', 'false');
  body.innerHTML = `
    <dl class="ledger">
      <div><dt>Users</dt><dd>${c.users}</dd></div>
      <div><dt>Reviews</dt><dd>${c.reviews}</dd></div>
      <div><dt>Favourites</dt><dd>${c.favorites}</dd></div>
      <div><dt>Questions to Teta</dt><dd>${c.questions}<small>${c.questions_today} today</small></dd></div>
    </dl>

    <div class="admin-cols">
      ${rank('Most saved dishes', s.top_favorites.map((d) => ({ label: d.name_en, href: `dish.html?id=${d.id}`, n: d.saves })), 'saves')}
      ${rank('Best rated places', s.top_restaurants.map((r) => ({ label: `${r.name}, ${r.region}`, href: `restaurant.html?id=${r.id}`, n: r.avg_rating })), '★')}
      <section>
        <h2>Teta, last 7 days</h2>
        <div class="bars" role="img" aria-label="Questions per day: ${s.questions_per_day.map((d) => d.questions).join(', ')}">
          ${s.questions_per_day.map((d) => `<div><b>${d.questions}</b><span style="height:${(d.questions / most) * 100}%"></span></div>`).join('')}
        </div>
        <div class="bar-days" aria-hidden="true">${s.questions_per_day.map((d) => `<span>${DAY.format(new Date(`${d.day}T12:00`))}</span>`).join('')}</div>
        <p class="chat-note">${ai}</p>
      </section>
    </div>

    ${rank('Dishes people ask Teta about', s.top_asked.map((d) => ({ label: d.name_en, href: `dish.html?id=${d.id}`, n: d.questions })), 'questions')}

    <section class="admin-logs" aria-labelledby="logsTitle">
      <h2 id="logsTitle" style="margin-top:48px">What people asked</h2>
      <div id="logs"></div>
    </section>`;
}

async function loadLogs() {
  const box = $('logs');
  try {
    const { logs, pages, total } = await api.getChatLogs(page, 10);
    if (!total) {
      box.innerHTML = '<p class="chat-note">No questions yet. <a href="chat.html">Ask Teta something</a>.</p>';
      return;
    }
    box.innerHTML = `
      <table class="log-table">
        <thead><tr><th>When</th><th>Question</th><th>Teta's answer</th><th>Who</th></tr></thead>
        <tbody>${logs.map((l) => `
          <tr>
            <td>${WHEN.format(new Date(l.created_at))}</td>
            <td>${esc(l.question)}${l.matched_dish ? `<br><a class="distance" href="dish.html?id=${l.matched_dish_id}">${esc(l.matched_dish)}</a>` : ''}</td>
            <td class="answer">${esc(l.answer)}</td>
            <td>${l.user_name ? esc(l.user_name) : 'Visitor'}</td>
          </tr>`).join('')}
        </tbody>
      </table>
      <div class="log-pages">
        <button class="btn btn-ghost btn-sm" type="button" data-page="-1" ${page <= 1 ? 'disabled' : ''}>Newer</button>
        <span>Page ${page} of ${pages}</span>
        <button class="btn btn-ghost btn-sm" type="button" data-page="1" ${page >= pages ? 'disabled' : ''}>Older</button>
      </div>`;
  } catch (err) {
    toast(err.message);
  }
}

body.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-page]');
  if (btn) {
    page += Number(btn.dataset.page);
    loadLogs();
  }
  if (e.target.closest('[data-signin-page]')) openSignIn('Sign in with an admin account'); // the 'foodies:user' event below redraws the page
});

async function load() {
  const user = await getUser();
  if (!user) {
    return message('Admins only.', 'Sign in with an admin account to see the dashboard.', '<button class="btn btn-primary" type="button" data-signin-page>Sign in</button>');
  }
  if (user.role !== 'admin') {
    return message('Admins only.', 'Your account is not an admin account.', '<a class="btn btn-primary" href="index.html">Back home</a>');
  }

  try {
    renderStats(await api.getAdminStats());
    loadLogs();
  } catch (err) {
    toast(err.message);
    message("We couldn't load the dashboard.", err.message);
  }
}

// sign in / sign out from the top bar: draw the page again
document.addEventListener('foodies:user', load);

initNav();
initCurrency();
load();
