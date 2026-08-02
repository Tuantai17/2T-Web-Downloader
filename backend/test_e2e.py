import time
import os
from app import database, models
from app.engine.downloader import YTDLPEngine, DOWNLOADS_DIR, FFMPEG_PATH

def run_test():
    db = database.SessionLocal()
    try:
        models.Base.metadata.create_all(bind=database.engine)
        print("Database initialized.")
        print(f"FFmpeg path: {FFMPEG_PATH}")
        print(f"Downloads path: {DOWNLOADS_DIR}")

        engine = YTDLPEngine(db)
        # Standard test video
        test_url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        
        print("\n1. Testing analyze_url...")
        info = engine.extract_info(test_url)
        print(f"Extracted Title: {info.get('title')}")
        print(f"Duration: {info.get('duration')}s")

        print("\n2. Testing start_download...")
        dl_id = "test-download-youtube"
        task_id = "test-task-youtube"

        # Cleanup prior test entries if any
        db.query(models.Task).filter(models.Task.id == task_id).delete()
        db.query(models.Download).filter(models.Download.id == dl_id).delete()
        db.commit()

        dl = models.Download(
            id=dl_id,
            url=test_url,
            title=info.get('title'),
            thumbnail=info.get('thumbnail'),
            platform="YouTube",
            duration=info.get('duration'),
            status=models.DownloadStatus.QUEUED
        )
        task = models.Task(id=task_id, download_id=dl_id, stage="Queued")
        
        db.add(dl)
        db.add(task)
        db.commit()

        print("\n3. Executing download synchronous test...")
        engine.download(
            download_id=dl_id,
            task_id=task_id,
            url=test_url,
            format_id=None,
            audio_only=False
        )

        db.refresh(dl)
        db.refresh(task)

        print(f"\nFinal Download Status: {dl.status}")
        print(f"Final Task Stage: {task.stage}")
        print(f"Final Task Progress: {task.progress}%")

        print("\n4. Verifying history & file output...")
        history = db.query(models.History).filter(models.History.download_id == dl_id).first()
        if history:
            print(f"History Recorded: {history.title}")
            print(f"Saved Path: {history.file_path}")
            print(f"File Size: {history.file_size} bytes")
            if os.path.exists(history.file_path) and history.file_size > 0:
                print("\n✅ SUCCESS: Downloaded file exists on disk and size > 0!")
            else:
                print("\n❌ FAILURE: File not found or empty!")
        else:
            print("\n❌ FAILURE: No history record created!")

    finally:
        db.close()

if __name__ == "__main__":
    run_test()
