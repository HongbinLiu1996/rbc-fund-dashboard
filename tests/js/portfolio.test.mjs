import test from 'node:test';import assert from 'node:assert/strict';import{calculateFundSnapshot,calculatePortfolioSnapshot,buildSeries,latestCommonObservations}from'../../src/js/portfolio.js';
const H={A:{code:'A',name:'A',account:'X',purchaseDate:'2026-08-31',contribution:10000,purchaseNav:20,units:500},B:{code:'B',name:'B',account:'Y',purchaseDate:'2026-08-31',contribution:5000,purchaseNav:50,units:100}};
test('purchase day starts at basis',()=>{const s=calculateFundSnapshot(H.A,{date:'2026-08-31',nav:20});assert.equal(s.value,10000);assert.equal(s.returnPct,0)});
test('fund gain and daily change',()=>{const s=calculateFundSnapshot(H.B,{date:'2026-09-04',nav:52},{date:'2026-09-03',nav:51});assert.equal(s.value,5200);assert.equal(s.gainLoss,200);assert.equal(s.dailyNavChange,1)});
test('combined snapshot',()=>{const s=calculatePortfolioSnapshot(H,{A:{date:'2026-09-04',nav:21},B:{date:'2026-09-04',nav:52}},{A:{date:'2026-09-03',nav:20.5},B:{date:'2026-09-03',nav:51}});assert.equal(s.value,15700);assert.equal(s.dailyValueChange,350)});
test('series uses common dates',()=>{const history={funds:{A:[{date:'2026-08-31',nav:20},{date:'2026-09-02',nav:20.4}],B:[{date:'2026-08-31',nav:50}]}};assert.deepEqual(buildSeries(history,H,'TOTAL','value').map(x=>x.date),['2026-08-31'])});
test('latest common valuation is aligned',()=>{const history={funds:{A:[{date:'2026-09-01',nav:20},{date:'2026-09-04',nav:21},{date:'2026-09-05',nav:21.2}],B:[{date:'2026-09-01',nav:50},{date:'2026-09-04',nav:52}]}};const x=latestCommonObservations(history,['A','B']);assert.equal(x.latestDate,'2026-09-04');assert.equal(x.previousDate,'2026-09-01')});
test('series creates private purchase baseline without publishing purchase NAV',()=>{
  const history={funds:{A:[{date:'2026-08-30',nav:19},{date:'2026-09-01',nav:21}],B:[{date:'2026-08-30',nav:49},{date:'2026-09-01',nav:52}]}};
  const G={A:{...H.A,contribution:11000,units:550},B:{...H.B,contribution:5500,units:110}};
  assert.deepEqual(buildSeries(history,G,'TOTAL','value'),[{date:'2026-08-31',value:16500},{date:'2026-09-01',value:17270}]);
  assert.deepEqual(buildSeries(history,H,'A','return'),[{date:'2026-08-31',value:0},{date:'2026-09-01',value:5}]);
});
