from pathlib import Path
from scripts.update_nav import update_history
def backfill_history(path:Path,*,updater=update_history): return updater(path,range_="1mo")
if __name__=="__main__": print("Recent NAV history backfilled." if backfill_history(Path("data/nav-history.json")) else "Recent NAV history already current.")
