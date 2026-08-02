from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import uuid
import os
import logging
import yt_dlp

from app import schemas
from app.engine.downloader import YTDLPEngine, DOWNLOADS_DIR, FFMPEG_PATH, IS_PRODUCTION
from app.config import get_settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def cleanup_after_delivery(file_path: str):
    """Remove a downloaded file after it has been served to the client."""
    try:
        if file_path and os.path.exists(file_path):
            os.remove(file_path)
            logger.info(f"Cleaned up delivered file: {file_path}")
    except Exception as e:
        logger.error(f"Failed to cleanup delivered file {file_path}: {e}")


app = FastAPI(
    title="2T-Downloader Engine API",
    description="High Performance Video Downloader API powered by yt-dlp and FastAPI",
    version="3.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── In-memory download progress ─────────────────────────────────
download_progress: dict[str, dict] = {}


def format_codec_name(codec_str: str) -> str:
    if not codec_str or codec_str == 'none':
        return ''
    codec_lower = codec_str.lower()
    if 'avc' in codec_lower or 'h264' in codec_lower:
        return 'H.264'
    if 'hev' in codec_lower or 'h265' in codec_lower or 'hvc' in codec_lower:
        return 'H.265'
    if 'vp9' in codec_lower or 'vp09' in codec_lower:
        return 'VP9'
    if 'av01' in codec_lower or 'av1' in codec_lower:
        return 'AV1'
    if 'mp4a' in codec_lower or 'aac' in codec_lower:
        return 'AAC'
    if 'opus' in codec_lower:
        return 'Opus'
    if 'mp3' in codec_lower:
        return 'MP3'
    return codec_str.split('.')[0].upper()


def build_format_options(raw_formats: list) -> list[schemas.FormatOption]:
    options = []
    seen_keys = set()

    for f in raw_formats:
        fmt_id = str(f.get('format_id', ''))
        vcodec = f.get('vcodec', 'none')
        acodec = f.get('acodec', 'none')
        ext = f.get('ext', 'mp4')
        height = f.get('height')
        width = f.get('width')
        fps = f.get('fps')
        filesize = f.get('filesize') or f.get('filesize_approx')

        is_video = vcodec != 'none'
        is_audio = vcodec == 'none' and acodec != 'none'

        if not is_video and not is_audio:
            continue

        # Format label generation
        if is_video:
            h = height or 0
            if h >= 4320:
                cat = "8K"
                res_tag = "8K UHD"
            elif h >= 2160:
                cat = "4K"
                res_tag = "4K UHD"
            elif h >= 1440:
                cat = "2K"
                res_tag = "2K"
            elif h >= 1080:
                cat = "1080p"
                res_tag = "Full HD"
            elif h >= 720:
                cat = "720p"
                res_tag = "HD"
            elif h >= 480:
                cat = "480p"
                res_tag = "SD"
            elif h >= 360:
                cat = "360p"
                res_tag = "SD"
            elif h >= 240:
                cat = "240p"
                res_tag = "SD"
            else:
                cat = "144p"
                res_tag = "SD"

            res_str = f"{width}×{height}" if width and height else f"{h}p"
            codec_name = format_codec_name(vcodec)
            
            # Estimate MB
            size_str = f"~{int(filesize / (1024*1024))} MB" if filesize else ""
            
            parts = [f"📹 {h}p ({res_tag})", res_str, ext.upper()]
            if codec_name:
                parts.append(codec_name)
            if size_str:
                parts.append(size_str)
            
            label = " • ".join(parts)
            
            # Deduplicate similar quality/format combos
            dedup_key = (h, ext, codec_name)
            if dedup_key in seen_keys:
                continue
            seen_keys.add(dedup_key)

        else:
            cat = "Audio Only"
            abr = f.get('abr') or f.get('tbr') or 128
            codec_name = format_codec_name(acodec) or ext.upper()
            label = f"🎵 Audio Only • {codec_name} • {int(abr)} kbps"
            res_str = "Audio"
            dedup_key = ("audio", ext, codec_name)
            if dedup_key in seen_keys:
                continue
            seen_keys.add(dedup_key)

        options.append(schemas.FormatOption(
            format_id=fmt_id,
            label=label,
            quality_category=cat,
            resolution=res_str,
            ext=ext,
            url=f.get('url'),
            vcodec=vcodec,
            acodec=acodec,
            fps=fps,
            filesize_approx=filesize,
            is_audio=is_audio
        ))

    # Sort options by height descending, audio at the end
    def sort_key(opt: schemas.FormatOption):
        if opt.is_audio:
            return -1
        try:
            h = int(opt.quality_category.replace('p', '').replace('K', '000').replace('UHD', '').strip())
            return h
        except:
            return 0

    options.sort(key=sort_key, reverse=True)
    return options


# ── API Endpoints ────────────────────────────────────────────────


@app.post("/api/analyze", response_model=schemas.ExtractResponse)
def analyze_url(req: schemas.ExtractRequest):
    engine = YTDLPEngine()
    try:
        info = engine.extract_info(req.url)
        raw_formats = info.get("formats", [])
        formatted_options = build_format_options(raw_formats)

        extractor = info.get('extractor_key') or info.get('extractor') or 'Web'
        
        return schemas.ExtractResponse(
            id=info.get('id', str(uuid.uuid4())),
            title=info.get('title', 'Untitled Video'),
            thumbnail=info.get('thumbnail'),
            duration=info.get('duration'),
            platform=extractor,
            extractor=extractor,
            formats=formatted_options
        )
    except Exception as e:
        logger.error(f"Analyze failed for URL {req.url}: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/download")
def start_download(req: schemas.DownloadRequest, background_tasks: BackgroundTasks):
    task_id = str(uuid.uuid4())
    
    # Initialize in-memory progress
    progress = {
        "task_id": task_id,
        "status": "QUEUED",
        "stage": "Queued",
        "progress": 0.0,
        "speed": 0.0,
        "eta": 0,
        "downloaded_bytes": 0,
        "total_bytes": 0,
        "filename": None,
        "error_message": None,
    }
    download_progress[task_id] = progress

    def run_download():
        engine = YTDLPEngine()
        engine.download(
            task_id=task_id,
            url=req.url,
            progress_dict=progress,
            format_id=req.format_id,
            audio_only=req.audio_only
        )

    background_tasks.add_task(run_download)
    return {
        "message": "Download started",
        "task_id": task_id
    }


@app.get("/api/tasks/{task_id}", response_model=schemas.DownloadProgress)
def get_task_progress(task_id: str):
    progress = download_progress.get(task_id)
    if not progress:
        raise HTTPException(status_code=404, detail="Task not found")
    return schemas.DownloadProgress(**progress)


@app.get("/api/settings", response_model=schemas.SettingsResponse)
def get_settings_api():
    cfg = get_settings()
    return schemas.SettingsResponse(
        download_dir=DOWNLOADS_DIR,
        app_mode=cfg.APP_MODE.value,
        ffmpeg_available=FFMPEG_PATH is not None,
        ffmpeg_path=FFMPEG_PATH,
        ytdlp_version=yt_dlp.version.__version__,
        is_production=cfg.is_production,
        cleanup_after_download=cfg.CLEANUP_AFTER_DOWNLOAD
    )


@app.get("/api/downloads/{filename}")
def serve_downloaded_file(filename: str, background_tasks: BackgroundTasks):
    file_path = os.path.join(DOWNLOADS_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    # In production mode, schedule cleanup after serving
    if IS_PRODUCTION:
        background_tasks.add_task(cleanup_after_delivery, file_path)
    
    return FileResponse(file_path, filename=filename)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
