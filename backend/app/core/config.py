from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    mongodb_uri: str
    mongodb_db_name: str = "linkea"

    # IA (API de Claude). Sin key la app funciona igual: solo se desactivan las funciones de IA.
    anthropic_api_key: str = ""
    # Modelo que se usa en las llamadas. Se puede cambiar desde el .env sin tocar código
    # (p. ej. claude-sonnet-5-5 o claude-haiku-5-5 para gastar menos).
    anthropic_model: str = "claude-opus-5-5"

    # Sesiones (JWT). Si falta la clave se genera una al azar en cada arranque: sirve para probar,
    # pero cierra la sesión de todos cada vez que el servidor se reinicia.
    jwt_secret: str = ""
    jwt_horas: int = 12

    model_config = SettingsConfigDict(
        env_file=BACKEND_ROOT / ".env", env_file_encoding="utf-8"
    )


settings = Settings()
