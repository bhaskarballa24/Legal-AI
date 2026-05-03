import logging

try:
    from sentence_transformers import SentenceTransformer
    embeddings_available = True
except ImportError:
    SentenceTransformer = None  # type: ignore
    embeddings_available = False
    logging.warning("Sentence Transformers not installed - embeddings disabled")


embeddings_model = None

if embeddings_available and SentenceTransformer is not None:
    try:
        logging.info("Loading Sentence Transformers model...")
        embeddings_model = SentenceTransformer("all-MiniLM-L6-v2")
        logging.info("Embeddings model loaded successfully")
    except Exception as e:
        logging.error(f"Failed to load embeddings model: {e}")
        embeddings_model = None
        embeddings_available = False

