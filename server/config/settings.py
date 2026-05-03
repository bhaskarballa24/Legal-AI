import logging
import os

from dotenv import load_dotenv


load_dotenv()

# Flask / uploads
MAX_CONTENT_LENGTH_MB = int(os.getenv("MAX_CONTENT_LENGTH_MB", "64"))

# Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

if not OPENAI_API_KEY:
    logging.warning("No OpenAI API key found - OpenAI features may be disabled")

if not GEMINI_API_KEY:
    logging.warning("No Gemini API key found — GEMINI AI features will be disabled")

# MongoDB
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017").strip()
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "mutli-ai").strip()
MONGODB_TIMEOUT_MS = int(os.getenv("MONGODB_TIMEOUT_MS", "3000"))

# In-memory document store / sessions
DOC_TTL_SECONDS = int(os.getenv("DOC_TTL_SECONDS", "7200"))  # 2 hours
DOC_MAX_ITEMS = int(os.getenv("DOC_MAX_ITEMS", "20"))
MAX_TEXT_CHARS = int(os.getenv("MAX_TEXT_CHARS", "200000"))
MAX_PDF_PAGES = int(os.getenv("MAX_PDF_PAGES", "25"))
SESSION_TTL_SECONDS = int(os.getenv("SESSION_TTL_SECONDS", "864000"))
