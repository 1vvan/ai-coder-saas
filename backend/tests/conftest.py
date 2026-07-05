"""Point the app at a throwaway SQLite file before it is imported."""

import os
import tempfile
from pathlib import Path

# Must be set before `app.db` is imported, since DB_PATH is read at import time.
_tmp = Path(tempfile.gettempdir()) / "prelegal_test.db"
os.environ["PRELEGAL_DB_PATH"] = str(_tmp)
