import re
from collections import Counter


def normalize_text(text: str) -> str:
    """Clean and normalize text for processing."""
    cleaned = text.replace("\r", "\n")
    cleaned = re.sub(r"[ \t]+", " ", cleaned)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned.strip()


def local_extractive_summary(text: str, max_sentences: int = 6) -> str:
    """
    Generate extractive summary using simple TF-IDF-like scoring.

    Used as a fallback when Gemini is not available.
    """
    cleaned = normalize_text(text)
    if not cleaned:
        return "No readable text found."

    sentences = re.split(r"(?<=[.!?])\s+", cleaned)
    sentences = [s.strip() for s in sentences if 40 <= len(s.strip()) <= 500]

    if not sentences:
        return "No readable text found."

    stopwords = {
        "the",
        "and",
        "for",
        "that",
        "with",
        "this",
        "from",
        "are",
        "was",
        "were",
        "into",
        "about",
        "have",
        "has",
        "had",
        "not",
        "but",
        "you",
        "your",
        "our",
        "their",
        "they",
        "them",
        "also",
        "such",
        "than",
        "then",
        "when",
        "where",
        "which",
        "while",
        "will",
        "can",
        "could",
    }

    words = re.findall(r"[a-zA-Z]{3,}", cleaned.lower())
    word_freq = Counter(w for w in words if w not in stopwords)

    scored = []
    n = len(sentences)
    for idx, sent in enumerate(sentences):
        sent_words = re.findall(r"[a-zA-Z]{3,}", sent.lower())
        keyword_score = sum(word_freq.get(w, 0) for w in sent_words) / max(
            1, len(sent_words)
        )
        position_bonus = 0.15 if idx < max(2, n // 10) else 0.0
        score = keyword_score + position_bonus
        scored.append((score, idx, sent))

    selected = []
    seen_token_sets = []
    for _, idx, sent in sorted(scored, key=lambda x: x[0], reverse=True):
        token_set = set(re.findall(r"[a-zA-Z]{3,}", sent.lower()))
        if not token_set:
            continue
        is_duplicate = False
        for prev in seen_token_sets:
            overlap = len(token_set & prev) / max(1, len(token_set | prev))
            if overlap > 0.75:
                is_duplicate = True
                break
        if is_duplicate:
            continue
        selected.append((idx, sent))
        seen_token_sets.append(token_set)
        if len(selected) >= max_sentences:
            break

    if not selected:
        return " ".join(sentences[:max_sentences])

    selected.sort(key=lambda x: x[0])
    return " ".join([s for _, s in selected])


def summary_source_text(text: str, max_chars: int = 24000) -> str:
    """
    Build representative context from start/middle/end to avoid start-only bias.
    """
    cleaned = normalize_text(text)
    if len(cleaned) <= max_chars:
        return cleaned

    seg = max(3000, max_chars // 3)
    mid_start = max(0, (len(cleaned) // 2) - (seg // 2))
    start_part = cleaned[:seg]
    mid_part = cleaned[mid_start : mid_start + seg]
    end_part = cleaned[-seg:]

    return (
        "[Document Beginning]\n"
        f"{start_part}\n\n"
        "[Document Middle]\n"
        f"{mid_part}\n\n"
        "[Document End]\n"
        f"{end_part}"
    )

