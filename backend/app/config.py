"""Application configuration for 2T-Downloader.

Supports two modes:
- LOCAL (default): Files saved to configured download directory. User can open folder, see file paths.
- PRODUCTION: Files streamed to browser, auto-cleaned after delivery. No server-side storage.

Reads from .env file or environment variables.
"""

import os
import logging
from enum import Enum
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

# Automatically load .env file from backend/ directory
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
if os.path.exists(env_path):
    load_dotenv(env_path)
    logger.info(f"Loaded environment from {env_path}")
else:
    logger.warning(f"No .env file found at {env_path}. Using defaults / system env vars.")


class AppMode(str, Enum):
    LOCAL = "local"
    PRODUCTION = "production"


class Settings:
    """Application settings loaded from environment."""

    def __init__(self):
        # Determine app mode
        mode_str = os.getenv("APP_MODE", "local").lower().strip()
        if mode_str not in ("local", "production"):
            logger.warning(f"Unknown APP_MODE '{mode_str}', falling back to 'local'")
            mode_str = "local"
        self.APP_MODE: AppMode = AppMode(mode_str)
        
        # Set mode flags FIRST (before they're used by path resolution)
        self.is_production: bool = (self.APP_MODE == AppMode.PRODUCTION)
        self.is_local: bool = (self.APP_MODE == AppMode.LOCAL)

        # Base directory (one level up from app/)
        self.BASE_DIR: str = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        
        # Download directory
        # In production, use a temp subdirectory under BASE_DIR
        # In local, use configured path or default
        configured_dir = os.getenv("DOWNLOAD_DIR", "")
        if configured_dir:
            self.DOWNLOAD_DIR: str = os.path.abspath(configured_dir)
        elif self.is_production:
            self.DOWNLOAD_DIR: str = os.path.join(self.BASE_DIR, "temp_downloads")
        else:
            self.DOWNLOAD_DIR: str = os.path.join(self.BASE_DIR, "downloads")

        os.makedirs(self.DOWNLOAD_DIR, exist_ok=True)

        # Cleanup behavior
        cleanup_str = os.getenv("CLEANUP_AFTER_DOWNLOAD", "")
        if cleanup_str:
            self.CLEANUP_AFTER_DOWNLOAD: bool = cleanup_str.lower() in ("1", "true", "yes")
        else:
            # Production: cleanup by default; Local: keep files
            self.CLEANUP_AFTER_DOWNLOAD: bool = self.is_production

        # Max history items (0 = unlimited)
        max_hist = os.getenv("MAX_HISTORY_ITEMS", "100")
        try:
            self.MAX_HISTORY_ITEMS: int = max(0, int(max_hist))
        except ValueError:
            self.MAX_HISTORY_ITEMS: int = 100

    def __repr__(self):
        return (
            f"Settings(APP_MODE={self.APP_MODE.value}, "
            f"DOWNLOAD_DIR={self.DOWNLOAD_DIR}, "
            f"CLEANUP_AFTER_DOWNLOAD={self.CLEANUP_AFTER_DOWNLOAD}, "
            f"MAX_HISTORY_ITEMS={self.MAX_HISTORY_ITEMS})"
        )


# Global singleton
_settings: Settings | None = None


def get_settings() -> Settings:
    global _settings
    if _settings is None:
        _settings = Settings()
        logger.info(f"Configuration loaded: {_settings}")
    return _settings


def reload_settings():
    """Reload settings from environment (useful for testing)."""
    global _settings
    _settings = Settings()
    return _settings
