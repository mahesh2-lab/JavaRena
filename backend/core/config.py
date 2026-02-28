import os
import platform
from typing import Dict, Any, List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    # App Config
    SECRET_KEY: str = Field(default="javarena-secret-key-change-in-production")
    DB_PATH: str = Field(default="shares.db")
    SHARE_IMAGES_DIR: str = Field(default="share-images")
    
    # Environment
    SYSTEM: str = platform.system()
    IS_WINDOWS: bool = SYSTEM == "Windows"
    IS_LINUX: bool = SYSTEM == "Linux"
    IS_MAC: bool = SYSTEM == "Darwin"
    
    # Rate limiting
    RATE_LIMIT_WINDOW: int = 60  # seconds
    RATE_LIMIT_MAX: int = 5  # max shares per window
    
    # Static files
    PROJECT_ROOT: str = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
