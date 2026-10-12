export const labels = ['Alcohol','Malic acid','Ash','Alcalinity of ash','Magnesium','Total phenols','Flavanoids','Nonflavanoid phenols','Proanthocyanins','Color intensity','Hue','OD280/OD315','Proline'];
export const demo = [13.2,1.78,2.14,11.2,100,2.65,2.76,.26,1.28,4.38,1.05,3.4,1050];

// Preserve the exported scikit-learn model's float32 inputs and <= splits.
export function winePredict(model, sample) {
  const x = sample.map(Math.fround);
  const probabilities = Array(model.classes.length).fill(0);
  for (const tree of model.trees) {
    let node = 0;
    while (tree.left[node] !== -1) {
      node = x[tree.feature[node]] <= tree.threshold[node] ? tree.left[node] : tree.right[node];
    }
    probabilities.forEach((_, i) => { probabilities[i] += tree.value[node][i] / model.trees.length; });
  }
  return probabilities;
}

// Only observed dimensions select neighbours. The reference excludes test rows.
export function estimateMissing(reference, values) {
  const observed = values.map((value, i) => value === null ? -1 : i).filter(i => i >= 0);
  if (!observed.length) throw new Error('Enter at least one actual chemical measurement.');
  const neighbours = reference.rows.map((row, index) => ({
    row, index,
    distance: observed.reduce((sum, i) => sum + ((row[i] - values[i]) / reference.scale[i]) ** 2, 0) / observed.length,
  })).sort((a, b) => a.distance - b.distance || a.index - b.index).slice(0, reference.neighbours);
  return values.map((value, i) => {
    if (value !== null) return { value, estimated: false };
    const sorted = neighbours.map(({row}) => row[i]).sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    return { value: median, estimated: true, min: sorted[0], max: sorted[sorted.length - 1] };
  });
}

export function bottleCalculations(bottle) {
  const size = bottle.size === '' ? null : Number(bottle.size);
  const price = bottle.price === '' ? null : Number(bottle.price);
  const abv = bottle.abv === '' ? null : Number(bottle.abv);
  return {
    pricePer100: size > 0 && Number.isFinite(price) && price >= 0 ? price / size * 100 : null,
    alcoholVolume: size > 0 && Number.isFinite(abv) && abv >= 0 && abv <= 100 ? size * abv / 100 : null,
  };
}
