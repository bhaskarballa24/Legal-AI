import logging
from typing import List

import numpy as np

from models.embedding_model import embeddings_available, embeddings_model


def generate_embeddings(chunks: List[str]):
    """
    Generate semantic embeddings for text chunks.

    Returns list of vectors (or empty list if model not available).
    """
    if not embeddings_available or embeddings_model is None or not chunks:
        return []

    try:
        logging.info(f"Generating embeddings for {len(chunks)} chunks...")
        embeddings = embeddings_model.encode(chunks)
        logging.info(f"Generated embeddings: shape {embeddings.shape}")
        return embeddings.tolist()
    except Exception as e:
        logging.error(f"Failed to generate embeddings: {e}")
        return []


def embed_query(question: str):
    """Embed a single query string to a numpy vector."""
    if not embeddings_available or embeddings_model is None:
        return None
    try:
        vec = embeddings_model.encode(question)
        return np.array(vec, dtype=np.float32)
    except Exception as e:
        logging.error(f"Failed to embed query: {e}")
        return None

