import logging
from typing import Callable, Optional

from config.settings import GEMINI_API_KEY, OPENAI_API_KEY
from models.gemini_client import (
    gemini_client,
    gemini_is_available,
    get_gemini_model_name,
    get_gemini_status,
    register_gemini_failure,
)
from models.openai_client import (
    get_openai_model_name,
    get_openai_status,
    openai_client,
    openai_is_available,
    register_openai_failure,
)


def get_primary_provider() -> str:
    # choose the best provider based on availability and key validity
    if gemini_is_available():
        return "gemini"
    if openai_is_available():
        return "openai"
    return "local"


def get_provider_chain() -> list[str]:
    primary = get_primary_provider()
    chain = []

    if primary == "gemini":
        chain.append("gemini")
        if openai_is_available():
            chain.append("openai")
    elif primary == "openai":
        chain.append("openai")
    chain.append("local")

    return chain


def get_provider_status() -> dict:
    primary = get_primary_provider()
    return {
        "primary": primary,
        "gemini": get_gemini_status(),
        "openai": get_openai_status(),
    }


def _generate_with_gemini(
    prompt: str,
    *,
    system_instruction: Optional[str],
    max_tokens: int,
    temperature: float,
) -> str:
    model = gemini_client.GenerativeModel(
        get_gemini_model_name(),
        system_instruction=system_instruction,
    )
    response = model.generate_content(
        prompt,
        generation_config={
            "max_output_tokens": max_tokens,
            "temperature": temperature,
        },
    )
    return (getattr(response, "text", "") or "").strip()


def _generate_with_openai(
    prompt: str,
    *,
    system_instruction: Optional[str],
    max_tokens: int,
    temperature: float,
) -> str:
    messages = []
    if system_instruction:
        messages.append({"role": "system", "content": system_instruction})
    messages.append({"role": "user", "content": prompt})

    response = openai_client.chat.completions.create(
        model=get_openai_model_name(),
        messages=messages,
        max_tokens=max_tokens,
        temperature=temperature,
    )
    message = response.choices[0].message if response.choices else None
    return (getattr(message, "content", "") or "").strip()


def generate_ai_response(
    prompt,
    service: str = "summary",
    *,
    system_instruction: Optional[str] = None,
    max_tokens: int = 1024,
    temperature: float = 0.0,
    local_fallback: Optional[Callable[[], str]] = None,
) -> str:
    provider_chain = get_provider_chain()
    logging.info("Provider chain for service=%s: %s", service, provider_chain)

    for provider in provider_chain:
        logging.info("Trying provider=%s for service=%s", provider, service)

        if provider == "gemini":
            if not gemini_is_available():
                logging.info("Skipping provider=gemini for service=%s because it is unavailable", service)
                continue
            try:
                result = _generate_with_gemini(
                    prompt,
                    system_instruction=system_instruction,
                    max_tokens=max_tokens,
                    temperature=temperature,
                )
                logging.info("Using provider=gemini for service=%s", service)
                print("Using provider: gemini")
                return result
            except Exception as e:
                register_gemini_failure(e)
                logging.warning("Gemini failed for %s: %s", service, e)
                continue

        if provider == "openai":
            if not openai_is_available():
                logging.info("Skipping provider=openai for service=%s because it is unavailable", service)
                continue
            try:
                result = _generate_with_openai(
                    prompt,
                    system_instruction=system_instruction,
                    max_tokens=max_tokens,
                    temperature=temperature,
                )
                logging.info("Using provider=openai for service=%s", service)
                print("Using provider: openai")
                return result
            except Exception as e:
                register_openai_failure(e)
                logging.warning("OpenAI failed for %s: %s", service, e)
                continue

        if provider == "local":
            logging.info("Using provider=local for service=%s", service)
            print("Using provider: local")
            return local_fallback() if callable(local_fallback) else ""

    logging.info("Falling back to local provider for service=%s", service)
    print("Using provider: local")
    if callable(local_fallback):
        result = local_fallback()
        logging.info("Local fallback result length=%s for service=%s", len(result or ""), service)
        return result
    return ""
