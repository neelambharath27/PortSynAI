"""Local-disk implementation of image storage for uploaded X-ray scans.

Kept behind a narrow interface (save/url/path) so swapping this for S3/GCS
in production only touches this one file, not the API layer that calls it.
"""

import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

from app.config import settings

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}


def _inspections_dir() -> Path:
    path = Path(settings.STORAGE_DIR) / "inspections"
    path.mkdir(parents=True, exist_ok=True)
    return path


def _reports_dir() -> Path:
    path = Path(settings.STORAGE_DIR) / "reports"
    path.mkdir(parents=True, exist_ok=True)
    return path


async def save_inspection_image(container_id: str, upload: UploadFile) -> str:
    """Validates and persists an uploaded X-ray image, returns a relative
    path suitable for storing on the Inspection row and serving via the
    /storage static mount."""

    if upload.content_type not in ALLOWED_CONTENT_TYPES:
        raise ForbiddenException(
            f"Unsupported image type '{upload.content_type}'. Allowed: JPEG, PNG, WEBP."
        )

    max_bytes = settings.MAX_UPLOAD_IMAGE_MB * 1024 * 1024
    contents = await upload.read()
    if len(contents) > max_bytes:
        raise ForbiddenException(
            f"Image exceeds the {settings.MAX_UPLOAD_IMAGE_MB}MB upload limit."
        )

    extension = Path(upload.filename or "").suffix.lower() or ".jpg"
    if extension not in (".jpg", ".jpeg", ".png", ".webp"):
        extension = ".jpg"

    filename = f"{container_id}_{uuid.uuid4().hex}{extension}"
    destination = _inspections_dir() / filename
    destination.write_bytes(contents)

    return f"inspections/{filename}"


def image_disk_path(relative_path: str) -> Path:
    return Path(settings.STORAGE_DIR) / relative_path


def report_disk_path(inspection_id: str) -> Path:
    return _reports_dir() / f"{inspection_id}.pdf"
