// Extraction proposes editable label candidates; it never verifies a bottle.
export const labelFields = ['name', 'grape', 'region', 'vintage', 'type', 'colour', 'abv', 'sweetness', 'price', 'currency', 'size'];
const empty = () => Object.fromEntries(labelFields.map(key => [key, key === 'currency' ? 'CAD' : '']));
const grapeNames = [
  ['Cabernet Sauvignon', /\bcabernet\s+sauvignon\b/i], ['Cabernet Franc', /\bcabernet\s+franc\b/i],
  ['Sauvignon Blanc', /\bsauvignon\s+blanc\b/i], ['Pinot Noir', /\bpinot\s+noir\b/i],
  ['Pinot Grigio', /\bpinot\s+grigio\b/i], ['Pinot Gris', /\bpinot\s+gris\b/i],
  ['Chardonnay', /\bchardonnay\b/i], ['Riesling', /\briesling\b/i],
  ['Malbec', /\bmalbec\b/i], ['Merlot', /\bmerlot\b/i], ['Syrah', /\bsyrah\b/i],
  ['Shiraz', /\bshiraz\b/i], ['Grenache', /\bgrenache\b/i], ['Garnacha', /\bgarnacha\b/i],
  ['Tempranillo', /\btempranillo\b/i], ['Sangiovese', /\bsangiovese\b/i],
  ['Nebbiolo', /\bnebbiolo\b/i], ['Gamay', /\bgamay\b/i], ['Chenin Blanc', /\bchenin\s+blanc\b/i],
  ['Gewürztraminer', /\bgew[uü]rztraminer\b/i], ['Viognier', /\bviognier\b/i],
  ['Zinfandel', /\bzinfandel\b/i], ['Primitivo', /\bprimitivo\b/i],
];
const regionNames = [
  ['Niagara Peninsula', /\bniagara\s+peninsula\b/i], ['Niagara', /\bniagara\b/i],
  ['Prince Edward County', /\bprince\s+edward\s+county\b/i], ['Okanagan Valley', /\bokanagan\s+valley\b/i],
  ['British Columbia', /\bbritish\s+columbia\b/i], ['Ontario', /\bontario\b/i],
  ['Bordeaux', /\bbordeaux\b/i], ['Burgundy', /\bburgundy\b/i], ['Bourgogne', /\bbourgogne\b/i],
  ['Champagne', /\bchampagne\b/i], ['Rhône', /\brh[oô]ne\b/i], ['Loire', /\bloire\b/i],
  ['Rioja', /\brioja\b/i], ['Ribera del Duero', /\bribera\s+del\s+duero\b/i],
  ['Tuscany', /\btuscany\b/i], ['Toscana', /\btoscana\b/i], ['Piedmont', /\bpiedmont\b/i],
  ['Piemonte', /\bpiemonte\b/i], ['Chianti', /\bchianti\b/i],
  ['Napa Valley', /\bnapa\s+valley\b/i], ['Sonoma', /\bsonoma\b/i],
  ['California', /\bcalifornia\b/i], ['Marlborough', /\bmarlborough\b/i],
  ['Barossa Valley', /\bbarossa\s+valley\b/i], ['Mendoza', /\bmendoza\b/i],
  ['Canada', /\bcanada\b/i], ['France', /\bfrance\b/i], ['Italy', /\bitaly\b/i],
  ['Spain', /\bspain\b/i], ['New Zealand', /\bnew\s+zealand\b/i],
  ['Australia', /\baustralia\b/i], ['Argentina', /\bargentina\b/i],
  ['Chile', /\bchile\b/i], ['South Africa', /\bsouth\s+africa\b/i],
  ['United States', /\b(?:united\s+states|u\.?s\.?a\.?)\b/i], ['Portugal', /\bportugal\b/i],
];
const decimal = value => Number(value.replace(',', '.'));
const unique = values => [...new Set(values)];
const standaloneYear = /^\s*(?:19|20)\d{2}\s*$/;
const historical = /\b(?:since|est(?:ablished)?\.?|founded|copyright|bottl(?:ed|ing)|packed|printed|best\s+before|expiry|expires|imported|address|street|avenue|road|tel|phone)\b|©|\d[/-]\d/i;

export function validateImageFile(file) {
  if (!file) return 'Choose a label photo first.';
  if (!Number.isFinite(file.size) || file.size <= 0) return 'Choose a photo that is not empty.';
  if (file.size > 10 * 1024 * 1024) return 'Choose a photo smaller than 10 MB.';
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (file.type ? !allowed.includes(file.type.toLowerCase()) : !/\.(?:jpe?g|png|webp)$/i.test(file.name || '')) {
    return 'Use a JPEG, PNG or WebP photo. Convert HEIC photos to JPEG first.';
  }
  return '';
}

export function parseLabelText(raw, { currentYear = new Date().getFullYear() } = {}) {
  const bottle = empty();
  const warnings = [];
  const text = String(raw ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').slice(0, 20000);
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const grapes = grapeNames.filter(([, pattern]) => pattern.test(text));
  bottle.grape = grapes.map(([name]) => name).join(' / ');
  const regions = regionNames.filter(([, pattern]) => pattern.test(text)).map(([name]) => name);
  bottle.region = regions.filter(name => name !== 'Niagara' || !regions.includes('Niagara Peninsula')).join(', ');

  // Explicit vintage words and short year-bearing label lines are candidates.
  // Founding, bottling and full date lines are excluded instead of guessed.
  const years = [];
  for (const line of lines) {
    if (historical.test(line)) continue;
    const explicit = /\b(?:vintage|mill[eé]sime|cosecha|r[eé]colte)\s*[:\-]?\s*((?:18|19|20)\d{2})\b/i.exec(line);
    if (explicit) years.push(Number(explicit[1]));
    else if (standaloneYear.test(line) || (line.length <= 100 && grapeNames.some(([, pattern]) => pattern.test(line)))) {
      const match = /\b((?:18|19|20)\d{2})\b/g;
      for (const year of line.matchAll(match)) years.push(Number(year[1]));
    }
  }
  const validYears = unique(years.filter(year => year >= 1800 && year <= currentYear));
  if (validYears.length === 1) bottle.vintage = String(validYears[0]);
  if (validYears.length > 1) warnings.push('Multiple possible vintage years were found. Choose the harvest year printed on the bottle.');

  const alcohol = [];
  const percentFirst = /(?<![-\d.,\p{L}])(\d{1,3}(?:[.,]\d{1,2})?)\s*%\s*(?:abv\b|(?:alc(?:ohol|ool)?\.?\s*(?:[\/]\s*)?)?vol\.?\b|alc(?:ohol|ool)?\.?\b)/giu;
  const labelFirst = /\b(?:abv|alcohol|alcool|alc\.?(?:\s*\/\s*vol\.?)?)\s*[:=]?\s*(\d{1,3}(?:[.,]\d{1,2})?)(?![\d.,\p{L}])\s*%?/giu;
  for (const pattern of [percentFirst, labelFirst]) for (const match of text.matchAll(pattern)) alcohol.push(decimal(match[1]));
  for (const line of lines) {
    const match = /^\s*(\d{1,2}(?:[.,]\d{1,2})?)\s*%\s*$/.exec(line);
    if (match && decimal(match[1]) <= 25) alcohol.push(decimal(match[1]));
  }
  const validAlcohol = unique(alcohol.filter(value => value >= 0 && value <= 100));
  if (validAlcohol.length === 1) bottle.abv = String(validAlcohol[0]);
  if (validAlcohol.length > 1) warnings.push('Conflicting alcohol percentages were found. Confirm the % ABV from the label.');

  const volumes = [];
  for (const line of lines) {
    if (/\b(?:per|serving|glass|portion)\b/i.test(line)) continue;
    for (const match of line.matchAll(/(?<![-\d.,\p{L}])(\d{1,7}(?:[.,]\d{1,3})?)\s*(ml|cl|lit(?:re|er)s?|l)\b/giu)) {
      const unit = match[2].toLowerCase();
      const value = decimal(match[1]) * (unit === 'ml' ? 1 : unit === 'cl' ? 10 : 1000);
      if (value >= 1 && value <= 1000000) volumes.push(Number(value.toFixed(3)));
    }
  }
  const sizes = unique(volumes);
  if (sizes.length === 1) bottle.size = String(sizes[0]);
  if (sizes.length > 1) warnings.push('Multiple container sizes were found. Enter the volume of this bottle in mL.');

  if (/\b(?:sparkling|mousseux|spumante)\b/i.test(text)) bottle.type = 'Sparkling';
  else if (/\bfortified\b/i.test(text)) bottle.type = 'Fortified';
  else if (/\bstill\s+wine\b/i.test(text)) bottle.type = 'Still';
  if (/(?<![\p{L}])(?:ros[eé]|rosado|rosato)(?![\p{L}])/iu.test(text)) bottle.colour = 'Rosé';
  else if (/\b(?:red\s+wine|vin\s+rouge|vino\s+(?:rosso|tinto))\b/i.test(text)) bottle.colour = 'Red';
  else if (/\b(?:white\s+wine|vin\s+blanc|vino\s+(?:bianco|blanco))\b/i.test(text)) bottle.colour = 'White';
  else if (/\b(?:orange\s+wine|skin[- ]contact)\b/i.test(text)) bottle.colour = 'Orange / skin-contact';
  if (/\b(?:off[- ]dry|demi[- ]sec)\b/i.test(text)) bottle.sweetness = 'Off-dry';
  else if (/\b(?:sweet\s+wine|dolce|doux)\b/i.test(text)) bottle.sweetness = 'Sweet';
  else if (/\bdry\b|\bvin\s+sec\b/i.test(text) && !/\bbrut\b/i.test(text)) bottle.sweetness = 'Dry';
  // A heading is only a name candidate. It is displayed as plain React text.
  bottle.name = (lines.find(line => /[a-zÀ-ž]/i.test(line) && !historical.test(line) && !grapeNames.some(([, pattern]) => pattern.test(line)) && !/%|\b(?:ml|cl|abv|alcohol|contains|sulphites|sulfites|warning|government|drink|vintage|bottled)\b/i.test(line)) || '').slice(0, 120);
  const foundFields = labelFields.filter(key => key !== 'currency' && bottle[key]);
  if (!foundFields.length) warnings.push('No clear label fields were found. Type the details manually or try a sharper photo.');
  warnings.push('These are text candidates, not a verified product match. Check every field before continuing.');
  return { bottle, foundFields, warnings };
}
