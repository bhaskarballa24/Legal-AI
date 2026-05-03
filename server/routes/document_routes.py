import logging
import time
from typing import Any, Dict

from flask import Blueprint, jsonify, request

from database.mongo_connection import MongoClient, get_documents_collection
from services.ai_provider_service import get_provider_status
from services.extraction_service import extract_text_from_file
from services.translation_service import normalize_language, translate_text
from services.embedding_service import generate_embeddings
from services.summarization_service import generate_summary_bundle
from services.simplification_service import simplify_document
from storage.document_store import get_document, store_document
from utils.chunking import clean_document_text, split_into_chunks
from utils.security_utils import get_session, read_bearer_token


document_bp = Blueprint("documents", __name__, url_prefix="/api")


def _translate_entities(entities: Dict[str, Any], language: str) -> Dict[str, Any]:
    entities = entities if isinstance(entities, dict) else {}
    translated = dict(entities)
    translated["act"] = translate_text(str(entities.get("act", "") or ""), language)
    for field in ("sections", "parties", "courts", "dates"):
        values = entities.get(field) or []
        if isinstance(values, list):
            translated[field] = [translate_text(str(value or ""), language) for value in values]
        else:
            translated[field] = []
    return translated


@document_bp.errorhandler(413)
def request_entity_too_large(error):
    from config.settings import MAX_CONTENT_LENGTH_MB

    return jsonify({"error": f"File too large (max {MAX_CONTENT_LENGTH_MB}MB)"}), 413


@document_bp.route("/health", methods=["GET"])
def health():
    """Health check endpoint."""
    from models.embedding_model import embeddings_available
    from database.mongo_connection import MongoClient as DBClient

    translation_status = "unknown"
    try:
        from services.translation_service import _load_model_bundle
        # Test loading a model (Hindi is the first one)
        test_bundle = _load_model_bundle("Hindi")
        translation_status = "available" if test_bundle else "unavailable"
    except Exception as e:
        translation_status = f"error: {str(e)[:50]}"

    provider_status = get_provider_status()

    return (
        jsonify(
            {
                "status": "ok",
                "features": {
                    "gemini": provider_status["gemini"]["available"],
                    "gemini_status": provider_status["gemini"],
                    "openai": provider_status["openai"]["available"],
                    "openai_status": provider_status["openai"],
                    "provider": provider_status["primary"],
                    "embeddings": embeddings_available,
                    "database": DBClient is not None,
                    "translation": translation_status,
                },
            }
        ),
        200,
    )


@document_bp.route("/test_translation", methods=["POST"])
def test_translation():
    """Test translation feature with a sample text."""
    from services.translation_service import translate_text, normalize_language
    
    data = request.get_json() or {}
    text = (data.get("text") or "This is a test document.").strip()
    language = normalize_language((data.get("language") or "Hindi").strip() or "Hindi")

    try:
        translated = translate_text(text, language)
        success = translated != text
        
        return jsonify({
            "original": text,
            "translated": translated,
            "language": language,
            "success": success,
            "message": "Translation successful" if success else "Translation returned original text (may indicate missing dependencies)"
        }), 200
    except Exception as e:
        logging.error(f"Translation test failed: {e}", exc_info=True)
        return jsonify({
            "error": "Translation test failed",
            "details": str(e),
            "text": text,
            "language": language
        }), 500


@document_bp.route("/upload_summary", methods=["POST"])
def upload_summary():
    """
    Upload document → extract text → generate summary → generate simplified text → store with embeddings.
    Requires authentication.
    """
    token = read_bearer_token(request)
    sess = get_session(token) if token else None
    if not sess:
        return jsonify({"error": "Authentication required"}), 401
    user_id = sess.get("user_id")
    if not user_id:
        return jsonify({"error": "Invalid session"}), 401

    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file_obj = request.files["file"]

    try:
        text, truncated, truncate_reason = extract_text_from_file(file_obj)
    except Exception as e:
        logging.error(f"File extraction failed: {e}")
        return jsonify({"error": "Failed to read file", "detail": str(e)}), 500

    if not text:
        reason = truncate_reason or "Could not extract text from file"
        return jsonify({"error": reason}), 400

    language = normalize_language(request.form.get("language", "English") or "English")

    try:
        print("Selected language:", language)

        # Step 1: Generate AI summary and key points in English
        logging.info("Step 1/6: Generating AI summary...")
        summary_bundle = generate_summary_bundle(text)
        summary = summary_bundle.get("summary", "")
        key_points = summary_bundle.get("key_points", [])
        entities = summary_bundle.get("entities", {})

        # Step 2: Generate simplified text in English
        logging.info("Step 2/6: Generating simplified explanation...")
        simplified_text = simplify_document(text, language="English", summary=summary)

        # Step 3: Translate generated outputs only
        logging.info("Step 3/6: Translating generated outputs...")
        translated_summary = translate_text(summary, language)
        translated_simplified_text = translate_text(simplified_text, language)
        translated_key_points = [translate_text(point, language) for point in key_points]
        translated_entities = _translate_entities(entities, language)

        # Step 4: Clean text and split into chunks
        logging.info("Step 4/6: Splitting into chunks...")
        cleaned_text = clean_document_text(text)
        chunks = split_into_chunks(cleaned_text, chunk_size=700, overlap=200)

        # Step 5: Generate embeddings
        logging.info("Step 5/6: Generating embeddings...")
        embeddings = generate_embeddings(chunks)

        # Step 6: Store document
        doc_id = store_document(
            text=text,
            summary=summary,
            chunks=chunks,
            embeddings=embeddings,
            language=language,
            cleaned_text=cleaned_text,
            entities=entities,
        )

        logging.info(
            f"Step 6/6: Stored doc {doc_id} with {len(chunks)} chunks and embeddings"
        )

        # Store document history for the authenticated user
        try:
            if MongoClient is not None:
                coll = get_documents_collection()
                coll.insert_one(
                    {
                        "user_id": user_id,
                        "doc_id": doc_id,
                        "filename": getattr(file_obj, "filename", None),
                        "summary": translated_summary,
                        "uploaded_at": time.time(),
                    }
                )
        except Exception as e:
            logging.warning(f"Failed to store document history: {e}")

        # Prepare original document (first 1500-2000 chars)
        original_document = text[:2000]
        show_more = len(text) > 2000

        return (
            jsonify(
                {
                    "original_document": original_document,
                    "show_more": show_more,
                    "summary": translated_summary,
                    "simplified_text": translated_simplified_text,
                    "simplified_explanation": translated_simplified_text,
                    "key_points": translated_key_points,
                    "entities": translated_entities,
                    "documentId": doc_id,
                    "textChars": len(text),
                    "truncated": truncated,
                    "truncatedReason": truncate_reason,
                    "chunksCount": len(chunks),
                    "embeddingsAvailable": len(embeddings) > 0,
                }
            ),
            200,
        )

    except Exception as e:
        logging.error(f"Summary/embedding generation failed: {e}", exc_info=True)
        return jsonify({"error": "Failed to process document", "detail": str(e)}), 500


@document_bp.route("/document/<doc_id>", methods=["GET"])
def get_document_info(doc_id):
    """Get document metadata (summary, chunks count, embedding status)."""
    doc = get_document(doc_id)
    if not doc:
        return jsonify({"error": "Document not found or expired"}), 404

    return (
        jsonify(
            {
                "doc_id": doc_id,
                "summary": doc.get("summary", ""),
                "chunksCount": len(doc.get("chunks", [])),
                "textLength": len(doc.get("text", "")),
                "language": doc.get("language", "English"),
                "embeddingsAvailable": len(doc.get("embeddings", [])) > 0,
            }
        ),
        200,
    )


@document_bp.route("/history", methods=["GET"])
def history():
    token = read_bearer_token(request)
    sess = get_session(token) if token else None
    if not sess:
        return jsonify({"items": []}), 200
    user_id = sess.get("user_id")
    if not user_id:
        return jsonify({"items": []}), 200
    try:
        if MongoClient is None:
            return jsonify({"items": []}), 200
        coll = get_documents_collection()
        items = []
        cursor = coll.find({"user_id": user_id}).sort("uploaded_at", -1).limit(50)
        for doc in cursor:
            items.append(
                {
                    "doc_id": doc.get("doc_id"),
                    "filename": doc.get("filename"),
                    "summary": doc.get("summary"),
                    "uploaded_at": doc.get("uploaded_at"),
                }
            )
        return jsonify({"items": items}), 200
    except Exception:
        return jsonify({"items": []}), 200


@document_bp.route("/translate", methods=["POST"])
def translate_content():
    """
    Translate a bundle of content fields (summary, key points, etc.) to a target language.
    """
    data = request.get_json() or {}
    content = data.get("content", {})
    language = normalize_language(data.get("language", "English") or "English")

    if not content:
        return jsonify({"error": "No content provided"}), 400

    try:
        summary = content.get("summary", "")
        simplified_explanation = content.get("simplified_explanation", "")
        simplified_text = content.get("simplified_text", "") or simplified_explanation
        key_points = content.get("key_points", [])
        t5_simplified = content.get("t5_simplified", "")
        entities = content.get("entities", {})

        translated_summary = translate_text(summary, language)
        translated_simplified_explanation = translate_text(simplified_text, language)
        translated_key_points = [translate_text(kp, language) for kp in key_points]
        print("Selected language:", language)
        print("Translating T5 summary")
        translated_t5_simplified = translate_text(t5_simplified, language)

        return jsonify({
            "summary": translated_summary,
            "simplified_text": translated_simplified_explanation,
            "simplified_explanation": translated_simplified_explanation,
            "key_points": translated_key_points,
            "t5_simplified": translated_t5_simplified,
            "entities": _translate_entities(entities, language),
            "language": language,
        }), 200

    except Exception as e:
        logging.error(f"Translation failed: {e}", exc_info=True)
        return jsonify({"error": "Failed to translate content", "detail": str(e)}), 500


@document_bp.route("/document/<doc_id>/full", methods=["GET"])
def get_full_document(doc_id):
    """Get the full document text and generate T5 simplified summary."""
    doc = get_document(doc_id)
    if not doc:
        return jsonify({"error": "Document not found or expired"}), 404
    
    full_text = doc.get("text", "")
    language = normalize_language(request.args.get("language", "English") or "English")
    
    # Generate T5 simplified summary
    t5_simplified = ""
    try:
        from models.t5_model import t5_available
        if t5_available:
            from services.simplification_service import generate_t5_simplification
            t5_simplified = generate_t5_simplification(full_text)
            print("Selected language:", language)
            print("Translating T5 summary")
            t5_simplified = translate_text(t5_simplified, language)
    except Exception as e:
        logging.warning(f"T5 simplification failed: {e}")
    
    return jsonify({
        "full_text": full_text,
        "t5_simplified": t5_simplified,
        "text_length": len(full_text),
    }), 200
