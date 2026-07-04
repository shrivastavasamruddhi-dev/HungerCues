"""
Test suite for R2 object storage service.

Tests verify that the storage service correctly handles uploads, deletions,
and presigned URL generation for Cloudflare R2 storage.
"""

from io import BytesIO
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import status

from app.services.storage import (
    R2StorageService,
    StorageError,
    get_storage_service,
    storage_http_error,
)


class TestStorageError:
    """Test StorageError exception class."""

    def test_storage_error_is_exception(self):
        """Verify StorageError is an Exception."""
        error = StorageError("Test error")
        assert isinstance(error, Exception)

    def test_storage_error_message(self):
        """Verify StorageError stores message."""
        msg = "Storage operation failed"
        error = StorageError(msg)
        assert str(error) == msg


class TestR2StorageServiceInitialization:
    """Test R2StorageService initialization."""

    def test_r2_storage_service_init(self):
        """Verify R2StorageService initializes with None client."""
        service = R2StorageService()
        assert service._client is None

    def test_r2_storage_service_multiple_instances(self):
        """Verify multiple instances are independent."""
        service1 = R2StorageService()
        service2 = R2StorageService()
        assert service1 is not service2


class TestR2StorageServiceGetClient:
    """Test R2StorageService._get_client method."""

    def test_get_client_missing_r2_endpoint(self):
        """Verify StorageError raised when r2_endpoint is missing."""
        service = R2StorageService()
        with patch("app.services.storage.settings") as mock_settings:
            mock_settings.r2_endpoint = ""
            mock_settings.r2_access_key_id = "key"
            mock_settings.r2_secret_access_key = "secret"
            mock_settings.r2_bucket_name = "bucket"

            with pytest.raises(StorageError) as exc_info:
                service._get_client()

            assert "not configured" in str(exc_info.value).lower()

    def test_get_client_missing_r2_access_key_id(self):
        """Verify StorageError raised when r2_access_key_id is missing."""
        service = R2StorageService()
        with patch("app.services.storage.settings") as mock_settings:
            mock_settings.r2_endpoint = "https://r2.example.com"
            mock_settings.r2_access_key_id = ""
            mock_settings.r2_secret_access_key = "secret"
            mock_settings.r2_bucket_name = "bucket"

            with pytest.raises(StorageError) as exc_info:
                service._get_client()

            assert "not configured" in str(exc_info.value).lower()

    def test_get_client_missing_r2_secret_access_key(self):
        """Verify StorageError raised when r2_secret_access_key is missing."""
        service = R2StorageService()
        with patch("app.services.storage.settings") as mock_settings:
            mock_settings.r2_endpoint = "https://r2.example.com"
            mock_settings.r2_access_key_id = "key"
            mock_settings.r2_secret_access_key = ""
            mock_settings.r2_bucket_name = "bucket"

            with pytest.raises(StorageError) as exc_info:
                service._get_client()

            assert "not configured" in str(exc_info.value).lower()

    def test_get_client_missing_r2_bucket_name(self):
        """Verify StorageError raised when r2_bucket_name is missing."""
        service = R2StorageService()
        with patch("app.services.storage.settings") as mock_settings:
            mock_settings.r2_endpoint = "https://r2.example.com"
            mock_settings.r2_access_key_id = "key"
            mock_settings.r2_secret_access_key = "secret"
            mock_settings.r2_bucket_name = ""

            with pytest.raises(StorageError) as exc_info:
                service._get_client()

            assert "not configured" in str(exc_info.value).lower()

    def test_get_client_caches_client(self):
        """Verify _get_client caches the boto3 client."""
        service = R2StorageService()
        with patch("app.services.storage.settings") as mock_settings:
            mock_settings.r2_endpoint = "https://r2.example.com"
            mock_settings.r2_access_key_id = "key"
            mock_settings.r2_secret_access_key = "secret"
            mock_settings.r2_bucket_name = "bucket"

            with patch("app.services.storage.boto3") as mock_boto3:
                mock_client = MagicMock()
                mock_boto3.client.return_value = mock_client

                client1 = service._get_client()
                client2 = service._get_client()

                assert client1 is client2
                # boto3.client should only be called once due to caching
                mock_boto3.client.assert_called_once()

    def test_get_client_boto3_import_error(self):
        """Verify StorageError raised when boto3 is not installed."""
        service = R2StorageService()
        with patch("app.services.storage.settings") as mock_settings:
            mock_settings.r2_endpoint = "https://r2.example.com"
            mock_settings.r2_access_key_id = "key"
            mock_settings.r2_secret_access_key = "secret"
            mock_settings.r2_bucket_name = "bucket"

            with patch("builtins.__import__", side_effect=ImportError("No module named 'boto3'")):
                # We need to mock the import at the module level
                with patch("app.services.storage.boto3", side_effect=ImportError()):
                    with pytest.raises(StorageError) as exc_info:
                        service._get_client()

                    assert "boto3 is required" in str(exc_info.value).lower()


class TestR2StorageServiceUploadFileobj:
    """Test R2StorageService.upload_fileobj method."""

    @pytest.mark.asyncio
    async def test_upload_fileobj_success(self):
        """Verify successful file upload."""
        service = R2StorageService()
        fileobj = BytesIO(b"test data")

        with patch("app.services.storage.settings") as mock_settings:
            mock_settings.r2_bucket_name = "test-bucket"
            mock_settings.r2_endpoint = "https://r2.example.com"
            mock_settings.r2_access_key_id = "key"
            mock_settings.r2_secret_access_key = "secret"

            mock_client = MagicMock()
            service._client = mock_client

            with patch("app.services.storage.run_in_threadpool", new_callable=AsyncMock) as mock_run:
                mock_run.return_value = None

                await service.upload_fileobj(fileobj, "test-key", "text/plain")

                mock_run.assert_called_once()
                # Verify the call was made with correct arguments
                call_args = mock_run.call_args
                assert call_args[0][0] == mock_client.upload_fileobj

    @pytest.mark.asyncio
    async def test_upload_fileobj_storage_error_re_raised(self):
        """Verify StorageError is re-raised."""
        service = R2StorageService()
        fileobj = BytesIO(b"test data")

        with patch("app.services.storage.run_in_threadpool", new_callable=AsyncMock) as mock_run:
            mock_run.side_effect = StorageError("Config missing")

            with pytest.raises(StorageError):
                await service.upload_fileobj(fileobj, "test-key", "text/plain")

    @pytest.mark.asyncio
    async def test_upload_fileobj_generic_exception_wrapped(self):
        """Verify generic exceptions are wrapped in StorageError."""
        service = R2StorageService()
        fileobj = BytesIO(b"test data")

        with patch("app.services.storage.run_in_threadpool", new_callable=AsyncMock) as mock_run:
            mock_run.side_effect = Exception("Connection failed")

            with pytest.raises(StorageError) as exc_info:
                await service.upload_fileobj(fileobj, "test-key", "text/plain")

            assert "Failed to upload media" in str(exc_info.value)


class TestR2StorageServiceDeleteObject:
    """Test R2StorageService.delete_object method."""

    @pytest.mark.asyncio
    async def test_delete_object_success(self):
        """Verify successful object deletion."""
        service = R2StorageService()

        with patch("app.services.storage.settings") as mock_settings:
            mock_settings.r2_bucket_name = "test-bucket"
            mock_settings.r2_endpoint = "https://r2.example.com"
            mock_settings.r2_access_key_id = "key"
            mock_settings.r2_secret_access_key = "secret"

            mock_client = MagicMock()
            service._client = mock_client

            with patch("app.services.storage.run_in_threadpool", new_callable=AsyncMock) as mock_run:
                mock_run.return_value = None

                await service.delete_object("test-key")

                mock_run.assert_called_once()
                call_args = mock_run.call_args
                assert call_args[0][0] == mock_client.delete_object

    @pytest.mark.asyncio
    async def test_delete_object_storage_error_re_raised(self):
        """Verify StorageError is re-raised."""
        service = R2StorageService()

        with patch("app.services.storage.run_in_threadpool", new_callable=AsyncMock) as mock_run:
            mock_run.side_effect = StorageError("Config missing")

            with pytest.raises(StorageError):
                await service.delete_object("test-key")

    @pytest.mark.asyncio
    async def test_delete_object_generic_exception_wrapped(self):
        """Verify generic exceptions are wrapped in StorageError."""
        service = R2StorageService()

        with patch("app.services.storage.run_in_threadpool", new_callable=AsyncMock) as mock_run:
            mock_run.side_effect = Exception("Connection failed")

            with pytest.raises(StorageError) as exc_info:
                await service.delete_object("test-key")

            assert "Failed to delete media" in str(exc_info.value)


class TestR2StorageServicePresignedURL:
    """Test R2StorageService.create_presigned_download_url method."""

    @pytest.mark.asyncio
    async def test_create_presigned_download_url_success(self):
        """Verify successful presigned URL generation."""
        service = R2StorageService()
        expected_url = "https://r2.example.com/presigned-url"

        with patch("app.services.storage.settings") as mock_settings:
            mock_settings.r2_bucket_name = "test-bucket"

            mock_client = MagicMock()
            service._client = mock_client

            with patch("app.services.storage.run_in_threadpool", new_callable=AsyncMock) as mock_run:
                mock_run.return_value = expected_url

                url = await service.create_presigned_download_url("test-key")

                assert url == expected_url
                mock_run.assert_called_once()
                call_args = mock_run.call_args
                assert call_args[0][0] == mock_client.generate_presigned_url

    @pytest.mark.asyncio
    async def test_create_presigned_download_url_custom_expires(self):
        """Verify presigned URL with custom expiration."""
        service = R2StorageService()
        expected_url = "https://r2.example.com/presigned-url"

        with patch("app.services.storage.settings") as mock_settings:
            mock_settings.r2_bucket_name = "test-bucket"

            mock_client = MagicMock()
            service._client = mock_client

            with patch("app.services.storage.run_in_threadpool", new_callable=AsyncMock) as mock_run:
                mock_run.return_value = expected_url

                url = await service.create_presigned_download_url("test-key", expires_in=3600)

                assert url == expected_url

    @pytest.mark.asyncio
    async def test_create_presigned_download_url_storage_error_re_raised(self):
        """Verify StorageError is re-raised."""
        service = R2StorageService()

        with patch("app.services.storage.run_in_threadpool", new_callable=AsyncMock) as mock_run:
            mock_run.side_effect = StorageError("Config missing")

            with pytest.raises(StorageError):
                await service.create_presigned_download_url("test-key")

    @pytest.mark.asyncio
    async def test_create_presigned_download_url_generic_exception_wrapped(self):
        """Verify generic exceptions are wrapped in StorageError."""
        service = R2StorageService()

        with patch("app.services.storage.run_in_threadpool", new_callable=AsyncMock) as mock_run:
            mock_run.side_effect = Exception("URL generation failed")

            with pytest.raises(StorageError) as exc_info:
                await service.create_presigned_download_url("test-key")

            assert "Failed to create media download URL" in str(exc_info.value)


class TestStorageServiceGetter:
    """Test module-level storage service getter."""

    def test_get_storage_service_returns_instance(self):
        """Verify get_storage_service returns R2StorageService instance."""
        service = get_storage_service()
        assert isinstance(service, R2StorageService)

    def test_get_storage_service_returns_same_instance(self):
        """Verify get_storage_service returns the same singleton instance."""
        service1 = get_storage_service()
        service2 = get_storage_service()
        assert service1 is service2


class TestStorageHttpError:
    """Test storage_http_error helper function."""

    def test_storage_http_error_default_message(self):
        """Verify default error message."""
        error = storage_http_error()
        assert error.status_code == status.HTTP_502_BAD_GATEWAY
        assert error.detail["code"] == "storage_failure"
        assert error.detail["message"] == "Media storage operation failed"

    def test_storage_http_error_custom_message(self):
        """Verify custom error message."""
        custom_msg = "Failed to upload file"
        error = storage_http_error(message=custom_msg)
        assert error.status_code == status.HTTP_502_BAD_GATEWAY
        assert error.detail["code"] == "storage_failure"
        assert error.detail["message"] == custom_msg

    def test_storage_http_error_is_http_exception(self):
        """Verify storage_http_error returns HTTPException."""
        error = storage_http_error()
        assert error.status_code == status.HTTP_502_BAD_GATEWAY
