import logging

import numpy as np

from models.embedding_model import embeddings_available
from services.embedding_service import embed_query


def retrieve_relevant_chunk_records(question: str, doc: dict, top_k: int = 5):
    """Return the top matching chunks with indices and scores."""
    if not embeddings_available or not np:
        logging.warning("Embeddings not available, using fallback retrieval.")
        fallback_text = doc.get("cleaned_text", "")[:5000] or doc.get("text", "")[:5000]
        return [{"index": 0, "text": fallback_text, "score": None}] if fallback_text else []

    chunks = doc.get("chunks", [])
    embeddings = doc.get("embeddings", [])

    if not chunks or not embeddings:
        logging.warning("No chunks or embeddings in doc, using fallback retrieval.")
        fallback_text = doc.get("cleaned_text", "")[:5000] or doc.get("text", "")[:5000]
        return [{"index": 0, "text": fallback_text, "score": None}] if fallback_text else []

    try:
        question_embedding = embed_query(question)
        if question_embedding is None:
            logging.warning("Failed to embed question, using fallback retrieval.")
            fallback_text = doc.get("cleaned_text", "")[:5000] or doc.get("text", "")[:5000]
            return [{"index": 0, "text": fallback_text, "score": None}] if fallback_text else []

        embeddings_array = np.array(embeddings, dtype=np.float32)
        question_vector = np.array(question_embedding, dtype=np.float32)

        if embeddings_array.size == 0 or question_vector.size == 0:
            logging.warning("Empty embedding vectors, using fallback retrieval.")
            fallback_text = doc.get("cleaned_text", "")[:5000] or doc.get("text", "")[:5000]
            return [{"index": 0, "text": fallback_text, "score": None}] if fallback_text else []

        doc_norms = np.linalg.norm(embeddings_array, axis=1)
        query_norm = np.linalg.norm(question_vector)
        valid_mask = doc_norms > 0

        if query_norm == 0 or not np.any(valid_mask):
            logging.warning("Zero-norm embedding detected, using fallback retrieval.")
            fallback_text = doc.get("cleaned_text", "")[:5000] or doc.get("text", "")[:5000]
            return [{"index": 0, "text": fallback_text, "score": None}] if fallback_text else []

        similarities = np.full(len(chunks), -np.inf, dtype=np.float32)
        similarities[valid_mask] = (
            embeddings_array[valid_mask] @ question_vector
        ) / (doc_norms[valid_mask] * query_norm)

        top_indices = np.argsort(similarities)[-top_k:][::-1]
        relevant_chunks = [
            {
                "index": int(index),
                "text": chunks[index],
                "score": float(similarities[index]),
            }
            for index in top_indices
            if index < len(chunks) and np.isfinite(similarities[index])
        ]

        if not relevant_chunks:
            logging.warning("No relevant chunks found after similarity scoring.")
            fallback_text = doc.get("cleaned_text", "")[:5000] or doc.get("text", "")[:5000]
            return [{"index": 0, "text": fallback_text, "score": None}] if fallback_text else []

        logging.info(
            "Retrieved %s relevant chunks (top scores: %s)",
            len(relevant_chunks),
            similarities[top_indices],
        )
        return relevant_chunks
    except Exception as e:
        logging.error(f"Error in semantic retrieval: {e}", exc_info=True)
        fallback_text = doc.get("cleaned_text", "")[:5000] or doc.get("text", "")[:5000]
        return [{"index": 0, "text": fallback_text, "score": None}] if fallback_text else []


def retrieve_relevant_chunks(question: str, doc: dict, top_k: int = 5) -> str:
    """
    Retrieve the most relevant text chunks for a question using semantic search.
    """
    records = retrieve_relevant_chunk_records(question, doc, top_k=top_k)
    return "\n\n".join(record["text"] for record in records if record.get("text"))
