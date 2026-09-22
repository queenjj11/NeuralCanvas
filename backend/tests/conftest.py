import os
import tempfile
from pathlib import Path

import pytest

TMP_DB = Path(tempfile.gettempdir()) / "neuralcanvas_test.db"
os.environ["DATABASE_PATH"] = str(TMP_DB)


@pytest.fixture(autouse=True)
def fresh_db():
    if TMP_DB.exists():
        TMP_DB.unlink()
    from app import db
    from app.config import get_settings

    get_settings.cache_clear()
    db.init_db()
    yield
    if TMP_DB.exists():
        TMP_DB.unlink()


@pytest.fixture
def client():
    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app) as c:
        yield c
