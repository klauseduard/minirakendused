import json
import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .auth import (
    TokenResponse,
    UserCreate,
    UserLogin,
    create_token,
    get_current_user,
    hash_password,
    verify_password,
)
from .config import settings
from .database import DB_DIR, get_db, init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title='Garden Planner API', lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.allowed_origins.split(',')],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)


# --- Auth routes ---

@app.post('/api/register', response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(body: UserCreate):
    if len(body.username) < 3:
        raise HTTPException(status_code=400, detail='Username must be at least 3 characters')
    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail='Password must be at least 6 characters')

    db = await get_db()
    try:
        existing = await db.execute('SELECT id FROM users WHERE username = ?', (body.username,))
        if await existing.fetchone():
            raise HTTPException(status_code=409, detail='Username already taken')

        display_name = body.display_name or body.username
        cursor = await db.execute(
            'INSERT INTO users (username, display_name, password_hash) VALUES (?, ?, ?)',
            (body.username, display_name, hash_password(body.password)),
        )
        await db.commit()
        user_id = cursor.lastrowid

        # Create empty state for new user
        await db.execute(
            'INSERT INTO user_state (user_id, data_json) VALUES (?, ?)',
            (user_id, '{}'),
        )
        await db.commit()

        token = create_token(user_id, body.username)
        return TokenResponse(access_token=token, username=body.username, display_name=display_name)
    finally:
        await db.close()


@app.post('/api/login', response_model=TokenResponse)
async def login(body: UserLogin):
    db = await get_db()
    try:
        cursor = await db.execute(
            'SELECT id, username, display_name, password_hash FROM users WHERE username = ?',
            (body.username,),
        )
        row = await cursor.fetchone()
        if not row or not verify_password(body.password, row['password_hash']):
            raise HTTPException(status_code=401, detail='Invalid username or password')

        token = create_token(row['id'], row['username'])
        return TokenResponse(access_token=token, username=row['username'], display_name=row['display_name'])
    finally:
        await db.close()


# --- Sync routes ---

class SyncState(BaseModel):
    data: dict
    updated_at: str | None = None


class SyncResponse(BaseModel):
    data: dict
    updated_at: str


@app.get('/api/sync', response_model=SyncResponse)
async def get_state(user: dict = Depends(get_current_user)):
    user_id = int(user['sub'])
    db = await get_db()
    try:
        cursor = await db.execute(
            'SELECT data_json, updated_at FROM user_state WHERE user_id = ?',
            (user_id,),
        )
        row = await cursor.fetchone()
        if not row:
            return SyncResponse(data={}, updated_at=datetime.now(timezone.utc).isoformat())

        return SyncResponse(
            data=json.loads(row['data_json']),
            updated_at=row['updated_at'],
        )
    finally:
        await db.close()


@app.put('/api/sync', response_model=SyncResponse)
async def put_state(body: SyncState, user: dict = Depends(get_current_user)):
    user_id = int(user['sub'])
    now = datetime.now(timezone.utc).isoformat()

    data_json = json.dumps(body.data)

    db = await get_db()
    try:
        await db.execute(
            '''INSERT INTO user_state (user_id, data_json, updated_at)
               VALUES (?, ?, ?)
               ON CONFLICT(user_id) DO UPDATE SET data_json = ?, updated_at = ?''',
            (user_id, data_json, now, data_json, now),
        )
        await db.commit()
        return SyncResponse(data=body.data, updated_at=now)
    finally:
        await db.close()


# --- Photo routes ---

def _photos_dir(user_id: int) -> str:
    d = os.path.join(DB_DIR, 'photos', str(user_id))
    os.makedirs(d, exist_ok=True)
    return d


class PhotoUpload(BaseModel):
    id: str
    entryId: str
    data: str
    thumbnail: str = ''


@app.get('/api/photos')
async def list_photos(user: dict = Depends(get_current_user)):
    """Return list of photo IDs stored on the server for this user."""
    user_id = int(user['sub'])
    d = _photos_dir(user_id)
    ids = []
    for fname in os.listdir(d):
        if fname.endswith('.json'):
            ids.append(fname[:-5])
    return {'photo_ids': ids}


@app.get('/api/photos/{photo_id}')
async def get_photo(photo_id: str, user: dict = Depends(get_current_user)):
    user_id = int(user['sub'])
    path = os.path.join(_photos_dir(user_id), f'{photo_id}.json')
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail='Photo not found')
    with open(path, 'r') as f:
        return json.load(f)


@app.put('/api/photos/{photo_id}')
async def put_photo(photo_id: str, body: PhotoUpload, user: dict = Depends(get_current_user)):
    user_id = int(user['sub'])
    if body.id != photo_id:
        raise HTTPException(status_code=400, detail='Photo ID in body must match URL')
    path = os.path.join(_photos_dir(user_id), f'{photo_id}.json')
    with open(path, 'w') as f:
        json.dump({'id': body.id, 'entryId': body.entryId, 'data': body.data, 'thumbnail': body.thumbnail}, f)
    return {'status': 'ok', 'id': photo_id}


@app.delete('/api/photos/{photo_id}')
async def delete_photo(photo_id: str, user: dict = Depends(get_current_user)):
    user_id = int(user['sub'])
    path = os.path.join(_photos_dir(user_id), f'{photo_id}.json')
    if os.path.exists(path):
        os.remove(path)
    return {'status': 'ok'}


@app.get('/api/health')
async def health():
    return {'status': 'ok'}
