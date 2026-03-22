from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix='GARDEN_', env_file='.env')

    database_url: str = 'sqlite+aiosqlite:///./data/garden.db'
    jwt_secret: str = 'change-me-in-production'
    jwt_algorithm: str = 'HS256'
    jwt_expire_minutes: int = 60 * 24 * 30  # 30 days


settings = Settings()
