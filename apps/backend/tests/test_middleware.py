"""
Test suite for security and rate limit middleware.

Tests verify that middleware correctly adds security headers,
manages rate limits, and attaches request IDs for tracing.
"""

import uuid
from unittest.mock import AsyncMock, patch

import pytest
from starlette.requests import Request
from starlette.responses import Response
from starlette.testclient import TestClient

from app.middleware.rate_limit import (
    AI_LIMIT,
    AUTH_LIMIT,
    GENERAL_LIMIT,
    limiter,
    rate_limit_exceeded_handler,
)
from app.middleware.security import RequestIDMiddleware, SecurityHeadersMiddleware


class TestRateLimitConfiguration:
    """Test rate limit configuration."""

    def test_limiter_is_initialized(self):
        """Verify limiter instance is created."""
        assert limiter is not None

    def test_rate_limit_constants_are_strings(self):
        """Verify rate limit constants are formatted correctly."""
        assert isinstance(GENERAL_LIMIT, str)
        assert isinstance(AI_LIMIT, str)
        assert isinstance(AUTH_LIMIT, str)
        assert "/minute" in GENERAL_LIMIT
        assert "/minute" in AI_LIMIT
        assert "/minute" in AUTH_LIMIT

    def test_rate_limit_exceeded_handler_exists(self):
        """Verify rate limit exceeded handler is defined."""
        assert rate_limit_exceeded_handler is not None

    def test_rate_limits_from_settings(self):
        """Verify rate limits are derived from settings."""
        with patch("app.middleware.rate_limit.settings") as mock_settings:
            mock_settings.is_production = False
            mock_settings.rate_limit_per_minute = 100
            mock_settings.ai_rate_limit_per_minute = 20
            mock_settings.auth_rate_limit_per_minute = 50

            # Re-import to get new values
            from app.middleware.rate_limit import AI_LIMIT, AUTH_LIMIT, GENERAL_LIMIT

            assert "100" in GENERAL_LIMIT
            assert "20" in AI_LIMIT
            assert "50" in AUTH_LIMIT

    def test_storage_uri_development(self):
        """Verify in-memory storage is used in development."""
        with patch("app.middleware.rate_limit.settings") as mock_settings:
            mock_settings.is_production = False
            mock_settings.redis_url = "redis://localhost:6379/0"

            from app.middleware.rate_limit import storage_uri

            # Storage URI should be memory:// for non-production
            assert storage_uri == "memory://"


class TestSecurityHeadersMiddleware:
    """Test SecurityHeadersMiddleware."""

    @pytest.mark.asyncio
    async def test_security_headers_added(self):
        """Verify security headers are added to response."""
        middleware = SecurityHeadersMiddleware(AsyncMock(return_value=Response()))
        request = AsyncMock(spec=Request)

        response = await middleware.dispatch(request, AsyncMock(return_value=Response()))

        assert "Strict-Transport-Security" in response.headers
        assert "X-Content-Type-Options" in response.headers
        assert "X-Frame-Options" in response.headers
        assert "Referrer-Policy" in response.headers
        assert "Content-Security-Policy" in response.headers
        assert "Permissions-Policy" in response.headers

    @pytest.mark.asyncio
    async def test_hsts_header_value(self):
        """Verify HSTS header has correct value."""
        middleware = SecurityHeadersMiddleware(AsyncMock(return_value=Response()))
        request = AsyncMock(spec=Request)

        response = await middleware.dispatch(request, AsyncMock(return_value=Response()))

        hsts = response.headers["Strict-Transport-Security"]
        assert "max-age=31536000" in hsts
        assert "includeSubDomains" in hsts

    @pytest.mark.asyncio
    async def test_x_content_type_options_value(self):
        """Verify X-Content-Type-Options header is set correctly."""
        middleware = SecurityHeadersMiddleware(AsyncMock(return_value=Response()))
        request = AsyncMock(spec=Request)

        response = await middleware.dispatch(request, AsyncMock(return_value=Response()))

        assert response.headers["X-Content-Type-Options"] == "nosniff"

    @pytest.mark.asyncio
    async def test_x_frame_options_value(self):
        """Verify X-Frame-Options header is set to DENY."""
        middleware = SecurityHeadersMiddleware(AsyncMock(return_value=Response()))
        request = AsyncMock(spec=Request)

        response = await middleware.dispatch(request, AsyncMock(return_value=Response()))

        assert response.headers["X-Frame-Options"] == "DENY"

    @pytest.mark.asyncio
    async def test_referrer_policy_value(self):
        """Verify Referrer-Policy header is set correctly."""
        middleware = SecurityHeadersMiddleware(AsyncMock(return_value=Response()))
        request = AsyncMock(spec=Request)

        response = await middleware.dispatch(request, AsyncMock(return_value=Response()))

        assert response.headers["Referrer-Policy"] == "strict-origin-when-cross-origin"

    @pytest.mark.asyncio
    async def test_csp_header_value(self):
        """Verify Content-Security-Policy header is restrictive."""
        middleware = SecurityHeadersMiddleware(AsyncMock(return_value=Response()))
        request = AsyncMock(spec=Request)

        response = await middleware.dispatch(request, AsyncMock(return_value=Response()))

        csp = response.headers["Content-Security-Policy"]
        assert "default-src 'none'" in csp
        assert "frame-ancestors 'none'" in csp

    @pytest.mark.asyncio
    async def test_permissions_policy_value(self):
        """Verify Permissions-Policy disables unused features."""
        middleware = SecurityHeadersMiddleware(AsyncMock(return_value=Response()))
        request = AsyncMock(spec=Request)

        response = await middleware.dispatch(request, AsyncMock(return_value=Response()))

        policy = response.headers["Permissions-Policy"]
        assert "camera=()" in policy
        assert "microphone=()" in policy
        assert "geolocation=()" in policy
        assert "payment=()" in policy

    @pytest.mark.asyncio
    async def test_middleware_preserves_existing_headers(self):
        """Verify middleware doesn't remove existing response headers."""
        base_response = Response()
        base_response.headers["X-Custom-Header"] = "custom-value"

        async def call_next(req):
            return base_response

        middleware = SecurityHeadersMiddleware(AsyncMock())
        request = AsyncMock(spec=Request)

        response = await middleware.dispatch(request, call_next)

        assert "X-Custom-Header" in response.headers
        assert response.headers["X-Custom-Header"] == "custom-value"


class TestRequestIDMiddleware:
    """Test RequestIDMiddleware."""

    @pytest.mark.asyncio
    async def test_request_id_generated_when_missing(self):
        """Verify request ID is generated when not provided."""
        middleware = RequestIDMiddleware(AsyncMock(return_value=Response()))
        request = AsyncMock(spec=Request)
        request.headers = {}
        request.state = type("State", (), {})()

        response = await middleware.dispatch(request, AsyncMock(return_value=Response()))

        assert hasattr(request.state, "request_id")
        assert request.state.request_id is not None
        # Verify it's a valid UUID format
        try:
            uuid.UUID(request.state.request_id)
        except ValueError:
            pytest.fail("request_id is not a valid UUID")

    @pytest.mark.asyncio
    async def test_request_id_from_header_when_provided(self):
        """Verify provided X-Request-ID header is used."""
        provided_id = "test-request-id-123"
        middleware = RequestIDMiddleware(AsyncMock(return_value=Response()))
        request = AsyncMock(spec=Request)
        request.headers = {"X-Request-ID": provided_id}
        request.state = type("State", (), {})()

        response = await middleware.dispatch(request, AsyncMock(return_value=Response()))

        assert request.state.request_id == provided_id

    @pytest.mark.asyncio
    async def test_request_id_added_to_response_header(self):
        """Verify request ID is added to response headers."""
        provided_id = "test-request-id-456"
        middleware = RequestIDMiddleware(AsyncMock(return_value=Response()))
        request = AsyncMock(spec=Request)
        request.headers = {"X-Request-ID": provided_id}
        request.state = type("State", (), {})()

        response = await middleware.dispatch(request, AsyncMock(return_value=Response()))

        assert "X-Request-ID" in response.headers
        assert response.headers["X-Request-ID"] == provided_id

    @pytest.mark.asyncio
    async def test_request_id_unique_when_generated(self):
        """Verify generated request IDs are unique."""
        middleware = RequestIDMiddleware(AsyncMock(return_value=Response()))

        request_ids = set()
        for _ in range(10):
            request = AsyncMock(spec=Request)
            request.headers = {}
            request.state = type("State", (), {})()

            await middleware.dispatch(request, AsyncMock(return_value=Response()))
            request_ids.add(request.state.request_id)

        # All generated IDs should be unique
        assert len(request_ids) == 10

    @pytest.mark.asyncio
    async def test_middleware_calls_next_handler(self):
        """Verify middleware calls the next handler."""
        middleware = RequestIDMiddleware(AsyncMock(return_value=Response()))
        request = AsyncMock(spec=Request)
        request.headers = {}
        request.state = type("State", (), {})()

        call_next = AsyncMock(return_value=Response())
        await middleware.dispatch(request, call_next)

        call_next.assert_called_once_with(request)

    @pytest.mark.asyncio
    async def test_middleware_returns_response_from_next(self):
        """Verify middleware returns response from next handler."""
        expected_response = Response(content="test content")
        middleware = RequestIDMiddleware(AsyncMock(return_value=expected_response))
        request = AsyncMock(spec=Request)
        request.headers = {}
        request.state = type("State", (), {})()

        call_next = AsyncMock(return_value=expected_response)
        response = await middleware.dispatch(request, call_next)

        assert response is expected_response


class TestSecurityHeadersMiddlewareIntegration:
    """Integration tests for SecurityHeadersMiddleware."""

    @pytest.mark.asyncio
    async def test_security_headers_on_all_responses(self):
        """Verify security headers are added to all responses."""
        middleware = SecurityHeadersMiddleware(AsyncMock(return_value=Response()))
        request = AsyncMock(spec=Request)

        for _ in range(5):
            response = await middleware.dispatch(request, AsyncMock(return_value=Response()))
            assert "Strict-Transport-Security" in response.headers
            assert "X-Content-Type-Options" in response.headers
            assert "X-Frame-Options" in response.headers


class TestRequestIDMiddlewareIntegration:
    """Integration tests for RequestIDMiddleware."""

    @pytest.mark.asyncio
    async def test_request_id_lifecycle(self):
        """Verify request ID is maintained throughout request lifecycle."""
        middleware = RequestIDMiddleware(AsyncMock(return_value=Response()))
        request = AsyncMock(spec=Request)
        request.headers = {}
        request.state = type("State", (), {})()

        call_next = AsyncMock(return_value=Response())
        response = await middleware.dispatch(request, call_next)

        # Request should have ID in state
        assert request.state.request_id is not None
        # Response should have ID in header
        assert response.headers["X-Request-ID"] is not None
        # Both should match
        assert response.headers["X-Request-ID"] == request.state.request_id
