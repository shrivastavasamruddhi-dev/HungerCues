"""
Milestones router — /api/v1/milestones

Provides full CRUD for milestone records and media attachments.

Authorization model
-------------------
Every operation verifies that:
  1. The authenticated Firebase user owns the baby
     (Baby.family_id == firebase_uid).
  2. The milestone belongs to that baby.

Media limits
------------
  Photos : max 10 MB  (image/jpeg, image/png, image/webp, image/heic)
  Videos : max 100 MB (video/mp4, video/quicktime)
  Max 10 attachments per milestone.
"""

from __future__ import annotations

import io
import logging
import uuid
from datetime import UTC, date, datetime

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies.auth import get_current_firebase_uid
from app.models.baby import Baby
from app.models.milestone import Milestone, MilestoneMedia
from app.services.storage import StorageError, get_storage_service, storage_http_error

logger = logging.getLogger(__name__)

router = APIRouter()

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

PHOTO_MIME_TYPES: frozenset[str] = frozenset({"image/jpeg", "image/png", "image/webp", "image/heic"})
VIDEO_MIME_TYPES: frozenset[str] = frozenset({"video/mp4", "video/quicktime"})
ALLOWED_MIME_TYPES: frozenset[str] = PHOTO_MIME_TYPES | VIDEO_MIME_TYPES

MAX_PHOTO_BYTES = 10 * 1024 * 1024  # 10 MB
MAX_VIDEO_BYTES = 100 * 1024 * 1024  # 100 MB
MAX_MEDIA_PER_MILESTONE = 10


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------


class MilestoneMediaSchema(BaseModel):
    id: int
    milestone_id: int
    media_type: str
    original_filename: str | None
    content_type: str
    size_bytes: int
    created_at: datetime
    # download_url is populated by the endpoint, not stored in DB
    download_url: str | None = None

    class Config:
        from_attributes = True


class MilestoneCreate(BaseModel):
    baby_id: int
    name: str
    achieved_at: date | None = None
    notes: str | None = None


class MilestoneUpdate(BaseModel):
    name: str | None = None
    achieved_at: date | None = None
    notes: str | None = None


class MilestoneSchema(BaseModel):
    id: int
    baby_id: int
    name: str
    achieved_at: date | None
    notes: str | None
    media: list[MilestoneMediaSchema] = []

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _get_owned_baby(
    baby_id: int,
    firebase_uid: str,
    db: AsyncSession,
) -> Baby:
    """Return the baby if it exists and belongs to the caller, else 404/403."""
    result = await db.execute(select(Baby).where(Baby.id == baby_id))
    baby = result.scalar_one_or_none()
    if baby is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Baby not found")
    if baby.family_id != firebase_uid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this baby",
        )
    return baby


async def _get_owned_milestone(
    milestone_id: int,
    firebase_uid: str,
    db: AsyncSession,
    *,
    load_media: bool = False,
) -> Milestone:
    """Return the milestone if it belongs to one of the caller's babies."""
    q = select(Milestone).where(Milestone.id == milestone_id)
    if load_media:
        q = q.options(selectinload(Milestone.media))
    result = await db.execute(q)
    milestone = result.scalar_one_or_none()
    if milestone is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Milestone not found")
    # Verify ownership via the parent baby
    await _get_owned_baby(milestone.baby_id, firebase_uid, db)
    return milestone


def _media_type_for(content_type: str) -> str:
    return "photo" if content_type in PHOTO_MIME_TYPES else "video"


def _validate_upload(file: UploadFile, data: bytes) -> None:
    """Raise HTTPException for invalid uploads before touching storage."""
    content_type = file.content_type or ""

    if content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "unsupported_mime_type",
                "message": (f"Unsupported file type '{content_type}'. Allowed: {sorted(ALLOWED_MIME_TYPES)}"),
            },
        )

    if len(data) == 0:
        raise HTTPException(
            status_code=422,
            detail={"code": "empty_file", "message": "Uploaded file is empty"},
        )

    limit = MAX_PHOTO_BYTES if content_type in PHOTO_MIME_TYPES else MAX_VIDEO_BYTES
    label = "10 MB" if content_type in PHOTO_MIME_TYPES else "100 MB"
    if len(data) > limit:
        raise HTTPException(
            status_code=413,
            detail={
                "code": "file_too_large",
                "message": (f"File size {len(data):,} bytes exceeds the {label} limit for this media type"),
            },
        )


async def _milestone_with_urls(milestone: Milestone, db: AsyncSession) -> MilestoneSchema:
    """Build a MilestoneSchema, generating presigned URLs for each media item."""
    storage = get_storage_service()
    media_out: list[MilestoneMediaSchema] = []
    for m in milestone.media:
        url: str | None = None
        try:
            url = await storage.create_presigned_download_url(m.storage_key)
        except StorageError:
            logger.warning("Could not generate presigned URL for storage_key=%s", m.storage_key)
        media_out.append(
            MilestoneMediaSchema(
                id=m.id,
                milestone_id=m.milestone_id,
                media_type=m.media_type,
                original_filename=m.original_filename,
                content_type=m.content_type,
                size_bytes=m.size_bytes,
                created_at=(m.created_at if m.created_at.tzinfo else m.created_at.replace(tzinfo=UTC)),
                download_url=url,
            )
        )
    return MilestoneSchema(
        id=milestone.id,
        baby_id=milestone.baby_id,
        name=milestone.name,
        achieved_at=milestone.achieved_at,
        notes=milestone.notes,
        media=media_out,
    )


# ---------------------------------------------------------------------------
# Milestone CRUD
# ---------------------------------------------------------------------------


@router.post("/", response_model=MilestoneSchema, status_code=status.HTTP_201_CREATED)
async def create_milestone(
    milestone_in: MilestoneCreate,
    db: AsyncSession = Depends(get_db),
    firebase_uid: str = Depends(get_current_firebase_uid),
):
    """Create a new milestone.  Caller must own the baby."""
    await _get_owned_baby(milestone_in.baby_id, firebase_uid, db)

    milestone = Milestone(
        baby_id=milestone_in.baby_id,
        name=milestone_in.name,
        achieved_at=milestone_in.achieved_at,
        notes=milestone_in.notes,
    )
    db.add(milestone)
    await db.commit()

    # Re-fetch with media relationship loaded (empty list at creation)
    milestone = await _get_owned_milestone(milestone.id, firebase_uid, db, load_media=True)
    return await _milestone_with_urls(milestone, db)


@router.get("/baby/{baby_id}", response_model=list[MilestoneSchema])
async def list_milestones(
    baby_id: int,
    db: AsyncSession = Depends(get_db),
    firebase_uid: str = Depends(get_current_firebase_uid),
):
    """List all milestones for a baby.  Caller must own the baby."""
    await _get_owned_baby(baby_id, firebase_uid, db)

    result = await db.execute(
        select(Milestone).where(Milestone.baby_id == baby_id).options(selectinload(Milestone.media)).order_by(Milestone.id.asc())
    )
    milestones = result.scalars().all()
    return [await _milestone_with_urls(m, db) for m in milestones]


@router.get("/{milestone_id}", response_model=MilestoneSchema)
async def get_milestone(
    milestone_id: int,
    db: AsyncSession = Depends(get_db),
    firebase_uid: str = Depends(get_current_firebase_uid),
):
    """Retrieve a single milestone with its media metadata."""
    milestone = await _get_owned_milestone(milestone_id, firebase_uid, db, load_media=True)
    return await _milestone_with_urls(milestone, db)


@router.patch("/{milestone_id}", response_model=MilestoneSchema)
async def update_milestone(
    milestone_id: int,
    milestone_in: MilestoneUpdate,
    db: AsyncSession = Depends(get_db),
    firebase_uid: str = Depends(get_current_firebase_uid),
):
    """Partially update a milestone.  Caller must own the baby."""
    milestone = await _get_owned_milestone(milestone_id, firebase_uid, db, load_media=True)

    if milestone_in.name is not None:
        milestone.name = milestone_in.name
    if milestone_in.achieved_at is not None:
        milestone.achieved_at = milestone_in.achieved_at
    if milestone_in.notes is not None:
        milestone.notes = milestone_in.notes

    await db.commit()
    await db.refresh(milestone)

    # Reload with media
    milestone = await _get_owned_milestone(milestone_id, firebase_uid, db, load_media=True)
    return await _milestone_with_urls(milestone, db)


@router.delete("/{milestone_id}")
async def delete_milestone(
    milestone_id: int,
    db: AsyncSession = Depends(get_db),
    firebase_uid: str = Depends(get_current_firebase_uid),
):
    """
    Delete a milestone and all its media.

    R2 objects are deleted first; DB records are removed after.
    If R2 deletion fails the DB record is still removed (we log the error
    but don't want to leave orphaned DB rows because R2 is idempotent on
    missing keys — operator can retry the R2 cleanup manually).
    """
    milestone = await _get_owned_milestone(milestone_id, firebase_uid, db, load_media=True)

    storage = get_storage_service()
    for media in list(milestone.media):
        try:
            await storage.delete_object(media.storage_key)
        except StorageError:
            logger.error(
                "Failed to delete R2 object %s for media_id=%s; continuing with DB deletion",
                media.storage_key,
                media.id,
            )

    await db.delete(milestone)
    await db.commit()
    return {"status": "deleted"}


# ---------------------------------------------------------------------------
# Media upload
# ---------------------------------------------------------------------------


@router.post(
    "/{milestone_id}/media",
    response_model=MilestoneMediaSchema,
    status_code=status.HTTP_201_CREATED,
)
async def upload_media(
    milestone_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    firebase_uid: str = Depends(get_current_firebase_uid),
):
    """
    Upload a photo or video and attach it to a milestone.

    - Validates content-type and file size before touching storage.
    - Uses a UUID as the R2 object key (never the original filename).
    - Creates the DB record only after a successful upload.
    """
    milestone = await _get_owned_milestone(milestone_id, firebase_uid, db, load_media=True)

    # Check attachment cap
    if len(milestone.media) >= MAX_MEDIA_PER_MILESTONE:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "max_attachments_exceeded",
                "message": (f"Milestone already has {MAX_MEDIA_PER_MILESTONE} attachments (the maximum allowed)"),
            },
        )

    data = await file.read()
    _validate_upload(file, data)

    content_type = file.content_type or ""
    storage_key = f"milestone-media/{milestone_id}/{uuid.uuid4()}"

    storage = get_storage_service()
    try:
        await storage.upload_fileobj(io.BytesIO(data), storage_key, content_type)
    except StorageError as exc:
        logger.exception("R2 upload failed for milestone_id=%s", milestone_id)
        raise storage_http_error("Failed to upload media to storage") from exc

    media_record = MilestoneMedia(
        milestone_id=milestone_id,
        media_type=_media_type_for(content_type),
        storage_key=storage_key,
        original_filename=file.filename,
        content_type=content_type,
        size_bytes=len(data),
    )
    db.add(media_record)
    try:
        await db.commit()
        await db.refresh(media_record)
    except Exception:
        # DB write failed after successful upload — best-effort R2 cleanup
        logger.exception(
            "DB commit failed after R2 upload; attempting to clean up storage_key=%s",
            storage_key,
        )
        try:
            await storage.delete_object(storage_key)
        except StorageError:
            logger.error("Could not clean up orphaned R2 object %s after DB failure", storage_key)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "storage_failure",
                "message": "Media was uploaded but could not be saved; the upload has been rolled back",
            },
        )

    # Generate presigned URL for immediate use
    url: str | None = None
    try:
        url = await storage.create_presigned_download_url(media_record.storage_key)
    except StorageError:
        logger.warning(
            "Media uploaded but presigned URL generation failed for storage_key=%s",
            storage_key,
        )

    created_at = media_record.created_at
    if created_at and created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=UTC)

    return MilestoneMediaSchema(
        id=media_record.id,
        milestone_id=media_record.milestone_id,
        media_type=media_record.media_type,
        original_filename=media_record.original_filename,
        content_type=media_record.content_type,
        size_bytes=media_record.size_bytes,
        created_at=created_at or datetime.now(UTC),
        download_url=url,
    )


# ---------------------------------------------------------------------------
# Media deletion
# ---------------------------------------------------------------------------


@router.delete("/{milestone_id}/media/{media_id}")
async def delete_media(
    milestone_id: int,
    media_id: int,
    db: AsyncSession = Depends(get_db),
    firebase_uid: str = Depends(get_current_firebase_uid),
):
    """
    Delete a single media attachment.

    Ownership is verified through the milestone → baby chain.
    R2 deletion is attempted first; DB record is removed regardless
    (R2 treats missing keys as success, so duplicate calls are safe).
    """
    # Ownership check
    await _get_owned_milestone(milestone_id, firebase_uid, db)

    result = await db.execute(
        select(MilestoneMedia).where(
            MilestoneMedia.id == media_id,
            MilestoneMedia.milestone_id == milestone_id,
        )
    )
    media = result.scalar_one_or_none()
    if media is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Media attachment not found",
        )

    storage = get_storage_service()
    try:
        await storage.delete_object(media.storage_key)
    except StorageError:
        logger.error(
            "Failed to delete R2 object %s for media_id=%s; proceeding with DB deletion anyway",
            media.storage_key,
            media_id,
        )

    await db.delete(media)
    await db.commit()
    return {"status": "deleted"}
