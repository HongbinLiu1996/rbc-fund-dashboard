from __future__ import annotations
import argparse,json,math,os
from datetime import datetime,timezone
from pathlib import Path
from typing import Iterable
import requests
YAHOO_SYMBOLS={"RBF460":"0P0000706A.TO","RBF266":"0P000072KJ.TO"}
YAHOO_URL="https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
def validate_observation(date_str,nav):
    try: datetime.strptime(date_str,"%Y-%m-%d")
    except ValueError as exc: raise ValueError(f"Invalid valuation date: {date_str}") from exc
    if not isinstance(nav,(int,float)) or not math.isfinite(nav) or nav<=0: raise ValueError(f"Invalid NAV: {nav}")
def parse_yahoo_chart(payload):
    chart=payload.get("chart",{}); results=chart.get("result") or []
    if chart.get("error"): raise ValueError(f"Yahoo returned error: {chart['error']}")
    if not results: raise ValueError("Yahoo response has no chart result")
    result=results[0]; timestamps=result.get("timestamp") or []; quotes=((result.get("indicators") or {}).get("quote") or []); closes=quotes[0].get("close") if quotes else []
    if not timestamps or not closes or len(timestamps)!=len(closes): raise ValueError("Yahoo response is missing aligned timestamps and closes")
    rows=[]
    for ts,close in zip(timestamps,closes):
        if close is None: continue
        date_str=datetime.fromtimestamp(ts,tz=timezone.utc).date().isoformat(); nav=float(close); validate_observation(date_str,nav); rows.append((date_str,nav))
    if not rows: raise ValueError("Yahoo response contained no usable NAV rows")
    return sorted(rows)
def fetch_yahoo_rows(fund_code,*,range_="1mo",session=None):
    client=session or requests.Session(); response=client.get(YAHOO_URL.format(symbol=YAHOO_SYMBOLS[fund_code]),params={"interval":"1d","range":range_,"events":"history"},headers={"User-Agent":"Mozilla/5.0 (compatible; FundDashboard/1.0)"},timeout=20); response.raise_for_status(); return parse_yahoo_chart(response.json())
def merge_observation(history,fund_code,date_str,nav):
    validate_observation(date_str,nav); rows=history.setdefault("funds",{}).setdefault(fund_code,[]); by_date={r["date"]:r for r in rows}
    if date_str in by_date:
        existing=float(by_date[date_str]["nav"])
        if math.isclose(existing,nav,rel_tol=0,abs_tol=1e-9): return False
        raise ValueError(f"Conflicting NAV for {fund_code} on {date_str}: {existing} vs {nav}")
    if rows and date_str<max(r["date"] for r in rows): raise ValueError(f"Refusing older observation {fund_code} {date_str}")
    rows.append({"date":date_str,"nav":nav,"source":"yahoo"}); rows.sort(key=lambda r:r["date"]); return True
def merge_observations(history,fund_code,observations:Iterable[tuple[str,float]]):
    changed=False; unique={}
    for date_str,nav in observations:
        validate_observation(date_str,nav)
        if date_str in unique and not math.isclose(unique[date_str],nav,rel_tol=0,abs_tol=1e-9): raise ValueError(f"Conflicting duplicate input for {fund_code} on {date_str}")
        unique[date_str]=nav
    for date_str in sorted(unique):
        rows=history.setdefault("funds",{}).setdefault(fund_code,[]); matching=next((r for r in rows if r["date"]==date_str),None); incoming=unique[date_str]
        if matching is not None:
            existing=float(matching["nav"])
            if math.isclose(existing,incoming,rel_tol=0,abs_tol=1e-9): continue
            source=matching.get("source"); small=abs(existing-incoming)<=0.01
            if source in {"purchase-nav"} and small: continue
            if source in {"public-rounded","public"} and small: matching["nav"]=incoming; matching["source"]="yahoo"; changed=True; continue
            raise ValueError(f"Conflicting NAV for {fund_code} on {date_str}: {existing} vs {incoming}")
        rows.append({"date":date_str,"nav":incoming,"source":"yahoo"}); rows.sort(key=lambda r:r["date"]); changed=True
    return changed
def load_history(path): return json.loads(path.read_text(encoding="utf-8"))
def atomic_write(path,data):
    tmp=path.with_suffix(path.suffix+".tmp"); tmp.write_text(json.dumps(data,indent=2,sort_keys=True)+"\n",encoding="utf-8"); os.replace(tmp,path)
def update_history(path,*,range_="1mo"):
    original=load_history(path); candidate=json.loads(json.dumps(original)); fetched={code:fetch_yahoo_rows(code,range_=range_) for code in YAHOO_SYMBOLS}
    if any(not rows for rows in fetched.values()): raise RuntimeError("A required fund returned no observations")
    changed=False
    for code,observations in fetched.items():
        start=candidate.get("funds",{}).get(code,[{}])[0].get("date","0000-00-00"); changed=merge_observations(candidate,code,[(d,n) for d,n in observations if d>=start]) or changed
    if changed: candidate["updatedAt"]=datetime.now(timezone.utc).isoformat(timespec="seconds"); atomic_write(path,candidate)
    return changed
def main():
    parser=argparse.ArgumentParser(); parser.add_argument("--path",default="data/nav-history.json"); parser.add_argument("--range",dest="range_",default="1mo"); args=parser.parse_args(); changed=update_history(Path(args.path),range_=args.range_); print("NAV history updated." if changed else "NAV history already current."); return 0
if __name__=="__main__": raise SystemExit(main())
