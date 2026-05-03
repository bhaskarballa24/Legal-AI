import logging
import re

from services.ai_provider_service import generate_ai_response
from services.retrieval_service import retrieve_relevant_chunk_records
from services.translation_service import translate_text
from utils.entity_extraction import extract_legal_entities


ENTITY_QUESTION_MAP = {
    "courts": "courts",
    "court": "courts",
    "parties": "parties",
    "party": "parties",
    "sections": "sections",
    "section": "sections",
    "acts": "act",
    "act": "act",
}


def _clean_answer_text(text: str) -> str:
    lines = []
    for line in (text or "").splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        if re.fullmatch(r"(page\s+)?\d{1,4}", stripped, flags=re.IGNORECASE):
            continue
        if re.fullmatch(r"\d{1,4}\s*/\s*\d{1,4}", stripped):
            continue
        lines.append(stripped)
    return "\n".join(lines).strip()


def _detect_entity_question(question: str) -> str:
    lowered = (question or "").lower()
    for needle, entity_type in ENTITY_QUESTION_MAP.items():
        if needle in lowered:
            return entity_type
    return ""


def _format_entity_answer(entity_type: str, entities: dict) -> str:
    if entity_type == "act":
        act_value = entities.get("act") or "Not Found"
        values = [] if act_value == "Not Found" else [act_value]
        heading = "Acts mentioned in the document:"
    else:
        values = entities.get(entity_type) or []
        values = [value for value in values if value and value != "Not Found"]
        heading_map = {
            "courts": "Courts mentioned in the document:",
            "parties": "Parties mentioned in the document:",
            "sections": "Sections mentioned in the document:",
        }
        heading = heading_map.get(entity_type, "Entities mentioned in the document:")

    if not values:
        return "The document does not contain this information."

    bullet_lines = "\n".join(f"• {value}" for value in values)
    return f"{heading}\n\n{bullet_lines}"


def _format_citation(records: list) -> str:
    indices = [record["index"] + 1 for record in records if record.get("index") is not None]
    if not indices:
        return ""
    labels = ", ".join(f"chunk {index}" for index in indices[:3])
    return f"\n\nSource: {labels}"


def answer_question_with_context(
    question: str, doc: dict, language: str = "English", answer_mode: str = "short"
) -> str:
    """
    Answer user question using document content.
    """
    if not doc:
        return "Document not found or expired. Please re-upload the file."

    entities = doc.get("entities") or extract_legal_entities(doc.get("text", ""))
    entity_question = _detect_entity_question(question)
    if entity_question:
        return translate_text(_format_entity_answer(entity_question, entities), language)

    chunk_records = retrieve_relevant_chunk_records(question, doc, top_k=5)
    context = "\n\n".join(record["text"] for record in chunk_records if record.get("text"))

    if not context:
        context = doc.get("cleaned_text", "")[:5000] or doc.get("text", "")[:5000]

    language = (language or "English").strip() or "English"

    try:
        prompt = (
            "You are a legal assistant.\n\n"
            "Answer the user question only using the provided document context.\n\n"
            "Rules:\n\n"
            "* Provide complete sentences.\n"
            "* If the question asks about courts, clearly state the court name.\n"
            "* If the question asks about parties, list the parties involved.\n"
            "* Do not output page numbers or document headers.\n"
            "* If the answer is not present say: 'The document does not contain this information.'\n\n"
            "Context:\n"
            f"{context}\n\n"
            "Question:\n"
            f"{question}\n\n"
            "Provide a clear legal explanation."
        )
        answer = generate_ai_response(
            prompt,
            service="chatbot",
            max_tokens=600,
            temperature=0.0,
            local_fallback=lambda: "",
        ).strip()
        if answer:
            answer = _clean_answer_text(answer)
            answer = f"{answer}{_format_citation(chunk_records)}"
            return translate_text(answer, language)
    except Exception as e:
        logging.error(f"AI QA failed: {e}")

    if False:
        try:
            prompt = (
                "You are a legal assistant.\n\n"
                "Answer the user question only using the provided document context.\n\n"
                "Rules:\n\n"
                "* Provide complete sentences.\n"
                "* If the question asks about courts, clearly state the court name.\n"
                "* If the question asks about parties, list the parties involved.\n"
                "* Do not output page numbers or document headers.\n"
                "* If the answer is not present say: 'The document does not contain this information.'\n\n"
                "Context:\n"
                f"{context}\n\n"
                "Question:\n"
                f"{question}\n\n"
                "Provide a clear legal explanation."
            )

            model = gemini_client.GenerativeModel(get_gemini_model_name())
            ctx = log_request(
                service="qa",
                model=get_gemini_model_name(),
                messages_count=1,
                max_tokens=600,
                temperature=0.0,
            )
            response = model.generate_content(
                prompt
            )
            
            answer = response.text.strip()

            if not answer:
                logging.warning("QA returned empty response")
                if hasattr(response, 'prompt_feedback'):
                    logging.warning(f"Prompt feedback: {response.prompt_feedback}")
                # Fall through to extractive method

            usage = response.usage_metadata
            log_response(
                ctx=ctx,
                status="success",
                response_chars=len(answer),
                prompt_tokens=getattr(usage, "prompt_token_count", None),
                completion_tokens=getattr(usage, "candidates_token_count", None),
                total_tokens=getattr(usage, "total_token_count", None),
            )

            if answer:
                answer = _clean_answer_text(answer)
                answer = f"{answer}{_format_citation(chunk_records)}"
                
                # Log before translation
                original_len = len(answer)
                answer = translate_text(answer, language)
                translated_len = len(answer)
                
                if language != "English":
                    if translated_len != original_len:
                        logging.info(f"✓ QA answer translated to {language}: {original_len} → {translated_len} chars")
                    else:
                        logging.warning(f"⚠ QA translation to {language} returned original text (may indicate missing dependencies)")
                else:
                    logging.info(f"Gemini QA answered: {translated_len} chars, language={language}")
                
                return answer
        except Exception as e:
            register_gemini_failure(e)
            log_error(service="qa", error=e, ctx=ctx if 'ctx' in dir() else None)
            logging.error(f"Gemini QA failed: {e}")

    logging.info("Using extractive fallback for QA")
    if (answer_mode or "").lower() == "detailed":
        from utils.text_utils import local_extractive_summary

        summary = local_extractive_summary(context, max_sentences=8)
        summary = f"{_clean_answer_text(summary)}{_format_citation(chunk_records)}"
        
        original_len = len(summary)
        summary = translate_text(summary, language)
        translated_len = len(summary)
        
        if language != "English":
            if translated_len != original_len:
                logging.info(f"✓ Fallback answer translated to {language}: {original_len} → {translated_len} chars")
            else:
                logging.warning(f"⚠ Fallback translation to {language} returned original text")
        
        return summary
    else:
        from utils.text_utils import local_extractive_summary

        summary = local_extractive_summary(context, max_sentences=4)
        summary = f"{_clean_answer_text(summary)}{_format_citation(chunk_records)}"
        
        original_len = len(summary)
        summary = translate_text(summary, language)
        translated_len = len(summary)
        
        if language != "English":
            if translated_len != original_len:
                logging.info(f"✓ Fallback answer translated to {language}: {original_len} → {translated_len} chars")
            else:
                logging.warning(f"⚠ Fallback translation to {language} returned original text")
        
        return summary
