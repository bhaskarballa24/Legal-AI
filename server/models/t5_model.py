import logging

try:
    import transformers  # noqa: F401
    t5_available = True
    logging.info("HuggingFace Transformers installed — T5 support available")
except ImportError:
    t5_available = False
    logging.warning("HuggingFace Transformers not installed - T5 simplification disabled")
