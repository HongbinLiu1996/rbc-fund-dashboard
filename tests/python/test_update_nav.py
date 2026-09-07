import pytest
from scripts.update_nav import parse_yahoo_chart,validate_observation,merge_observation,merge_observations
SAMPLE={"chart":{"result":[{"timestamp":[1788192000,1788278400],"indicators":{"quote":[{"close":[20.0,20.5]}]}}],"error":None}}
def test_parse():
    rows=parse_yahoo_chart(SAMPLE); assert len(rows)==2; assert rows[0][1]==20
def test_invalid():
    with pytest.raises(ValueError): validate_observation('bad',10)
    with pytest.raises(ValueError): validate_observation('2026-09-01',0)
def test_merge():
    h={"funds":{"X":[{"date":"2026-09-01","nav":10}]}}; assert merge_observation(h,'X','2026-09-02',11); assert h['funds']['X'][-1]['nav']==11
def test_backfill_merge():
    h={"funds":{"X":[{"date":"2026-08-31","nav":10}]}}; assert merge_observations(h,'X',[('2026-09-04',12),('2026-09-02',11)]); assert [r['date'] for r in h['funds']['X']]==['2026-08-31','2026-09-02','2026-09-04']

def test_fetch_failure_preserves_previous_file(tmp_path,monkeypatch):
    import json
    import scripts.update_nav as updater
    path=tmp_path/'history.json'
    old=json.dumps({'funds':{'RBF460':[{'date':'2026-09-01','nav':20}], 'RBF266':[{'date':'2026-09-01','nav':50}]}})
    path.write_text(old)
    def fetch(code,**kwargs):
        if code=='RBF266': raise RuntimeError('source unavailable')
        return [('2026-09-02',21)]
    monkeypatch.setattr(updater,'fetch_yahoo_rows',fetch)
    with pytest.raises(RuntimeError): updater.update_history(path)
    assert path.read_text()==old
