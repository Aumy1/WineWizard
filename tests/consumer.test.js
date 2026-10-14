import test from 'node:test';
import assert from 'node:assert/strict';
import {STYLE_CATALOG,numericProfile,ratingHistory,styleBottle,readConsumerStore,shiftCalendar} from '../frontend/catalog-data.js';
import {tasteMatch,weeklyIntake} from '../examples/product-logic.mjs';
test('editorial styles have bounded descriptors, primary references and no invented bottle commerce',()=>{
  assert.equal(STYLE_CATALOG.length,10);
  assert.equal(new Set(STYLE_CATALOG.map(item=>item.id)).size,10);
  for(const style of STYLE_CATALOG){
    for(const [trait,range] of Object.entries(style.ranges)){
      assert.ok(range[0]>=0&&range[1]<=1&&range[0]<=range[1]);
      assert.equal(style[trait],(range[0]+range[1])/2);
    }
    assert.ok(style.sources.every(source=>new URL(source).hostname==='www.wsetglobal.com'));
    const bottle=styleBottle(style);
    assert.equal(bottle.name,'');assert.equal(bottle.abv,'');assert.equal(bottle.price,'');assert.equal(bottle.region,'');
  }
});
test('quiz unknowns stay unknown and unknown aromas are not accepted',()=>{
  const profile=numericProfile({body:'',sweetness:'0',acidity:'1.5',tannin:'0.8',colour:'red',aromas:['oak','fake','oak']});
  assert.equal(profile.body,undefined);assert.equal(profile.sweetness,0);assert.equal(profile.acidity,undefined);assert.deepEqual(profile.aromas,['oak']);
  assert.equal(tasteMatch(profile,STYLE_CATALOG[7]).matchPercentage!==null,true);
});
test('only tried and rated entries update matching, never intake',()=>{
  const notebook=[{tried:false,rating:'5',descriptors:STYLE_CATALOG[7]},{tried:true,rating:'5',descriptors:STYLE_CATALOG[0]},{tried:true,rating:'',descriptors:STYLE_CATALOG[2]}];
  assert.equal(ratingHistory(notebook).length,1);
  assert.equal(weeklyIntake(notebook,{weekOf:'2026-10-12'}).knownStandardDrinks,0);
});
test('storage corruption and wrong versions recover without unsafe values',()=>{
  assert.equal(readConsumerStore('not json').notebook.length,0);
  assert.equal(readConsumerStore('{"version":2}').quizSaved,false);
  const store=readConsumerStore(JSON.stringify({version:1,quiz:{body:'bad',colour:'pink'},notebook:[null,{id:'x',name:'A',abv:'-1',tried:true,rating:'99',descriptors:{body:3}}],servings:[null,{id:'bad',volumeMl:-10,consumedAt:'2026-10-12'},{id:'unknown',volumeMl:150,abvPercent:null,consumedAt:'2026-10-12T16:00:00Z'}]}));
  assert.equal(store.quiz.body,'');assert.equal(store.quiz.colour,'');assert.equal(store.notebook[0].abv,'');assert.equal(store.notebook[0].rating,'');assert.equal(store.notebook[0].descriptors.body,'');
  assert.equal(store.servings.length,1);
  const week=weeklyIntake(store.servings,{weekOf:'2026-10-12'});assert.equal(week.unknownEntries,1);assert.equal(week.knownStandardDrinks,0);
});
test('calendar shift handles month and year navigation',()=>{
  assert.equal(shiftCalendar('2026-12-28',7),'2027-01-04');
  assert.equal(shiftCalendar('2026-11-02',-7),'2026-10-26');
});
