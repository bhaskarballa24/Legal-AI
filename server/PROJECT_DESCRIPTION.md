# Multi-AI Legal Document Analysis System — Full Project Description

## 1. Project Overview

**Multi-AI** is a Flask-based backend system that processes legal documents by extracting text, simplifying complex legal jargon, generating AI-powered summaries, extracting entities, creating semantic embeddings, and providing a chatbot-style Q&A interface — all with full multilingual translation support.

### Key Capabilities

| Feature                        | Description                                                                 |
| ------------------------------ | --------------------------------------------------------------------------- |
| Document Upload & Extraction   | Accepts PDF, DOCX, and TXT files; extracts raw text                         |
| Legal Text Simplification (T5) | Replaces 35+ legal terms with plain-language equivalents using regex rules   |
| AI Summarization               | Generates summary, key points, and entity extraction via OpenAI GPT-4o-mini |
| Entity Extraction              | Identifies acts, sections, parties, and dates from legal documents           |
| Semantic Embeddings            | Generates vector embeddings for document chunks using Sentence Transformers  |
| Chatbot Q&A                    | Answers user questions grounded in the uploaded document context             |
| Multilingual Translation       | Translates all output fields into the selected language in a single API call |
| User Authentication            | JWT-based session management with MongoDB user storage                       |
| Document History               | Stores upload history per user in MongoDB                                    |

---

## 2. Architecture & Folder Structure

```
server/
├── app.py                          # Flask application entry point
├── requirements.txt                # Python dependencies
│
├── config/
│   └── settings.py                 # Environment-based configuration
│
├── database/
│   └── mongo_connection.py         # MongoDB client and collection setup
│
├── models/
│   ├── openai_client.py            # OpenAI API client (singleton)
│   ├── embedding_model.py          # Sentence Transformers model (singleton)
│   └── t5_model.py                 # T5 availability check (HuggingFace Transformers)
│
├── routes/
│   ├── document_routes.py          # /api/upload_summary, /api/document/<id>, /api/history
│   ├── qa_routes.py                # /api/ask
│   ├── auth_routes.py              # Authentication endpoints
│   └── dataset_routes.py           # Dataset management endpoints
│
├── services/
│   ├── extraction_service.py       # Text extraction from PDF/DOCX/TXT
│   ├── simplification_service.py   # Legal text simplification (rule-based, T5-backed)
│   ├── summarization_service.py    # AI summary generation pipeline
│   ├── translation_service.py      # Multilingual translation (single + batch)
│   ├── embedding_service.py        # Embedding generation for text chunks
│   ├── retrieval_service.py        # Semantic similarity search for Q&A
│   └── qa_service.py               # Question answering with document context
│
├── storage/
│   └── document_store.py           # In-memory document store with TTL expiry
│
└── utils/
    ├── text_utils.py               # Text normalization, extractive summary, sampling
    ├── chunking.py                 # Sentence-based text chunking with overlap
    ├── entity_extraction.py        # Regex-based legal entity extraction
    └── security_utils.py           # JWT session and bearer token utilities
```

---

## 3. Processing Pipeline

When a user uploads a document and clicks **Analyze**, the following pipeline executes:

```
Document Upload (PDF / DOCX / TXT)
        │
        ▼
Step 1: Text Extraction           →  extraction_service.py
        │
        ▼
Step 2: Legal Simplification      →  simplification_service.py
        │   (rule-based: "shall" → "must", "lessee" → "tenant", etc.)
        ▼
Step 3: AI Summarization          →  summarization_service.py
        │   ├─ OpenAI GPT-4o-mini  (primary)
        │   └─ Extractive fallback  (if OpenAI unavailable)
        │   Returns: summary, key_points, entities
        ▼
Step 4: Entity Enrichment         →  entity_extraction.py
        │   (regex-based: acts, sections, parties, dates)
        ▼
Step 5: Batch Translation         →  translation_service.py
        │   (all fields in ONE API call if language ≠ English)
        ▼
Step 6: Text Chunking             →  chunking.py
        │   (sentence-based, ~300 chars per chunk)
        ▼
Step 7: Embedding Generation      →  embedding_service.py
        │   (all-MiniLM-L6-v2 via Sentence Transformers)
        ▼
Step 8: Storage                   →  document_store.py + MongoDB
        │
        ▼
    JSON Response to Frontend
```

---

## 4. Detailed Module Descriptions

### 4.1 `app.py` — Application Entry Point

- Creates the Flask app with CORS enabled for all `/api/*` routes.
- Registers four blueprints: `document_bp`, `qa_bp`, `auth_bp`, `dataset_bp`.
- Configures max upload size from `settings.MAX_CONTENT_LENGTH_MB`.
- Logs feature availability on startup: OpenAI, T5, Embeddings, Database.
- Runs on `0.0.0.0:5000`.

### 4.2 `config/settings.py` — Configuration

All settings are loaded from environment variables with sensible defaults:

| Variable                | Default                         | Purpose                       |
| ----------------------- | ------------------------------- | ----------------------------- |
| `MAX_CONTENT_LENGTH_MB` | `64`                            | Max upload file size (MB)     |
| `OPENAI_API_KEY`        | *(required)*                    | OpenAI API authentication     |
| `OPENAI_SUMMARY_MODEL`  | `gpt-4o-mini`                   | Model for summarization       |
| `OPENAI_TRANSLATE_MODEL`| `gpt-4o-mini`                   | Model for translation         |
| `MONGODB_URI`           | `mongodb://localhost:27017`     | MongoDB connection string     |
| `MONGODB_DB_NAME`       | `mutli-ai`                      | Database name                 |
| `MONGODB_TIMEOUT_MS`    | `3000`                          | MongoDB connection timeout    |
| `DOC_TTL_SECONDS`       | `7200` (2 hours)                | In-memory document expiry     |
| `DOC_MAX_ITEMS`         | `20`                            | Max documents in memory       |
| `MAX_TEXT_CHARS`         | `200000`                        | Max extracted text length     |
| `MAX_PDF_PAGES`         | `25`                            | Max PDF pages to extract      |
| `SESSION_TTL_SECONDS`   | `86400` (24 hours)              | User session expiry           |

### 4.3 `models/` — AI Model Initialization

#### `openai_client.py`
- Creates a singleton `OpenAI` client using the API key from settings.
- Exports `openai_client` (or `None` if key is missing / library not installed).

#### `embedding_model.py`
- Loads `all-MiniLM-L6-v2` from Sentence Transformers at startup (singleton).
- Exports `embeddings_available` (bool) and `embeddings_model`.
- Used for semantic search in the Q&A chatbot.

#### `t5_model.py`
- Checks if the `transformers` library is installed.
- Exports `t5_available` (bool) — reported at startup for feature status.
- The T5 model is **not loaded into memory** at startup (to keep startup fast). The simplification service uses a fast rule-based approach instead.

### 4.4 `services/extraction_service.py` — Text Extraction

**Function:** `extract_text_from_file(file_storage) → (text, truncated, reason)`

| File Type | Library     | Behavior                                         |
| --------- | ----------- | ------------------------------------------------ |
| `.txt`    | Built-in    | UTF-8 decode, truncate at `MAX_TEXT_CHARS`        |
| `.pdf`    | PyPDF2      | Page-by-page extraction, max `MAX_PDF_PAGES`     |
| `.docx`   | python-docx | Paragraph-by-paragraph extraction                |
| Other     | Fallback    | Attempts UTF-8 decode                             |

Returns a tuple: `(extracted_text, was_truncated, truncation_reason)`.

### 4.5 `services/simplification_service.py` — Legal Text Simplification

**Function:** `simplify_text(text: str) → str`

Uses **fast regex-based substitution** (executes in < 1ms) with 35+ legal-term mappings:

| Legal Term              | Simplified To              |
| ----------------------- | -------------------------- |
| `shall`                 | `must`                     |
| `hereinafter`           | `from now on`              |
| `notwithstanding`       | `despite`                  |
| `lessee`                | `tenant`                   |
| `lessor`                | `landlord`                 |
| `rental consideration`  | `rent`                     |
| `prior to`              | `before`                   |
| `subsequent to`         | `after`                    |
| `pursuant to`           | `according to`             |
| `in the event that`     | `if`                       |
| `commence`              | `start`                    |
| `terminate`             | `end`                      |
| `remit`                 | `pay`                      |
| `indemnify`             | `compensate`               |
| `null and void`         | `invalid`                  |
| `force majeure`         | `unforeseeable circumstances` |
| `hold harmless`         | `protect from liability`   |
| ... and 18 more         |                            |

**Example:**
- **Input:** `"The lessee shall remit the rental consideration to the lessor prior to the fifth day of each calendar month."`
- **Output:** `"The tenant must pay the rent to the landlord before the fifth day of each month."`

**Why rule-based instead of T5 model inference?**
- `flan-t5-base` and `flan-t5-small` echo input verbatim (not trained for simplification).
- `grammarly/coedit-large` (3.13 GB) works but takes 30–60 seconds per chunk on CPU, causing request timeouts.
- The rule-based approach runs in **< 1ms**, handles common legal jargon accurately, and never blocks the pipeline.
- The T5 infrastructure remains available for offline/batch use.

### 4.6 `services/summarization_service.py` — AI Summarization

**Function:** `generate_summary(text: str, language: str) → Dict`

**Pipeline:**
1. Samples up to 24,000 characters from start/middle/end of document (avoids start-only bias).
2. Runs `simplify_text()` on the sampled text.
3. Sends to OpenAI GPT-4o-mini with structured prompt requesting:
   - Summary (2–3 sentences)
   - 5–7 key points
   - Entities: act name, sections, parties, dates
   - Simplification instruction (replace legal jargon with simple language)
   - Language instruction (respond in selected language)
4. Parses JSON response; enriches entities with local regex extraction as fallback.
5. Calls `batch_translate()` to translate all fields in one API call.

**Fallback:** If OpenAI is unavailable, uses `local_extractive_summary()` (TF-IDF-like scoring).

**Returns:**
```json
{
  "summary": "...",
  "detailedSummary": "...",
  "keyPoints": ["...", "..."],
  "entities": {
    "act": "...",
    "sections": ["..."],
    "parties": ["..."],
    "dates": ["..."]
  }
}
```

### 4.7 `services/translation_service.py` — Multilingual Translation

Three functions:

#### `translate_text(text, language) → str`
- Translates a single string using OpenAI.
- Uses a strict legal translation system prompt with 8 rules:
  1. Output strictly in target language
  2. No English mixing (except proper legal names)
  3. Preserve numbers, section references, act names
  4. No explanations, no summarizing
  5. Return only translated text

#### `force_language(text, language) → str`
- Wrapper: returns text as-is for English, otherwise calls `translate_text()`.
- Used by the Q&A service for single-string translation.

#### `batch_translate(payload, language) → Dict`
- Translates **all fields** of a summary payload in **ONE** API call.
- Builds a numbered map of all strings → sends as a single prompt → parses JSON response → writes translations back into the payload structure.
- Handles: summary, detailedSummary, each key point, act, sections, parties, dates.
- **Performance:** 1 API call (~2s) instead of 15–20 individual calls (~30s).

### 4.8 `services/embedding_service.py` — Semantic Embeddings

**Functions:**
- `generate_embeddings(chunks) → List[List[float]]` — Encodes all text chunks using `all-MiniLM-L6-v2`.
- `embed_query(question) → np.ndarray` — Encodes a single query for similarity search.

### 4.9 `services/retrieval_service.py` — Semantic Search

**Function:** `retrieve_relevant_chunks(question, doc, top_k=3) → str`

- Embeds the user's question.
- Computes cosine similarity against all document chunk embeddings.
- Returns the top-K most relevant chunks as concatenated context.
- Falls back to first 4000 chars if embeddings are unavailable.

### 4.10 `services/qa_service.py` — Chatbot Q&A

**Function:** `answer_question_with_context(question, doc, language, answer_mode) → str`

- Retrieves top-5 relevant chunks via semantic search.
- Sends question + context to OpenAI with strict rules:
  - Answer only from document context
  - Respond in selected language
  - No external knowledge
  - Concise and precise
- Translates the answer via `force_language()`.
- Fallback: extractive summary of relevant chunks.

---

## 5. API Endpoints

### Document Routes (`/api`)

| Method | Endpoint               | Description                                  |
| ------ | ---------------------- | -------------------------------------------- |
| POST   | `/api/upload_summary`  | Upload file → extract → simplify → summarize |
| GET    | `/api/document/<id>`   | Get document metadata                        |
| GET    | `/api/history`         | Get user's upload history                     |
| GET    | `/api/health`          | Health check with feature status              |

### Q&A Routes (`/api`)

| Method | Endpoint    | Description                           |
| ------ | ----------- | ------------------------------------- |
| POST   | `/api/ask`  | Ask a question about uploaded document |

**Request body for `/api/ask`:**
```json
{
  "question": "What is the rent amount?",
  "doc_id": "abc123...",
  "language": "Telugu",
  "answer_mode": "short"
}
```

### Auth Routes (`/api`)

Handles user registration, login, and JWT session management.

---

## 6. Database

### MongoDB Collections

| Collection  | Purpose                         | Key Fields                                |
| ----------- | ------------------------------- | ----------------------------------------- |
| `users`     | User accounts                   | `email` (unique index), password hash     |
| `documents` | Upload history                  | `user_id`, `doc_id`, `filename`, `summary`, `uploaded_at` |

### In-Memory Document Store

- Stores full document data (text, chunks, embeddings) in a Python dict.
- TTL-based expiry (default 2 hours).
- Max 20 documents in memory.
- Used for fast Q&A retrieval without hitting the database.

---

## 7. AI Models Used

| Model                    | Provider             | Purpose                  | Size     |
| ------------------------ | -------------------- | ------------------------ | -------- |
| `gpt-4o-mini`           | OpenAI               | Summarization            | Cloud    |
| `gpt-4o-mini`           | OpenAI               | Translation              | Cloud    |
| `all-MiniLM-L6-v2`      | Sentence Transformers| Semantic embeddings      | ~80 MB   |
| T5 (transformers lib)    | HuggingFace          | Available for offline use| Varies   |

---

## 8. Dependencies

```
flask                  # Web framework
flask-cors             # Cross-origin request support
python-dotenv          # Environment variable loading
openai                 # OpenAI API client
sentence-transformers  # Embedding model (all-MiniLM-L6-v2)
pymongo                # MongoDB driver
PyPDF2                 # PDF text extraction
python-docx            # DOCX text extraction
numpy                  # Numerical operations for embeddings
requests               # HTTP requests
jwt                    # JSON Web Token authentication
transformers           # HuggingFace Transformers (T5 support check)
torch                  # PyTorch (required by transformers)
sentencepiece          # Tokenizer (required by T5)
```

---

## 9. Environment Variables (`.env`)

```env
OPENAI_API_KEY=sk-...
OPENAI_SUMMARY_MODEL=gpt-4o-mini
OPENAI_TRANSLATE_MODEL=gpt-4o-mini
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=mutli-ai
MAX_CONTENT_LENGTH_MB=64
MAX_TEXT_CHARS=200000
MAX_PDF_PAGES=25
DOC_TTL_SECONDS=7200
DOC_MAX_ITEMS=20
SESSION_TTL_SECONDS=86400
```

---

## 10. How to Run

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Create .env file with your OpenAI API key
echo OPENAI_API_KEY=sk-your-key-here > .env

# 3. Start the server
python app.py
```

Server starts on `http://0.0.0.0:5000`.

Startup logs will show:
```
============================================================
Starting Multi-AI Document Backend
============================================================
OpenAI Support: True
T5 Simplification: True
Embeddings Support: True
Database Available: True
Starting server on 0.0.0.0:5000
============================================================
```

---

## 11. Performance Characteristics

| Step                     | Time (approx.)  | Notes                                    |
| ------------------------ | --------------- | ---------------------------------------- |
| Text extraction          | < 1s            | Local processing                         |
| Legal simplification     | < 1ms           | Rule-based regex substitution            |
| AI summarization         | 2–5s            | OpenAI API call                          |
| Batch translation        | 2–3s            | Single OpenAI API call for all fields    |
| Embedding generation     | 1–3s            | Local model inference                    |
| **Total (English)**      | **~5–8s**       |                                          |
| **Total (non-English)**  | **~7–11s**      | +translation step                        |

---

## 12. Error Handling & Fallbacks

| Failure                        | Fallback                                         |
| ------------------------------ | ------------------------------------------------ |
| OpenAI unavailable             | Extractive summary (TF-IDF scoring)              |
| Translation fails              | Returns original English text                    |
| Embeddings model not installed | Q&A uses first 4000 chars of document            |
| MongoDB unavailable            | App still works (no history/auth persistence)    |
| PDF is image-based             | Returns message: "Use OCR tools for scanned PDFs"|
| File too large                 | Returns 413 error with size limit                |
| T5 library not installed       | `t5_available = False`, simplification still runs |
