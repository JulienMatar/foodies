// "New here?" page: the first dishes to try, how to eat, the words for the table
// (the photo credits of the dishes are on each dish page and in the footer)

import * as api from './api.js';
import { TIPS, WORDS } from './heritage.js';
import { initNav, initCurrency, toast, reveal, esc, dishImg, arabic, dietBadges } from './ui.js';

const $ = (id) => document.getElementById(id);

async function loadStarters() {
  const box = $('starters');
  try {
    const dishes = await api.getDishes();
    const list = dishes.filter((d) => d.first_timer);
    box.innerHTML = list.map((d) => `
      <a class="starter reveal" href="dish.html?id=${d.id}">
        <div class="starter-photo">${dishImg(d)}</div>
        <div class="starter-body">
          <h2>${esc(d.name_en)} ${arabic(d.name_ar)}</h2>
          <p class="desc">${esc(d.description)}</p>
          <p class="ingredients"><strong>In it:</strong> ${d.ingredients.slice(0, 6).map(esc).join(', ')}</p>
          ${dietBadges(d)}
          ${d.good_to_know ? `<p class="tip">${esc(d.good_to_know)}</p>` : ''}
        </div>
      </a>`).join('');
    reveal(box);
  } catch (err) {
    toast(err.message);
    box.innerHTML = '';
  } finally {
    box.setAttribute('aria-busy', 'false');
  }
}

$('tips').innerHTML = TIPS.map((t) => `<li><div><strong>${esc(t.title)}</strong><p>${esc(t.text)}</p></div></li>`).join('');
$('words').innerHTML = WORDS.map((w) => `<li>${arabic(w.ar)}<strong>${esc(w.say)}</strong><span>${esc(w.means)}</span></li>`).join('');

initNav();
initCurrency();
loadStarters();
