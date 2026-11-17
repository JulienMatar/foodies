// helper5: Ask Teta without AI -- simple rules that look for words in the question.
// used when OPENAI_API_KEY is not set, when OpenAI is down, or when the daily AI limit is reached,
// so the chatbot always answers something useful.
//
// returns the same shape as helper4: { answer, dish_id, picks: [{ restaurant_id, dish_id }] }

// other spellings people type for some dishes
const ALIASES = {
  Hummus: ['hommos', 'houmous', 'humus'],
  Knefeh: ['knafeh', 'kunafa', 'kanafeh', 'knafe'],
  'Manoushe Zaatar': ['manakish', 'manaeesh', 'manousheh', 'manouche'],
  'Shish Taouk': ['tawook', 'taouk', 'chicken'],
  Mloukhieh: ['molokhia', 'mulukhiyah', 'mlukhiye'],
  'Baba Ghanouj': ['moutabal', 'mutabal', 'eggplant'],
};

const CATEGORY_WORDS = {
  Mezze: ['mezze', 'meze', 'starter', 'salad'],
  Grills: ['grill', 'bbq', 'skewer'],
  Seafood: ['fish', 'seafood'],
  Stews: ['stew', 'home cooking'],
  Desserts: ['dessert', 'sweet', 'sugar'],
  Bakery: ['bakery', 'bread', 'breakfast'],
};

// the words people use for each allergen of dishes.allergens
const ALLERGEN_WORDS = {
  nuts: ['nut', 'pine nut', 'almond', 'pistachio'],
  sesame: ['sesame', 'tahini'],
  gluten: ['gluten', 'wheat', 'celiac', 'coeliac'],
  dairy: ['dairy', 'milk', 'lactose', 'cheese'],
  eggs: ['egg'],
  fish: ['fish allerg', 'seafood allerg'],
};

// true if a word in the question starts with `word`
function has(text, word) {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z])${escaped}`).test(text);
}

function dishWords(dish) {
  return dish.name_en.toLowerCase().split(/\s+/).filter((w) => w.length >= 4).concat(ALIASES[dish.name_en] || []);
}

function askRules(question, { dishes, restaurants, menu }) {
  const q = question.toLowerCase();
  const regions = [...new Set(restaurants.map((r) => r.region))];
  const region = regions.find((name) => has(q, name.toLowerCase()));
  const where = region ? ` in ${region}` : '';
  const cheap = /cheap|budget|afford|price|least/.test(q);
  const tradition = (r) => r.tradition_score ?? 3;

  // the places serving a dish (available), in the region if one was named
  const placesFor = (dish) => menu
    .filter((m) => m.dish_id === dish.id && m.available)
    .map((m) => ({ restaurant: restaurants.find((r) => r.id === m.restaurant_id), dish, price_usd: m.price_usd }))
    .filter((p) => p.restaurant && (!region || p.restaurant.region === region));
  const rank = (places) => places.sort(cheap
    ? (a, b) => a.price_usd - b.price_usd
    : (a, b) => tradition(b.restaurant) - tradition(a.restaurant) || (b.restaurant.avg_rating ?? 0) - (a.restaurant.avg_rating ?? 0));
  const toPicks = (places) => places.map((p) => ({ restaurant_id: p.restaurant.id, dish_id: p.dish ? p.dish.id : null }));

  // 1. the question names a dish
  const dish = dishes.find((d) => (d.name_ar && question.includes(d.name_ar)) || dishWords(d).some((w) => has(q, w)));
  if (dish) {
    const places = rank(placesFor(dish)).slice(0, 3);
    if (!places.length) {
      return { answer: `Nobody makes ${dish.name_en}${where} yet, habibi. Ask me again without the region and I'll find you a place.`, dish_id: dish.id, picks: [] };
    }
    const top = places[0].restaurant;
    const count = places.length === 1 ? 'One place makes it' : `${places.length} places make it`;
    const why = cheap ? 'it has the best price' : `they score ${tradition(top)} out of 5 for tradition`;
    return {
      answer: `${dish.name_en}! ${dish.description} ${count}${where}. Go to ${top.name} first, ${why}.`,
      dish_id: dish.id,
      picks: toPicks(places),
    };
  }

  // 2. the question describes what they want: a category, vegetarian, or the weather
  let list = dishes;
  let filtered = false;
  const category = Object.entries(CATEGORY_WORDS).find(([, words]) => words.some((w) => has(q, w)));
  if (category) { list = list.filter((d) => d.category === category[0]); filtered = true; }
  if (/vegetarian|veggie|vegan|no meat/.test(q)) { list = list.filter((d) => d.is_vegetarian); filtered = true; }
  // "allergic to nuts", "no gluten", "dairy free": hide the dishes with that allergen
  const avoid = /allerg|intoleran|without|free|no |can't eat|cannot eat/.test(q)
    ? Object.entries(ALLERGEN_WORDS).filter(([, words]) => words.some((w) => has(q, w))).map(([allergen]) => allergen)
    : [];
  if (avoid.length) { list = list.filter((d) => !d.allergens.some((a) => avoid.includes(a))); filtered = true; }
  if (/cold|winter|rain|warm me/.test(q)) { list = list.filter((d) => d.weather === 'cold'); filtered = true; }
  else if (/hot day|summer|heat|fresh|light/.test(q)) { list = list.filter((d) => d.weather === 'hot'); filtered = true; }

  if (filtered) {
    const places = rank(list.flatMap(placesFor));
    if (!places.length) {
      return { answer: `I can't find anything like that${where}, ya albi. Try another region, or ask me about a dish by name.`, dish_id: null, picks: [] };
    }
    // the best place for each of the first 3 dishes (places is already ranked)
    const best = places.filter((p, i) => places.findIndex((x) => x.dish.id === p.dish.id) === i).slice(0, 3);
    const names = best.map((p) => p.dish.name_en);
    const listText = names.length > 1 ? `${names.slice(0, -1).join(', ')} or ${names.at(-1)}` : names[0];
    return {
      answer: `For that, I'd have ${listText}${where}. My pick: ${best[0].dish.name_en} at ${best[0].restaurant.name}.`
        + (avoid.length ? ` They have no ${avoid.join(' or ')} in the usual recipe, but tell the waiter about your allergy, ya albi.` : ''),
      dish_id: best[0].dish.id,
      picks: toPicks(best),
    };
  }

  // 3. only a region
  if (region) {
    const here = rank(restaurants.filter((r) => r.region === region).map((r) => ({ restaurant: r, dish: null, price_usd: null })));
    if (!here.length) return { answer: `I don't know a good place in ${region} yet. Soon, inshallah.`, dish_id: null, picks: [] };
    const top = here[0].restaurant;
    return {
      answer: `In ${region}, start with ${top.name}. It's ${top.style}, and diners give it ${tradition(top)} out of 5 for tradition.`,
      dish_id: null,
      picks: toPicks(here.slice(0, 3)),
    };
  }

  return {
    answer: "Ahlan! I only know Lebanese food, habibi. Ask me about a dish like hummus or knefeh, what to eat on a cold day, or what's good in Byblos.",
    dish_id: null,
    picks: [],
  };
}

module.exports = { askRules };
