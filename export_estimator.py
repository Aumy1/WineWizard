"""Export a small training reference and evaluate missing-value estimates."""
import json
from pathlib import Path
import numpy as np
from sklearn.datasets import load_wine
from sklearn.model_selection import train_test_split

def estimate(rows, scale, sample, observed):
    distance=np.mean(((rows[:, observed]-sample[observed])/scale[observed])**2,axis=1)
    neighbours=rows[np.argsort(distance,kind='stable')[:10]]
    return np.median(neighbours,axis=0)

def main():
    data=load_wine()
    train,test=train_test_split(data.data,test_size=.2,random_state=42,stratify=data.target)
    scale=train.std(axis=0)
    reports=[]
    for observed in [[0],[0,1,9]]:
        missing=[i for i in range(13) if i not in observed]
        estimates=np.array([estimate(train,scale,row,observed) for row in test])
        error=np.mean(np.abs(estimates[:,missing]-test[:,missing])/scale[missing])
        baseline=np.mean(np.abs(np.median(train,axis=0)[missing]-test[:,missing])/scale[missing])
        reports.append({'observed':observed,'test_samples':len(test),'mean_scaled_absolute_error':round(float(error),3),'median_baseline_error':round(float(baseline),3)})
    payload={'rows':train.tolist(),'scale':scale.tolist(),'features':list(data.feature_names),'neighbours':10,'validation':reports}
    path=Path(__file__).resolve().parent/'web/reference.json'
    path.write_text(json.dumps(payload,separators=(',',':'))+'\n')
    print(json.dumps(reports,indent=2))
if __name__=='__main__':main()
