from pathlib import Path
from scripts.backfill_nav import backfill_history
def test_range(tmp_path):
    calls=[]
    def fake(path:Path,*,range_): calls.append(range_); return True
    p=tmp_path/'x.json';p.write_text('{}');assert backfill_history(p,updater=fake);assert calls==['1mo']
