export const styleSource = 'https://www.wsetglobal.com/knowledge-centre/blog/2023/october/03/how-many-wine-types-and-styles-are-there';
export const sauvignonSource = 'https://www.wsetglobal.com/knowledge-centre/blog/2020/may/01/understanding-grapes-spotlight-on-sauvignon-blanc';
export const tasteStyles = [
  { name: 'Italian Pinot Grigio', colour: 'white', body: 'light', aroma: '', note: 'A light-bodied white style to explore.' },
  { name: 'Beaujolais', colour: 'red', body: 'light', aroma: '', note: 'A light-bodied red style to explore.' },
  { name: 'Cabernet Sauvignon', colour: 'red', body: 'full', aroma: '', note: 'Often a full-bodied red style; bottle styles vary.' },
  { name: 'Warm-climate oaked Chardonnay', colour: 'white', body: 'full', aroma: 'oak', note: 'Look for warm-climate, oaked examples with a full body.' },
  { name: 'Riesling', colour: 'white', body: '', aroma: 'aromatic', note: 'Explore aromatic white styles. Check the bottle’s sweetness.' },
  { name: 'Sauvignon Blanc', colour: 'white', body: '', aroma: 'herbal', note: 'Explore fresh, herbaceous white styles; check the producer’s notes.', source: sauvignonSource },
];
export const grapeContext = {
  'cabernet sauvignon': { text: 'Cabernet Sauvignon is a black grape often associated with full-bodied red wines. Many styles use oak. This is general context, not a tasting result for your bottle.', source: styleSource },
  'pinot noir': { text: 'Pinot Noir is a black grape used for red wines. Growing conditions and winemaking change the finished style.', source: styleSource },
  malbec: { text: 'Malbec is a black grape used for red wines. Precise flavour requires more than a grape name.', source: styleSource },
  chardonnay: { text: 'Chardonnay is a white grape. Climate and oak can change its style; some warm-climate, oaked examples are full-bodied.', source: styleSource },
  riesling: { text: 'Riesling is a white grape known for aromatic styles. Check the producer’s description for sweetness.', source: styleSource },
  'sauvignon blanc': { text: 'Sauvignon Blanc often has noticeable acidity and herbaceous aromas. Style varies by region and winemaking.', source: sauvignonSource },
};
export const typeContext = { Still: 'Still wine is not sparkling.', Sparkling: 'Sparkling wine contains carbon dioxide that produces bubbles.', Fortified: 'Fortified wine has had grape spirit added. Sweetness varies.' };
export const sweetnessContext = { Dry: 'Dry describes little or no perceived sweetness.', 'Off-dry': 'Off-dry describes a small amount of perceived sweetness.', Medium: 'Medium indicates noticeable sweetness.', Sweet: 'Sweet indicates prominent sweetness.' };
export const emptyBottle = { name: '', grape: '', region: '', vintage: '', type: '', colour: '', abv: '', sweetness: '', price: '', currency: 'CAD', size: '' };
export const exampleBottle = { name: 'Example Estate · fictional bottle', grape: 'Cabernet Sauvignon', region: 'Ontario, Canada', vintage: '2023', type: 'Still', colour: 'Red', abv: '13.5', sweetness: 'Dry', price: '20', currency: 'CAD', size: '750' };
