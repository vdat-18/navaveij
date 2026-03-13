"""AI Gateway module for managing pluggable LLM connectivity via OpenAI-compatible API."""

from loguru import logger
from openai import AsyncOpenAI
from src.shared.settings import settings


class AIGateway:
    """Routes inference requests to Gemini or other OpenAI-compatible providers."""

    def __init__(self):
        """Initialize configurations for LLM providers (Cloud or Local)."""
        base_url = settings.llm_base_url.rstrip("/")

        # Specialized logic for Google Gemini OpenAI-compatible endpoint
        if "generativelanguage.googleapis.com" in base_url:
            if "/v1beta/openai" not in base_url:
                if "/v1beta" not in base_url:
                    base_url += "/v1beta/openai"
                elif "/openai" not in base_url:
                    base_url += "/openai"

        # Ensure trailing slash for OpenAI SDK compatibility
        base_url += "/"

        self.client = AsyncOpenAI(
            api_key=settings.llm_api_key,
            base_url=base_url
        )
        self.model_id = settings.llm_model

        logger.info(f"AI Gateway initialized for model: {self.model_id} at {base_url}")

    async def call_model(self, system_prompt: str, user_content: str) -> str:
        """Call the AI model and return the raw string response."""
        logger.info(f"Dispatching inference request to {self.model_id}")

        try:
            # We remove response_format as some Gemini OpenAI proxies have issues with it.
            # We ensure the prompt asks for JSON instead (done in prompts.py).
            response = await self.client.chat.completions.create(
                model=self.model_id,
                messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": user_content}],
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"LLM call failed for model {self.model_id}: {e}")
            raise
