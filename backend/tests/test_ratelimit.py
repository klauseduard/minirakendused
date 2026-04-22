import pytest

from app.ratelimit import RateLimiter, login_limiter, register_limiter


@pytest.mark.asyncio
async def test_login_rate_limit(client):
    """Login endpoint returns 429 after exceeding 10 attempts in 60 seconds."""
    # Register a user first
    await client.post('/api/register', json={
        'username': 'ratelimituser',
        'password': 'secret123',
    })

    # Reset the login limiter so other tests don't interfere
    login_limiter._hits.clear()

    # Make 10 login attempts (all should succeed or return 401, but not 429)
    for i in range(10):
        resp = await client.post('/api/login', json={
            'username': 'ratelimituser',
            'password': 'secret123',
        })
        assert resp.status_code == 200, f'Request {i+1} should succeed, got {resp.status_code}'

    # 11th attempt should be rate limited
    resp = await client.post('/api/login', json={
        'username': 'ratelimituser',
        'password': 'secret123',
    })
    assert resp.status_code == 429
    assert 'Too many requests' in resp.json()['detail']


@pytest.mark.asyncio
async def test_register_rate_limit(client):
    """Register endpoint returns 429 after exceeding 5 attempts in an hour."""
    # Reset the register limiter
    register_limiter._hits.clear()

    # Make 5 registration attempts (each with a unique username)
    for i in range(5):
        resp = await client.post('/api/register', json={
            'username': f'reguser{i}',
            'password': 'secret123',
        })
        assert resp.status_code == 201, f'Request {i+1} should succeed, got {resp.status_code}'

    # 6th attempt should be rate limited
    resp = await client.post('/api/register', json={
        'username': 'reguser99',
        'password': 'secret123',
    })
    assert resp.status_code == 429


def test_rate_limiter_unit():
    """Unit test: RateLimiter allows up to max_attempts, then rejects."""
    limiter = RateLimiter(max_attempts=3, window_seconds=60)

    # First 3 should pass
    for _ in range(3):
        limiter.check('testkey')

    # 4th should raise
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc_info:
        limiter.check('testkey')
    assert exc_info.value.status_code == 429


def test_rate_limiter_separate_keys():
    """Different keys are tracked independently."""
    limiter = RateLimiter(max_attempts=2, window_seconds=60)

    limiter.check('key_a')
    limiter.check('key_a')

    # key_a is now exhausted, but key_b should still work
    limiter.check('key_b')

    from fastapi import HTTPException
    with pytest.raises(HTTPException):
        limiter.check('key_a')
