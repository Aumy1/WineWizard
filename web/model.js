/* Match scikit-learn: float32 inputs, <= tree splits, averaged leaf probabilities. */
function winePredict(model, sample) {
 const x=sample.map(Math.fround), probabilities=Array(model.classes.length).fill(0);
 for(const t of model.trees){let n=0;while(t.left[n]!==-1){n=x[t.feature[n]]<=t.threshold[n]?t.left[n]:t.right[n];}for(let i=0;i<probabilities.length;i++) probabilities[i]+=t.value[n][i]/model.trees.length;}
 return probabilities;
}
if(typeof module!=='undefined') module.exports={winePredict};
