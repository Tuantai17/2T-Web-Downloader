from pydantic import BaseModel
from typing import Optional, List

class FormatOption(BaseModel):
    format_id: str
    label: str
    quality_category: str
    resolution: str
    ext: str
    url: Optional[str] = None
    vcodec: Optional[str] = None
    acodec: Optional[str] = None
    fps: Optional[float] = None
    filesize_approx: Optional[int] = None
    is_audio: bool = False

class DownloadRequest(BaseModel):
    url: str
    format_id: Optional[str] = None
    audio_only: bool = False
    title: Optional[str] = None
    thumbnail: Optional[str] = None
    platform: Optional[str] = None
    duration: Optional[float] = None
    resolution: Optional[str] = None

class DownloadProgress(BaseModel):
    task_id: str
    status: str = "QUEUED"
    stage: str = "Queued"
    progress: float = 0.0
    speed: float = 0.0
    eta: int = 0
    downloaded_bytes: int = 0
    total_bytes: int = 0
    filename: Optional[str] = None
    error_message: Optional[str] = None

class ExtractRequest(BaseModel):
    url: str

class ExtractResponse(BaseModel):
    id: str
    title: Optional[str] = None
    thumbnail: Optional[str] = None
    duration: Optional[float] = None
    platform: Optional[str] = None
    extractor: Optional[str] = None
    formats: List[FormatOption] = []

class SettingsResponse(BaseModel):
    download_dir: str
    app_mode: str = "local"
    ffmpeg_available: bool
    ffmpeg_path: Optional[str] = None
    ytdlp_version: str
    is_production: bool = False
    cleanup_after_download: bool = False
