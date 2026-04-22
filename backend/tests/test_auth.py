import pytest


@pytest.mark.asyncio
async def test_register(client):
    resp = await client.post('/api/register', json={
        'username': 'alice',
        'password': 'secret123',
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data['username'] == 'alice'
    assert data['display_name'] == 'alice'  # defaults to username
    assert 'access_token' in data


@pytest.mark.asyncio
async def test_register_with_display_name(client):
    resp = await client.post('/api/register', json={
        'username': 'alice',
        'password': 'secret123',
        'display_name': 'Alice W.',
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data['username'] == 'alice'
    assert data['display_name'] == 'Alice W.'


@pytest.mark.asyncio
async def test_register_duplicate(client):
    await client.post('/api/register', json={'username': 'alice', 'password': 'secret123'})
    resp = await client.post('/api/register', json={'username': 'alice', 'password': 'other456'})
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_register_short_username(client):
    resp = await client.post('/api/register', json={'username': 'ab', 'password': 'secret123'})
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_register_short_password(client):
    resp = await client.post('/api/register', json={'username': 'alice', 'password': '12345'})
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_login_success(client):
    await client.post('/api/register', json={
        'username': 'alice', 'password': 'secret123', 'display_name': 'Alice W.',
    })
    resp = await client.post('/api/login', json={'username': 'alice', 'password': 'secret123'})
    assert resp.status_code == 200
    data = resp.json()
    assert 'access_token' in data
    assert data['display_name'] == 'Alice W.'


@pytest.mark.asyncio
async def test_login_wrong_password(client):
    await client.post('/api/register', json={'username': 'alice', 'password': 'secret123'})
    resp = await client.post('/api/login', json={'username': 'alice', 'password': 'wrong'})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_login_nonexistent_user(client):
    resp = await client.post('/api/login', json={'username': 'nobody', 'password': 'secret123'})
    assert resp.status_code == 401
