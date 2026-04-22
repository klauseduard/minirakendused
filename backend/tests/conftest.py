import os
import shutil
import tempfile

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

# Point DB to a temp file before importing the app
_tmp = tempfile.mkdtemp()
os.environ['GARDEN_JWT_SECRET'] = 'test-secret'

from app.database import DB_DIR
import app.database as db_mod

# Override DB path to temp directory for tests
db_mod.DB_DIR = _tmp
db_mod.DB_PATH = os.path.join(_tmp, 'test.db')

from app.main import app


@pytest_asyncio.fixture
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url='http://test',
    ) as c:
        yield c


@pytest_asyncio.fixture(autouse=True)
async def reset_db():
    """Reset database before each test."""
    from app.database import get_db, init_db
    # Remove existing DB
    if os.path.exists(db_mod.DB_PATH):
        os.remove(db_mod.DB_PATH)
    # Remove photos directory
    photos_dir = os.path.join(db_mod.DB_DIR, 'photos')
    if os.path.exists(photos_dir):
        shutil.rmtree(photos_dir)
    # Recreate schema
    await init_db()
    # Reset rate limiters so test isolation is maintained
    from app.ratelimit import login_limiter, register_limiter
    login_limiter.reset()
    register_limiter.reset()
    yield
