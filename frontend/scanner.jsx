import React, { useEffect, useRef, useState } from 'react';
import { parseLabelText, validateImageFile } from './label-parser.js';

const options = {
  type: ['Still', 'Sparkling', 'Fortified'], colour: ['Red', 'White', 'Rosé', 'Orange / skin-contact'],
  sweetness: ['Dry', 'Off-dry', 'Medium', 'Sweet'], currency: ['CAD', 'USD', 'EUR', 'GBP'],
};
const fields = [
  ['name', 'Bottle / producer'], ['grape', 'Grape variety or blend'], ['region', 'Country / region'],
  ['vintage', 'Vintage year'], ['type', 'Wine type'], ['colour', 'Colour'],
  ['abv', 'Alcohol (% ABV)'], ['sweetness', 'Sweetness, if stated'],
  ['price', 'Bottle price (enter manually)'], ['currency', 'Currency'], ['size', 'Bottle size (mL)'],
];
const numeric = {
  vintage: { type: 'number', min: 1800, max: 2100, step: 1 },
  abv: { type: 'number', min: 0, max: 100, step: 'any' },
  price: { type: 'number', min: 0, max: 1000000, step: 'any' },
  size: { type: 'number', min: 1, max: 1000000, step: 'any' },
};

export function LabelScanner({ onParsed }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [text, setText] = useState('');
  const [review, setReview] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const current = useRef(0);
  const workerRef = useRef(null);
  const terminatedWorkers = useRef(new WeakSet());
  const alive = useRef(true);
  const reviewHeading = useRef(null);
  const terminate = worker => {
    if (!worker || terminatedWorkers.current.has(worker)) return Promise.resolve();
    terminatedWorkers.current.add(worker);
    return Promise.resolve().then(() => worker.terminate()).catch(() => {});
  };

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      current.current += 1;
      const worker = workerRef.current;
      workerRef.current = null;
      terminate(worker);
    };
  }, []);
  useEffect(() => {
    if (!file) { setPreview(''); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const selectFile = event => {
    const selected = event.target.files?.[0];
    if (!selected) return;
    const problem = validateImageFile(selected);
    setError(problem);
    if (problem) { event.target.value = ''; return; }
    setFile(selected); setReview(null); setWarnings([]); setConfirmed(false); setText('');
    setStatus('Photo selected. Choose Read label to extract text.'); setProgress(null);
  };
  const propose = value => {
    const parsed = parseLabelText(value);
    setReview(parsed.bottle); setWarnings(parsed.warnings); setConfirmed(false);
    setStatus('Text extracted. Review and correct the proposed bottle details.');
    requestAnimationFrame(() => { if (alive.current) reviewHeading.current?.focus(); });
  };
  const readLabel = async () => {
    const problem = validateImageFile(file);
    if (problem) { setError(problem); return; }
    const task = ++current.current;
    setBusy(true); setError(''); setReview(null); setWarnings([]); setConfirmed(false);
    setProgress(null); setStatus('Preparing text recognition…');
    let worker;
    try {
      const { createWorker } = await import('tesseract.js');
      if (!alive.current || task !== current.current) return;
      worker = await createWorker('eng', 1, {
        logger: message => {
          if (!alive.current || task !== current.current) return;
          if (message.status === 'recognizing text') {
            setStatus('Reading the label…');
            setProgress(Math.min(100, Math.max(0, Math.round((message.progress || 0) * 100))));
          } else {
            setProgress(null);
            setStatus(message.status?.includes('language') ? 'Loading English reading files…' : 'Preparing text recognition…');
          }
        },
      });
      if (!alive.current || task !== current.current) return;
      workerRef.current = worker;
      const result = await worker.recognize(file);
      if (!alive.current || task !== current.current) return;
      const extracted = result?.data?.text || '';
      setText(extracted.slice(0, 20000));
      if (!extracted.trim()) {
        setError('No readable text was found. Try a sharper photo, avoid glare, or paste the label text below.');
        setStatus('No readable label text found.');
      } else propose(extracted);
    } catch {
      if (alive.current && task === current.current) {
        setError('Could not read this photo. Check your connection for the reading files, try a JPEG photo, or paste the label text below.');
        setStatus('Photo reading did not complete.');
      }
    } finally {
      if (workerRef.current === worker) workerRef.current = null;
      // This also releases a worker whose initialization finished after cancellation.
      await terminate(worker);
      if (alive.current && task === current.current) { setBusy(false); setProgress(null); }
    }
  };
  const cancel = () => {
    current.current += 1;
    const worker = workerRef.current;
    workerRef.current = null;
    terminate(worker);
    setBusy(false); setProgress(null); setStatus('Photo reading cancelled.');
  };
  const parsePasted = event => {
    event.preventDefault();
    if (!text.trim()) { setError('Paste or type some label text first.'); return; }
    setError(''); propose(text);
  };
  const confirm = event => {
    event.preventDefault();
    const values = Object.fromEntries(Object.entries(review).map(([key, value]) => [key, String(value).trim()]));
    if (!values.name && !values.grape && !values.region && !values.type) {
      setError('Add a bottle name, grape, region or wine type before continuing.'); return;
    }
    setError(''); onParsed?.(values); setConfirmed(true); setStatus('Bottle details copied to your bottle guide.');
  };
  const change = (key, value) => { setReview(previous => ({ ...previous, [key]: value })); setConfirmed(false); setError(''); };

  return <section className="scanner-section explorer panel" aria-labelledby="scanner-title">
    <p className="eyebrow">READ THE LABEL</p><h2 id="scanner-title">Scan, then check.</h2>
    <p className="helper">Take a clear, straight-on photo of the label. Avoid glare and crop away the background. You can read the front and back separately. JPEG, PNG or WebP; up to 10 MB.</p>
    <p className="helper">Text recognition runs on this device. Your photo is not uploaded. The first scan downloads the reading engine and English language files; smaller print and other languages may need manual correction.</p>
    <div className="fields">
      <div className="field"><label htmlFor="label-camera">Take a label photo</label><input id="label-camera" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" disabled={busy} onChange={selectFile}/></div>
      <div className="field"><label htmlFor="label-upload">Choose an existing photo</label><input id="label-upload" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={selectFile}/></div>
    </div>
    {preview && <figure className="scanner-preview"><img src={preview} alt="Selected label photo for text recognition" style={{ maxWidth: '100%', maxHeight: 320, objectFit: 'contain' }}/><figcaption>{file?.name}</figcaption></figure>}
    <div className="scanner-actions"><button type="button" className="predict" disabled={!file || busy} onClick={readLabel}>{busy ? 'Reading label…' : 'Read label ↗'}</button>{busy && <button type="button" className="quiet" onClick={cancel}>Cancel reading</button>}</div>
    <p className="helper" role="status" aria-live="polite">{status}{progress !== null && ` ${progress}%`}</p>
    {busy && progress !== null && <progress max="100" value={progress} aria-label="Label text recognition progress"/>}
    <p className="error" role="alert">{error}</p>
    <form onSubmit={parsePasted} className="scanner-text-form"><div className="field"><label htmlFor="label-text">Label text · edit extracted text or paste it here</label><textarea id="label-text" value={text} maxLength={20000} rows={6} disabled={busy} onChange={event => { setText(event.target.value); setReview(null); setWarnings([]); setConfirmed(false); }} placeholder="Example Estate\nCabernet Sauvignon 2023\nOntario, Canada\n13.5% alc/vol\n750 mL"/></div><button type="submit" className="quiet" disabled={busy}>Review these details ↗</button></form>
    {review && <form className="scanner-review" onSubmit={confirm}><h3 ref={reviewHeading} tabIndex={-1}>Confirm your bottle details.</h3>
      <ul className="helper">{warnings.map(warning => <li key={warning}>{warning}</li>)}</ul>
      <p className="helper">Missing details stay blank. Price is entered manually. A region mentioned in the text may be an importer’s address—confirm the bottle’s actual origin.</p>
      <div className="fields">{fields.map(([key, label]) => <div className="field" key={key}><label htmlFor={`scan-${key}`}>{label}</label>
        {options[key] ? <select id={`scan-${key}`} value={review[key]} onChange={event => change(key, event.target.value)}>{key !== 'currency' && <option value="">Unknown</option>}{options[key].map(option => <option key={option} value={option}>{option}</option>)}</select> : <input id={`scan-${key}`} {...(numeric[key] || { type: 'text', maxLength: 120 })} value={review[key]} onChange={event => change(key, event.target.value)}/>}
      </div>)}</div><button className="predict" type="submit">Use confirmed details <span aria-hidden="true">↗</span></button>{confirmed && <p role="status" className="helper">Confirmed details are ready in your bottle guide.</p>}
    </form>}
    <p className="helper">This scanner reads text; it does not authenticate a bottle or check real-time store inventory.</p>
    <a href="https://github.com/naptha/tesseract.js" target="_blank" rel="noopener noreferrer">Text recognition powered by Tesseract.js ↗</a>
  </section>;
}
