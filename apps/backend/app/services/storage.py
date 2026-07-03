import logging
from typing import BinaryIO

from fastapi import HTTPException, status
from starlette.concurrency import run_in_threadpool

from app.config import settings

logger = logging.getLogger(__name__)


class StorageError(Exception):
    """Raised when object storage cannot complete an operation."""


class R2StorageService:
    def __init__(self) -> None:
        self._client = None

    def _get_client(self):
        if self._client is not None:
            return self._client

        missing = [
            name
            for name, value in {
                "r2_endpoint": settings.r2_endpoint,
                "r2_access_key_id": settings.r2_access_key_id,
                "r2_secret_access_key": settings.r2_secret_access_key,
                "r2_bucket_name": settings.r2_bucket_name,
            }.items()
            if not value
        ]
        if missing:
            raise StorageError(f"Cloudflare R2 is not configured: {', '.join(missing)}")

        try:
            import boto3
        except ImportError as exc:
            raise StorageError("boto3 is required for Cloudflare R2 storage") from exc

        self._client = boto3.client(
            "s3",
            endpoint_url=settings.r2_endpoint,
            aws_access_key_id=settings.r2_access_key_id,
            aws_secret_access_key=settings.r2_secret_access_key,
            region_name="auto",
        )
        return self._client

    async def upload_fileobj(
        self,
        fileobj: BinaryIO,
        storage_key: str,
        content_type: str,
    ) -> None:
        try:
            await run_in_threadpool(
                self._get_client().upload_fileobj,
                fileobj,
                settings.r2_bucket_name,
                storage_key,
                ExtraArgs={"ContentType": content_type},
            )
        except StorageError:
            raise
        except Exception as exc:
            logger.exception("Failed to upload milestone media to R2")
            raise StorageError("Failed to upload media") from exc

    async def delete_object(self, storage_key: str) -> None:
        try:
            await run_in_threadpool(
                self._get_client().delete_object,
                Bucket=settings.r2_bucket_name,
                Key=storage_key,
            )
        except StorageError:
            raise
        except Exception as exc:
            logger.exception("Failed to delete milestone media from R2")
            raise StorageError("Failed to delete media") from exc

    async def create_presigned_download_url(
        self,
        storage_key: str,
        expires_in: int = 300,
    ) -> str:
        try:
            return await run_in_threadpool(
                self._get_client().generate_presigned_url,
                "get_object",
                Params={"Bucket": settings.r2_bucket_name, "Key": storage_key},
                ExpiresIn=expires_in,
            )
        except StorageError:
            raise
        except Exception as exc:
            logger.exception("Failed to create R2 presigned download URL")
            raise StorageError("Failed to create media download URL") from exc


_storage_service = R2StorageService()


def get_storage_service() -> R2StorageService:
    return _storage_service


def storage_http_error(message: str = "Media storage operation failed") -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail={"code": "storage_failure", "message": message},
    )
