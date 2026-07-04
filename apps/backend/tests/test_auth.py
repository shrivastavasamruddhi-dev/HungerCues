import asyncio
import unittest
from unittest.mock import AsyncMock, patch

from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from app.dependencies.auth import (
    get_current_firebase_uid,
    initialize_firebase_app,
    settings,
)


class FirebaseInitializationTests(unittest.TestCase):
    @patch("app.dependencies.auth.firebase_admin.initialize_app")
    @patch("app.dependencies.auth.firebase_admin.get_app")
    def test_initializes_with_application_default_credentials(
        self,
        get_app,
        initialize_app,
    ):
        get_app.side_effect = ValueError
        initialize_app.return_value = object()

        with (
            patch.object(settings, "firebase_project_id", "baby-tracker"),
            patch.object(settings, "firebase_service_account_key_path", ""),
        ):
            app = initialize_firebase_app()

        self.assertIs(app, initialize_app.return_value)
        initialize_app.assert_called_once_with(options={"projectId": "baby-tracker"})

    @patch("app.dependencies.auth.firebase_admin.initialize_app")
    @patch("app.dependencies.auth.firebase_admin.get_app")
    def test_rejects_missing_configured_service_account_file(
        self,
        get_app,
        initialize_app,
    ):
        get_app.side_effect = ValueError

        with (
            patch.object(settings, "firebase_service_account_key_path", "missing.json"),
            self.assertRaisesRegex(
                RuntimeError, "Firebase service account file not found"
            ),
        ):
            initialize_firebase_app()

        initialize_app.assert_not_called()


class FirebaseTokenVerificationTests(unittest.TestCase):
    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials="token")

    def setUp(self):
        self.patcher = patch.object(settings, "firebase_project_id", "test-project")
        self.patcher.start()

    def tearDown(self):
        self.patcher.stop()

    def test_requires_bearer_token(self):
        with self.assertRaises(HTTPException) as raised:
            asyncio.run(get_current_firebase_uid(None))

        self.assertEqual(raised.exception.status_code, 401)
        self.assertEqual(raised.exception.headers, {"WWW-Authenticate": "Bearer"})

    @patch("app.dependencies.auth.run_in_threadpool", new_callable=AsyncMock)
    def test_returns_uid_from_verified_token(self, run_in_threadpool):
        run_in_threadpool.return_value = {"uid": "firebase-user-id"}

        uid = asyncio.run(get_current_firebase_uid(self.credentials))

        self.assertEqual(uid, "firebase-user-id")

    @patch("app.dependencies.auth.run_in_threadpool", new_callable=AsyncMock)
    def test_rejects_token_without_uid(self, run_in_threadpool):
        run_in_threadpool.return_value = {}

        with self.assertRaises(HTTPException) as raised:
            asyncio.run(get_current_firebase_uid(self.credentials))

        self.assertEqual(raised.exception.status_code, 401)

    @patch("app.dependencies.auth.run_in_threadpool", new_callable=AsyncMock)
    def test_reports_unexpected_verification_failure_as_unavailable(
        self,
        run_in_threadpool,
    ):
        run_in_threadpool.side_effect = RuntimeError("certificate server unavailable")

        with self.assertRaises(HTTPException) as raised:
            asyncio.run(get_current_firebase_uid(self.credentials))

        self.assertEqual(raised.exception.status_code, 503)
        self.assertNotIn("certificate server", raised.exception.detail)


if __name__ == "__main__":
    unittest.main()
