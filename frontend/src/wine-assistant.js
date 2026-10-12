// A small, deterministic reference library. No LLM or live bottle lookup runs here.
const SOURCES = {
  styles: { title: 'WSET: Wine types and styles', url: 'https://www.wsetglobal.com/knowledge-centre/blog/2023/october/03/how-many-wine-types-and-styles-are-there' },
  sauvignon: { title: 'WSET: Sauvignon Blanc', url: 'https://www.wsetglobal.com/knowledge-centre/blog/2020/may/01/understanding-grapes-spotlight-on-sauvignon-blanc' },
  labels: { title: 'WSET: Reading wine labels', url: 'https://www.wsetglobal.com/knowledge-centre/blog/2019/how-to-read-wine-labels-part-one-common-features-on-wine-labels' },
  alcohol: { title: 'CFIA: Alcohol by volume on labels', url: 'https://inspection.canada.ca/en/food-labels/labelling/industry/alcoholic-beverages' },
  uci: { title: 'UCI: Wine dataset', url: 'https://archive.ics.uci.edu/dataset/109/wine' },
  project: { title: 'WineWizard: Project source', url: 'https://github.com/Aumy1/WineWizard' },
};

const FEATURES = ['Alcohol', 'Malic acid', 'Ash', 'Alcalinity of ash', 'Magnesium', 'Total phenols', 'Flavanoids', 'Nonflavanoid phenols', 'Proanthocyanins', 'Color intensity', 'Hue', 'OD280/OD315', 'Proline'];
const STYLES = [
  { name: 'Italian Pinot Grigio', colour: 'white', body: 'light', aroma: '', description: 'a light white style', source: 'styles' },
  { name: 'Beaujolais', colour: 'red', body: 'light', aroma: '', description: 'a light red style', source: 'styles' },
  { name: 'Cabernet Sauvignon', colour: 'red', body: 'full', aroma: '', description: 'often a fuller red style', source: 'styles' },
  { name: 'Warm-climate oaked Chardonnay', colour: 'white', body: 'full', aroma: 'oak', description: 'an oaked, fuller white style', source: 'styles' },
  { name: 'Riesling', colour: 'white', body: '', aroma: 'aromatic', description: 'an aromatic white style', source: 'styles' },
  { name: 'Sauvignon Blanc', colour: 'white', body: '', aroma: 'herbal', description: 'a herbaceous white style', source: 'sauvignon' },
];
const GRAPES = [
  { match: /\bcabernet(?:\s+sauvignon)?\b/, name: 'Cabernet Sauvignon', detail: 'A black grape often used for full-bodied, oaked reds.', source: 'styles' },
  { match: /\bpinot\s+noir\b/, name: 'Pinot Noir', detail: 'A black grape used for red wines.', source: 'styles' },
  { match: /\bmalbec\b/, name: 'Malbec', detail: 'A black grape used for red wines.', source: 'styles' },
  { match: /\bchardonnay\b/, name: 'Chardonnay', detail: 'A white grape; warm-climate, oaked examples can be full-bodied.', source: 'styles' },
  { match: /\briesling\b/, name: 'Riesling', detail: 'An aromatic white grape. Its name does not establish sweetness.', source: 'styles' },
  { match: /\bsauvignon\s+blanc\b/, name: 'Sauvignon Blanc', detail: 'Often shows high acidity and green, herbaceous aromas; styles vary.', source: 'sauvignon' },
];

function normalize(value) {
  return typeof value === 'string' ? value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[’‘]/g, "'").trim() : '';
}
function reply(answer, sourceKeys = []) {
  return { answer: `From the WineWizard reference library:\n\n${answer}`, sources: [...new Set(sourceKeys)].map(key => ({ ...SOURCES[key] })), mode: 'reference' };
}
function number(value, { min = 0, max = 1e9 } = {}) {
  if (value === null || value === undefined || value === '' || (typeof value !== 'number' && typeof value !== 'string') || String(value).trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null;
}
const format = value => new Intl.NumberFormat('en-CA', { maximumFractionDigits: 2 }).format(value);
const AMOUNT = '(-?\\d+(?:\\.\\d+)?)';

// Parse only numbers with explicit units/labels, rather than guessing from every numeral.
function measurements(question, bottle) {
  const money = question.match(new RegExp(`(?:[$€£]\\s*)${AMOUNT}`))
    || question.match(new RegExp(`${AMOUNT}\\s*(?:cad|usd|eur|gbp|dollars?|euros?|pounds?)\\b`))
    || question.match(new RegExp(`\\b(?:price|costs?|priced)\\s*(?:is|of|at|:)?\\s*${AMOUNT}\\b`));
  const explicitCurrency = question.match(/\b(cad|usd|eur|gbp)\b/);
  const currency = explicitCurrency?.[1]?.toUpperCase() || (/^[A-Z]{3}$/.test(String(bottle.currency || '').toUpperCase()) && ['CAD', 'USD', 'EUR', 'GBP'].includes(String(bottle.currency).toUpperCase()) ? String(bottle.currency).toUpperCase() : 'currency units');
  const volumeMatches = [...question.matchAll(new RegExp(`${AMOUNT}\\s*(ml|millilit(?:res?|ers?)|l|lit(?:res?|ers?))\\b`, 'g'))];
  const toMl = match => Number(match[1]) * (/^(l|lit)/.test(match[2]) ? 1000 : 1);
  const serving = volumeMatches.find(match => /(?:glass|serving|pour)\s*(?:of|size|is|:)?\s*$/.test(question.slice(Math.max(0, match.index - 25), match.index)) || /^\s*(?:glass|serving|pour)\b/.test(question.slice(match.index + match[0].length)));
  const bottleVolumes = volumeMatches.filter(match => match !== serving && !/\bper\s*$/.test(question.slice(Math.max(0, match.index - 8), match.index)));
  const volume = bottleVolumes.length === 1 ? toMl(bottleVolumes[0]) : null;
  const abv = question.match(new RegExp(`${AMOUNT}\\s*(?:%|percent|per cent)(?:\\s*(?:abv|alcohol|alc))?`));
  return {
    price: /-\s*[$€£]/.test(question) ? null : money ? number(money[1]) : number(bottle.price),
    size: volume !== null ? number(volume, { min: Number.MIN_VALUE }) : number(bottle.size ?? bottle.volumeMl, { min: Number.MIN_VALUE }),
    abv: abv ? number(abv[1], { max: 100 }) : number(bottle.abv, { max: 100 }),
    serving: serving ? number(toMl(serving), { min: Number.MIN_VALUE }) : null,
    currency,
  };
}

function tastePreferences(question, preferences) {
  const clean = question.replace(/\b(?:not|no|avoid|hate|dislike|don't like|do not like)\s+(?:any\s+)?(?:red|white|light|full|oaked|oak)\b/g, '');
  const chosen = (pattern, supplied, choices) => {
    const hits = [...new Set([...clean.matchAll(pattern)].map(match => match[1]))];
    if (hits.length === 1) return hits[0];
    if (hits.length > 1) return '?';
    return choices.includes(normalize(supplied)) ? normalize(supplied) : '';
  };
  const colour = chosen(/\b(red|white)\b/g, preferences.colour ?? preferences.color, ['red', 'white']);
  let body = chosen(/\b(light|full|rich|delicate)\b/g, preferences.body, ['light', 'full']);
  if (body === 'rich') body = 'full';
  if (body === 'delicate') body = 'light';
  let aroma = chosen(/\b(aromatic|floral|herbal|herbaceous|oaked|oak)\b/g, preferences.aroma, ['aromatic', 'herbal', 'oak']);
  if (aroma === 'floral') aroma = 'aromatic';
  if (aroma === 'herbaceous') aroma = 'herbal';
  if (aroma === 'oaked') aroma = 'oak';
  return { colour, body, aroma };
}

/** Answer only supported wine/project questions. Context contains user entries, not verified facts. */
export function answerWineQuestion(question, context = {}) {
  const q = normalize(question);
  const safeContext = context && typeof context === 'object' ? context : {};
  const bottle = safeContext.bottle && typeof safeContext.bottle === 'object' ? safeContext.bottle : {};
  const preferences = safeContext.preferences && typeof safeContext.preferences === 'object' ? safeContext.preferences : {};
  if (!q || q.length > 2000) return reply('Ask a short question about wine styles, label terms, bottle calculations, or the WineWizard lab model.');

  if (/\b(?:drive|driving|pregnant|pregnancy|medication|medicine|drunk|intoxicated)\b|\bsafe to drink\b/.test(q)) {
    return reply('This wine reference guide cannot assess medical safety, intoxication, or fitness to drive. Bottle-volume calculations do not answer those questions.');
  }
  if (/\b(?:authentic|authenticity|counterfeit|fake|quality|score|rating)\b|\bis (?:this|my) (?:bottle|wine) good\b/.test(q)) {
    return reply('WineWizard cannot verify authenticity or give a bottle a quality score. Label entries, price, and lab-model class probabilities do not establish those facts. Check the producer or a qualified assessor for bottle-specific information.', ['project']);
  }
  if (/\b(?:in stock|inventory|availability|available at|buy near|local store|lcbo|retailer)\b/.test(q)) {
    return reply('I do not look up shops, stock, prices, or current bottle listings. Use a retailer’s own listing for availability. WineWizard suggests general styles, not verified products.', ['project']);
  }
  if (/\b(?:chatgpt|llm|generative|chatbot|reference library)\b|\b(?:are you|is this) (?:an? )?ai\b|\bhow do you (?:answer|work)\b/.test(q)) {
    return reply('This mode uses a small local reference library and fixed calculations. It is not a generative AI or LLM, has no live web search, and can only answer its supported topics. WineWizard’s separate lab classifier is a trained machine-learning model.', ['project']);
  }
  if (/\b(?:accuracy|accurate|reliable|guarantee|guaranteed|100 percent)\b|\b100\s*%\b/.test(q)) {
    return reply('The classifier got 36 of 36 held-out samples correct on one fixed split of the small UCI dataset. That is not a guarantee on new wines. Its probabilities are not validated real-world success rates or quality scores. Missing-value estimates were checked on only two fixed patterns across 36 held-out samples; that does not validate store-bottle chemistry.', ['project', 'uci']);
  }
  if (/\b(?:missing|incomplete|estimate|estimates|estimated|guess|guesses|impute|imputation)\b|\b(?:calculate|fill|predict) (?:the )?(?:rest|remaining|other values)\b|\bonly (?:one|two|three|\d+) (?:values|measurements|inputs)\b/.test(q)) {
    return reply('Enter actual known lab measurements and leave missing fields blank. WineWizard uses the median of 10 nearby training rows, comparing only the entered measurements after scaling. These are experimental estimates, not measured chemistry. Few inputs may give large errors; neighbour ranges are not confidence intervals. Label details cannot determine the remaining chemicals. Estimates are kept separate and are not sent to the classifier.', ['project', 'uci']);
  }
  if (/\b(?:13|thirteen)\b.*\b(?:values|features|measurements|inputs|chemicals)\b|\b(?:features|measurements|chemicals|inputs)\b.*\b(?:13|thirteen)\b|\bwhat (?:are|does).*\b(?:measurements|features|inputs)\b/.test(q)) {
    return reply(`The classifier requires all 13 measurements, in the dataset’s order and units: ${FEATURES.join(', ')}. These are lab measurements; a normal bottle label does not provide them all. The separate estimator can explore missing values but cannot recover a bottle’s actual chemistry.`, ['uci', 'project']);
  }
  if (/\b(?:model|classifier|random forest|cultivar|classes|class [012]|machine learning|predict(?:ion|or|ing)?)\b/.test(q)) {
    return reply('The lab uses a 200-tree Random Forest trained on chemical measurements from the UCI Wine dataset: 178 samples from three Italian cultivars. Class 0, 1, and 2 are dataset labels, not commercial bottle names. Trees’ class probabilities are averaged. This educational model does not rate quality, predict taste, or identify an arbitrary shop bottle.', ['project', 'uci']);
  }
  if (/\b(?:cost|costs|price|priced|cheaper|value for money|per glass|per serving)\b/.test(q)) {
    const values = measurements(q, bottle);
    const perServing = /\b(?:glass|serving|pour)\b/.test(q);
    if (values.price === null || values.size === null || (perServing && values.serving === null)) {
      return reply(`Provide a nonnegative bottle price and a positive bottle size in mL or litres${perServing ? ', plus the glass/serving size' : ''}. Cost per 100 mL = price ÷ bottle size in mL × 100. I do not guess missing amounts or look up prices.`);
    }
    const target = perServing ? values.serving : 100;
    const cost = values.price / values.size * target;
    if (!Number.isFinite(cost)) return reply('Those amounts are too large to calculate reliably. Use ordinary finite bottle prices and volumes.');
    return reply(`Using your entries: ${format(values.price)} ${values.currency} ÷ ${format(values.size)} mL × ${format(target)} mL = ${format(cost)} ${values.currency} ${perServing ? 'per serving' : 'per 100 mL'}. This compares cost by volume, not quality; the inputs are not independently verified.`);
  }
  const tasteRequest = /\b(?:recommend|suggest|suggestion|suggestions|match|matches|prefer|preference|preferences|choose|looking for|want|try)\b|\bi (?:like|enjoy)\b/.test(q)
    && !/\bwhat (?:does|is|are)\b/.test(q);
  if (tasteRequest) {
    const prefs = tastePreferences(q, preferences);
    if (Object.values(prefs).includes('?')) return reply('Choose one colour (red or white), body (light or full), and character (aromatic, herbal, or oak) if you have a preference. Your question mentions multiple choices; this small guide cannot rank them.', ['styles']);
    if (!Object.values(prefs).some(Boolean)) return reply('Tell me whether you prefer red or white, light or full body, or aromatic, herbal, or oak character. I can suggest general styles from a small reference list; I cannot know your personal taste or verify a specific bottle.', ['styles']);
    const matches = STYLES.filter(style => Object.entries(prefs).every(([key, value]) => !value || style[key] === value));
    if (!matches.length) return reply('No style in this small reference list matches every selected preference. Try fewer preferences or check a producer’s description. A missing match does not mean such a wine does not exist.', ['styles']);
    return reply(`Styles to explore: ${matches.map(style => `${style.name} (${style.description})`).join('; ')}. These are general reference suggestions, not personal taste scores or verified bottle matches. Check the producer’s notes for sweetness and the finished style.`, matches.map(style => style.source));
  }
  if (/\b(?:abv|alcohol|alc)\b|\balcohol by volume\b/.test(q)) {
    const values = measurements(q, bottle);
    if (/\b(?:calculate|volume|how much|amount|pure|ml|millilitres|milliliters)\b/.test(q) && values.abv !== null && values.size !== null) {
      return reply(`Using your entries: ${format(values.size)} mL × ${format(values.abv)} ÷ 100 = ${format(values.size * values.abv / 100)} mL of pure alcohol in the bottle. ABV is alcohol as a percentage of total volume. This calculation does not reveal sugar or other chemistry.`, ['alcohol']);
    }
    return reply(`ABV means alcohol by volume: the percentage of the liquid’s volume that is alcohol.${values.abv !== null ? ` Your entered value is ${format(values.abv)}% ABV; I have not verified the label.` : ''} To calculate pure alcohol volume, give both ABV (0–100%) and bottle size. ABV alone cannot establish sweetness or the other lab values.`, ['alcohol']);
  }
  if (/\b(?:sweet|sweetness|sugar|dry|off dry|off-dry)\b/.test(q)) {
    const entry = normalize(bottle.sweetness);
    const entered = ['dry', 'off-dry', 'off dry', 'medium', 'sweet'].includes(entry) ? ` Your label entry says “${entry}”; it is user-provided, not independently verified.` : ' No verified sweetness is available for your bottle.';
    return reply(`Dry means little perceived sweetness; sweet means sweetness dominates.${entered} Grape name or ABV alone cannot determine a specific bottle’s sweetness. Check its producer’s description.`, ['styles']);
  }
  if (/\b(?:vintage|harvest|year on (?:a|the|my|this) (?:bottle|label))\b/.test(q)) {
    const vintage = number(bottle.vintage, { min: 1800, max: 2100 });
    return reply(`Vintage is the year the grapes were harvested.${vintage !== null ? ` Your entered vintage is ${vintage}; I have not verified it.` : ''} It is not necessarily the bottling year. The year alone cannot establish quality or whether your particular bottle has aged well.`, ['labels']);
  }
  if (/\b(?:body|light bodied|light-bodied|full bodied|full-bodied|mouthfeel)\b/.test(q)) {
    return reply('Body describes how light or mouth-filling a wine feels. Light examples include Pinot Grigio and Beaujolais; Cabernet Sauvignon and warm-climate oaked Chardonnay often feel fuller. A label entry alone cannot establish your bottle’s exact body.', ['styles']);
  }
  const grape = GRAPES.find(item => item.match.test(q)) || (/\b(?:grape|variety|varietal|my bottle|this bottle)\b/.test(q) ? GRAPES.find(item => item.match.test(normalize(bottle.grape))) : null);
  if (grape) return reply(`${grape.name}: ${grape.detail} This is general grape context, not a tasting result for your bottle. Region and winemaking can change the finished style; I cannot verify your bottle’s contents.`, [grape.source]);
  if (/\b(?:sparkling|fortified|still wine)\b/.test(q)) {
    return reply('Still wine is not sparkling. Sparkling wine contains carbon dioxide bubbles. Fortified wine has added grape spirit. Each type includes different styles; type alone does not establish sweetness or quality.', ['styles']);
  }
  if (/^(?:hi|hey|hello|thanks|thank you|help)(?:\s+there)?[!.?\s]*$/.test(q)) {
    return reply('Hi! I use a small local reference library, not a generative AI model. Ask about wine styles, label terms, cost per 100 mL, alcohol volume, or WineWizard’s lab predictions and estimates.');
  }
  return reply('I do not have a supported reference answer for that question. Try asking about wine styles, grape varieties in this guide, sweetness, body, ABV, vintage, bottle calculations, or the lab model. I do not invent bottle facts or search the web.');
}
