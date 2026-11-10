// Traditions page: the habits and feasts around Lebanese food (text from heritage.js)

import { TRADITIONS } from './heritage.js';
import { initNav, initCurrency, reveal, esc, arabic } from './ui.js';

const box = document.getElementById('customs');
box.innerHTML = TRADITIONS.map((t) => `
  <article class="custom reveal">
    <div class="custom-top"><h2>${esc(t.name)}</h2>${arabic(t.ar)}</div>
    <span class="when">${esc(t.when)}</span>
    <p>${esc(t.text)}</p>
  </article>`).join('');

initNav();
initCurrency();
reveal(box);
