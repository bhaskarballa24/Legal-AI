import logging
import re
import time

from config.settings import GEMINI_API_KEY, GEMINI_MODEL
from utils.api_logger import log_key_status

try:
    import google.generativeai as genai
except ImportError:
    genai = None
    logging.warning("google-generativeai not installed — AI features disabled")


gemini_client = None
gemini_key_valid = False
active_gemini_model = GEMINI_MODEL
_gemini_retry_after_until = 0.0
_gemini_retry_after_reason = ""
_gemini_disabled = False


def list_available_models() -> list:
    """
    List all available Gemini models.
    Useful for debugging and finding the correct model name.
    
    Returns:
        List of model names (strings)
    """
    if not genai or not GEMINI_API_KEY:
        logging.warning("Cannot list models: genai not available or API key missing")
        return []
    
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        models = list(genai.list_models())
        # Filter to only include models that support generateContent
        available = [
            m.name.replace("models/", "") 
            for m in models 
            if "generateContent" in m.supported_generation_methods
        ]
        return available
    except Exception as e:
        logging.error(f"Failed to list models: {e}")
        return []


def _resolve_model_name(available_models: list) -> str:
    preferred_models = [
        GEMINI_MODEL,
        "gemini-2.0-flash",
        "gemini-2.0-flash-lite",
        "gemini-1.5-flash",
        "gemini-1.5-pro",
    ]

    for candidate in preferred_models:
        if candidate and candidate in available_models:
            return candidate

    return available_models[0] if available_models else GEMINI_MODEL


def get_gemini_model_name() -> str:
    return active_gemini_model


def _extract_retry_delay_seconds(error: Exception) -> int:
    message = str(error or "")
    match = re.search(r"Please retry in\s+(\d+(?:\.\d+)?)s", message, flags=re.IGNORECASE)
    if match:
        return max(1, int(float(match.group(1)) + 0.999))
    return 60


def _is_quota_or_rate_limit_error(error: Exception) -> bool:
    message = str(error or "").lower()
    markers = (
        "resourceexhausted",
        "quota exceeded",
        "rate limit",
        "too many requests",
        "429",
    )
    return any(marker in message for marker in markers)


def _is_invalid_key_error(error: Exception) -> bool:
    message = str(error or "").lower()
    markers = (
        "api_key_invalid",
        "api key not valid",
        "invalid api key",
        "permission denied",
    )
    return any(marker in message for marker in markers)


def register_gemini_failure(error: Exception) -> None:
    global _gemini_retry_after_until, _gemini_retry_after_reason
    global _gemini_disabled, gemini_key_valid

    if _is_invalid_key_error(error):
        _gemini_disabled = True
        gemini_key_valid = False
        _gemini_retry_after_until = 0.0
        _gemini_retry_after_reason = "invalid Gemini API key"
        logging.error("Gemini disabled because the configured API key is invalid.")
        return

    if not _is_quota_or_rate_limit_error(error):
        return

    delay_seconds = _extract_retry_delay_seconds(error)
    _gemini_retry_after_until = time.time() + delay_seconds
    _gemini_retry_after_reason = f"quota/rate limit backoff for {delay_seconds}s"
    logging.warning(
        "Gemini temporarily disabled for %ss after quota/rate-limit failure.",
        delay_seconds,
    )


def gemini_is_available() -> bool:
    if _gemini_disabled:
        return False
    if not gemini_client or not gemini_key_valid:
        return False
    return time.time() >= _gemini_retry_after_until


def get_gemini_status() -> dict:
    retry_after_seconds = max(0, int(_gemini_retry_after_until - time.time() + 0.999))
    return {
        "configured": bool(gemini_client),
        "key_valid": gemini_key_valid,
        "available": gemini_is_available(),
        "model": active_gemini_model,
        "retry_after_seconds": retry_after_seconds,
        "reason": _gemini_retry_after_reason if (retry_after_seconds or _gemini_disabled) else "",
    }


def generate_response(
    prompt: str,
    *,
    system_instruction: str = None,
    max_tokens: int = 1024,
    temperature: float = 0.0,
) -> str:
    """
    Generate a text response using the configured Gemini model.

    Returns the response text, or an empty string on failure.
    """
    if not gemini_is_available():
        logging.warning("Gemini client not available — cannot generate response")
        return ""

    from utils.api_logger import log_request, log_response, log_error

    try:
        model_name = get_gemini_model_name()
        model = gemini_client.GenerativeModel(
            model_name=model_name,
            system_instruction=system_instruction,
        )
        ctx = log_request(
            service="generate_response",
            model=model_name,
            max_tokens=max_tokens,
            temperature=temperature,
        )
        response = model.generate_content(
            prompt,
            generation_config={
                "max_output_tokens": max_tokens,
                "temperature": temperature,
            },
        )
        
        # Handle different response formats from Gemini API
        result = ""
        if hasattr(response, 'text') and response.text:
            result = response.text.strip()
        elif hasattr(response, 'candidates') and response.candidates:
            candidate = response.candidates[0]
            if hasattr(candidate, 'content') and candidate.content:
                parts = candidate.content.parts
                if parts:
                    result = "".join([part.text for part in parts if hasattr(part, 'text')]).strip()

        usage = response.usage_metadata
        log_response(
            ctx=ctx,
            status="success",
            response_chars=len(result),
            prompt_tokens=getattr(usage, "prompt_token_count", None),
            completion_tokens=getattr(usage, "candidates_token_count", None),
            total_tokens=getattr(usage, "total_token_count", None),
        )
        return result
    except Exception as e:
        register_gemini_failure(e)
        log_error(service="generate_response", error=e)
        logging.error(f"Gemini generate_response failed: {e}")
        return ""


if genai and GEMINI_API_KEY:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        available_models = list_available_models()
        gemini_client = genai
        gemini_key_valid = True
        active_gemini_model = _resolve_model_name(available_models)
        logging.info("Gemini active model: %s", active_gemini_model)
        log_key_status(key_present=True, valid=True)
    except Exception as e:
        logging.error(f"Failed to initialize Gemini client: {e}")
        log_key_status(key_present=True, valid=False, error=str(e))
else:
    log_key_status(
        key_present=bool(GEMINI_API_KEY),
        valid=False,
        error="google-generativeai not installed" if not genai else "API key not provided",
    )
