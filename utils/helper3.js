// helper3: exchange rates from USD, from open.er-api.com (free, no API key)
// https://www.exchangerate-api.com/docs/free
//
// rates change once a day, so we keep them in memory for 1 hour

const CACHE_MS = 60 * 60 * 1000;

let cached = null;
let cachedAt = 0;

// returns { USD: 1, LBP, EUR, updated_at }
async function getRates() {
  if (cached && Date.now() - cachedAt < CACHE_MS) return cached;

  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`Rates API answered ${res.status}`);
    const data = await res.json();

    cached = {
      USD: 1,
      LBP: data.rates.LBP,
      EUR: data.rates.EUR,
      updated_at: new Date(data.time_last_update_unix * 1000).toISOString(),
    };
    cachedAt = Date.now();
    return cached;
  } catch (err) {
    // the API is down: old rates are better than no rates
    if (cached) return cached;
    throw err;
  }
}

module.exports = { getRates };
