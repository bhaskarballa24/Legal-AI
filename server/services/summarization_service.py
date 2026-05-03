import json
import logging
import re
from typing import Dict

from services.ai_provider_service import generate_ai_response
from utils.entity_extraction import extract_legal_entities
from utils.text_utils import local_extractive_summary, summary_source_text


def generate_summary(text: str) -> Dict:
    """
    Generate a LONG legal summary of the document.
    
    Purpose: Provide a detailed legal overview of the document.
    
    Rules:
    - Generate a LONG summary (minimum 10–15 lines)
    - Must include: Case type, Parties, Background, Facts, Issues, Evidence, Legal reasoning, Final judgment
    - DO NOT give short answers
    - DO NOT copy sentences directly
    - Explain clearly like a case story
    
    Returns:
        Dict with 'summary' and 'key_points' keys
    """
    sampled_text = summary_source_text(text, max_chars=24000)

    summary_val = ""
    key_points = []

    try:
        prompt = (
            "## SUMMARY RULES (VERY STRICT)\n\n"
            "• Generate a LONG summary (minimum 10–15 lines)\n"
            "• Must include:\n\n"
            "* Case type\n"
            "* Parties\n"
            "* Background\n"
            "* Facts (dates, amounts, promises, defaults)\n"
            "* Issues\n"
            "* Evidence (bank transfer, notice)\n"
            "* Legal reasoning and statute references\n"
            "* Final judgment (outcome, award amount, interest, costs)\n\n"
            "• Use concrete details from the text to make the summary informative\n"
            "• DO NOT give short answers\n"
            "• DO NOT copy sentences directly\n"
            "• Explain clearly like a case story\n\n"
            "Analyze the following legal document and provide a JSON object with 'summary' and 'key_points'.\n\n"
            "Rules for JSON output:\n"
            "1. 'summary': A long detailed explanation (10-15 lines minimum) covering all required elements.\n"
            "2. 'key_points': An array of 5-6 important bullet points from the document.\n"
            "3. Respond ONLY with the JSON object, without any surrounding text or markdown.\n\n"
            "DOCUMENT:\n"
            f"{sampled_text}"
        )

        raw = generate_ai_response(
            prompt,
            service="summary",
            max_tokens=4000,
            temperature=0.0,
            local_fallback=lambda: "",
        ).strip()

        if raw:
            try:
                payload = json.loads(raw)
            except Exception:
                m = re.search(r"\{[\s\S]*\}", raw)
                payload = json.loads(m.group(0)) if m else {}

            summary_val = (payload.get("summary") or "").strip()
            key_points = payload.get("key_points") or []
            key_points = [str(x).strip() for x in key_points if str(x).strip()]
    except Exception as e:
        logging.warning(f"AI summary failed: {e}, using fallback")

    # Fallback to extractive summary
    if not summary_val:
        summary_val = local_extractive_summary(sampled_text, max_sentences=15)
    if not key_points:
        cand = re.split(
            r"(?<=[.!?])\s+",
            local_extractive_summary(sampled_text, max_sentences=6),
        )
        key_points = [s.strip() for s in cand if s.strip()][:6]

    logging.info(f"Summary ready ({len(summary_val)} chars)")
    
    return {
        "summary": summary_val,
        "key_points": key_points[:6]
    }


def generate_summary_bundle(text: str) -> Dict:
    """
    Generate summary, key points, and entities in English.
    Translation is applied later at the route layer after all generated
    outputs are available.
    """
    summary_result = generate_summary(text)
    summary_val = summary_result.get("summary", "")
    key_points = summary_result.get("key_points", [])
    local_entities = extract_legal_entities(text)

    return {
        "summary": summary_val,
        "key_points": key_points,
        "entities": local_entities,
    }
