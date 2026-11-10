// helper2: today's weather in Beirut, from Open-Meteo (free, no API key)
// https://open-meteo.com/en/docs
//
// the answer is kept in memory for 30 minutes, so we don't call Open-Meteo on every request

const CITY = { name: 'Beirut', lat: 33.89, lng: 35.5 };
const CACHE_MS = 30 * 60 * 1000;

let cached = null;     // the last weather we got
let cachedAt = 0;      // when we got it (milliseconds)

// turns the temperature into the values of dishes.weather: 'hot', 'cold' or 'any'
function weatherType(tempC) {
  if (tempC >= 25) return 'hot';
  if (tempC <= 15) return 'cold';
  return 'any';
}

function weatherLabel(tempC) {
  if (tempC >= 30) return 'very hot day';
  if (tempC >= 25) return 'hot day';
  if (tempC <= 10) return 'cold day';
  if (tempC <= 15) return 'cool day';
  return 'mild day';
}

// returns { city, temp_c, label, type }
// throws if Open-Meteo can't be reached and we have nothing saved
async function getWeather() {
  if (cached && Date.now() - cachedAt < CACHE_MS) return cached;

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${CITY.lat}&longitude=${CITY.lng}&current=temperature_2m`;
  // AbortSignal.timeout stops waiting after 5 seconds
  const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`Open-Meteo answered ${res.status}`);

  const data = await res.json();
  const tempC = Math.round(data.current.temperature_2m);

  cached = { city: CITY.name, temp_c: tempC, label: weatherLabel(tempC), type: weatherType(tempC) };
  cachedAt = Date.now();
  return cached;
}

module.exports = { getWeather };
