// These are educational styles, not commercial bottles or measured chemistry.
// Ranges are WineWizard editorial encodings of the cited qualitative descriptions.
export const STYLE_SOURCES = Object.freeze({
  styles: 'https://www.wsetglobal.com/knowledge-centre/blog/2023/october/03/how-many-wine-types-and-styles-are-there',
  tasting: 'https://www.wsetglobal.com/knowledge-centre/blog/2019/november/how-to-build-your-wine-tasting-skills/',
  acidity: 'https://www.wsetglobal.com/knowledge-centre/blog/2026/understanding-acidity-in-wine',
  sauvignon: 'https://www.wsetglobal.com/knowledge-centre/blog/2020/may/01/understanding-grapes-spotlight-on-sauvignon-blanc',
  riesling: 'https://www.wsetglobal.com/knowledge-centre/blog/2024/july/17/understanding-riesling-in-germany',
  rose: 'https://www.wsetglobal.com/knowledge-centre/blog/2023/november/29/types-of-ros%C3%A9-from-around-the-world',
});
const style = (id, name, grape, colour, type, description, ranges, aromas, sources) => ({
  id, name, grape, colour, type, description, ranges, aromas, sources,
  ...Object.fromEntries(Object.entries(ranges).map(([trait, range]) => [trait, (range[0] + range[1]) / 2])),
});
export const STYLE_CATALOG = Object.freeze([
  style('sauvignon-fresh', 'Fresh, herbaceous Sauvignon Blanc', 'Sauvignon Blanc', 'white', 'Still',
    'A crisp white style with green, grassy character. Climate and winemaking can change its weight and fruit aromas.',
    { body: [.2,.5], sweetness: [0,.15], acidity: [.7,1], tannin: [0,.1] }, ['herbal','citrus'], [STYLE_SOURCES.sauvignon]),
  style('sauvignon-ripe', 'Ripe-fruited Sauvignon Blanc', 'Sauvignon Blanc', 'white', 'Still',
    'A more tropical expression, with herbaceous character still possible. Check the producer’s own tasting description.',
    { body: [.3,.6], sweetness: [0,.15], acidity: [.65,.95], tannin: [0,.1] }, ['tropical','herbal'], [STYLE_SOURCES.sauvignon]),
  style('riesling-dry', 'Dry, bright Riesling', 'Riesling', 'white', 'Still',
    'An aromatic, high-acid white style. Dry refers to sweetness; floral or fruit aromas do not make it sweet.',
    { body: [.2,.5], sweetness: [0,.15], acidity: [.8,1], tannin: [0,.1] }, ['citrus','floral'], [STYLE_SOURCES.riesling]),
  style('riesling-offdry', 'Off-dry, aromatic Riesling', 'Riesling', 'white', 'Still',
    'Some sweetness alongside fresh acidity, often with citrus, blossom or stone-fruit character. Riesling also comes in dry and sweeter styles.',
    { body: [.25,.55], sweetness: [.2,.45], acidity: [.8,1], tannin: [0,.1] }, ['citrus','floral','stone fruit'], [STYLE_SOURCES.riesling]),
  style('chardonnay-unoaked', 'Cool-climate, unoaked Chardonnay', 'Chardonnay', 'white', 'Still',
    'A fresher, lighter expression than many warm-climate, oak-aged examples. The grape alone does not specify the style.',
    { body: [.25,.55], sweetness: [0,.15], acidity: [.65,.95], tannin: [0,.1] }, ['citrus'], [STYLE_SOURCES.acidity,STYLE_SOURCES.tasting]),
  style('chardonnay-oaked', 'Rich, oak-aged Chardonnay', 'Chardonnay', 'white', 'Still',
    'A fuller style; warm-climate examples may show tropical fruit, with spice from oak. Individual producers use oak differently.',
    { body: [.65,.9], sweetness: [0,.15], acidity: [.35,.7], tannin: [0,.15] }, ['tropical','oak'], [STYLE_SOURCES.tasting]),
  style('pinot-noir', 'Light, delicate Pinot Noir', 'Pinot Noir', 'red', 'Still',
    'A lighter red style with less drying tannin than many Cabernet Sauvignons. Cool climates can preserve lively acidity.',
    { body: [.25,.5], sweetness: [0,.15], acidity: [.6,.9], tannin: [.2,.45] }, [], [STYLE_SOURCES.tasting,STYLE_SOURCES.acidity]),
  style('cabernet', 'Full, structured Cabernet Sauvignon', 'Cabernet Sauvignon', 'red', 'Still',
    'A fuller red style that can feel drying and grippy. Oak ageing is common and may add toasted or spicy character.',
    { body: [.7,1], sweetness: [0,.15], acidity: [.45,.8], tannin: [.7,1] }, ['oak'], [STYLE_SOURCES.tasting,STYLE_SOURCES.styles]),
  style('rose-dry', 'Dry, light rosé', 'Blend / varies', 'rosé', 'Still',
    'A dry, pale style often made with brief contact between juice and black-grape skins. Colour does not establish sweetness.',
    { body: [.2,.5], sweetness: [0,.15], acidity: [.55,.85], tannin: [0,.2] }, [], [STYLE_SOURCES.rose]),
  style('rose-offdry', 'Fruity, off-dry rosé', 'Blend / varies', 'rosé', 'Still',
    'A softer rosé style with some sweetness. Rosé spans dry to sweeter expressions; check each bottle’s description.',
    { body: [.2,.5], sweetness: [.2,.45], acidity: [.35,.7], tannin: [0,.2] }, [], [STYLE_SOURCES.rose]),
]);
export const TRAIT_OPTIONS = Object.freeze({
  body: [['','Not sure'],['0.2','Light / delicate'],['0.5','Medium'],['0.8','Full / rich']],
  sweetness: [['','Not sure'],['0.05','Dry'],['0.3','A little sweet'],['0.6','Medium sweet'],['0.9','Sweet']],
  acidity: [['','Not sure'],['0.2','Soft / gentle'],['0.5','Balanced'],['0.8','Bright / tart']],
  tannin: [['','Not sure'],['0.1','Soft / little grip'],['0.5','Some drying grip'],['0.85','Firm / drying']],
});
export const AROMAS = ['citrus','floral','herbal','tropical','stone fruit','oak'];
export const COLOURS = ['white','red','rosé','orange'];
export const INTAKE_SOURCE = 'https://www.ccsa.ca/sites/default/files/2023-01/CCSA_Canadas_Guidance_on_Alcohol_and_Health_Final_Report_en.pdf';
export const CONSUMER_STORAGE_KEY = 'winewizard-consumer-v1';
export const EMPTY_QUIZ = Object.freeze({body:'',sweetness:'',acidity:'',tannin:'',colour:'',aromas:[]});
export function numericProfile(values) {
  const result = { colour: COLOURS.includes(values.colour) ? values.colour : '', aromas: AROMAS.filter(item => values.aromas?.includes(item)) };
  for (const key of Object.keys(TRAIT_OPTIONS)) {
    const value = values[key];
    if (value !== '' && value != null && Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 1) result[key] = Number(value);
  }
  return result;
}
export function styleBottle(item) {
  return { name:'', grape:item.grape === 'Blend / varies' ? '' : item.grape, region:'',vintage:'', type:item.type,
    colour:item.colour === 'rosé' ? 'Rosé' : item.colour[0].toUpperCase()+item.colour.slice(1), abv:'',price:'',currency:'CAD',size:'',sweetness:'' };
}
export function ratingHistory(notebook) {
  return notebook.filter(item => item.tried && Number(item.rating) >= 1 && Number(item.rating) <= 5)
    .map(item => ({ rating: Number(item.rating), wine: numericProfile(item.descriptors || {}) }));
}
export function localDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type,part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}
export function localDateTime(date = new Date()) {
  return `${localDate(date)}T${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
}
export function shiftCalendar(day, amount) {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate()+amount);
  return date.toISOString().slice(0,10);
}
export function readConsumerStore(raw) {
  const empty = {quiz:{...EMPTY_QUIZ,aromas:[]}, quizSaved:false, notebook:[], servings:[]};
  if (!raw) return empty;
  try {
    const input = JSON.parse(raw);
    if (!input || input.version !== 1) return empty;
    const quiz = {...EMPTY_QUIZ,aromas:[],...numericProfile(input.quiz || {})};
    for (const key of Object.keys(TRAIT_OPTIONS)) quiz[key] = quiz[key] == null ? '' : String(quiz[key]);
    const notebook = (Array.isArray(input.notebook) ? input.notebook : []).slice(-500).filter(item => typeof item?.id === 'string' && typeof item.name === 'string')
      .map(item => ({id:item.id,name:item.name.slice(0,120),grape:String(item.grape||'').slice(0,120),region:String(item.region||'').slice(0,120),abv:validNumber(item.abv,0,100),
        type:['Still','Sparkling','Fortified'].includes(item.type)?item.type:'',vintage:validNumber(item.vintage,1800,2100),price:validNumber(item.price,0,1000000),size:validNumber(item.size,1,1000000),currency:['CAD','USD','EUR','GBP'].includes(item.currency)?item.currency:'CAD',
        tried:item.tried === true,rating:[1,2,3,4,5].includes(Number(item.rating)) ? String(item.rating) : '',notes:String(item.notes||'').slice(0,1000),
        descriptors:{...EMPTY_QUIZ,...numericProfile(item.descriptors||{})},kind:item.kind === 'style' ? 'style' : 'bottle'}));
    const servings = (Array.isArray(input.servings) ? input.servings : []).slice(-1000).filter(item => typeof item?.id === 'string' && Number.isFinite(new Date(item.consumedAt).getTime())
      && Number.isFinite(item.volumeMl) && item.volumeMl > 0 && item.volumeMl <= 10000 && (item.abvPercent == null || (Number.isFinite(item.abvPercent) && item.abvPercent >= 0 && item.abvPercent <= 100)))
      .map(item => ({id:item.id,kind:'consumption',consumedAt:item.consumedAt,volumeMl:item.volumeMl,abvPercent:item.abvPercent ?? null,label:String(item.label||'').slice(0,120)}));
    return {quiz,quizSaved:input.quizSaved===true,notebook,servings};
  } catch { return empty; }
}
function validNumber(value,min,max) { return value !== '' && value != null && Number.isFinite(Number(value)) && Number(value)>=min && Number(value)<=max ? String(value) : ''; }
