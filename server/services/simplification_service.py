import logging
import re

from services.ai_provider_service import generate_ai_response
from utils.text_utils import local_extractive_summary

_T5_MODEL = None
_T5_TOKENIZER = None


def _local_plain_language_fallback(text: str, summary: str = "") -> str:
    source = summary.strip() or local_extractive_summary(text, max_sentences=5)
    if not source:
        return ""

    replacements = [
        (r"\bcognizable\b", "a police case can be registered immediately"),
        (r"\bnon-cognizable\b", "police usually need court permission before starting the case"),
        (r"\bbailable\b", "bail is normally available"),
        (r"\bnon-bailable\b", "bail is not automatic"),
        (r"\bappellant\b", "the person who filed the appeal"),
        (r"\brespondent\b", "the person or authority answering the case"),
    ]

    plain = source
    for pattern, replacement in replacements:
        plain = re.sub(pattern, replacement, plain, flags=re.IGNORECASE)

    sentences = re.split(r"(?<=[.!?])\s+", plain)
    sentences = [sentence.strip() for sentence in sentences if sentence.strip()]
    if not sentences:
        return ""

    simplified = []
    for index, sentence in enumerate(sentences[:4]):
        if index == 0:
            simplified.append(f"In simple terms, {sentence[0].lower() + sentence[1:] if len(sentence) > 1 else sentence.lower()}")
        elif "means" not in sentence.lower():
            simplified.append(f"This means {sentence[0].lower() + sentence[1:] if len(sentence) > 1 else sentence.lower()}")
        else:
            simplified.append(sentence)

    return " ".join(simplified)


def simplify_document(text: str, language: str = "English", summary: str = "") -> str:
    """
    Explain the legal document in simple language for general users.
    
    Purpose: Explain the document in simple language for general users.
    
    Rules:
    - Use simple sentences
    - Explain legal terminology
    - 5-8 sentences
    - Make it understandable for non-law students
    - Do not copy sentences directly from the document
    
    Args:
        text: The document text to simplify
        language: Reserved for compatibility; simplification is generated in English
        and translated later in the route pipeline.
    
    Returns:
        Simplified explanation string
    """
    text = (text or "").strip()
    if not text:
        return text

    logging.info("Simplification started...")

    try:
        # Generate simplification in English first, then translate if needed
        prompt = (
            "You are an AI that explains legal documents in simple language.\n\n"
            "Write a plain-language explanation for an ordinary citizen.\n\n"
            "Rules:\n"
            "* Use 5-8 short sentences\n"
            "* Mention all key facts: parties, relationship, date of transaction, amount, agreed terms, breach, evidence, and final court order\n"
            "* Include the main legal sections cited and practical consequences (rights, duties, money, cost orders, interest, or enforcement)\n"
            "* Do not repeat or paraphrase the summary line by line; instead create a cohesive story\n"
            "* Explain what the legal rule means in practice\n"
            "* Replace technical legal phrasing with plain everyday wording\n"
            "* Keep section numbers, act names, parties, and dates unchanged\n"
            "* Do not copy long sentences directly from the document\n\n"
            "DOCUMENT:\n"
            f"{text}"
        )
        if summary.strip():
            prompt += (
                "\n\nREFERENCE SUMMARY:\n"
                f"{summary.strip()}\n\n"
                "The explanation must be simpler than the reference summary and must not sound like a duplicate."
            )

        result = generate_ai_response(
            prompt,
            service="simplification",
            max_tokens=2048,
            temperature=0.0,
            local_fallback=lambda: _local_plain_language_fallback(text, summary),
        ).strip()

        if result:
            logging.info(
                f"Simplification complete (Gemini) — "
                f"input {len(text)} chars → output {len(result)} chars"
            )
            return result

    except Exception as e:
        logging.error(f"AI simplification failed: {e}")

    logging.warning("AI simplification failed, using local fallback.")
    return _local_plain_language_fallback(text, summary)


# Keep backward compatibility
def simplify_text(text: str) -> str:
    """
    Legacy function for backward compatibility.
    Calls simplify_document internally.
    """
    return simplify_document(text)


def generate_t5_simplification(text: str) -> str:
    """
    Generate a simplified summary using T5 model.
    
    Args:
        text: The document text to simplify
        
    Returns:
        T5-generated simplified summary
    """
    try:
        from transformers import T5Tokenizer, T5ForConditionalGeneration
        import torch
        global _T5_MODEL, _T5_TOKENIZER
        
        model_name = "t5-small"
        if _T5_MODEL is None or _T5_TOKENIZER is None:
            logging.info("Loading T5 model for simplification...")
            _T5_TOKENIZER = T5Tokenizer.from_pretrained(model_name, legacy=True)
            _T5_MODEL = T5ForConditionalGeneration.from_pretrained(
                model_name,
                low_cpu_mem_usage=False,
                device_map=None,
            )
            if any(getattr(param, "is_meta", False) for param in _T5_MODEL.parameters()):
                raise RuntimeError("T5 model loaded on meta device")
            _T5_MODEL.to(torch.device("cpu"))
            _T5_MODEL.eval()

        tokenizer = _T5_TOKENIZER
        model = _T5_MODEL
        device = torch.device("cpu")
        
        # Prepare input with summarization prefix and focus instructions
        input_text = (
            "summarize: "
            + text[:5000]
            + "\n\nPlease include: plaintiff and defendant names, loan amount, date, agreed repayment terms, evidence found, breach details, legal reasoning, final order with interest/costs. "
            + "Use clear, reader-friendly statements."
        )  # Limit text length for T5
        
        # Encode
        inputs = tokenizer.encode(
            input_text,
            return_tensors="pt",
            max_length=1024,
            truncation=True
        ).to(device)
        
        # Generate summary
        with torch.no_grad():
            outputs = model.generate(
                inputs,
                max_length=280,
                min_length=80,
                num_beams=5,
                length_penalty=1.0,
                no_repeat_ngram_size=3,
                early_stopping=True
            )
        
        # Decode
        summary = tokenizer.decode(outputs[0], skip_special_tokens=True)
        
        logging.info(f"T5 simplification complete: {len(summary)} chars")
        return summary
        
    except ImportError:
        logging.warning("Transformers library not available for T5")
        return ""
    except Exception as e:
        logging.error(f"T5 simplification failed: {e}")
        return ""
