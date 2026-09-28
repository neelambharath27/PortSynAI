from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile

from app.core.config import settings


ALLOWED_CONTENT_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


def _storage_root() -> Path:
    return Path(settings.STORAGE_DIR)


def _inspection_directory(container_id: str) -> Path:
    return _storage_root() / "inspections" / container_id


def report_disk_path(relative_path: str) -> Path:
    """
    Convert a stored relative inspection image path
    into an absolute/local filesystem path.
    """
    return _storage_root() / relative_path


async def save_inspection_image(
    container_id: str,
    file: UploadFile,
) -> str:
    """
    Validate and save an inspection image.

    Returns the relative path stored in the database.
    """

    # ------------------------------------------------------------
    # Validate content type
    # ------------------------------------------------------------
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        allowed = ", ".join(ALLOWED_CONTENT_TYPES.keys())

        raise ValueError(
            f"Unsupported image type: {file.content_type}. "
            f"Allowed types: {allowed}"
        )

    # ------------------------------------------------------------
    # Read uploaded file
    # ------------------------------------------------------------
    contents = await file.read()

    if not contents:
        raise ValueError("Uploaded image is empty.")

    # ------------------------------------------------------------
    # Validate file size
    # ------------------------------------------------------------
    max_bytes = settings.MAX_UPLOAD_IMAGE_MB * 1024 * 1024

    if len(contents) > max_bytes:
        raise ValueError(
            f"Image exceeds the "
            f"{settings.MAX_UPLOAD_IMAGE_MB}MB upload limit."
        )

    # ------------------------------------------------------------
    # Create inspection directory
    # ------------------------------------------------------------
    inspection_dir = _inspection_directory(container_id)

    inspection_dir.mkdir(
        parents=True,
        exist_ok=True,
    )

    # ------------------------------------------------------------
    # Generate unique filename
    # ------------------------------------------------------------
    extension = ALLOWED_CONTENT_TYPES[file.content_type]

    filename = f"{uuid4()}{extension}"

    file_path = inspection_dir / filename

    # ------------------------------------------------------------
    # Save image
    # ------------------------------------------------------------
    file_path.write_bytes(contents)

    # ------------------------------------------------------------
    # Return database-relative path
    # ------------------------------------------------------------
    relative_path = (
        Path("inspections")
        / container_id
        / filename
    )

    return relative_path.as_posix()