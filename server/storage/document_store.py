import logging
import time
import uuid

from config import settings


_DOC_STORE = {}


def _cleanup_doc_store(now=None):
    """Remove expired documents from in-memory store and enforce max size."""
    now = now or time.time()
    expired = [
        k
        for k, v in _DOC_STORE.items()
        if now - v.get("ts", 0) > settings.DOC_TTL_SECONDS
    ]
    for k in expired:
        logging.info(f"Removing expired document: {k}")
        _DOC_STORE.pop(k, None)

    # If too many docs in store, remove oldest
    if len(_DOC_STORE) > settings.DOC_MAX_ITEMS:
        sorted_docs = sorted(_DOC_STORE.items(), key=lambda kv: kv[1].get("ts", 0))
        for k, _ in sorted_docs[: len(_DOC_STORE) - settings.DOC_MAX_ITEMS]:
            _DOC_STORE.pop(k, None)


def store_document(
    text,
    summary="",
    chunks=None,
    embeddings=None,
    language="English",
    cleaned_text="",
    entities=None,
):
    """
    Store a document with its metadata, chunks, and embeddings.

    Returns:
        doc_id: Unique document identifier
    """
    _cleanup_doc_store()
    doc_id = uuid.uuid4().hex
    _DOC_STORE[doc_id] = {
        "text": text,
        "summary": summary,
        "chunks": chunks or [],
        "embeddings": embeddings or [],
        "ts": time.time(),
        "language": language,
        "cleaned_text": cleaned_text or text,
        "entities": entities or {},
    }
    logging.info(
        f"Stored document {doc_id} ({len(text)} chars, {len(chunks or [])} chunks)"
    )
    return doc_id


def get_document(doc_id):
    """Retrieve a stored document by ID."""
    if not doc_id:
        return None
    _cleanup_doc_store()
    return _DOC_STORE.get(doc_id)
