import re


def clean_document_text(text: str) -> str:
    """
    Remove common PDF noise such as page numbers, repeated section headers,
    and duplicated all-caps title lines before chunking/retrieval.
    """
    lines = [line.strip() for line in (text or "").splitlines()]
    filtered = []
    seen_upper_titles = set()

    for line in lines:
        if not line:
            continue
        if re.fullmatch(r"(page\s+)?\d{1,4}", line, flags=re.IGNORECASE):
            continue
        if re.fullmatch(r"\d{1,4}\s*/\s*\d{1,4}", line):
            continue
        if re.fullmatch(r"[ivxlcdm]+", line, flags=re.IGNORECASE):
            continue

        normalized = re.sub(r"\s+", " ", line)
        if normalized.isupper() and len(normalized.split()) >= 3:
            if normalized in seen_upper_titles:
                continue
            seen_upper_titles.add(normalized)

        filtered.append(normalized)

    cleaned = "\n".join(filtered)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    cleaned = re.sub(r"[ \t]+", " ", cleaned)
    return cleaned.strip()


def split_into_chunks(text: str, chunk_size: int = 700, overlap: int = 200):
    """
    Split text into chunks for better retrieval.

    Uses larger overlapping sentence windows to preserve legal context.
    """
    cleaned_text = clean_document_text(text)
    sentences = re.split(r"(?<=[.!?])\s+", cleaned_text)
    sentences = [sentence.strip() for sentence in sentences if sentence.strip()]

    chunks = []
    current_sentences = []
    current_word_count = 0

    for sentence in sentences:
        sentence_word_count = len(sentence.split())
        if current_sentences and current_word_count + sentence_word_count > chunk_size:
            chunks.append(" ".join(current_sentences).strip())

            overlap_sentences = []
            overlap_words = 0
            for existing in reversed(current_sentences):
                existing_words = len(existing.split())
                if overlap_words + existing_words > overlap and overlap_sentences:
                    break
                overlap_sentences.insert(0, existing)
                overlap_words += existing_words

            current_sentences = overlap_sentences[:]
            current_word_count = overlap_words

        current_sentences.append(sentence)
        current_word_count += sentence_word_count

    if current_sentences:
        chunks.append(" ".join(current_sentences).strip())

    chunks = [chunk for chunk in chunks if len(chunk.split()) > 40]
    return chunks
