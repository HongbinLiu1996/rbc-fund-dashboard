function assertFinitePositive(value, label) {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${label} must be > 0`);
}

export function calculateFundSnapshot(holding, observation, previousObservation = null) {
  assertFinitePositive(holding.units, 'units');
  assertFinitePositive(holding.contribution, 'contribution');
  assertFinitePositive(observation.nav, 'NAV');
  const isPurchasePoint = observation.date === holding.purchaseDate && Math.abs(observation.nav - holding.purchaseNav) < 1e-6;
  const value = isPurchasePoint ? holding.contribution : holding.units * observation.nav;
  const gainLoss = value - holding.contribution;
  const returnPct = (gainLoss / holding.contribution) * 100;
  let dailyNavChange = null;
  let dailyNavChangePct = null;
  if (previousObservation) {
    assertFinitePositive(previousObservation.nav, 'previous NAV');
    dailyNavChange = observation.nav - previousObservation.nav;
    dailyNavChangePct = (dailyNavChange / previousObservation.nav) * 100;
  }
  return {code:holding.code,name:holding.name,account:holding.account,date:observation.date,nav:observation.nav,purchaseNav:holding.purchaseNav,units:holding.units,contribution:holding.contribution,value,gainLoss,returnPct,dailyNavChange,dailyNavChangePct};
}

export function calculatePortfolioSnapshot(holdings, observationsByCode, previousByCode = {}) {
  const codes = Object.keys(holdings);
  const fundSnapshots = codes.map((code) => calculateFundSnapshot(holdings[code], observationsByCode[code], previousByCode[code] ?? null));
  const value = fundSnapshots.reduce((sum, item) => sum + item.value, 0);
  const contribution = fundSnapshots.reduce((sum, item) => sum + item.contribution, 0);
  const gainLoss = value - contribution;
  const returnPct = (gainLoss / contribution) * 100;
  const hasPrevious = codes.every((code) => previousByCode[code]?.nav);
  const previousValue = hasPrevious ? codes.reduce((sum, code) => sum + holdings[code].units * previousByCode[code].nav, 0) : null;
  const dailyValueChange = previousValue == null ? null : value - previousValue;
  const dailyValueChangePct = previousValue == null ? null : (dailyValueChange / previousValue) * 100;
  const dates = fundSnapshots.map((item) => item.date).sort();
  return {date:dates.at(-1),value,contribution,gainLoss,returnPct,previousValue,dailyValueChange,dailyValueChangePct,funds:Object.fromEntries(fundSnapshots.map((item)=>[item.code,item]))};
}

function mapByDate(rows) { return new Map((rows ?? []).map((row) => [row.date, row.nav])); }

export function buildSeries(history, holdings, selection = 'TOTAL', metric = 'value') {
  const codes = Object.keys(holdings);
  if (selection !== 'TOTAL' && !holdings[selection]) throw new Error(`Unknown selection: ${selection}`);
  if (!['value','return'].includes(metric)) throw new Error(`Unknown metric: ${metric}`);
  const maps = Object.fromEntries(codes.map((code) => [code, mapByDate(history.funds?.[code])]));
  // The starting point comes from private browser settings, never public NAV data.
  for (const code of codes) {
    const h = holdings[code];
    for (const date of maps[code].keys()) if (date < h.purchaseDate) maps[code].delete(date);
    maps[code].set(h.purchaseDate, h.purchaseNav);
  }
  const dates = selection === 'TOTAL' ? [...maps[codes[0]].keys()].filter((date) => codes.every((code) => maps[code].has(date))) : [...maps[selection].keys()];
  dates.sort();
  return dates.map((date) => {
    if (selection === 'TOTAL') {
      const currentValue = codes.reduce((sum, code) => {
        const h=holdings[code], nav=maps[code].get(date);
        return sum + (date===h.purchaseDate && Math.abs(nav-h.purchaseNav)<1e-6 ? h.contribution : h.units*nav);
      },0);
      const basis = codes.reduce((sum, code)=>sum+holdings[code].contribution,0);
      return {date,value:metric==='value'?currentValue:((currentValue-basis)/basis)*100};
    }
    const h=holdings[selection], nav=maps[selection].get(date);
    const currentValue=date===h.purchaseDate && Math.abs(nav-h.purchaseNav)<1e-6 ? h.contribution : h.units*nav;
    return {date,value:metric==='value'?currentValue:((currentValue-h.contribution)/h.contribution)*100};
  });
}

export function latestCommonObservations(history, codes) {
  if (!Array.isArray(codes)||!codes.length) throw new Error('At least one fund code is required');
  const maps=Object.fromEntries(codes.map((code)=>[code,new Map((history.funds?.[code]??[]).map((row)=>[row.date,row]))]));
  const commonDates=[...maps[codes[0]].keys()].filter((date)=>codes.every((code)=>maps[code].has(date))).sort();
  const latestDate=commonDates.at(-1)??null, previousDate=commonDates.at(-2)??null;
  const pick=(date)=>date==null?{}:Object.fromEntries(codes.map((code)=>[code,maps[code].get(date)]));
  return {latestDate,previousDate,latest:pick(latestDate),previous:pick(previousDate)};
}
