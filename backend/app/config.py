from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 30  # 은행 도메인 표준 idle. 프론트엔드 카운트다운과 일치.
    CORS_ORIGINS: str = "http://localhost:3001"

    # LLM API — `groq` 우선(가이드 §0 Llama 3.1 호환), `mistral`/`huggingface` fallback.
    # 모든 키 비어있으면 챗봇은 키워드 기반 답변만 사용 (가이드 §3.7 환각 방지 그대로).
    LLM_PROVIDER: str = "groq"
    GROQ_API_KEY: str = ""
    MISTRAL_API_KEY: str = ""
    HUGGINGFACE_API_KEY: str = ""

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


settings = Settings()
