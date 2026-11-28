// the weather for the dish of the day: Open-Meteo first, wttr.in as the backup, and the last good weather if both fail.
// fake weather services answer instead of the real ones (we replace fetch), so this test needs no internet and no database.
const { test, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { getWeather, resetWeather } = require('../utils/helper2');

const realFetch = global.fetch;
let answers = {}; // service host -> { status, body } or 'down'
let calls = [];   // the hosts our code called, in order

global.fetch = async (url) => {
  const host = new URL(url).host;
  calls.push(host);
  const answer = answers[host];
  if (!answer || answer === 'down') throw new TypeError('fetch failed');
  return new Response(JSON.stringify(answer.body), { status: answer.status, headers: { 'Content-Type': 'application/json' } });
};
after(() => { global.fetch = realFetch; });

const OPEN_METEO = 'api.open-meteo.com';
const WTTR = 'wttr.in';
const openMeteo = (temp) => ({ status: 200, body: { current: { temperature_2m: temp } } });
const wttr = (temp) => ({ status: 200, body: { current_condition: [{ temp_C: String(temp) }] } });
const refused = { status: 429, body: { error: true, reason: 'Too many requests' } };

beforeEach(() => {
  resetWeather();
  calls = [];
});

test('Open-Meteo answers: its weather is used, and wttr.in is not called', async () => {
  answers = { [OPEN_METEO]: openMeteo(27.4), [WTTR]: wttr(10) };
  const w = await getWeather();
  assert.deepEqual(w, { city: 'Beirut', temp_c: 27, label: 'hot day', type: 'hot', source: 'Open-Meteo' });
  assert.deepEqual(calls, [OPEN_METEO]);
});

test('Open-Meteo refuses (429, like on Render): wttr.in answers instead', async () => {
  answers = { [OPEN_METEO]: refused, [WTTR]: wttr(12) };
  const w = await getWeather();
  assert.equal(w.source, 'wttr.in');
  assert.equal(w.temp_c, 12);
  assert.equal(w.type, 'cold');
});

// t.mock.timers moves the clock forward without waiting
test('after a 429, Open-Meteo is left alone for 10 minutes', async (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: Date.parse('2026-11-28T12:00:00Z') });
  answers = { [OPEN_METEO]: refused, [WTTR]: 'down' };
  await assert.rejects(getWeather());
  assert.deepEqual(calls, [OPEN_METEO, WTTR]);

  calls = [];
  t.mock.timers.tick(5 * 60 * 1000); // 5 minutes later: Open-Meteo is still paused
  answers = { [OPEN_METEO]: openMeteo(20), [WTTR]: wttr(21) };
  assert.equal((await getWeather()).source, 'wttr.in');
  assert.deepEqual(calls, [WTTR]);
});

test('both services fail later: the last good weather is still shown', async (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: Date.parse('2026-11-28T12:00:00Z') });
  answers = { [OPEN_METEO]: openMeteo(24), [WTTR]: wttr(24) };
  await getWeather();

  t.mock.timers.tick(45 * 60 * 1000); // 45 minutes later, the saved weather is old and both services fail
  answers = { [OPEN_METEO]: 'down', [WTTR]: 'down' };
  const w = await getWeather();
  assert.equal(w.temp_c, 24);
  assert.deepEqual(calls, [OPEN_METEO, OPEN_METEO, WTTR], 'it did try again first');
});

test('the weather is kept 30 minutes: no new call for the next requests', async () => {
  answers = { [OPEN_METEO]: openMeteo(22), [WTTR]: wttr(22) };
  await getWeather();
  await getWeather();
  await getWeather();
  assert.deepEqual(calls, [OPEN_METEO]);
});

test('both services down and no weather yet: a clear error (the dish of the day then picks any dish)', async () => {
  answers = { [OPEN_METEO]: 'down', [WTTR]: { status: 503, body: {} } };
  await assert.rejects(getWeather(), /fetch failed; wttr\.in answered 503/);
});

test('a strange answer without a temperature counts as a failure', async () => {
  answers = { [OPEN_METEO]: { status: 200, body: { current: {} } }, [WTTR]: wttr(18) };
  const w = await getWeather();
  assert.equal(w.source, 'wttr.in');
});
