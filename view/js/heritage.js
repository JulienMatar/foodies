// The stories shown around the food: cities, traditions, how to eat, useful words.
// This is page content (like the text of an HTML page), so it lives here and not in the database.
// The city photographs are in view/img/photos/cities; their credits are in credits.js.

// the order of the road trip: up the coast, then over the mountains to the Beqaa
export const ROAD = ['Tripoli', 'Byblos', 'Beirut', 'Saida', 'Zahle', 'Baalbek'];

// one entry per region of the database, by its name
// plate = what to order there, shown on the road trip
export const CITIES = {
  Beirut: {
    slug: 'beirut', ar: 'بيروت', landmark: 'Raouché, the Pigeon Rocks',
    story: 'The capital by the sea. People walk the Corniche at sunset, buy ka\'ak from street carts, and stay at the mezze table for hours.',
    taste: ['Mezze', 'Ka\'ak', 'Knefeh'],
    plate: 'Manoushe from the furn, then a long mezze by the sea.',
  },
  Byblos: {
    slug: 'byblos', ar: 'جبيل', landmark: 'The old harbour',
    story: 'One of the oldest cities in the world. The Phoenicians shipped cedar wood from this harbour; today fishing boats still bring in the catch of the day.',
    taste: ['Fresh fish', 'Sayadieh'],
    plate: 'Fish of the day, fried or grilled, at the old harbour.',
  },
  Tripoli: {
    slug: 'tripoli', ar: 'طرابلس', landmark: 'The Citadel of Raymond de Saint-Gilles',
    story: 'The capital of Lebanese sweets. Under the citadel and the Ottoman clock tower, the old souks smell of orange blossom, soap and warm knefeh.',
    taste: ['Knefeh', 'Halawet el jebn', 'Ma\'amoul'],
    plate: 'Knefeh for breakfast, and the sweet shops of the old souk.',
  },
  Saida: {
    slug: 'saida', ar: 'صيدا', landmark: 'The Sea Castle, built in 1228',
    story: 'Sidon\'s castle stands on a small island, joined to the shore by a stone bridge. The old city is famous for falafel, fresh fish and sanioura biscuits.',
    taste: ['Falafel', 'Seafood', 'Sanioura'],
    plate: 'Falafel in the old souk, sanioura biscuits by the Sea Castle.',
  },
  Zahle: {
    slug: 'zahle', ar: 'زحلة', landmark: 'The cafés of the Berdawni river',
    story: '"The bride of the Beqaa". Its riverside cafés made mezze famous: dozens of small plates, arak, and long summer evenings under the trees.',
    taste: ['Mezze', 'Arak', 'Kibbeh nayeh'],
    plate: 'A long mezze and arak in the cafés along the Berdawni river.',
  },
  Baalbek: {
    slug: 'baalbek', ar: 'بعلبك', landmark: 'The Temple of Bacchus',
    story: 'Roman Heliopolis, with some of the largest Roman temples ever built. Visitors leave the ruins for the bakeries, where sfiha are baked by the dozen.',
    taste: ['Sfiha Baalbakiyeh'],
    plate: 'Sfiha, the small open meat pies, hot from the oven.',
  },
};

export const TRADITIONS = [
  {
    slug: 'furn', name: 'The furn', ar: 'الفرن', when: 'Every morning',
    text: 'Each neighbourhood has its bakery. Manoushe is baked to order, with za\'atar, cheese or both, and eaten warm on the way to work or school.',
  },
  {
    slug: 'ahweh', name: 'Ahweh', ar: 'قهوة', when: 'All day, for every guest',
    text: 'Arabic coffee boiled with cardamom in a rakweh pot and poured into small cups without handles. Refusing a cup is rude; some turn the cup over to read the future in the grounds.',
  },
  {
    slug: 'sunday', name: 'Sunday lunch at Teta\'s', ar: 'غدا عند تيتا', when: 'Every Sunday',
    text: 'The whole family around one table: mezze, then a main, then fruit, sweets and coffee. Teta keeps filling your plate. "Kol!" means "eat!".',
  },
  {
    slug: 'kaak', name: 'The ka\'ak cart', ar: 'عربة الكعك', when: 'In every street',
    text: 'Sellers push wooden carts of purse-shaped sesame bread. They open it and fill it with za\'atar or soft cheese while you wait.',
  },
  {
    slug: 'mouneh', name: 'Mouneh', ar: 'مونة', when: 'At the end of summer',
    text: 'Families preserve the harvest for winter: makdous (small eggplants stuffed with walnuts in oil), labneh balls, za\'atar dried on the roof, jams and pomegranate molasses.',
  },
  {
    slug: 'maamoul', name: 'Ma\'amoul', ar: 'معمول', when: 'Easter and Eid al-Fitr',
    text: 'Semolina cookies filled with dates, pistachios or walnuts, pressed in carved wooden moulds. Christian and Muslim families bake the same cookie for their feasts.',
  },
  {
    slug: 'barbara', name: 'Eid el-Barbara', ar: 'عيد البربارة', when: '4 December',
    text: 'Lebanon\'s Saint Barbara day: children wear masks and go door to door, and families eat amhiyeh, boiled wheat with sugar, pomegranate and nuts.',
  },
  {
    slug: 'arak', name: 'Arak with mezze', ar: 'عرق', when: 'With a long mezze',
    text: 'An anise spirit that turns milky white when water is added. It is sipped slowly between small plates. Not drinking? Ask for jallab, a grape and rose-water drink.',
  },
];

// shown in "New to Lebanese food?"
export const TIPS = [
  { title: 'Share everything', text: 'Mezze plates come to the middle of the table and everyone helps themselves.' },
  { title: 'Bread is your spoon', text: 'Tear a piece of thin Lebanese bread and scoop the dips with it.' },
  { title: 'The free plates', text: 'Raw vegetables (khodra), pickles (kabis) and olives come with the mezze. Eat them between bites.' },
  { title: 'Pace yourself', text: 'The mezze is only the start: grills or a main dish come after, then fruit and coffee.' },
  { title: 'Mild, not spicy', text: 'Lebanese food is tangy (lemon, sumac) and garlicky, rarely hot. Ask for chili if you like it.' },
];

export const WORDS = [
  { ar: 'صحتين', say: 'Sahtein', means: 'Enjoy your meal (to your health)' },
  { ar: 'على قلبك', say: '\'Ala albak', means: 'The reply to sahtein: "on your heart"' },
  { ar: 'بلا لحمة', say: 'Bala lahmeh', means: 'Without meat' },
  { ar: 'بلا طحينة', say: 'Bala tahini', means: 'Without sesame paste' },
  { ar: 'يلا', say: 'Yalla', means: 'Let\'s go / come on' },
];
