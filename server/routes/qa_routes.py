from flask import Blueprint, jsonify, request

from services.qa_service import answer_question_with_context
from services.translation_service import normalize_language
from storage.document_store import get_document


qa_bp = Blueprint("qa", __name__, url_prefix="/api")


@qa_bp.route("/ask", methods=["POST"])
def ask():
    """
    Answer question about uploaded document.
    """
    data = request.get_json() or {}
    question = (data.get("question") or "").strip()
    doc_id = (data.get("doc_id") or "").strip()
    language = normalize_language((data.get("language") or "English").strip() or "English")
    answer_mode = (data.get("answer_mode") or "short").strip() or "short"

    if not question:
        return jsonify({"error": "Missing question"}), 400

    if not doc_id:
        return jsonify({"error": "Missing doc_id"}), 400

    try:
        doc = get_document(doc_id)
        if not doc:
            return (
                jsonify(
                    {
                        "error": "Document not found or expired",
                        "detail": "Please upload the document again",
                    }
                ),
                400,
            )

        answer = answer_question_with_context(
            question, doc, language=language, answer_mode=answer_mode
        )

        return (
            jsonify(
                {
                    "answer": answer,
                    "doc_id": doc_id,
                    "mode": answer_mode,
                }
            ),
            200,
        )

    except Exception as e:
        return jsonify({"error": "Failed to answer question", "detail": str(e)}), 500
