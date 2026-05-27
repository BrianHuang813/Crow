from pydantic_settings import BaseSettings
from pydantic import ConfigDict

class Settings(BaseSettings):
    model_config = ConfigDict(env_file=".env")
    database_url: str
    redis_url: str
    github_client_id: str = "placeholder"
    github_client_secret: str = "placeholder"
    jwt_secret: str = "dev-secret-change-in-prod"
    jwt_algorithm: str = "HS256"
    jwt_expire_hours: int = 24 * 30  # 30 days

    # Game constants — tunable without code changes
    initial_lifespan_hours: int = 48
    resurrection_lifespan_hours: int = 24
    resurrection_credit_cost: int = 200
    boost_momentum: int = 25
    boost_time_seconds: int = 1800
    boost_credit_cost: int = 20
    click_momentum: int = 5
    click_time_seconds: int = 300
    click_credit_reward: int = 5
    click_cooldown_seconds: int = 60
    dying_threshold_hours: int = 6
    grid_width: int = 60
    grid_height: int = 60
    grid_cache_ttl_seconds: int = 30

settings = Settings()
