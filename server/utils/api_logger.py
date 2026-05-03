"""
Gemini API Logger
=================
Dedicated logging for Gemini API key validation, requests, and responses.
Logs are written to both the console and server/logs/gemini_api.log.
"""

import logging
import os
import time
from datetime import datetime, timezone
from typing import Any, Dict, Optional

# ---------------------------------------------------------------------------
# Set up a dedicated logger that writes to its own log file
# ---------------------------------------------------------------------------
_LOG_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "logs")
os.makedirs(_LOG_DIR, exist_ok=True)

LOG_FILE = os.path.join(_LOG_DIR, "gemini_api.log")

api_logger = logging.getLogger("gemini_api")
api_logger.setLevel(logging.DEBUG)
api_logger.propagate = False  # don't duplicate into root logger

# File handler – detailed logs
_file_handler = logging.FileHandler(LOG_FILE, encoding="utf-8")
_file_handler.setLevel(logging.DEBUG)
_file_handler.setFormatter(
    logging.Formatter(
        "[%(asctime)s] %(levelname)-8s %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
)
api_logger.addHandler(_file_handler)

# Console handler – summary-level logs
_console_handler = logging.StreamHandler()
_console_handler.setLevel(logging.INFO)
_console_handler.setFormatter(
    logging.Formatter("%(levelname)-8s [Gemini] %(message)s")
)
api_logger.addHandler(_console_handler)


# ---------------------------------------------------------------------------
# Key validation helpers
# ---------------------------------------------------------------------------

def log_key_status(*, key_present: bool, valid: bool, error: Optional[str] = None):
    """Log whether the Gemini API key is present and valid."""
    masked = "****" if key_present else "(empty)"
    if not key_present:
        api_logger.warning("API-KEY  | Key not provided — Gemini features disabled")
    elif valid:
        api_logger.info(f"API-KEY  | Key [{masked}] is VALID ✓")
    else:
        api_logger.error(f"API-KEY  | Key [{masked}] is INVALID ✗ — {error or 'unknown error'}")


# ---------------------------------------------------------------------------
# Request / response logging
# ---------------------------------------------------------------------------

def log_request(
    *,
    service: str,
    model: str,
    endpoint: str = "generateContent",
    messages_count: int = 0,
    max_tokens: Optional[int] = None,
    temperature: Optional[float] = None,
    extra: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Log an outgoing Gemini API request.

    Returns a context dict (pass it to ``log_response`` later).
    """
    ts = datetime.now(timezone.utc).isoformat()
    api_logger.info(
        f"REQUEST  | service={service} model={model} endpoint={endpoint} "
        f"messages={messages_count} max_tokens={max_tokens} temperature={temperature}"
    )
    if extra:
        api_logger.debug(f"REQUEST  | extra={extra}")

    return {"service": service, "model": model, "endpoint": endpoint, "start": time.perf_counter(), "ts": ts}


def log_response(
    *,
    ctx: Dict[str, Any],
    status: str = "success",
    response_chars: int = 0,
    prompt_tokens: Optional[int] = None,
    completion_tokens: Optional[int] = None,
    total_tokens: Optional[int] = None,
    extra: Optional[Dict[str, Any]] = None,
):
    """Log a Gemini API response (or failure)."""
    elapsed_ms = round((time.perf_counter() - ctx["start"]) * 1000)

    token_info = ""
    if total_tokens is not None:
        token_info = (
            f" prompt_tokens={prompt_tokens}"
            f" completion_tokens={completion_tokens}"
            f" total_tokens={total_tokens}"
        )

    api_logger.info(
        f"RESPONSE | service={ctx['service']} status={status} "
        f"response_chars={response_chars} elapsed={elapsed_ms}ms{token_info}"
    )
    if extra:
        api_logger.debug(f"RESPONSE | extra={extra}")


def log_error(*, service: str, error: Exception, ctx: Optional[Dict[str, Any]] = None):
    """Log a Gemini API error."""
    elapsed = ""
    if ctx:
        elapsed_ms = round((time.perf_counter() - ctx["start"]) * 1000)
        elapsed = f" elapsed={elapsed_ms}ms"

    api_logger.error(
        f"ERROR    | service={service} error={type(error).__name__}: {error}{elapsed}"
    )
