// Footprints describe posted places, not verified physical visits.
// Do not infer a city from a venue name or the user's current map region.
const REGION_CODES = 'au nz cn hk tw mo sg my jp kr mn id ph th vn kh la mm bn tl in pk bd lk np bt mv af kz uz kg tj tm tr ir iq lb sy ps jo il sa ae qa kw om ye ge am az gb us ca fr de it es pt nl be ch at gr ie se no dk fi pl cz za br mx ar'.split(' ');
const countryAliases = new Map();
for (const locale of ['en', 'zh-Hans', 'zh-Hant']) {
  const names = new Intl.DisplayNames([locale], { type: 'region' });
  for (const code of REGION_CODES) countryAliases.set(names.of(code.toUpperCase()).toLowerCase(), code);
}
for (const [name, code] of Object.entries({
  'mainland china': 'cn', '中国大陆': 'cn', '中华人民共和国': 'cn',
  'hong kong sar (china)': 'hk', 'hong kong': 'hk', '香港': 'hk',
  'taiwan (china)': 'tw', 'taiwan': 'tw', '台湾': 'tw', '臺灣': 'tw',
  'macau sar (china)': 'mo', 'macau': 'mo', '澳门': 'mo', '澳門': 'mo',
  'usa': 'us', 'uk': 'gb', '澳洲': 'au', '新加坡': 'sg', '马来西亚': 'my',
})) countryAliases.set(name, code);

const englishNames = new Intl.DisplayNames(['en'], { type: 'region' });
const KNOWN_CITIES = {
  au: ['Brisbane', 'Gold Coast', 'Perth', 'Sydney', 'Melbourne', 'Adelaide', 'Canberra', 'Hobart', 'Darwin', 'Cairns', 'Townsville', 'Sunshine Coast', 'Newcastle', 'Geelong', 'Wollongong'],
  cn: ['Beijing', 'Shanghai', 'Guangzhou', 'Shenzhen', 'Chengdu', 'Chongqing', 'Hangzhou', 'Nanjing', 'Wuhan', 'Xiamen'],
  my: ['Kuala Lumpur', 'George Town', 'Johor Bahru', 'Ipoh', 'Malacca', 'Kota Kinabalu', 'Kuching'],
  sg: ['Singapore'], hk: ['Hong Kong'], mo: ['Macau', 'Macao'],
  tw: ['Taipei', 'Taichung', 'Kaohsiung', 'Tainan'],
};
const STREET = /\b(street|road|avenue|lane|highway|drive|crescent|parade|circuit|court|terrace|mall|walk|way|cycleway|footway|bridge|path|st|rd|ave)\b|[路街道巷号號]/i;
const AU_STATES = ['Queensland', 'New South Wales', 'Victoria', 'Western Australia', 'South Australia', 'Tasmania', 'Northern Territory', 'Australian Capital Territory'];
const AU_CODES = ['qld', 'nsw', 'vic', 'wa', 'sa', 'tas', 'nt', 'act'];
const CITY_ALIASES = { '北京市': 'Beijing', '北京': 'Beijing', '上海市': 'Shanghai', '上海': 'Shanghai', '广州市': 'Guangzhou', '廣州市': 'Guangzhou', '深圳市': 'Shenzhen', '成都市': 'Chengdu', '重庆市': 'Chongqing', '重慶市': 'Chongqing', '杭州市': 'Hangzhou', '南京市': 'Nanjing', '武汉市': 'Wuhan', '武漢市': 'Wuhan', '厦门市': 'Xiamen', '廈門市': 'Xiamen', '新加坡': 'Singapore', 'macao': 'Macau', '吉隆坡': 'Kuala Lumpur' };
const normalize = (value) => String(value || '').normalize('NFKC').trim().replace(/\s+/g, ' ');
const key = (value) => normalize(value).toLowerCase();

export function footprintCountryName(code) {
  return ({ hk: 'Hong Kong', tw: 'Taiwan', mo: 'Macau' })[code] || (code ? englishNames.of(code.toUpperCase()) : 'Unlabelled place');
}

export function footprintCountryFlag(code) {
  if (code === 'hk') return '🇭🇰🇨🇳';
  if (code === 'tw') return '🇨🇳';
  if (code === 'mo') return '🇲🇴🇨🇳';
  return /^[a-z]{2}$/.test(code || '') ? [...code.toUpperCase()].map((letter) => String.fromCodePoint(letter.charCodeAt(0) + 127397)).join('') : '';
}

export function footprintLocation(post, resolved = {}) {
  resolved = { ...post.locationContext, ...resolved };
  const parts = normalize(resolved.label || post.locationLabel).split(/[,，]/).map(normalize).filter(Boolean);
  let country = key(resolved.countryCode || post.countryCode);
  if (!REGION_CODES.includes(country)) country = '';
  if (!country) country = parts.map((part) => countryAliases.get(key(part))).find(Boolean) || '';
  const australianState = parts.find((part) => AU_STATES.some((state) => key(state) === key(part)) || /^(QLD|NSW|VIC|WA|SA|TAS|NT|ACT)\s+\d{4}$/.test(part));
  if (!country && australianState && post.latitude >= -45 && post.latitude <= -10 && post.longitude >= 112 && post.longitude <= 154) country = 'au';
  // A common city name without a country (e.g. Perth) is deliberately ambiguous.
  let city = normalize(resolved.city || post.city);
  let suburb = normalize(resolved.suburb || post.suburb);
  let state = normalize(resolved.state || post.state || australianState);
  if (country === 'au') {
    const stateIndex = AU_STATES.findIndex((name, index) => key(name) === key(state) || key(state).split(' ')[0] === AU_CODES[index]);
    if (stateIndex >= 0) state = AU_STATES[stateIndex];
  }
  let cityIndex = -1;
  if (!city && country) {
    cityIndex = parts.findIndex((part) => (KNOWN_CITIES[country] || []).some((name) => key(part.replace(/^city of /i, '')) === key(name)));
    if (cityIndex >= 0) city = parts[cityIndex].replace(/^City of /i, '');
  }
  if (!suburb && cityIndex > 0) {
    const candidate = parts[cityIndex - 1];
    if (key(candidate) !== key(post.placeName) && !STREET.test(candidate) && !/\d/.test(candidate) && candidate.length < 55 && key(candidate) !== key(city)) suburb = candidate;
  }
  // Explicit Chinese administrative suffixes also work when the label isn't comma separated.
  if (country === 'cn' && !city) {
    const match = parts.join(',').match(/(?:^|[,，省])([\p{Script=Han}]{2,8}市)(?:[,，]|[\p{Script=Han}]|$)/u);
    if (match) city = match[1];
  }
  city = CITY_ALIASES[key(city)] || city;
  // Major city names are unique within these countries. A missing state on a
  // legacy label must not create a second Brisbane next to the cached Brisbane.
  if ((KNOWN_CITIES[country] || []).some((name) => key(name) === key(city))) state = '';
  if (key(city) === key(suburb)) suburb = '';
  return { country, city, suburb, state };
}

export function buildFoodFootprint(posts, resolvedPlaces = new Map()) {
  const collections = { countries: new Map(), cities: new Map(), suburbs: new Map() };
  let unnamed = 0;
  const seen = new Set();
  for (const post of posts) {
    if (!post?.id || seen.has(post.id) || (post.status && post.status !== 'active')) continue;
    seen.add(post.id);
    const place = footprintLocation(post, resolvedPlaces.get(post.id));
    if (!place.country || !place.city) unnamed += 1;
    const countryName = footprintCountryName(place.country);
    const entries = [
      ['countries', place.country, countryName, ''],
      ['cities', place.country && place.city && `${place.country}/${key(place.state)}/${key(place.city)}`, place.city, countryName],
      ['suburbs', place.country && place.city && place.suburb && `${place.country}/${key(place.state)}/${key(place.city)}/${key(place.suburb)}`, place.suburb, `${place.city} · ${countryName}`],
    ];
    for (const [type, id, name, context] of entries) {
      if (!id) continue;
      let item = collections[type].get(id);
      if (!item) {
        item = { id, name, context, country: place.country, count: 0, latestAt: post.createdAt, points: [] };
        collections[type].set(id, item);
      }
      item.count += 1;
      if (new Date(post.createdAt) > new Date(item.latestAt)) item.latestAt = post.createdAt;
      if (Number.isFinite(post.latitude) && Number.isFinite(post.longitude)) item.points.push([post.longitude, post.latitude]);
    }
  }
  const groups = Object.fromEntries(Object.entries(collections).map(([type, values]) => [type, [...values.values()].sort((a, b) => new Date(b.latestAt) - new Date(a.latestAt) || a.name.localeCompare(b.name))]));
  return { ...groups, finds: seen.size, unnamed };
}
