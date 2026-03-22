# Garden Planner Backend

FastAPI backend providing user authentication and cloud sync for the Garden Planner app.

## Quick Start

### Without Docker

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Set a secret for JWT tokens (use a random string in production)
export GARDEN_JWT_SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))")

# Start the server
uvicorn app.main:app --port 8000
```

The API is now at `http://localhost:8000`. Auto-generated docs at `http://localhost:8000/docs`.

### With Docker

```bash
cd backend
cp .env.example .env
# Edit .env and set GARDEN_JWT_SECRET to a random string

docker compose up -d
```

### Data Storage

- **SQLite database** stored in `backend/data/garden.db` (created automatically on first start)
- **Photos** stored as JSON files in `backend/data/photos/<user_id>/`
- Both are in the `data/` directory, which is Docker-volume-mounted for persistence

To back up all server data, just copy the `data/` directory.

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/register` | No | Create account, returns JWT |
| POST | `/api/login` | No | Log in, returns JWT |
| GET | `/api/sync` | Yes | Get user's synced state |
| PUT | `/api/sync` | Yes | Push user's state |
| GET | `/api/photos` | Yes | List photo IDs |
| GET | `/api/photos/{id}` | Yes | Download a photo |
| PUT | `/api/photos/{id}` | Yes | Upload a photo |
| DELETE | `/api/photos/{id}` | Yes | Delete a photo |
| GET | `/api/health` | No | Health check |

All authenticated endpoints expect `Authorization: Bearer <token>` header.

## Running Tests

```bash
source venv/bin/activate
python -m pytest tests/ -v
```

## Configuration

Environment variables (prefix `GARDEN_`):

| Variable | Default | Description |
|----------|---------|-------------|
| `GARDEN_JWT_SECRET` | `change-me-in-production` | Secret for signing JWT tokens |
| `GARDEN_JWT_EXPIRE_MINUTES` | `43200` (30 days) | Token expiration time |

## Connecting the Frontend

In the Garden Planner app, click **Log In / Register** in the footer, enter the server URL (e.g. `http://localhost:8000`), and create an account. Data syncs automatically on login and via the **Sync Now** button.
