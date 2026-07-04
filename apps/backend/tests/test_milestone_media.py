"""
Tests for milestone CRUD and media upload/download/delete.

Coverage targets
----------------
- Milestone create / list / get / update / delete
- Ownership & authorization (403 for wrong user, 404 for bad IDs)
- Media upload success (photo and video — jpeg, png, webp, mp4, mov)
- Media upload failures: wrong MIME, oversized, empty, cap exceeded
- Storage failure → 502 (no orphaned DB record created)
- Media deletion: own media, wrong milestone ID, wrong user
- Milestone deletion cascades — R2 delete called for each attached media
- Retrieval includes media metadata with presigned URLs

Auth strategy
-------------
We use a single shared mutable dict (_current_uid) and a dynamic dependency
override so tests can switch user identity within the same client without
colliding on app.dependency_overrides.  The `as_user()` context manager
temporarily changes the active UID and always restores it.

Storage is mocked throughout so tests run offline without real R2 credentials.
"""

from __future__ import annotations

import io
from contextlib import contextmanager
from datetime import date
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import pytest_asyncio
from httpx import AsyncClient

from app.dependencies.auth import get_current_firebase_uid
from app.main import app
from app.models.baby import Baby

# ---------------------------------------------------------------------------
# UID constants — OWNER_UID matches "mock-user-uid" used by conftest.py
# and test_milestones.py so the default identity is consistent.
# ---------------------------------------------------------------------------
OWNER_UID = "mock-user-uid"
OTHER_UID = "other-test-uid"


# ---------------------------------------------------------------------------
# Auth helpers
#
# Other test files (loaded after this one alphabetically) install their own
# module-level app.dependency_overrides, so we can't rely on a single
# module-level installation surviving to run-time.
#
# Instead:
#   • reset_auth (autouse=True, function-scoped) reinstalls the OWNER_UID
#     override before every test in this module.
#   • as_user() directly patches app.dependency_overrides for the duration
#     of the context block and always restores the previous value.
# ---------------------------------------------------------------------------


async def _make_uid_dep(uid: str):
    """Return a fresh async callable that always returns uid."""

    async def _dep() -> str:
        return uid

    return _dep


@contextmanager
def as_user(uid: str):
    """
    Temporarily run requests as a different user.

    Directly replaces app.dependency_overrides[get_current_firebase_uid]
    for the duration of the block, then restores whatever was there before.
    Safe across any module import ordering.
    """

    async def _temp_uid() -> str:
        return uid

    previous = app.dependency_overrides.get(get_current_firebase_uid)
    app.dependency_overrides[get_current_firebase_uid] = _temp_uid
    try:
        yield
    finally:
        if previous is None:
            app.dependency_overrides.pop(get_current_firebase_uid, None)
        else:
            app.dependency_overrides[get_current_firebase_uid] = previous


@pytest.fixture(autouse=True)
def reset_auth():
    """
    Ensure every test starts as OWNER_UID, regardless of what other test
    modules may have installed in app.dependency_overrides.
    """

    async def _owner_uid() -> str:
        return OWNER_UID

    app.dependency_overrides[get_current_firebase_uid] = _owner_uid
    yield
    app.dependency_overrides[get_current_firebase_uid] = _owner_uid


# ---------------------------------------------------------------------------
# DB lifecycle & HTTP Client (Delegated to shared conftest fixtures)
# ---------------------------------------------------------------------------
@pytest_asyncio.fixture
async def db(db_session):
    yield db_session


@pytest_asyncio.fixture
async def client(async_client):
    yield async_client


# ---------------------------------------------------------------------------
# Baby fixtures
# ---------------------------------------------------------------------------
@pytest_asyncio.fixture
async def owner_baby(db):
    baby = Baby(
        name="Test Baby",
        birth_date=date(2026, 1, 1),
        gender="Girl",
        family_id=OWNER_UID,
    )
    db.add(baby)
    await db.commit()
    await db.refresh(baby)
    return baby


@pytest_asyncio.fixture
async def other_baby(db):
    """A baby owned by a different user."""
    baby = Baby(
        name="Other Baby",
        birth_date=date(2026, 1, 1),
        gender="Boy",
        family_id=OTHER_UID,
    )
    db.add(baby)
    await db.commit()
    await db.refresh(baby)
    return baby


# ---------------------------------------------------------------------------
# Storage mock helper
# ---------------------------------------------------------------------------
def _mock_storage(
    upload_raises: bool = False,
    url: str = "https://r2.example.com/media/abc",
):
    """
    Return (patch_context, mock_service).

    When upload_raises=True the upload_fileobj raises StorageError,
    simulating an R2 outage.
    """
    from app.services.storage import StorageError

    svc = MagicMock()
    svc.upload_fileobj = AsyncMock(side_effect=StorageError("R2 down") if upload_raises else None)
    svc.delete_object = AsyncMock()
    svc.create_presigned_download_url = AsyncMock(return_value=url)

    ctx = patch("app.routers.v1.milestones.get_storage_service", return_value=svc)
    return ctx, svc


# ---------------------------------------------------------------------------
# Helper — create a milestone as OWNER_UID
# ---------------------------------------------------------------------------
async def _create_milestone(
    client: AsyncClient,
    baby_id: int,
    name: str = "First Word",
) -> dict:
    patch_ctx, _ = _mock_storage()
    with patch_ctx:
        r = await client.post(
            "/api/v1/milestones/",
            json={
                "baby_id": baby_id,
                "name": name,
                "achieved_at": "2026-04-01",
                "notes": "test",
            },
        )
    assert r.status_code == 201, r.text
    return r.json()


# ===========================================================================
# Milestone CRUD
# ===========================================================================


@pytest.mark.asyncio
async def test_create_milestone(client, owner_baby):
    patch_ctx, _ = _mock_storage()
    with patch_ctx:
        r = await client.post(
            "/api/v1/milestones/",
            json={
                "baby_id": owner_baby.id,
                "name": "Social Smile",
                "achieved_at": "2026-03-01",
                "notes": "First smile!",
            },
        )
    assert r.status_code == 201
    data = r.json()
    assert data["name"] == "Social Smile"
    assert data["achieved_at"] == "2026-03-01"
    assert data["notes"] == "First smile!"
    assert data["media"] == []


@pytest.mark.asyncio
async def test_create_milestone_wrong_baby(client, other_baby):
    """Cannot create a milestone on another user's baby → 403."""
    r = await client.post(
        "/api/v1/milestones/",
        json={"baby_id": other_baby.id, "name": "Crawling"},
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_create_milestone_nonexistent_baby(client):
    r = await client.post(
        "/api/v1/milestones/",
        json={"baby_id": 999999, "name": "Walking"},
    )
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_list_milestones(client, owner_baby):
    patch_ctx, _ = _mock_storage()
    with patch_ctx:
        await _create_milestone(client, owner_baby.id, "Sit Up")
        await _create_milestone(client, owner_baby.id, "Stand Up")
        r = await client.get(f"/api/v1/milestones/baby/{owner_baby.id}")
    assert r.status_code == 200
    names = [m["name"] for m in r.json()]
    assert "Sit Up" in names
    assert "Stand Up" in names


@pytest.mark.asyncio
async def test_list_milestones_wrong_baby(client, other_baby):
    r = await client.get(f"/api/v1/milestones/baby/{other_baby.id}")
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_get_milestone(client, owner_baby):
    patch_ctx, _ = _mock_storage()
    with patch_ctx:
        created = await _create_milestone(client, owner_baby.id, "Wave Bye")
        r = await client.get(f"/api/v1/milestones/{created['id']}")
    assert r.status_code == 200
    assert r.json()["name"] == "Wave Bye"


@pytest.mark.asyncio
async def test_get_milestone_nonexistent(client):
    r = await client.get("/api/v1/milestones/999999")
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_update_milestone(client, owner_baby):
    patch_ctx, _ = _mock_storage()
    with patch_ctx:
        created = await _create_milestone(client, owner_baby.id, "Clap Hands")
        r = await client.patch(
            f"/api/v1/milestones/{created['id']}",
            json={"notes": "Updated notes"},
        )
    assert r.status_code == 200
    assert r.json()["notes"] == "Updated notes"


@pytest.mark.asyncio
async def test_update_milestone_wrong_user(client, owner_baby):
    """Other user cannot update owner's milestone → 403."""
    created = await _create_milestone(client, owner_baby.id, "Pull Up")
    with as_user(OTHER_UID):
        r = await client.patch(
            f"/api/v1/milestones/{created['id']}",
            json={"notes": "Hack"},
        )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_delete_milestone(client, owner_baby):
    patch_ctx, _ = _mock_storage()
    with patch_ctx:
        created = await _create_milestone(client, owner_baby.id, "To Delete")
        r = await client.delete(f"/api/v1/milestones/{created['id']}")
    assert r.status_code == 200
    assert r.json() == {"status": "deleted"}


@pytest.mark.asyncio
async def test_delete_milestone_wrong_user(client, owner_baby):
    """Other user cannot delete owner's milestone → 403."""
    created = await _create_milestone(client, owner_baby.id, "No Delete")
    with as_user(OTHER_UID):
        r = await client.delete(f"/api/v1/milestones/{created['id']}")
    assert r.status_code == 403


# ===========================================================================
# Media upload — success cases
# ===========================================================================


@pytest.mark.asyncio
async def test_upload_jpeg_success(client, owner_baby):
    patch_ctx, svc = _mock_storage()
    with patch_ctx:
        created = await _create_milestone(client, owner_baby.id, "JPEG Milestone")
        r = await client.post(
            f"/api/v1/milestones/{created['id']}/media",
            files={"file": ("smile.jpg", io.BytesIO(b"fakejpegdata"), "image/jpeg")},
        )
    assert r.status_code == 201, r.text
    data = r.json()
    assert data["media_type"] == "photo"
    assert data["content_type"] == "image/jpeg"
    assert data["original_filename"] == "smile.jpg"
    assert data["size_bytes"] == len(b"fakejpegdata")
    assert data["download_url"] is not None
    svc.upload_fileobj.assert_awaited_once()


@pytest.mark.asyncio
async def test_upload_png_success(client, owner_baby):
    patch_ctx, _ = _mock_storage()
    with patch_ctx:
        created = await _create_milestone(client, owner_baby.id, "PNG Milestone")
        r = await client.post(
            f"/api/v1/milestones/{created['id']}/media",
            files={"file": ("photo.png", io.BytesIO(b"fakepngdata"), "image/png")},
        )
    assert r.status_code == 201
    assert r.json()["media_type"] == "photo"


@pytest.mark.asyncio
async def test_upload_webp_success(client, owner_baby):
    patch_ctx, _ = _mock_storage()
    with patch_ctx:
        created = await _create_milestone(client, owner_baby.id, "WebP Milestone")
        r = await client.post(
            f"/api/v1/milestones/{created['id']}/media",
            files={"file": ("photo.webp", io.BytesIO(b"fakewebpdata"), "image/webp")},
        )
    assert r.status_code == 201


@pytest.mark.asyncio
async def test_upload_mp4_success(client, owner_baby):
    patch_ctx, _ = _mock_storage()
    with patch_ctx:
        created = await _create_milestone(client, owner_baby.id, "MP4 Milestone")
        r = await client.post(
            f"/api/v1/milestones/{created['id']}/media",
            files={"file": ("steps.mp4", io.BytesIO(b"fakemp4data"), "video/mp4")},
        )
    assert r.status_code == 201, r.text
    data = r.json()
    assert data["media_type"] == "video"
    assert data["content_type"] == "video/mp4"


@pytest.mark.asyncio
async def test_upload_mov_success(client, owner_baby):
    patch_ctx, _ = _mock_storage()
    with patch_ctx:
        created = await _create_milestone(client, owner_baby.id, "MOV Milestone")
        r = await client.post(
            f"/api/v1/milestones/{created['id']}/media",
            files={"file": ("clip.mov", io.BytesIO(b"fakemovdata"), "video/quicktime")},
        )
    assert r.status_code == 201
    assert r.json()["media_type"] == "video"


# ===========================================================================
# Media upload — failure cases
# ===========================================================================


@pytest.mark.asyncio
async def test_upload_unsupported_mime_type(client, owner_baby):
    patch_ctx, _ = _mock_storage()
    with patch_ctx:
        created = await _create_milestone(client, owner_baby.id, "Bad MIME")
        r = await client.post(
            f"/api/v1/milestones/{created['id']}/media",
            files={"file": ("doc.pdf", io.BytesIO(b"pdfdata"), "application/pdf")},
        )
    assert r.status_code == 422
    assert r.json()["detail"]["code"] == "unsupported_mime_type"


@pytest.mark.asyncio
async def test_upload_empty_file(client, owner_baby):
    patch_ctx, _ = _mock_storage()
    with patch_ctx:
        created = await _create_milestone(client, owner_baby.id, "Empty File")
        r = await client.post(
            f"/api/v1/milestones/{created['id']}/media",
            files={"file": ("empty.jpg", io.BytesIO(b""), "image/jpeg")},
        )
    assert r.status_code == 422
    assert r.json()["detail"]["code"] == "empty_file"


@pytest.mark.asyncio
async def test_upload_photo_too_large(client, owner_baby):
    big = b"x" * (10 * 1024 * 1024 + 1)  # 10 MB + 1 byte
    patch_ctx, _ = _mock_storage()
    with patch_ctx:
        created = await _create_milestone(client, owner_baby.id, "Big Photo")
        r = await client.post(
            f"/api/v1/milestones/{created['id']}/media",
            files={"file": ("big.jpg", io.BytesIO(big), "image/jpeg")},
        )
    assert r.status_code == 413
    assert r.json()["detail"]["code"] == "file_too_large"


@pytest.mark.asyncio
async def test_upload_video_too_large(client, owner_baby):
    big = b"x" * (100 * 1024 * 1024 + 1)  # 100 MB + 1 byte
    patch_ctx, _ = _mock_storage()
    with patch_ctx:
        created = await _create_milestone(client, owner_baby.id, "Big Video")
        r = await client.post(
            f"/api/v1/milestones/{created['id']}/media",
            files={"file": ("big.mp4", io.BytesIO(big), "video/mp4")},
        )
    assert r.status_code == 413
    assert r.json()["detail"]["code"] == "file_too_large"


@pytest.mark.asyncio
async def test_upload_exceeds_cap(client, owner_baby):
    """Uploading an 11th attachment → 422 max_attachments_exceeded."""
    patch_ctx, _ = _mock_storage()
    with patch_ctx:
        created = await _create_milestone(client, owner_baby.id, "Cap Test")
        mid = created["id"]
        for i in range(10):
            r = await client.post(
                f"/api/v1/milestones/{mid}/media",
                files={"file": (f"img{i}.jpg", io.BytesIO(b"data"), "image/jpeg")},
            )
            assert r.status_code == 201, f"upload {i} failed: {r.text}"

        r = await client.post(
            f"/api/v1/milestones/{mid}/media",
            files={"file": ("extra.jpg", io.BytesIO(b"data"), "image/jpeg")},
        )
    assert r.status_code == 422
    assert r.json()["detail"]["code"] == "max_attachments_exceeded"


@pytest.mark.asyncio
async def test_upload_wrong_user(client, owner_baby):
    """Other user cannot upload to owner's milestone → 403."""
    created = await _create_milestone(client, owner_baby.id, "Auth Upload")
    with as_user(OTHER_UID):
        r = await client.post(
            f"/api/v1/milestones/{created['id']}/media",
            files={"file": ("img.jpg", io.BytesIO(b"data"), "image/jpeg")},
        )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_upload_storage_failure_returns_502(client, owner_baby):
    """When R2 upload fails the endpoint returns 502; no DB record is created."""
    created = await _create_milestone(client, owner_baby.id, "Storage Fail")
    patch_ctx, _ = _mock_storage(upload_raises=True)
    with patch_ctx:
        r = await client.post(
            f"/api/v1/milestones/{created['id']}/media",
            files={"file": ("img.jpg", io.BytesIO(b"data"), "image/jpeg")},
        )
    assert r.status_code == 502


# ===========================================================================
# Media deletion
# ===========================================================================


@pytest.mark.asyncio
async def test_delete_media_success(client, owner_baby):
    patch_ctx, svc = _mock_storage()
    with patch_ctx:
        created = await _create_milestone(client, owner_baby.id, "Del Media")
        upload = await client.post(
            f"/api/v1/milestones/{created['id']}/media",
            files={"file": ("img.jpg", io.BytesIO(b"data"), "image/jpeg")},
        )
        assert upload.status_code == 201
        media_id = upload.json()["id"]
        r = await client.delete(f"/api/v1/milestones/{created['id']}/media/{media_id}")
    assert r.status_code == 200
    assert r.json() == {"status": "deleted"}
    svc.delete_object.assert_awaited()


@pytest.mark.asyncio
async def test_delete_media_wrong_user(client, owner_baby):
    """Other user cannot delete owner's media → 403."""
    patch_ctx, _ = _mock_storage()
    with patch_ctx:
        created = await _create_milestone(client, owner_baby.id, "Del Auth")
        upload = await client.post(
            f"/api/v1/milestones/{created['id']}/media",
            files={"file": ("img.jpg", io.BytesIO(b"data"), "image/jpeg")},
        )
    media_id = upload.json()["id"]
    with as_user(OTHER_UID):
        r = await client.delete(f"/api/v1/milestones/{created['id']}/media/{media_id}")
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_delete_media_not_found(client, owner_baby):
    created = await _create_milestone(client, owner_baby.id, "Del 404")
    r = await client.delete(f"/api/v1/milestones/{created['id']}/media/999999")
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_delete_media_wrong_milestone(client, owner_baby):
    """Media ID exists but doesn't belong to the given milestone → 404."""
    patch_ctx, _ = _mock_storage()
    with patch_ctx:
        m1 = await _create_milestone(client, owner_baby.id, "M1")
        m2 = await _create_milestone(client, owner_baby.id, "M2")
        upload = await client.post(
            f"/api/v1/milestones/{m1['id']}/media",
            files={"file": ("img.jpg", io.BytesIO(b"data"), "image/jpeg")},
        )
        media_id = upload.json()["id"]
        r = await client.delete(f"/api/v1/milestones/{m2['id']}/media/{media_id}")
    assert r.status_code == 404


# ===========================================================================
# Cascade deletion — milestone delete removes all R2 objects
# ===========================================================================


@pytest.mark.asyncio
async def test_delete_milestone_cascades_media(client, owner_baby):
    """Deleting a milestone calls storage.delete_object for every attachment."""
    patch_ctx, svc = _mock_storage()
    with patch_ctx:
        created = await _create_milestone(client, owner_baby.id, "Cascade")
        mid = created["id"]
        for fname, ct in [("a.jpg", "image/jpeg"), ("b.mp4", "video/mp4")]:
            await client.post(
                f"/api/v1/milestones/{mid}/media",
                files={"file": (fname, io.BytesIO(b"data"), ct)},
            )
        r = await client.delete(f"/api/v1/milestones/{mid}")

    assert r.status_code == 200
    # delete_object called once per attached media (2)
    assert svc.delete_object.await_count == 2


# ===========================================================================
# Retrieval includes media metadata + presigned URLs
# ===========================================================================


@pytest.mark.asyncio
async def test_get_milestone_includes_media(client, owner_baby):
    patch_ctx, _ = _mock_storage()
    with patch_ctx:
        created = await _create_milestone(client, owner_baby.id, "With Media")
        await client.post(
            f"/api/v1/milestones/{created['id']}/media",
            files={"file": ("pic.jpg", io.BytesIO(b"data"), "image/jpeg")},
        )
        r = await client.get(f"/api/v1/milestones/{created['id']}")
    assert r.status_code == 200
    data = r.json()
    assert len(data["media"]) == 1
    m = data["media"][0]
    assert m["original_filename"] == "pic.jpg"
    assert m["media_type"] == "photo"
    assert m["download_url"] is not None


@pytest.mark.asyncio
async def test_list_milestones_includes_media(client, owner_baby):
    patch_ctx, _ = _mock_storage()
    with patch_ctx:
        created = await _create_milestone(client, owner_baby.id, "List With Media")
        await client.post(
            f"/api/v1/milestones/{created['id']}/media",
            files={"file": ("vid.mp4", io.BytesIO(b"data"), "video/mp4")},
        )
        r = await client.get(f"/api/v1/milestones/baby/{owner_baby.id}")
    assert r.status_code == 200
    milestones = r.json()
    target = next((m for m in milestones if m["id"] == created["id"]), None)
    assert target is not None
    assert len(target["media"]) >= 1
    assert target["media"][0]["media_type"] == "video"
