from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    face_service_api_key: str
    model_name: str = "insightface"
    model_version: str = "configured-version"
    mock_face_service: bool = False
    match_threshold: float = 0.82
    manual_review_threshold: float = 0.72
    liveness_threshold: float = 0.85
    quality_min_score: float = 0.18
    low_light_threshold: float = 0.14

    class Config:
        env_file = ".env"


settings = Settings()
