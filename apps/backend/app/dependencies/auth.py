"""
Server-side Firebase JWT verification middleware.

Verifies Firebase ID tokens from the Authorization header
and extracts the authenticated user's Firebase UID.

Usage:
    from app.dependencies.auth import get_current_firebase_uid

    @router.get("/protected")
    async def protected_route(firebase_uid: str = Depends(get_current_firebase_uid)):
        ...
"""

import logging
from pathlib import Path

import firebase_admin
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from firebase_admin import auth, credentials
from starlette.concurrency import run_in_threadpool

from app.config import settings

logger = logging.getLogger(__name__)
security = HTTPBearer(auto_error=False)


def initialize_firebase_app() -> firebase_admin.App | None:
    """Initialize the default Firebase app once and return it."""
    try:
        return firebase_admin.get_app()
    except ValueError:
        pass

    is_project_id_placeholder = (
        not settings.firebase_project_id
        or settings.firebase_project_id == "your-firebase-project-id"
    )
    if is_project_id_placeholder and not settings.firebase_service_account_key_path:
        logger.warning(
            "Firebase credentials not configured. Firebase admin SDK will not be initialized."
        )
        return None

    options = (
        {"projectId": settings.firebase_project_id}
        if settings.firebase_project_id
        else None
    )
    key_path = settings.firebase_service_account_key_path

    if not key_path:
        try:
            return firebase_admin.initialize_app(options=options)
        except Exception as exc:
            logger.warning(
                f"Could not initialize Firebase App with default credentials: {exc}"
            )
            return None

    service_account_path = Path(key_path).expanduser()
    if not service_account_path.is_absolute():
        service_account_path = (
            Path(__file__).resolve().parents[2] / service_account_path
        )

    if not service_account_path.is_file():
        raise RuntimeError(
            f"Firebase service account file not found: {service_account_path}"
        )

    credential = credentials.Certificate(str(service_account_path))
    return firebase_admin.initialize_app(credential, options=options)


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


async def get_current_firebase_uid(
    bearer_credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> str:
    """
    Verify the Firebase ID token and return the user's Firebase UID.

    Raises HTTPException 401 if the token is invalid or expired.
    Bypasses authentication only when an explicit "mock-token" is provided
    and Firebase is not fully configured (local dev mode).
    """
    if bearer_credentials is None:
        raise _unauthorized("Bearer token is required")

    token = bearer_credentials.credentials

    # Allow mock-token bypass ONLY when Firebase is not configured (local dev)
    is_project_id_configured = bool(
        settings.firebase_project_id
        and settings.firebase_project_id != "your-firebase-project-id"
    )
    firebase_configured = is_project_id_configured or bool(
        settings.firebase_service_account_key_path
    )
    if token == "mock-token" and not firebase_configured:
        return "mock-user-uid"

    if not firebase_configured:
        raise _unauthorized(
            "Firebase is not configured and the provided token is not a valid mock-token"
        )

    try:
        decoded_token = await run_in_threadpool(
            auth.verify_id_token,
            bearer_credentials.credentials,
        )
        uid = decoded_token.get("uid")
        if not uid:
            raise _unauthorized("Firebase ID token does not contain a user UID")
        return uid
    except HTTPException:
        raise
    except auth.ExpiredIdTokenError as exc:
        raise _unauthorized("Firebase ID token has expired") from exc
    except auth.RevokedIdTokenError as exc:
        raise _unauthorized("Firebase ID token has been revoked") from exc
    except auth.UserDisabledError as exc:
        raise _unauthorized("Firebase user account is disabled") from exc
    except auth.InvalidIdTokenError as exc:
        raise _unauthorized("Invalid Firebase ID token") from exc
    except Exception as exc:
        logger.exception("Firebase ID token verification failed")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service is temporarily unavailable",
        ) from exc
