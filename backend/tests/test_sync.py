import pytest


async def register_and_get_token(client, username='alice', password='secret123'):
    resp = await client.post('/api/register', json={
        'username': username,
        'password': password,
    })
    return resp.json()['access_token']


def auth_header(token):
    return {'Authorization': f'Bearer {token}'}


@pytest.mark.asyncio
async def test_get_empty_state(client):
    token = await register_and_get_token(client)
    resp = await client.get('/api/sync', headers=auth_header(token))
    assert resp.status_code == 200
    data = resp.json()
    assert data['data'] == {}
    assert 'updated_at' in data


@pytest.mark.asyncio
async def test_put_and_get_state(client):
    token = await register_and_get_token(client)

    state = {
        'journal_entries': [{'id': '1', 'text': 'Planted tomatoes'}],
        'settings': {'temp_unit': 'C'},
    }

    put_resp = await client.put('/api/sync', headers=auth_header(token), json={'data': state})
    assert put_resp.status_code == 200
    assert put_resp.json()['data'] == state

    get_resp = await client.get('/api/sync', headers=auth_header(token))
    assert get_resp.json()['data'] == state


@pytest.mark.asyncio
async def test_put_updates_timestamp(client):
    token = await register_and_get_token(client)

    await client.put('/api/sync', headers=auth_header(token), json={'data': {'v': 1}})
    resp1 = await client.get('/api/sync', headers=auth_header(token))
    ts1 = resp1.json()['updated_at']

    await client.put('/api/sync', headers=auth_header(token), json={'data': {'v': 2}})
    resp2 = await client.get('/api/sync', headers=auth_header(token))
    ts2 = resp2.json()['updated_at']

    assert ts2 >= ts1


@pytest.mark.asyncio
async def test_sync_requires_auth(client):
    resp = await client.get('/api/sync')
    assert resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_users_have_separate_state(client):
    token_a = await register_and_get_token(client, 'alice', 'pass123456')
    token_b = await register_and_get_token(client, 'bob', 'pass123456')

    await client.put('/api/sync', headers=auth_header(token_a), json={'data': {'owner': 'alice'}})
    await client.put('/api/sync', headers=auth_header(token_b), json={'data': {'owner': 'bob'}})

    resp_a = await client.get('/api/sync', headers=auth_header(token_a))
    resp_b = await client.get('/api/sync', headers=auth_header(token_b))

    assert resp_a.json()['data']['owner'] == 'alice'
    assert resp_b.json()['data']['owner'] == 'bob'


@pytest.mark.asyncio
async def test_health(client):
    resp = await client.get('/api/health')
    assert resp.status_code == 200
    assert resp.json()['status'] == 'ok'
