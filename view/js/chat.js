// Ask Teta: a chat thread. Answers come from api.askTeta() (a mock for POST /api/chat for now).

import * as api from './api.js';
import { initCurrency, toast, reduceMotion, esc, price, priceLevel, capitalize } from './ui.js';

const $ = (id) => document.getElementById(id);

const SUGGESTIONS = [
  "Where's the best kibbeh nayeh?",
  'Something vegetarian in Byblos',
  'Cheapest knefeh',
  'What should I eat on a cold day?',
  'Grills in Beirut',
];

const thread = $('thread');
let busy = false;

initCurrency();

$('suggestions').innerHTML = SUGGESTIONS.map((s) => `<button class="chip" type="button">${esc(s)}</button>`).join('');
$('suggestions').addEventListener('click', (e) => {
  const chip = e.target.closest('.chip');
  if (chip) ask(chip.textContent);
});

$('chatForm').addEventListener('submit', (e) => {
  e.preventDefault();
  ask($('msg').value);
});

addBubble('teta', "Ahlan, I'm Teta. Tell me what you feel like eating, or where you are, and I'll tell you who makes it right.");

// a question passed in the link, e.g. from "Ask Teta about it" on a dish page
const fromLink = new URLSearchParams(location.search).get('q');
if (fromLink) ask(fromLink);

function scrollDown() {
  thread.scrollTo({ top: thread.scrollHeight, behavior: reduceMotion ? 'auto' : 'smooth' });
}

function addBubble(who, text) {
  const p = document.createElement('p');
  p.className = `bubble ${who}`;
  p.textContent = text;
  thread.append(p);
  scrollDown();
  return p;
}

function addResults(results) {
  if (!results.length) return;
  const box = document.createElement('div');
  box.className = 'results';
  box.innerHTML = results.map(({ restaurant: r, dish, price_usd: usd }) => `
    <a class="result" href="${dish ? `dish.html?id=${dish.id}` : 'restaurants.html'}">
      <strong>${esc(r.name)}</strong>
      ${usd !== null ? `<span class="price">${price(usd)}</span>` : ''}
      <span class="meta">${dish ? `${esc(dish.name_en)} · ` : ''}${esc(r.region)} · ${esc(capitalize(r.style))} · ${priceLevel(r.price_level)}</span>
    </a>`).join('');
  thread.append(box);
  scrollDown();
}

async function ask(raw) {
  const question = raw.trim();
  if (!question || busy) return;

  busy = true;
  $('send').disabled = true;
  $('msg').value = '';
  addBubble('me', question);

  const typing = document.createElement('div');
  typing.className = 'bubble teta typing';
  typing.setAttribute('aria-label', 'Teta is typing');
  typing.innerHTML = '<span></span><span></span><span></span>';
  thread.append(typing);
  scrollDown();

  try {
    const reply = await api.askTeta(question);
    typing.remove();
    addBubble('teta', reply.answer);
    addResults(reply.results);
  } catch (err) {
    typing.remove();
    toast(err.message);
  } finally {
    busy = false;
    $('send').disabled = false;
    $('msg').focus();
  }
}
