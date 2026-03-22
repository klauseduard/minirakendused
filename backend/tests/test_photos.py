import pytest


async def register_and_get_token(client, username='alice', password='secret123'):
    resp = await client.post('/api/register', json={
        'username': username,
        'password': password,
    })
    return resp.json()['access_token']


def auth_header(token):
    return {'Authorization': f'Bearer {token}'}


SAMPLE_PHOTO = {
    'id': 'photo-123-0',
    'entryId': 'entry-123',
    'data': 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
    'thumbnail': 'data:image/jpeg;base64,/9j/small==',
}


@pytest.mark.asyncio
async def test_list_photos_empty(client):
    token = await register_and_get_token(client)
    resp = await client.get('/api/photos', headers=auth_header(token))
    assert resp.status_code == 200
    assert resp.json()['photo_ids'] == []


@pytest.mark.asyncio
async def test_upload_and_get_photo(client):
    token = await register_and_get_token(client)

    # Upload
    resp = await client.put(
        f'/api/photos/{SAMPLE_PHOTO["id"]}',
        headers=auth_header(token),
        json=SAMPLE_PHOTO,
    )
    assert resp.status_code == 200
    assert resp.json()['id'] == SAMPLE_PHOTO['id']

    # List
    resp = await client.get('/api/photos', headers=auth_header(token))
    assert SAMPLE_PHOTO['id'] in resp.json()['photo_ids']

    # Get
    resp = await client.get(f'/api/photos/{SAMPLE_PHOTO["id"]}', headers=auth_header(token))
    assert resp.status_code == 200
    data = resp.json()
    assert data['id'] == SAMPLE_PHOTO['id']
    assert data['entryId'] == SAMPLE_PHOTO['entryId']
    assert data['data'] == SAMPLE_PHOTO['data']


@pytest.mark.asyncio
async def test_get_photo_not_found(client):
    token = await register_and_get_token(client)
    resp = await client.get('/api/photos/nonexistent', headers=auth_header(token))
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_photo(client):
    token = await register_and_get_token(client)

    await client.put(
        f'/api/photos/{SAMPLE_PHOTO["id"]}',
        headers=auth_header(token),
        json=SAMPLE_PHOTO,
    )

    resp = await client.delete(f'/api/photos/{SAMPLE_PHOTO["id"]}', headers=auth_header(token))
    assert resp.status_code == 200

    resp = await client.get(f'/api/photos/{SAMPLE_PHOTO["id"]}', headers=auth_header(token))
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_photos_isolated_between_users(client):
    token_a = await register_and_get_token(client, 'alice', 'pass123456')
    token_b = await register_and_get_token(client, 'bob', 'pass123456')

    await client.put(
        f'/api/photos/{SAMPLE_PHOTO["id"]}',
        headers=auth_header(token_a),
        json=SAMPLE_PHOTO,
    )

    # Bob should not see Alice's photo
    resp = await client.get('/api/photos', headers=auth_header(token_b))
    assert SAMPLE_PHOTO['id'] not in resp.json()['photo_ids']

    resp = await client.get(f'/api/photos/{SAMPLE_PHOTO["id"]}', headers=auth_header(token_b))
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_upload_id_mismatch(client):
    token = await register_and_get_token(client)
    resp = await client.put(
        '/api/photos/wrong-id',
        headers=auth_header(token),
        json=SAMPLE_PHOTO,
    )
    assert resp.status_code == 400
