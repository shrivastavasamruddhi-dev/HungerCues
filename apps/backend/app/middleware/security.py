"""
Security and observability middleware for the Baby Tracker API.

- SecurityHeadersMiddleware: Adds standard HTTP security headers to every response.
- RequestIDMiddleware: Attaches a unique UUID to every request for end-to-end tracing.
"""

import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Adds HTTP security headers to every response.

    Headers added:
    - Strict-Transport-Security (HSTS): Forces HTTPS for 1 year.
    - X-Content-Type-Options: Prevents MIME-sniffing.
    - X-Frame-Options: Prevents clickjacking.
    - Referrer-Policy: Controls referrer information sent with requests.
    - Content-Security-Policy: Restricts resource loading to same origin.
    - Permissions-Policy: Disables unused browser features.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)

        # Enforce HTTPS for 1 year (only meaningful in production behind HTTPS)
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains"
        )

        # Prevent MIME-type sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"

        # Prevent this page from being framed (clickjacking protection)
        response.headers["X-Frame-Options"] = "DENY"

        # Control referrer information
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Content Security Policy — API only returns JSON, so restrict everything
        response.headers["Content-Security-Policy"] = (
            "default-src 'none'; frame-ancestors 'none';"
        )

        # Disable unused browser features
        response.headers["Permissions-Policy"] = (
            "camera=(), microphone=(), geolocation=(), payment=()"
        )

        return response


class RequestIDMiddleware(BaseHTTPMiddleware):
    """
    Attaches a unique request ID to every request and response.

    The ID is read from the incoming `X-Request-ID` header (if provided by a
    proxy/client), or a new UUID4 is generated. The ID is available on
    `request.state.request_id` for use in log lines throughout the request lifecycle.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        request.state.request_id = request_id

        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response
