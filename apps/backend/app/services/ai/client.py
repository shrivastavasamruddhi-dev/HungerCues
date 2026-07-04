import logging

import httpx
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from app.config import settings

logger = logging.getLogger(__name__)


class GeminiClient:
    """Async HTTP client for interacting with the Gemini 2.5 Flash API."""

    def __init__(self):
        self.api_key = settings.gemini_api_key
        self.base_url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((httpx.HTTPStatusError, httpx.RequestError)),
        reraise=True,
    )
    async def generate_content(self, prompt: str, system_instruction: str | None = None) -> str:
        """Call Gemini API to generate content with retries."""
        if not self.api_key:
            logger.warning("GEMINI_API_KEY is not configured. Returning mock response.")
            return self._get_mock_response(prompt)

        url = f"{self.base_url}?key={self.api_key}"

        # Setup standard Gemini payload structure
        contents = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"responseMimeType": "application/json"},
        }

        if system_instruction:
            contents["systemInstruction"] = {"parts": [{"text": system_instruction}]}

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=contents)
            response.raise_for_status()
            data = response.json()

            try:
                # Extract text response from Gemini's standard schema
                text_response = data["candidates"][0]["content"]["parts"][0]["text"]
                return text_response
            except (KeyError, IndexError) as exc:
                logger.error(f"Failed to parse Gemini API response: {data}")
                raise ValueError("Invalid response format from Gemini API") from exc

    def _get_mock_response(self, prompt: str = "") -> str:
        """Fallback mock response when Gemini API key is missing."""
        import json

        if "Parent's Question" in prompt or "answer" in prompt:
            return json.dumps(
                {
                    "answer": "This is a local mock response because no GEMINI_API_KEY was configured. Please set the GEMINI_API_KEY environment variable in your backend .env file to enable live Gemini answers."
                }
            )
        mock_data = {
            "summary": "This is a placeholder parenting insight since the Gemini API key was not configured. Baby seems to be feeding well and sleeping regularly.",
            "feeding_insights": "Feeding duration and quantity appear normal for this age group. Continue tracking details.",
            "sleep_insights": "Ensure baby sleep sessions match recommended sleep windows. Set a regular nap schedule.",
            "recommendations": [
                "Establish a consistent pre-bedtime routine.",
                "Ensure feedings are evenly spaced throughout the day.",
                "Monitor for hunger cues like rooting or lip-smacking before crying starts.",
            ],
        }
        return json.dumps(mock_data)
