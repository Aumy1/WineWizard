import React from 'react';

const resources = [
  { title: 'Wine styles in plain English', organisation: 'WSET', text: 'Start with body, sweetness, colour and aroma. These describe a style; individual bottles and vintages can differ.', href: 'https://www.wsetglobal.com/knowledge-centre/blog/2023/october/03/how-many-wine-types-and-styles-are-there', question: 'What is the difference between body and sweetness?' },
  { title: 'Read the label', organisation: 'WSET', text: 'Understand vintage, grape variety, origin and producer details. A label does not reveal every chemical measurement.', href: 'https://www.wsetglobal.com/knowledge-centre/blog/2019/how-to-read-wine-labels-part-one-common-features-on-wine-labels', question: 'What does vintage mean on a wine label?' },
  { title: 'Acidity and sulfur dioxide', organisation: 'Australian Wine Research Institute', text: 'pH and titratable acidity describe different aspects of acidity. Free and bound sulfur dioxide together make up total sulfur dioxide.', href: 'https://www.awri.com.au/industry_support/winemaking_resources/laboratory_establishment/scope/', question: 'Explain pH, titratable acidity, and free versus total sulfur dioxide.' },
  { title: 'Count standard drinks', organisation: 'CCSA', text: 'Use the serving volume and ABV you actually know. The intake journal uses the Canadian definition and keeps incomplete entries visible.', href: 'https://www.ccsa.ca/en/guidance-tools-resources/substances/alcohol/canadas-guidance-alcohol-and-health', question: 'How much pure alcohol is in 150 mL of wine at 13.5% ABV?' },
  { title: 'Check a retailer yourself', organisation: 'LCBO', text: 'Open the retailer’s own store finder. WineWizard does not check real-time inventory or local retail stock.', href: 'https://www.lcbo.com/stores', question: 'Can WineWizard check local store inventory?' },
];

export function ResourceLibrary({ onAsk }) {
  return <section className="explorer panel resource-library" aria-labelledby="resource-title" id="learn-wine">
    <p className="eyebrow">LEARN / CHECK THE SOURCE</p><h2 id="resource-title">A little knowledge goes a long way.</h2>
    <p className="helper">Wine education and research from the organisations below. The reference guide uses selected explanations; it does not search these pages live. Specific laws, unfamiliar grapes and vintage conditions need a current source check.</p>
    <div className="resource-list">{resources.map(item => <article key={item.href} className="style-option"><p className="eyebrow">{item.organisation}</p><h3>{item.title}</h3><p>{item.text}</p><div className="cw-actions"><a href={item.href} target="_blank" rel="noopener noreferrer">Read the original resource ↗</a><button className="quiet" onClick={() => onAsk(item.question)}>Ask about this</button></div></article>)}</div>
  </section>;
}
