import io
import logging

from config import settings

try:
    import PyPDF2
except ImportError:
    PyPDF2 = None  # type: ignore
    logging.warning("PyPDF2 not installed - PDF extraction disabled")

try:
    import docx
except ImportError:
    docx = None  # type: ignore
    logging.warning("python-docx not installed - DOCX extraction disabled")


def extract_text_from_file(file_storage):
    """
    Extract text from uploaded file (PDF, DOCX, or TXT).

    Returns:
        (text, truncated, reason) tuple
    """
    try:
        file_storage.stream.seek(0)
    except Exception:
        pass

    data = file_storage.read()
    filename = (file_storage.filename or "").lower()

    logging.info(f"Extracting text from {filename} ({len(data)} bytes)")

    # TXT file extraction
    if filename.endswith(".txt"):
        try:
            text = data.decode("utf-8", errors="ignore")
            if len(text) > settings.MAX_TEXT_CHARS:
                text = text[: settings.MAX_TEXT_CHARS]
                return text, True, f"Text truncated to {settings.MAX_TEXT_CHARS} characters"
            if text.strip():
                return text, False, ""
        except Exception as e:
            logging.warning(f"TXT extraction failed: {e}")

    # PDF file extraction
    if filename.endswith(".pdf"):
        if not PyPDF2:
            return "", False, "PyPDF2 not installed - cannot extract PDF"
        try:
            reader = PyPDF2.PdfReader(io.BytesIO(data))
            pages = []
            for i, page in enumerate(reader.pages):
                if i >= settings.MAX_PDF_PAGES:
                    return (
                        "\n".join(pages),
                        True,
                        f"PDF truncated to first {settings.MAX_PDF_PAGES} pages",
                    )
                text = page.extract_text() or ""
                pages.append(text)
                if sum(len(x) for x in pages) >= settings.MAX_TEXT_CHARS:
                    return (
                        "\n".join(pages),
                        True,
                        f"PDF truncated to {settings.MAX_TEXT_CHARS} characters",
                    )

            result = "\n".join(pages)
            if result.strip():
                return result, False, ""
            else:
                return (
                    "",
                    False,
                    "PDF appears to be image-based. Use OCR tools for scanned PDFs.",
                )
        except Exception as e:
            logging.error(f"PDF extraction failed: {e}")
            return "", False, f"Failed to read PDF: {str(e)}"

    # DOCX file extraction
    if filename.endswith(".docx"):
        if not docx:
            return "", False, "python-docx not installed - cannot extract DOCX"
        try:
            doc = docx.Document(io.BytesIO(data))
            parts = []
            for paragraph in doc.paragraphs:
                text = paragraph.text.strip()
                if text:
                    parts.append(text)
                if sum(len(x) for x in parts) >= settings.MAX_TEXT_CHARS:
                    return (
                        "\n".join(parts),
                        True,
                        f"DOCX truncated to {settings.MAX_TEXT_CHARS} characters",
                    )

            result = "\n".join(parts)
            if result.strip():
                return result, False, ""
        except Exception as e:
            logging.error(f"DOCX extraction failed: {e}")
            return "", False, f"Failed to read DOCX: {str(e)}"

    # Fallback: UTF-8 decode
    try:
        text = data.decode("utf-8", errors="ignore")
        if len(text) > settings.MAX_TEXT_CHARS:
            text = text[: settings.MAX_TEXT_CHARS]
            return text, True, f"Text truncated to {settings.MAX_TEXT_CHARS} characters"
        if text.strip():
            return text, False, ""
    except Exception as e:
        logging.error(f"UTF-8 fallback failed: {e}")

    return "", False, "Could not extract text from file"

