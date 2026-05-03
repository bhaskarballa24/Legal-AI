import time
from typing import Optional

from flask import Request

from config import settings


_AUTH_SESSIONS = {}


def cleanup_sessions(now: Optional[float] = None):
    """Remove expired authentication sessions."""
    now = now or time.time()
    expired = [
        token
        for token, meta in _AUTH_SESSIONS.items()
        if now - meta.get("ts", 0) > settings.SESSION_TTL_SECONDS
    ]
    for token in expired:
        _AUTH_SESSIONS.pop(token, None)


def read_bearer_token(request: Request) -> str:
    """Extract Bearer token from Authorization header or request JSON."""
    auth = (request.headers.get("Authorization") or "").strip()
    if auth.lower().startswith("bearer "):
        return auth[7:].strip()
    data = request.get_json(silent=True) or {}
    return (data.get("token") or "").strip()


def create_session(user_id: str) -> str:
    import uuid

    token = uuid.uuid4().hex
    _AUTH_SESSIONS[token] = {"user_id": user_id, "ts": time.time()}
    return token


def get_session(token: str):
    cleanup_sessions()
    return _AUTH_SESSIONS.get(token)


def destroy_session(token: str):
    if token:
        _AUTH_SESSIONS.pop(token, None)

