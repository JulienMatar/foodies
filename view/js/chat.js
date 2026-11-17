// Ask Teta: a chat thread. The answers come from POST /api/chat
// (OpenAI on the server when it has a key, Teta's built-in rules otherwise).

import * as api from './api.js';
import { initNav, initCurrency, toast, reduceMotion, esc, price, priceLevel, capitalize, dishImg } from './ui.js';

const $ = (id) => document.getElementById(id);

const SUGGESTIONS = [
  "Where's the best kibbeh nayeh?",
  'Something vegetarian in Byblos',
  "I'm allergic to nuts, what can I eat?",
  'Cheapest knefeh',
  'What should I eat on a cold day?',
];

const thread = $('thread');
const history = []; // the conversation so far, sent with each question (the server keeps the last 6)
let busy = false;

initNav();
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

// says if the answers come from the AI or from Teta's notebook (the rules)
api.getChatStatus().then(({ ai }) => {
  $('chatStatus').lastElementChild.textContent = ai ? 'Teta is here · answers written by AI' : "Teta is here · answers from her notebook";
}).catch(() => {});

addBubble('teta', "Ahlan, habibi! I'm Teta. Tell me what you feel like eating, where you are, or what you can't eat, and I'll tell you who makes it right.");

// a question passed in the link, e.g. chat.html?q=hummus
const fromLink = new URLSearchParams(location.search).get('q');
if (fromLink) ask(fromLink);

function scrollDown() {
  thread.scrollTo({ top: thread.scrollHeight, behavior: reduceMotion ? 'auto' : 'smooth' });
}

function addBubble(who, text) {
  const row = document.createElement('div');
  row.className = `msg ${who}`;
  if (who === 'teta') row.innerHTML = '<span class="avatar" lang="ar" dir="rtl" aria-hidden="true">تيتا</span>';
  const p = document.createElement('p');
  p.className = 'bubble';
  p.textContent = text; // textContent, never innerHTML: the answer can't inject HTML
  row.append(p);
  thread.append(row);
  scrollDown();
  return row;
}

function addResults(results) {
  if (!results.length) return;
  const box = document.createElement('div');
  box.className = 'results';
  box.innerHTML = results.map(({ restaurant: r, dish, price_usd: usd }) => `
    <a class="result" href="${dish ? `dish.html?id=${dish.id}` : `restaurant.html?id=${r.id}`}">
      ${dish ? dishImg(dish, 'result-img') : ''}
      <span class="result-text">
        <strong>${esc(r.name)}</strong>
        <span class="meta">${dish ? `${esc(dish.name_en)} · ` : ''}${esc(r.region)} · ${esc(capitalize(r.style))} · ${priceLevel(r.price_level)}</span>
      </span>
      ${usd !== null ? `<span class="price">${price(usd)}</span>` : ''}
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
  typing.className = 'msg teta';
  typing.innerHTML = '<span class="avatar" lang="ar" dir="rtl" aria-hidden="true">تيتا</span><p class="bubble typing" aria-label="Teta is typing"><span></span><span></span><span></span></p>';
  thread.append(typing);
  scrollDown();

  try {
    const reply = await api.askTeta(question, history.slice(-6));
    typing.remove();
    addBubble('teta', reply.answer);
    addResults(reply.results);
    history.push({ role: 'user', text: question }, { role: 'teta', text: reply.answer });
  } catch (err) {
    typing.remove();
    toast(err.message); // e.g. 429: too many questions in a minute
  } finally {
    busy = false;
    $('send').disabled = false;
    $('msg').focus();
  }
}
