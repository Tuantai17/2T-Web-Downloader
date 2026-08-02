import yt_dlp
import uuid
import os
import glob
import logging
import traceback
import shutil
import tempfile
from datetime import datetime
from app import models
from app.config import get_settings

logger = logging.getLogger(__name__)

# Get configuration
settings = get_settings()

# Try to get ffmpeg path from imageio_ffmpeg
FFMPEG_PATH = None
try:
    import imageio_ffmpeg
    FFMPEG_PATH = imageio_ffmpeg.get_ffmpeg_exe()
    logger.info(f"Using FFmpeg binary at: {FFMPEG_PATH}")
except Exception as e:
    logger.warning(f"Could not load imageio_ffmpeg: {e}")

# Downloads directory from config
DOWNLOADS_DIR = settings.DOWNLOAD_DIR
os.makedirs(DOWNLOADS_DIR, exist_ok=True)

# Mode flags
IS_PRODUCTION = settings.is_production
IS_LOCAL = settings.is_local

logger.info(f"2T-Downloader running in {settings.APP_MODE.value.upper()} mode")
logger.info(f"Downloads directory: {DOWNLOADS_DIR}")


class YTDLPEngine:
    def __init__(self):
        pass

    def extract_info(self, url: str) -> dict:
        ydl_opts = {
            'extract_flat': False,
            'quiet': True,
            'no_warnings': True,
            'skip_download': True,
        }
        if FFMPEG_PATH:
            ydl_opts['ffmpeg_location'] = FFMPEG_PATH

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            return info

    def download(
        self,
        task_id: str,
        url: str,
        progress_dict: dict,
        format_id: str = None,
        audio_only: bool = False
    ):
        logger.info(f"Starting download task {task_id} for URL: {url}")

        def update_progress(**kwargs):
            nonlocal progress_dict
            for k, v in kwargs.items():
                if v is not None:
                    progress_dict[k] = v

        # Update initial state
        update_progress(status="PREPARING", stage="Preparing download...", progress=0.0)

        # Progress hook for yt-dlp
        def progress_hook(d):
            status = d.get('status')
            if status == 'downloading':
                update_progress(status="DOWNLOADING")
                
                # Extract percentage
                percent_str = d.get('_percent_str', '0%').strip().replace('%', '')
                # Remove any ANSI colors
                for ansi in ['\x1b[0;94m', '\x1b[0m', '\x1b[1;32m', '\x1b[0;33m']:
                    percent_str = percent_str.replace(ansi, '')
                try:
                    pct = float(percent_str)
                except ValueError:
                    pct = 0.0

                dl_bytes = d.get('downloaded_bytes', 0)
                tot_bytes = d.get('total_bytes') or d.get('total_bytes_estimate') or 0
                spd = d.get('speed') or 0
                eta_sec = d.get('eta') or 0

                stage_msg = f"Downloading... ({pct:.1f}%)"
                update_progress(
                    stage=stage_msg,
                    progress=pct,
                    speed=spd,
                    eta=eta_sec,
                    downloaded_bytes=dl_bytes,
                    total_bytes=tot_bytes
                )
            elif status == 'finished':
                update_progress(status="MERGING", stage="Processing & Merging...", progress=99.0)

        def postprocessor_hook(d):
            pp_status = d.get('status')
            pp_name = d.get('postprocessor')
            if pp_status == 'started':
                update_progress(status="POST_PROCESSING", stage=f"Post-processing ({pp_name})...", progress=99.5)

        output_template = os.path.join(DOWNLOADS_DIR, "%(title)s [%(id)s].%(ext)s")

        ydl_opts = {
            'outtmpl': output_template,
            'progress_hooks': [progress_hook],
            'postprocessor_hooks': [postprocessor_hook],
            'quiet': False,
            'no_warnings': False,
            'restrictfilenames': False,
        }

        if FFMPEG_PATH:
            ydl_opts['ffmpeg_location'] = FFMPEG_PATH

        if audio_only:
            ydl_opts['format'] = 'bestaudio/best'
            if FFMPEG_PATH:
                ydl_opts['postprocessors'] = [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                    'preferredquality': '192',
                }]
        elif format_id and format_id != 'auto':
            if FFMPEG_PATH:
                ydl_opts['format'] = f'{format_id}+bestaudio/best'
            else:
                ydl_opts['format'] = format_id
        else:
            ydl_opts['format'] = 'bestvideo+bestaudio/best' if FFMPEG_PATH else 'best'

        downloaded_file_path = None
        info_dict = None

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info_dict = ydl.extract_info(url, download=True)
                if 'requested_downloads' in info_dict and info_dict['requested_downloads']:
                    downloaded_file_path = info_dict['requested_downloads'][0].get('filepath')
                else:
                    downloaded_file_path = ydl.prepare_filename(info_dict)
                    if audio_only:
                        base, _ = os.path.splitext(downloaded_file_path)
                        downloaded_file_path = base + ".mp3"

            # Check if file exists, if not search in DOWNLOADS_DIR for match
            if not downloaded_file_path or not os.path.exists(downloaded_file_path):
                video_id = info_dict.get('id', '')
                matches = glob.glob(os.path.join(DOWNLOADS_DIR, f"*{video_id}*"))
                if matches:
                    downloaded_file_path = matches[0]

            if downloaded_file_path and os.path.exists(downloaded_file_path):
                filename = os.path.basename(downloaded_file_path)
                file_size = os.path.getsize(downloaded_file_path)

                # Mark completed with filename
                update_progress(
                    status="COMPLETED",
                    stage="Completed",
                    progress=100.0,
                    filename=filename
                )
                logger.info(f"Task {task_id} completed successfully. File saved at: {downloaded_file_path}")

                # In production mode, schedule file for cleanup after serving
                if IS_PRODUCTION:
                    logger.info(f"Production mode: file {downloaded_file_path} will be cleaned up after serving")

            else:
                err_msg = f"Downloaded file not found on disk: {downloaded_file_path}"
                logger.error(err_msg)
                update_progress(status="FAILED", stage="Failed", error_message=err_msg)

        except Exception as e:
            err_str = f"{type(e).__name__}: {str(e)}"
            tb_str = traceback.format_exc()
            logger.error(f"Download failed for task {task_id}:\n{tb_str}")
            update_progress(status="FAILED", stage="Failed", error_message=err_str)

    def cleanup_file(self, file_path: str):
        """Delete a downloaded file. Used in production mode after serving to browser."""
        try:
            if file_path and os.path.exists(file_path):
                os.remove(file_path)
                logger.info(f"Cleaned up file: {file_path}")
                
                # Also remove any companion files (e.g., .part files)
                dir_name = os.path.dirname(file_path)
                base_name = os.path.splitext(os.path.basename(file_path))[0]
                for f in os.listdir(dir_name):
                    if f.startswith(base_name) and f != os.path.basename(file_path):
                        try:
                            os.remove(os.path.join(dir_name, f))
                        except:
                            pass
                return True
        except Exception as e:
            logger.error(f"Failed to cleanup file {file_path}: {e}")
        return False
