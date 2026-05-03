import logging
import re
import time

from config.settings import OPENAI_API_KEY, OPENAI_MODEL

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None
    logging.warning("openai package not installed - OpenAI features disabled")


openai_client = None
openai_key_valid = False
active_openai_model = OPENAI_MODEL
_openai_retry_after_until = 0.0
_openai_retry_after_reason = ""


def get_openai_model_name() -> str:
    return active_openai_model


def _extract_retry_delay_seconds(error: Exception) -> int:
    message = str(error or "")
    match = re.search(r"try again in\s+(\d+(?:\.\d+)?)s", message, flags=re.IGNORECASE)
    if match:
        return max(1, int(float(match.group(1)) + 0.999))
    return 60


def _is_quota_or_rate_limit_error(error: Exception) -> bool:
    message = str(error or "").lower()
    markers = (
        "rate limit",
        "quota",
        "insufficient_quota",
        "too many requests",
        "429",
    )
    return any(marker in message for marker in markers)


def register_openai_failure(error: Exception) -> None:
    global _openai_retry_after_until, _openai_retry_after_reason

    if not _is_quota_or_rate_limit_error(error):
        return

    delay_seconds = _extract_retry_delay_seconds(error)
    _openai_retry_after_until = time.time() + delay_seconds
    _openai_retry_after_reason = f"quota/rate limit backoff for {delay_seconds}s"
    logging.warning(
        "OpenAI temporarily disabled for %ss after quota/rate-limit failure.",
        delay_seconds,
    )


def openai_is_available() -> bool:
    if not openai_client or not openai_key_valid:
        return False
    return time.time() >= _openai_retry_after_until


def get_openai_status() -> dict:
    retry_after_seconds = max(0, int(_openai_retry_after_until - time.time() + 0.999))
    return {
        "configured": bool(openai_client),
        "key_valid": openai_key_valid,
        "available": openai_is_available(),
        "model": active_openai_model,
        "retry_after_seconds": retry_after_seconds,
        "reason": _openai_retry_after_reason if retry_after_seconds else "",
    }


if OpenAI and OPENAI_API_KEY:
    try:
        openai_client = OpenAI(api_key=OPENAI_API_KEY)
        openai_key_valid = True
        logging.info("OpenAI active model: %s", active_openai_model)
    except Exception as e:
        logging.error(f"Failed to initialize OpenAI client: {e}")
else:
    if not OPENAI_API_KEY:
        logging.warning("No OpenAI API key found - OpenAI features disabled")
