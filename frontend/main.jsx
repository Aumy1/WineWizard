import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { askAssistant, getSavedBottles, saveBottle, deleteBottle, getSession, signIn, signOut } from './src/services.js';
import { answerWineQuestion } from './src/wine-assistant.js';
import { labels, demo, winePredict, estimateMissing, bottleCalculations } from './model-utils.js';
import { styleSource, tasteStyles, grapeContext, typeContext, sweetnessContext, emptyBottle, exampleBottle } from './wine-data.js';
import './style.css';

const number = value => new Intl.NumberFormat('en-CA', { maximumFractionDigits: 3 }).format(value);
function Source({ href = styleSource, children = 'Read the educational source ↗' }) {
  return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
}
function Field({ id, label, value, onChange, options, small, ...props }) {
  return <div className="field"><label htmlFor={id}>{label}</label>
    {options ? <select id={id} value={value} onChange={e => onChange(e.target.value)} {...props}>{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
      : <input id={id} value={value} onChange={e => onChange(e.target.value)} aria-describedby={small ? `${id}-note` : undefined} {...props} />}
    {small && <small id={`${id}-note`}>{small}</small>}</div>;
}
const choices = (items, unknown = 'Unknown') => [{value: '', label: unknown}, ...items.map(value => ({value, label: value}))];
function Empty({ title, children }) { return <div className="empty"><span className="orb" aria-hidden="true">✧</span><h2>{title}</h2><p>{children}</p></div>; }
function ModelNote({ title, children }) { return <div className="model-note"><span className="dot" aria-hidden="true"/><div><strong>{title}</strong><p>{children}</p></div></div>; }

function TasteFinder({ preferences, setPreferences }) {
  const [result, setResult] = useState(null);
  const change = (key, value) => { setPreferences(current => ({...current, [key]: value})); setResult(null); };
  const submit = event => {
    event.preventDefault();
    if (!Object.values(preferences).some(Boolean)) return setResult({error: 'Choose at least one preference to find styles to explore.'});
    setResult({matches: tasteStyles.filter(style => Object.entries(preferences).every(([key, value]) => !value || style[key] === value))});
  };
  return <section className="explorer panel"><p className="eyebrow">START WITH YOUR TASTE</p><h2>Find your kind of wine.</h2><p className="helper">Choose what you enjoy. Explore general styles, then check the producer’s description for a specific bottle. Suggestions do not check store stock.</p>
    <form onSubmit={submit}><div className="fields">
      <Field id="taste-colour" label="Preferred colour" value={preferences.colour} onChange={v => change('colour', v)} options={[{value: '', label: 'Any colour'}, {value: 'red', label: 'Red'}, {value: 'white', label: 'White'}]}/>
      <Field id="taste-body" label="Preferred body" value={preferences.body} onChange={v => change('body', v)} options={[{value: '', label: 'Any body'}, {value: 'light', label: 'Light and delicate'}, {value: 'full', label: 'Full and rich'}]}/>
      <Field id="taste-aroma" label="Preferred character" value={preferences.aroma} onChange={v => change('aroma', v)} options={[{value: '', label: 'Any character'}, {value: 'aromatic', label: 'Aromatic'}, {value: 'herbal', label: 'Fresh and herbaceous'}, {value: 'oak', label: 'Oaked'}]}/>
    </div><button className="predict">Find styles to explore <span aria-hidden="true">↗</span></button></form>
    <div aria-live="polite">{result?.error && <p className="error">{result.error}</p>}{result?.matches && <><p className="helper">{result.matches.length ? 'Style suggestions based on your choices. No personal taste score or verified bottle match.' : 'No style in this small guide matches every preference. Try fewer preferences.'}</p>{result.matches.map(style => <section className="style-option" key={style.name}><h3>{style.name}</h3><p>{style.note}</p><Source href={style.source} children="Read the style reference ↗"/></section>)}</>}</div>
  </section>;
}

function BottleSection({ title, children, source }) { return <section className="bottle-section"><h2>{title}</h2><p>{children}</p>{source && <Source href={source}/>}</section>; }
function BottleResult({ bottle, onSave, saveState }) {
  const calculations = bottleCalculations(bottle);
  const money = value => new Intl.NumberFormat('en-CA', {style: 'currency', currency: bottle.currency}).format(value);
  const context = grapeContext[bottle.grape.toLowerCase().replace(/\s+/g, ' ').trim()];
  const facts = [['Grape / blend', bottle.grape], ['Country / region', bottle.region], ['Vintage', bottle.vintage], ['Wine type', bottle.type], ['Colour', bottle.colour], ['Alcohol', bottle.abv !== '' ? `${Number(bottle.abv)}% ABV` : ''], ['Sweetness', bottle.sweetness]];
  return <><h2 className="bottle-heading">{bottle.name || 'Your bottle'}</h2><p className="bottle-result-note">Details you entered · not independently verified</p><dl className="bottle-facts">{facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || 'Not provided'}</dd></div>)}</dl>
    <button type="button" className="quiet" disabled={saveState === 'saving'} onClick={() => onSave(bottle)}>{saveState === 'saving' ? 'Saving…' : 'Save this bottle +'} </button>
    <BottleSection title="Price in perspective">{calculations.pricePer100 !== null ? `${money(Number(bottle.price))} for ${Number(bottle.size)} mL = ${money(calculations.pricePer100)} per 100 mL (${bottle.currency}). This compares cost by volume, not quality.` : 'Enter both price and size to calculate the cost per 100 mL. Missing values are not estimated.'}</BottleSection>
    {calculations.alcoholVolume !== null && <BottleSection title="Calculated alcohol volume">{`${Number(bottle.size)} mL × ${Number(bottle.abv)}% ABV = ${number(calculations.alcoholVolume)} mL of pure alcohol in the bottle, based on your entries.`}</BottleSection>}
    {context ? <BottleSection title="General grape context" source={context.source}>{context.text}</BottleSection> : bottle.grape && <BottleSection title="General grape context">This guide has no sourced profile for this grape or blend. Check the producer’s notes.</BottleSection>}
    {bottle.type && <BottleSection title="What the type means" source={styleSource}>{typeContext[bottle.type]}</BottleSection>}
    <BottleSection title={bottle.sweetness ? 'What the sweetness term means' : 'Sweetness is still unknown'} source={bottle.sweetness ? styleSource : undefined}>{bottle.sweetness ? sweetnessContext[bottle.sweetness] : 'Alcohol percentage and grape name alone cannot establish sweetness. Look for a producer or retailer description.'}</BottleSection>
    <BottleSection title="What this guide can establish">Label details explain what you entered. They cannot reveal the 13 lab measurements, establish authenticity or quality, or predict personal taste.</BottleSection>
  </>;
}

function BottleGuide({ bottle, setBottle, result, setResult, onSave, saveState }) {
  const [error, setError] = useState('');
  const [changed, setChanged] = useState(false);
  const change = (key, value) => { setBottle(current => ({...current, [key]: value})); if (result) setChanged(true); setResult(null); setError(''); };
  const submit = event => { event.preventDefault(); if (!bottle.grape.trim() && !bottle.type) return setError('Enter a grape variety or select a wine type to start.'); setError(''); setChanged(false); setResult(Object.fromEntries(Object.entries(bottle).map(([key, value]) => [key, String(value).trim()]))); };
  const loadExample = () => { setBottle({...exampleBottle}); setResult(null); setChanged(false); setError(''); };
  return <div className="workspace"><section className="panel input-panel"><div className="panel-heading"><div><p className="eyebrow">01 / FROM THE LABEL</p><h2>Get to know your bottle.</h2></div><button type="button" className="quiet" onClick={loadExample}>Try example ↺</button></div><p className="helper">Copy what you find on the bottle or store listing. Leave missing details blank. The example is fictional.</p>
    <form onSubmit={submit}><div className="fields">
      <Field id="b-name" label="Bottle / producer" value={bottle.name} onChange={v => change('name', v)} maxLength={120} placeholder="Optional name"/>
      <Field id="b-grape" label="Grape variety or blend" value={bottle.grape} onChange={v => change('grape', v)} maxLength={120} placeholder="e.g. Cabernet Sauvignon" list="grapes"/>
      <datalist id="grapes">{['Cabernet Sauvignon','Pinot Noir','Chardonnay','Sauvignon Blanc','Riesling','Malbec'].map(value => <option key={value} value={value}/>)}</datalist>
      <Field id="b-region" label="Country / region" value={bottle.region} onChange={v => change('region', v)} maxLength={120} placeholder="e.g. Ontario, Canada"/>
      <Field id="b-vintage" label="Vintage year" value={bottle.vintage} onChange={v => change('vintage', v)} type="number" min="1800" max="2100" step="1" placeholder="Optional"/>
      <Field id="b-type" label="Wine type" value={bottle.type} onChange={v => change('type', v)} options={choices(['Still','Sparkling','Fortified'])}/>
      <Field id="b-colour" label="Colour" value={bottle.colour} onChange={v => change('colour', v)} options={choices(['Red','White','Rosé','Orange / skin-contact'])}/>
      <Field id="b-abv" label="Alcohol (% ABV)" value={bottle.abv} onChange={v => change('abv', v)} type="number" min="0" max="100" step="any" placeholder="e.g. 13.5"/>
      <Field id="b-sweetness" label="Sweetness, if stated" value={bottle.sweetness} onChange={v => change('sweetness', v)} options={choices(['Dry','Off-dry','Medium','Sweet'])} small="Use the label or retailer description."/>
      <Field id="b-price" label="Bottle price" value={bottle.price} onChange={v => change('price', v)} type="number" min="0" max="1000000" step="any" placeholder="Optional"/>
      <Field id="b-currency" label="Currency" value={bottle.currency} onChange={v => change('currency', v)} options={['CAD','USD','EUR','GBP'].map(value => ({value, label: value}))}/>
      <Field id="b-size" label="Bottle size (mL)" value={bottle.size} onChange={v => change('size', v)} type="number" min="1" max="1000000" step="1" placeholder="e.g. 750"/>
    </div><p className="error" role="alert">{error}</p><button className="predict">Explain this bottle <span aria-hidden="true">↗</span></button></form></section>
    <aside className="panel result-panel"><p className="eyebrow">02 / YOUR BOTTLE, EXPLAINED</p><div className="bottle-output" aria-live="polite">{result ? <BottleResult bottle={result} onSave={onSave} saveState={saveState}/> : <Empty title={changed ? 'Your label details changed.' : 'A clearer view of the label.'}>{changed ? 'Explain this bottle again to update the guide.' : 'Add a grape variety or wine type to start. We’ll explain your details and flag what is missing.'}</Empty>}</div><ModelNote title="A label guide, with educational context">Uses your entries. No bottle lookup or lab analysis.</ModelNote></aside></div>;
}

function SavedBottles({ saved, status, message, onLoad, onDelete, session, onSignIn, onSignOut }) {
  return <section className="saved-section explorer panel" aria-labelledby="saved-title"><div className="panel-heading"><div><p className="eyebrow">YOUR COLLECTION</p><h2 id="saved-title">Keep a bottle for later.</h2></div><span className="storage-label">{session.enabled && !session.user ? 'Sign-in required' : saved.mode === 'database' ? 'Database connected' : 'Saved in this browser'}</span></div>
    <p className="helper">{saved.mode === 'database' ? 'Your collection is saved through the connected database service.' : session.enabled ? 'Sign in to use your connected collection.' : 'Browser saves stay on this device. Clearing browser data removes them. A database connection can be configured separately.'}</p>
    {session.enabled && <div className="session-controls">{session.user ? <><p>Signed in as {session.user.displayName || session.user.email || 'your account'}</p><button className="quiet" disabled={status === 'signing'} onClick={onSignOut}>Sign out</button></> : <><p>Sign in to save bottles to your account.</p><button className="quiet" disabled={status === 'signing'} onClick={onSignIn}>{status === 'signing' ? 'Connecting…' : 'Sign in'}</button></>}</div>}
    <p role="status" className="save-message">{message}</p>{status === 'loading' ? <p>Loading saved bottles…</p> : saved.bottles.length ? <ul className="saved-list">{saved.bottles.map(item => <li key={item.id}><div><h3>{item.name || 'Unnamed bottle'}</h3><p>{[item.grape,item.region].filter(Boolean).join(' · ') || 'Label details saved'}</p></div><div className="saved-actions"><button className="quiet" onClick={() => onLoad(item)}>Open</button><button className="quiet" disabled={status === `deleting-${item.id}`} onClick={() => onDelete(item.id)}>{status === `deleting-${item.id}` ? 'Removing…' : 'Remove'}</button></div></li>)}</ul> : <p className="helper">No bottles saved yet. Explain a bottle above, then choose Save this bottle.</p>}
  </section>;
}

function Prediction({ prediction }) {
  const best = prediction.probabilities.indexOf(Math.max(...prediction.probabilities));
  return <><p className="result-label">Your sample most resembles</p><div className="class-name">Class {best}</div><p className="result-subtitle">Dataset label: {prediction.classes[best]}</p>{prediction.probabilities.map((p, i) => <div className={`probability ${i === best ? 'winner' : ''}`} key={i}><div className="bar-heading"><span>Class {i}{i === best ? ' · closest match' : ''}</span><strong>{(p * 100).toFixed(1)}%</strong></div><div className="track"><div className="fill" style={{width: `${p * 100}%`}}/></div></div>)}<p className="result-caveat">The model’s probabilities are not guarantees of correctness or wine quality scores.</p>{prediction.outside && <p className="outside">Some measurements are outside the training dataset’s range. This prediction may be less reliable.</p>}</>;
}
function Lab({ model, reference, dataError }) {
  const [sample, setSample] = useState(demo.map(String));
  const [prediction, setPrediction] = useState(null);
  const [sampleChanged, setSampleChanged] = useState(false);
  const [error, setError] = useState('');
  const [known, setKnown] = useState(labels.map(() => ''));
  const [estimate, setEstimate] = useState(null);
  const [estimateError, setEstimateError] = useState('');
  const predict = event => { event.preventDefault(); if (!model) return; const values = sample.map(Number); if (sample.some((value,i) => value.trim() === '' || !Number.isFinite(values[i]) || values[i] < 0 || !Number.isFinite(Math.fround(values[i])))) return setError('Enter a finite, nonnegative number for all 13 measurements.'); setError(''); setPrediction({probabilities: winePredict(model, values), classes: model.classes, outside: values.some((value,i) => value < model.ranges[i][0] || value > model.ranges[i][1])}); };
  const runEstimate = event => { event.preventDefault(); if (!reference) return; const values = known.map(value => value.trim() === '' ? null : Number(value)); const count = values.filter(value => value !== null).length; if (count === 0) return setEstimateError('Enter at least one actual chemical measurement.'); if (count === 13) return setEstimateError('All 13 values are present. Use the classifier above.'); if (values.some(value => value !== null && !Number.isFinite(value))) return setEstimateError('Use finite numbers for known measurements.'); setEstimateError(''); setEstimate({rows: estimateMissing(reference, values), count}); };
  const changeSample = (i, value) => { setSample(current => current.map((old, j) => i === j ? value : old)); setSampleChanged(true); setPrediction(null); setError(''); };
  return <><p className="lab-intro">Chemistry lab · An educational model of three categories from a small Italian wine dataset. It does not identify arbitrary store wines. Use the demo or compatible lab measurements.</p>{dataError && <p className="error" role="alert">{dataError}</p>}
    <div className="workspace"><section className="panel input-panel"><div className="panel-heading"><div><p className="eyebrow">01 / YOUR SAMPLE</p><h2>Make your measurements.</h2></div><button type="button" className="quiet" disabled={!model} onClick={() => {setSample(demo.map(String));setPrediction(null);setSampleChanged(false);setError('');}}>Load demo ↺</button></div><p className="helper">Enter values in the UCI Wine dataset’s units. The demo is ready to try.</p><form onSubmit={predict}><div className="fields">{labels.map((label,i) => <Field key={label} id={`f${i}`} label={label} type="number" step="any" min="0" required value={sample[i]} onChange={value => changeSample(i,value)} small={model && `Dataset range ${model.ranges[i][0]}–${model.ranges[i][1]}`}/>)}</div><p className="error" role="alert">{error}</p><button className="predict" disabled={!model}>{model ? 'Predict cultivar' : 'Loading model…'}<span aria-hidden="true">↗</span></button></form></section>
    <aside className="panel result-panel"><p className="eyebrow">02 / THE PREDICTION</p><div aria-live="polite">{prediction ? <Prediction prediction={prediction}/> : <Empty title={sampleChanged ? 'Your sample has changed.' : 'A story in every sample.'}>{sampleChanged ? 'Run a new prediction to update the result.' : 'Run a prediction to see its closest category and model probabilities.'}</Empty>}</div><ModelNote title="Powered by your WineWizard model">200 decision trees · 3 categories · runs in your browser</ModelNote></aside></div>
    <section className="explorer panel"><p className="eyebrow">EXPERIMENTAL / MISSING VALUES</p><h2>Explore an incomplete lab sample.</h2><p className="helper">Enter the chemical measurements you have in UCI dataset units. Leave the rest blank. Ten nearby training samples, chosen using only your entered measurements, provide a median for each missing value.</p><p className="helper">These are guesses from a small Italian dataset. A few values may produce very inaccurate estimates. Neighbour ranges are examples, not confidence intervals.</p>
    <form onSubmit={runEstimate}><div className="fields">{labels.map((label,i) => <Field key={label} id={`e${i}`} label={`Known ${label}`} type="number" step="any" value={known[i]} onChange={value => {setKnown(current => current.map((old,j) => j === i ? value : old));setEstimate(null);setEstimateError('');}} min={reference && Math.min(...reference.rows.map(row => row[i]))} max={reference && Math.max(...reference.rows.map(row => row[i]))} placeholder="Leave blank to estimate" small={reference && `Training range ${Math.min(...reference.rows.map(row => row[i]))}–${Math.max(...reference.rows.map(row => row[i]))}`}/>)}</div><p role="alert" className="error">{estimateError}</p><button className="predict" disabled={!reference}>{reference ? 'Estimate missing lab values' : 'Loading reference…'}<span aria-hidden="true">↗</span></button><button className="quiet estimate-demo" type="button" disabled={!reference} onClick={() => {setKnown(demo.map((value,i) => [0,1,9].includes(i) ? String(value) : ''));setEstimate(null);setEstimateError('');}}>Try partial demo ↺</button></form>
    <div aria-live="polite">{estimate && <><h3>Experimental estimates · not lab results</h3><p className="estimate-note">{estimate.count} entered values; {13 - estimate.count} estimated. {estimate.count < 3 && 'Very limited input: estimates may be especially inaccurate. '}These estimates are not sent to the classifier and do not establish a store bottle’s chemistry.</p><div className="estimate-scroll"><table className="estimate-table"><caption>Your entries and estimated missing measurements</caption><thead><tr>{['Measurement','Value','Source','Neighbour range'].map(title => <th scope="col" key={title}>{title}</th>)}</tr></thead><tbody>{estimate.rows.map((row,i) => <tr key={labels[i]}><th scope="row">{labels[i]}</th><td>{number(row.value)}</td><td>{row.estimated ? 'Estimated' : 'Entered'}</td><td>{row.estimated ? `${number(row.min)}–${number(row.max)}` : '—'}</td></tr>)}</tbody></table></div></>}</div><p className="source-notes">Reference: <Source href="https://archive.ics.uci.edu/dataset/109/wine">UCI Wine dataset ↗</Source> · 142 training rows. Tested on 36 held-out rows with two missing-value patterns; store wines are not validated.</p></section>
    <section className="explainer"><div><p className="eyebrow">BEHIND THE PREDICTION</p><h2>What does the model look for?</h2><p>Each tree asks questions about the sample. The trees’ probabilities are averaged. Here are the five most influential measurements.</p><p>An educational classifier, not a taste or quality rating. The training test split achieved 36/36 correct predictions; this is one small test.</p></div><div className="importance" aria-label="Top five feature importances">{model && model.importance.map((value,i) => ({value,i})).sort((a,b) => b.value - a.value).slice(0,5).map(({value,i}) => <div className="importance-row" key={i}><span>{labels[i]}</span><div className="track"><div className="fill" style={{width: `${Math.min(100,value * 400)}%`}}/></div><span>{(value * 100).toFixed(1)}%</span></div>)}</div></section>
  </>;
}

function Assistant({ bottle, preferences }) {
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState('reference');
  const [error, setError] = useState('');
  const conversation = useRef(null);
  useEffect(() => { if (conversation.current) conversation.current.scrollTop = conversation.current.scrollHeight; }, [messages, busy]);
  const send = async event => {
    event.preventDefault(); const content = question.trim(); if (!content || busy) return;
    const next = [...messages, {role: 'user', content}]; setMessages(next); setQuestion(''); setBusy(true); setError('');
    try {
      let response;
      try { response = await askAssistant(next.map(({role,content}) => ({role,content})), {bottle,preferences}); }
      catch { response = answerWineQuestion(content, {bottle,preferences}); setError('Using the reference guide because the assistant service is unavailable.'); }
      if (!response?.answer) throw new Error('The assistant could not provide an answer.');
      setMode(response.mode || 'reference'); setMessages(current => [...current, {role: 'assistant', content: response.answer, sources: response.sources || []}]);
    } catch (failure) { setError(failure.message || 'Could not answer. Try another question.'); }
    finally { setBusy(false); }
  };
  return <section className="assistant explorer panel" id="ask-winewizard" aria-labelledby="assistant-title"><div className="panel-heading"><div><p className="eyebrow">ASK WINEWIZARD</p><h2 id="assistant-title">A question, a clearer answer.</h2></div><span className="storage-label">{mode === 'ai' ? 'AI assistant' : 'Reference guide'}</span></div><p className="helper">Ask about grape styles, labels, calculations, or the chemistry tools. The reference guide answers common questions with sources. It does not look up store inventory or verify a bottle.</p>
    <div className="chat-log" role="log" aria-label="Wine questions and answers" aria-live="polite" ref={conversation}>{messages.length ? messages.map((message,i) => <article key={i} className={`chat-message ${message.role}`}><p className="chat-role">{message.role === 'user' ? 'You' : 'WineWizard'}</p><p className="chat-content">{message.content}</p>{message.sources?.length > 0 && <ul className="chat-sources">{message.sources.filter(source => /^https:\/\//.test(source.url)).map((source,j) => <li key={j}><Source href={source.url}>{source.title} ↗</Source></li>)}</ul>}</article>) : <p className="chat-welcome">Try “Is fruity wine always sweet?”, “What is ABV?”, or “How are missing measurements estimated?”</p>}{busy && <p className="chat-role">WineWizard is answering…</p>}</div>
    <form className="chat-form" onSubmit={send}><label htmlFor="wine-question">Your question</label><div className="chat-input-row"><textarea id="wine-question" value={question} onChange={event => setQuestion(event.target.value)} placeholder="Ask a wine question…" maxLength={1200} rows={2} required/><button className="predict" disabled={busy || !question.trim()}>{busy ? 'Answering…' : 'Ask'} <span aria-hidden="true">↗</span></button></div><p className="error" role="alert">{error}</p><small>Questions are sent to a backend only when one is configured. Avoid sharing personal information.</small></form>
  </section>;
}

function App() {
  const [active, setActive] = useState('store');
  const tabs = useRef([]);
  const [model, setModel] = useState(null);
  const [reference, setReference] = useState(null);
  const [dataError, setDataError] = useState('');
  const [bottle, setBottle] = useState({...emptyBottle});
  const [result, setResult] = useState(null);
  const [preferences, setPreferences] = useState({colour:'',body:'',aroma:''});
  const [saved, setSaved] = useState({bottles: [], mode: 'local'});
  const [saveStatus, setSaveStatus] = useState('loading');
  const [saveMessage, setSaveMessage] = useState('');
  const [session, setSession] = useState({enabled: false, user: null, mode: 'local'});
  const guide = useRef(null);
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => { try { const responses = await Promise.all(['model.json','reference.json'].map(file => fetch(`${import.meta.env.BASE_URL}${file}`, {signal: controller.signal}))); if (responses.some(response => !response.ok)) throw new Error(); const [m,r] = await Promise.all(responses.map(response => response.json())); setModel(m);setReference(r); } catch (error) { if (error.name !== 'AbortError') setDataError('The lab data could not load. Refresh the page to try again.'); } };
    load(); return () => controller.abort();
  }, []);
  useEffect(() => { let cancelled = false; Promise.allSettled([getSession(), getSavedBottles()]).then(([currentSession,response]) => {if (cancelled) return; if (currentSession.status === 'fulfilled') setSession(currentSession.value); if (response.status === 'fulfilled') setSaved(response.value); else setSaveMessage('Saved bottles could not load. Sign in or try refreshing.'); setSaveStatus('ready');}); return () => {cancelled = true;}; }, []);
  const changeSession = async signingIn => {setSaveStatus('signing');setSaveMessage('');try {if (signingIn) await signIn();else await signOut();const [currentSession,response] = await Promise.all([getSession(),getSavedBottles()]);setSession(currentSession);setSaved(response);setSaveMessage(signingIn ? 'Signed in. Your collection is ready.' : 'Signed out.');}catch(error){setSaveMessage(error.message || 'Could not update your sign-in.');}finally{setSaveStatus('ready');}};
  const save = async value => { setSaveStatus('saving');setSaveMessage(''); try {const response = await saveBottle(value);setSaved(response);setSaveMessage(response.mode === 'database' ? 'Bottle saved to your database collection.' : 'Bottle saved in this browser.');} catch (error) {setSaveMessage(error.message || 'Could not save this bottle.');} finally {setSaveStatus('ready');} };
  const remove = async id => {setSaveStatus(`deleting-${id}`);try {const response = await deleteBottle(id);setSaved(response);setSaveMessage('Bottle removed.');}catch(error){setSaveMessage(error.message || 'Could not remove this bottle.');}finally{setSaveStatus('ready');}};
  const loadSaved = value => {setBottle({...emptyBottle,...Object.fromEntries(Object.keys(emptyBottle).map(key => [key,String(value[key] ?? emptyBottle[key])]))});setResult(null);setSaveMessage('Bottle opened in the guide.');guide.current?.scrollIntoView({behavior:'smooth',block:'start'});};
  const switchTab = event => { if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return; event.preventDefault();const index = event.key === 'Home' ? 0 : event.key === 'End' ? 1 : active === 'store' ? 1 : 0;setActive(index ? 'lab' : 'store');tabs.current[index]?.focus();};
  return <><a className="skip-link" href="#explore">Skip to wine tools</a><header><a className="brand" href="./"><span className="brandmark" aria-hidden="true">W</span>WineWizard</a><span className="header-note">Understand wine. From label to lab.</span><nav className="header-links" aria-label="Project links"><a className="source" href="#ask-winewizard">Ask a question</a><a className="source" href="https://github.com/Aumy1/WineWizard" target="_blank" rel="noopener noreferrer">View project ↗</a></nav></header>
    <main><section className="intro"><div className="hero-copy"><p className="eyebrow">WINEWIZARD / LABEL TO LAB</p><h1>Label to lab.<br/>Wine, explained.</h1><p className="subtitle">Find styles that fit your preferences, understand a bottle’s label, and ask questions along the way.</p></div></section>
    <nav className="mode-picker" role="tablist" aria-label="Choose how to explore wine" id="explore">{[['store','Bottle guide','Use the label'],['lab','Chemistry lab','Use lab measurements']].map(([key,label,note],i) => <button key={key} id={`${key}-tab`} role="tab" ref={element => tabs.current[i] = element} aria-selected={active === key} aria-controls={`${key}-panel`} tabIndex={active === key ? 0 : -1} onClick={() => setActive(key)} onKeyDown={switchTab}>{label}<span>{note}</span></button>)}</nav>
    <section id="store-panel" role="tabpanel" aria-labelledby="store-tab" hidden={active !== 'store'}><TasteFinder preferences={preferences} setPreferences={setPreferences}/><div ref={guide}><BottleGuide bottle={bottle} setBottle={setBottle} result={result} setResult={setResult} onSave={save} saveState={saveStatus}/></div><SavedBottles saved={saved} status={saveStatus} message={saveMessage} onLoad={loadSaved} onDelete={remove} session={session} onSignIn={() => changeSession(true)} onSignOut={() => changeSession(false)}/><section className="explainer"><div><p className="eyebrow">THE PURPOSE</p><h2>Find a style you might enjoy.</h2><p>Start with preferences, use label context, and ask for help. These tools explain general styles; they do not verify a specific bottle’s flavours.</p></div><div className="label-glossary"><h2>A few words worth knowing.</h2><dl><dt>Grape &amp; region</dt><dd>Variety, growing conditions, and winemaking influence style.</dd><dt>Body &amp; sweetness</dt><dd>Body describes mouthfeel. Fruity aroma does not establish sweetness.</dd><dt>Vintage</dt><dd>The grape harvest year, rather than a quality score.</dd></dl><p className="source-notes"><Source>WSET’s wine styles guide ↗</Source></p></div></section></section>
    <section id="lab-panel" role="tabpanel" aria-labelledby="lab-tab" hidden={active !== 'lab'}><Lab model={model} reference={reference} dataError={dataError}/></section>
    <Assistant bottle={result || bottle} preferences={preferences}/><footer><span>WineWizard / built from Aumy1’s Python project</span><span>Lab measurements run in this browser.</span></footer></main></>;
}

createRoot(document.getElementById('root')).render(<App/>);
