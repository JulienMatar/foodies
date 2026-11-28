// helper2: today's weather in Beirut, from two free services that need no API key:
//   1. Open-Meteo (https://open-meteo.com/en/docs)
//   2. wttr.in (https://wttr.in/:help), the backup
//
// why a backup: online, our server shares its internet address with many other apps on the host,
// and Open-Meteo sometimes answers 429 "too many requests" to that shared address.
//
// the answer is kept in memory for 30 minutes, so we don't call the services on every request.
// if both services fail, we keep showing the last weather we got (if we have one).

const CITY = { name: 'Beirut', lat: 33.89, lng: 35.5 };
const CACHE_MS = 30 * 60 * 1000;
const PAUSE_MS = 10 * 60 * 1000; // after a refusal, leave that service alone for 10 minutes

let cached = null;     // the last weather we got
let cachedAt = 0;      // when we got it (milliseconds)
const pausedUntil = {}; // service name -> time until which we don't call it

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

// each service: its address, and how to read the temperature in its answer
const SERVICES = [
  {
    name: 'Open-Meteo',
    url: `https://api.open-meteo.com/v1/forecast?latitude=${CITY.lat}&longitude=${CITY.lng}&current=temperature_2m`,
    readTemp: (data) => data.current.temperature_2m,
  },
  {
    name: 'wttr.in',
    url: `https://wttr.in/${CITY.lat},${CITY.lng}?format=j1`,
    readTemp: (data) => Number(data.current_condition[0].temp_C),
  },
];

// asks one service; throws if it can't be reached, refuses, or sends something we can't read
async function askService(service) {
  // AbortSignal.timeout stops waiting after 5 seconds
  const res = await fetch(service.url, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) {
    if (res.status === 429) pausedUntil[service.name] = Date.now() + PAUSE_MS;
    throw new Error(`${service.name} answered ${res.status}`);
  }
  const tempC = service.readTemp(await res.json());
  if (!Number.isFinite(tempC)) throw new Error(`${service.name} sent no temperature`);
  return Math.round(tempC);
}

// returns { city, temp_c, label, type, source }
// throws only if no service answers and we have never had the weather
async function getWeather() {
  if (cached && Date.now() - cachedAt < CACHE_MS) return cached;

  const problems = [];
  for (const service of SERVICES) {
    if (Date.now() < (pausedUntil[service.name] || 0)) {
      problems.push(`${service.name} paused after a refusal`);
      continue;
    }
    try {
      const tempC = await askService(service);
      cached = { city: CITY.name, temp_c: tempC, label: weatherLabel(tempC), type: weatherType(tempC), source: service.name };
      cachedAt = Date.now();
      return cached;
    } catch (err) {
      problems.push(err.message);
    }
  }

  if (cached) return cached; // older than 30 minutes, but better than no weather
  throw new Error(problems.join('; '));
}

// for the tests: forget the saved weather and the pauses
function resetWeather() {
  cached = null;
  cachedAt = 0;
  for (const name of Object.keys(pausedUntil)) delete pausedUntil[name];
}

module.exports = { getWeather, resetWeather };
