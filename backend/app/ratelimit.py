"""Simple in-memory rate limiter for FastAPI endpoints."""

import time
import threading

from fastapi import HTTPException, Request, status


class RateLimiter:
    """Sliding-window rate limiter backed by an in-memory dict.

    Tracks request timestamps per key (client IP) and rejects with 429
    when the limit is exceeded within the configured window.

    Args:
        max_attempts: Maximum number of allowed requests per window.
        window_seconds: Length of the sliding window in seconds.
    """

    def __init__(self, max_attempts: int, window_seconds: int):
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        self._hits: dict[str, list[float]] = {}
        self._lock = threading.Lock()

    def _cleanup(self, key: str, now: float) -> list[float]:
        """Remove expired timestamps for a key and return remaining ones."""
        cutoff = now - self.window_seconds
        timestamps = self._hits.get(key, [])
        # Keep only timestamps within the current window
        timestamps = [t for t in timestamps if t > cutoff]
        self._hits[key] = timestamps
        return timestamps

    def reset(self) -> None:
        """Clear all tracked hits. Useful for testing."""
        with self._lock:
            self._hits.clear()

    def check(self, key: str) -> None:
        """Record a hit and raise HTTPException(429) if rate limit exceeded."""
        now = time.monotonic()
        with self._lock:
            timestamps = self._cleanup(key, now)
            if len(timestamps) >= self.max_attempts:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail='Too many requests. Please try again later.',
                )
            timestamps.append(now)

    async def __call__(self, request: Request) -> None:
        """FastAPI dependency interface — use with ``Depends(limiter)``."""
        key = request.client.host if request.client else 'unknown'
        self.check(key)


# Pre-configured limiters for auth endpoints
login_limiter = RateLimiter(max_attempts=10, window_seconds=60)
register_limiter = RateLimiter(max_attempts=5, window_seconds=3600)
