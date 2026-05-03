import logging
import re
from typing import Dict, List, Optional, Tuple

from services.ai_provider_service import generate_ai_response

LOGGER = logging.getLogger(__name__)

LANGUAGE_MAP = {
    "english": "en",
    "hindi": "hi",
    "telugu": "te",
    "tamil": "ta",
    "kannada": "kn",
    "malayalam": "ml",
    "bengali": "bn",
    "marathi": "mr",
    "gujarati": "gu",
    "punjabi": "pa",
}

SUPPORTED_LANGUAGES = {name.title() for name in LANGUAGE_MAP}
_MODEL_CONFIG = {
    "Hindi": {
        "model_name": "Helsinki-NLP/opus-mt-en-hi",
        "target_prefix": None,
    },
    "Telugu": {
        "model_name": "Helsinki-NLP/opus-mt-en-mul",
        "target_prefix": ">>tel<< ",
    },
    "Tamil": {
        "model_name": "Helsinki-NLP/opus-mt-en-mul",
        "target_prefix": ">>tam<< ",
    },
    "Kannada": {
        "model_name": "Helsinki-NLP/opus-mt-en-mul",
        "target_prefix": ">>kan<< ",
    },
    "Malayalam": {
        "model_name": "Helsinki-NLP/opus-mt-en-mul",
        "target_prefix": ">>mal<< ",
    },
    "Bengali": {
        "model_name": "Helsinki-NLP/opus-mt-en-mul",
        "target_prefix": ">>ben<< ",
    },
    "Marathi": {
        "model_name": "Helsinki-NLP/opus-mt-en-mul",
        "target_prefix": ">>mar<< ",
    },
    "Gujarati": {
        "model_name": "Helsinki-NLP/opus-mt-en-mul",
        "target_prefix": ">>guj<< ",
    },
    "Punjabi": {
        "model_name": "Helsinki-NLP/opus-mt-en-mul",
        "target_prefix": ">>pan<< ",
    },
}

_MODEL_CACHE: Dict[str, Tuple[object, object, Optional[str], object]] = {}
_MAX_CHARS_PER_CHUNK = 900

_LEGAL_TERM_DICTIONARY = {
    "Hindi": {
        "Indian Penal Code": "भारतीय दंड संहिता",
        "Code of Criminal Procedure": "दंड प्रक्रिया संहिता",
        "Criminal Law Amendment Act": "आपराधिक कानून संशोधन अधिनियम",
        "High Court": "उच्च न्यायालय",
        "Supreme Court": "उच्चतम न्यायालय",
        "District Court": "जिला न्यायालय",
        "Section": "धारा",
    },
    "Telugu": {
        "Indian Penal Code": "భారతీయ దండ సంహిత",
        "Code of Criminal Procedure": "ఫౌజ్దారీ విధాన సంహిత",
        "Criminal Law Amendment Act": "ఫౌజ్దారీ చట్ట సవరణ చట్టం",
        "High Court": "హైకోర్టు",
        "Supreme Court": "సుప్రీంకోర్టు",
        "District Court": "జిల్లా న్యాయస్థానం",
        "Section": "సెక్షన్",
    },
    "Tamil": {
        "Indian Penal Code": "இந்திய தண்டனைச் சட்டம்",
        "Code of Criminal Procedure": "குற்றவியல் நடைமுறைச் சட்டம்",
        "Criminal Law Amendment Act": "குற்றச் சட்டத் திருத்தச் சட்டம்",
        "High Court": "உயர்நீதிமன்றம்",
        "Supreme Court": "உச்ச நீதிமன்றம்",
        "District Court": "மாவட்ட நீதிமன்றம்",
        "Section": "பிரிவு",
    },
    "Kannada": {
        "Indian Penal Code": "ಭಾರತೀಯ ದಂಡ ಸಂಹಿತೆ",
        "Code of Criminal Procedure": "ದಂಡ ಪ್ರಕ್ರಿಯೆ ಸಂಹಿತೆ",
        "Criminal Law Amendment Act": "ಅಪರಾಧ ಕಾನೂನು ತಿದ್ದುಪಡಿ ಕಾಯಿದೆ",
        "High Court": "ಉಚ್ಚ ನ್ಯಾಯಾಲಯ",
        "Supreme Court": "ಸರ್ವೋಚ್ಚ ನ್ಯಾಯಾಲಯ",
        "District Court": "ಜಿಲ್ಲಾ ನ್ಯಾಯಾಲಯ",
        "Section": "ವಿಧಿ",
    },
    "Malayalam": {
        "Indian Penal Code": "ഇന്ത്യൻ ശിക്ഷാനിയമം",
        "Code of Criminal Procedure": "ക്രിമിനൽ പ്രൊസീജർ കോഡ്",
        "Criminal Law Amendment Act": "ക്രിമിനൽ ലോ ഭേദഗതി നിയമം",
        "High Court": "ഹൈക്കോടതി",
        "Supreme Court": "സുപ്രീംകോടതി",
        "District Court": "ജില്ലാ കോടതി",
        "Section": "വകുപ്പ്",
    },
    "Bengali": {
        "Indian Penal Code": "ভারতীয় দণ্ডবিধি",
        "Code of Criminal Procedure": "ফৌজদারি কার্যবিধি",
        "Criminal Law Amendment Act": "ফৌজদারি আইন সংশোধনী আইন",
        "High Court": "উচ্চ আদালত",
        "Supreme Court": "সুপ্রিম কোর্ট",
        "District Court": "জেলা আদালত",
        "Section": "ধারা",
    },
    "Marathi": {
        "Indian Penal Code": "भारतीय दंड संहिता",
        "Code of Criminal Procedure": "दंड प्रक्रिया संहिता",
        "Criminal Law Amendment Act": "फौजदारी कायदा दुरुस्ती अधिनियम",
        "High Court": "उच्च न्यायालय",
        "Supreme Court": "सर्वोच्च न्यायालय",
        "District Court": "जिल्हा न्यायालय",
        "Section": "कलम",
    },
    "Gujarati": {
        "Indian Penal Code": "ભારતીય દંડ સંહિતા",
        "Code of Criminal Procedure": "ફોજદારી કાર્યવાહી સંહિતા",
        "Criminal Law Amendment Act": "ફોજદારી કાયદા સુધારા અધિનિયમ",
        "High Court": "ઉચ્ચ ન્યાયાલય",
        "Supreme Court": "સુપ્રીમ કોર્ટ",
        "District Court": "જિલ્લા અદાલત",
        "Section": "ધારા",
    },
    "Punjabi": {
        "Indian Penal Code": "ਭਾਰਤੀ ਦੰਡ ਸੰਹਿਤਾ",
        "Code of Criminal Procedure": "ਫੌਜਦਾਰੀ ਕਾਰਵਾਈ ਸੰਹਿਤਾ",
        "Criminal Law Amendment Act": "ਫੌਜਦਾਰੀ ਕਾਨੂੰਨ ਸੋਧ ਐਕਟ",
        "High Court": "ਉੱਚ ਨਿਆਇਕ ਅਦਾਲਤ",
        "Supreme Court": "ਸੁਪਰੀਮ ਕੋਰਟ",
        "District Court": "ਜ਼ਿਲ੍ਹਾ ਅਦਾਲਤ",
        "Section": "ਧਾਰਾ",
    },
}
_ENTITY_PATTERNS = [
    ("case", re.compile(r"\b([A-Z][A-Za-z.&' -]+?\s+v\.?\s+[A-Z][A-Za-z.&' -]+)\b")),
    ("date", re.compile(r"\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b")),
    ("section", re.compile(r"\bSection\s+(\d+[A-Za-z]?)\b", flags=re.IGNORECASE)),
    ("section", re.compile(r"\b(\d+[A-Za-z]?)\s*(IPC|CrPC)\b", flags=re.IGNORECASE)),
    ("act", re.compile(r"\bIndian Penal Code\b", flags=re.IGNORECASE)),
    ("act", re.compile(r"\bCode of Criminal Procedure\b", flags=re.IGNORECASE)),
    ("act", re.compile(r"\bCriminal Law Amendment Act(?:,? ?\d{4})?\b", flags=re.IGNORECASE)),
    ("court", re.compile(r"\b(?:[A-Z][A-Za-z ]+ High Court|High Court|Supreme Court|District Court)\b", flags=re.IGNORECASE)),
]
_SECTION_PATTERN = re.compile(r"\bSection\s+(\d+[A-Za-z]?)\b", flags=re.IGNORECASE)
_SHORT_SECTION_PATTERN = re.compile(r"\b(\d+[A-Za-z]?)\s*(IPC|CrPC)\b", flags=re.IGNORECASE)


def normalize_language(language: str) -> str:
    language = (language or "English").strip() or "English"
    normalized = language.lower()
    if normalized in LANGUAGE_MAP:
        return normalized.title()
    return "English"


def _lazy_import_transformers():
    try:
        import torch
        from transformers import MarianMTModel, MarianTokenizer
        LOGGER.debug("Successfully imported torch, transformers, and sentencepiece")
    except ImportError as exc:
        error_msg = (
            "Translation dependencies are missing. Install with:\n"
            "pip install torch transformers sentencepiece\n"
            f"Error details: {exc}"
        )
        LOGGER.error(error_msg)
        raise RuntimeError(error_msg) from exc
    return torch, MarianMTModel, MarianTokenizer


def _ensure_real_model_device(model, torch_module, device: str = "cpu"):
    target_device = torch_module.device(device)
    if any(getattr(param, "is_meta", False) for param in model.parameters()):
        raise RuntimeError("Translation model loaded on meta device")
    model.to(target_device)
    return target_device


def _load_model_bundle(language: str):
    language = normalize_language(language)
    if language == "English":
        return None

    if language in _MODEL_CACHE:
        LOGGER.debug(f"Using cached model for {language}")
        return _MODEL_CACHE[language]

    try:
        torch, MarianMTModel, MarianTokenizer = _lazy_import_transformers()
        model_name = _MODEL_CONFIG[language]["model_name"]
        target_prefix = _MODEL_CONFIG[language]["target_prefix"]

        LOGGER.info(f"Loading translation model for {language} from {model_name}")
        
        try:
            tokenizer = MarianTokenizer.from_pretrained(model_name)
            LOGGER.debug(f"Tokenizer loaded for {language}")
        except Exception as e:
            LOGGER.error(f"Failed to load tokenizer for {language}: {e}")
            raise
        
        try:
            model = MarianMTModel.from_pretrained(
                model_name,
                low_cpu_mem_usage=False,
                device_map=None,
            )
            LOGGER.debug(f"Model loaded for {language}")
        except Exception as e:
            LOGGER.error(f"Failed to load model {model_name}: {e}")
            raise
        
        try:
            device = _ensure_real_model_device(model, torch, device="cpu")
            LOGGER.debug(f"Model moved to device: {device}")
        except Exception as e:
            LOGGER.error(f"Failed to move model to device: {e}")
            raise
        
        model.eval()

        bundle = (tokenizer, model, target_prefix, device)
        _MODEL_CACHE[language] = bundle
        LOGGER.info(f"Successfully loaded translation model for {language}")
        return bundle
        
    except Exception as e:
        LOGGER.error(f"Failed to load model bundle for {language}: {type(e).__name__}: {e}", exc_info=True)
        return None


def _split_text(text: str, max_chars: int = _MAX_CHARS_PER_CHUNK) -> List[str]:
    text = text or ""
    if len(text) <= max_chars:
        return [text]

    parts: List[str] = []
    paragraphs = re.split(r"(\n\s*\n)", text)
    current = ""

    for piece in paragraphs:
        if not piece:
            continue
        if len(current) + len(piece) <= max_chars:
            current += piece
            continue

        if current.strip():
            parts.append(current)
            current = ""

        if len(piece) <= max_chars:
            current = piece
            continue

        sentences = re.split(r"(?<=[.!?])\s+", piece)
        sentence_chunk = ""
        for sentence in sentences:
            if len(sentence_chunk) + len(sentence) + 1 <= max_chars:
                sentence_chunk = f"{sentence_chunk} {sentence}".strip()
                continue
            if sentence_chunk:
                parts.append(sentence_chunk)
            sentence_chunk = sentence

        if sentence_chunk:
            if len(sentence_chunk) <= max_chars:
                current = sentence_chunk
            else:
                for start in range(0, len(sentence_chunk), max_chars):
                    parts.append(sentence_chunk[start : start + max_chars])

    if current.strip():
        parts.append(current)

    return parts or [text]


def _find_entity_spans(text: str) -> List[Dict[str, str]]:
    spans = []
    for entity_type, pattern in _ENTITY_PATTERNS:
        for match in pattern.finditer(text):
            spans.append(
                {
                    "start": match.start(),
                    "end": match.end(),
                    "type": entity_type,
                    "value": match.group(0),
                }
            )

    spans.sort(key=lambda item: (item["start"], -(item["end"] - item["start"])))
    merged: List[Dict[str, str]] = []
    for span in spans:
        if not merged or span["start"] >= merged[-1]["end"]:
            merged.append(span)
    return merged


def _translate_legal_term(term: str, language: str) -> str:
    translations = _LEGAL_TERM_DICTIONARY.get(language, {})
    return translations.get(term, term)


def _restore_entity(entity_info: Dict[str, str], language: str) -> str:
    original = entity_info["value"]
    if language == "English":
        return original

    section_match = _SECTION_PATTERN.fullmatch(original)
    if section_match:
        return f"{_translate_legal_term('Section', language)} {section_match.group(1)}"

    short_section_match = _SHORT_SECTION_PATTERN.fullmatch(original)
    if short_section_match:
        return f"{_translate_legal_term('Section', language)} {short_section_match.group(1)} {short_section_match.group(2).upper()}"

    normalized = original.strip()
    if entity_info["type"] in {"act", "court"}:
        return _translate_legal_term(normalized, language)

    return original


def _translate_plain_segment(segment: str, language: str) -> str:
    if not segment.strip():
        return segment

    try:
        bundle = _load_model_bundle(language)
        if bundle is None:
            LOGGER.debug(f"No bundle for {language}, returning segment unchanged")
            return segment

        tokenizer, model, target_prefix, device = bundle
        torch, _, _ = _lazy_import_transformers()
        
        model_input = f"{target_prefix}{segment}" if target_prefix else segment
        LOGGER.debug(f"Translating segment ({len(segment)} chars) to {language}")
        
        encoded = tokenizer(
            [model_input],
            return_tensors="pt",
            truncation=True,
            padding=True,
            max_length=512,
        ).to(device)

        with torch.no_grad():
            generated = model.generate(
                **encoded,
                max_length=512,
                num_beams=4,
                early_stopping=True,
            )

        decoded = tokenizer.batch_decode(generated, skip_special_tokens=True)
        translated = decoded[0].strip() if decoded else segment

        translations = _LEGAL_TERM_DICTIONARY.get(language, {})
        for source, target in translations.items():
            if source == "Section":
                continue
            translated = re.sub(re.escape(source), target, translated, flags=re.IGNORECASE)
        
        LOGGER.debug(f"Segment translated to {language}: {len(translated)} chars")
        return translated
        
    except Exception as e:
        LOGGER.error(f"Failed to translate segment to {language}: {type(e).__name__}: {e}")
        return segment


def _translate_chunks(chunks: List[str], language: str) -> List[str]:
    if not chunks:
        return []

    if _load_model_bundle(language) is None:
        return chunks

    translated_chunks: List[str] = []
    for chunk in chunks:
        if not chunk.strip():
            translated_chunks.append(chunk)
            continue

        spans = _find_entity_spans(chunk)
        if not spans:
            translated_chunks.append(_translate_plain_segment(chunk, language))
            continue

        translated_parts: List[str] = []
        cursor = 0
        for span in spans:
            if span["start"] > cursor:
                translated_parts.append(
                    _translate_plain_segment(chunk[cursor : span["start"]], language)
                )
            translated_parts.append(_restore_entity(span, language))
            cursor = span["end"]

        if cursor < len(chunk):
            translated_parts.append(_translate_plain_segment(chunk[cursor:], language))

        translated_chunks.append("".join(translated_parts).strip())

    return translated_chunks


def translate_text(text: str, language: str) -> str:
    """
    Translate AI-generated English text into the selected language.

    The original document text must remain unchanged, so callers should use this
    only for generated outputs such as summaries, simplified text, entities, and
    chatbot responses.
    """
    text = text or ""
    language = normalize_language(language)

    if not text.strip() or language == "English":
        return text

    LOGGER.info(f"Starting translation to {language} for {len(text)} chars")

    def _local_translate() -> str:
        try:
            bundle = _load_model_bundle(language)
            if bundle is None:
                LOGGER.info(f"No model bundle for {language}, returning original text")
                return text

            LOGGER.info(f"Model bundle loaded successfully for {language}")
            chunks = _split_text(text)
            LOGGER.info(f"Split text into {len(chunks)} chunks for translation")

            translated_chunks = _translate_chunks(chunks, language)
            translated_text = "\n\n".join(
                chunk for chunk in translated_chunks if chunk is not None
            ).strip()

            LOGGER.info(
                f"Translation completed for {language}: {len(translated_text)} chars output"
            )
            return translated_text or text
        except ImportError as exc:
            LOGGER.error(
                f"Translation dependencies missing: {exc}. Install transformers, torch, sentencepiece."
            )
            return text
        except RuntimeError as exc:
            LOGGER.error(f"Translation runtime error for {language}: {exc}")
            return text
        except Exception as exc:
            LOGGER.error(
                f"Translation failed for language={language}: {type(exc).__name__}: {exc}",
                exc_info=True,
            )
            return text

    prompt = (
        f"Translate the following legal explanation from English to {language}.\n"
        "Keep act names, section numbers, dates, and party names accurate.\n"
        "Return only the translated text.\n\n"
        f"TEXT:\n{text}"
    )
    translated = generate_ai_response(
        prompt,
        service="translation",
        max_tokens=2048,
        temperature=0.0,
        local_fallback=_local_translate,
    ).strip()
    return translated or text
