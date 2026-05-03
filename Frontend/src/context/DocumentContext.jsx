import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { LanguageContext } from "./LanguageContext";

const STORAGE_KEY = "lastOutputState";

const defaultDocumentState = {
  summary: "",
  simplified_text: "",
  t5_summary: "",
  key_points: [],
  entities: null,
  document_id: "",
  original_document: "",
  full_text: "",
  textChars: 0,
  filename: "",
  apiBase: process.env.REACT_APP_API_BASE || "http://localhost:5000",
  uploaded_at: null,
};

function safeParse(raw) {
  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

function normalizeDocumentData(input = {}) {
  return {
    summary:
      typeof input.summary === "string"
        ? input.summary
        : typeof input.summary?.summary === "string"
          ? input.summary.summary
          : "",
    simplified_text:
      typeof input.simplified_text === "string"
        ? input.simplified_text
        : typeof input.simplified_explanation === "string"
          ? input.simplified_explanation
          : typeof input.detailedSummary === "string"
            ? input.detailedSummary
            : "",
    t5_summary: typeof input.t5_summary === "string" ? input.t5_summary : "",
    key_points: Array.isArray(input.key_points)
      ? input.key_points
      : Array.isArray(input.keyPoints)
        ? input.keyPoints
        : [],
    entities: input.entities && typeof input.entities === "object" ? input.entities : null,
    document_id: input.document_id || input.documentId || input.doc_id || "",
    original_document:
      input.original_document ||
      input.docText ||
      input.textExcerpt ||
      input.extractedText ||
      input.originalText ||
      "",
    full_text: input.full_text || "",
    textChars: Number(input.textChars) || Number(input.text_length) || 0,
    filename: input.filename || "Uploaded Document",
    apiBase: input.apiBase || process.env.REACT_APP_API_BASE || "http://localhost:5000",
    uploaded_at: input.uploaded_at || null,
  };
}

const DocumentContext = createContext(null);

export function DocumentProvider({ children }) {
  const [documentData, setDocumentData] = useState(() => {
    const persisted = safeParse(sessionStorage.getItem(STORAGE_KEY) || "null");
    return persisted ? { ...defaultDocumentState, ...normalizeDocumentData(persisted) } : defaultDocumentState;
  });
  const [loadingFullDocument, setLoadingFullDocument] = useState(false);
  const { language } = useContext(LanguageContext);

  const hasDocument = Boolean(documentData.document_id || documentData.summary || documentData.original_document);

  const replaceDocumentData = useCallback((nextValue) => {
    const normalized = { ...defaultDocumentState, ...normalizeDocumentData(nextValue) };
    setDocumentData(normalized);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  }, []);

  useEffect(() => {
    if (!documentData.document_id || documentData.full_text) {
      return;
    }

    let cancelled = false;

    async function fetchFullDocument() {
      setLoadingFullDocument(true);
      try {
        const response = await fetch(
          `${documentData.apiBase}/api/document/${documentData.document_id}/full?language=${encodeURIComponent(
            language || "English"
          )}`
        );
        if (!response.ok) {
          throw new Error(`Status ${response.status}`);
        }

        const data = await response.json();
        if (cancelled) {
          return;
        }

        setDocumentData((prev) => {
          const merged = {
            ...prev,
            full_text: data.full_text || prev.full_text,
            t5_summary: data.t5_simplified || prev.t5_summary,
            textChars: Number(data.text_length) || prev.textChars,
          };
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          return merged;
        });
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to fetch full document:", error);
        }
      } finally {
        if (!cancelled) {
          setLoadingFullDocument(false);
        }
      }
    }

    fetchFullDocument();

    return () => {
      cancelled = true;
    };
  }, [documentData.apiBase, documentData.document_id, documentData.full_text, language]);

  useEffect(() => {
    if (!documentData.document_id || !hasDocument) {
      return;
    }

    async function translateDocumentData() {
      try {
        const response = await fetch(`${documentData.apiBase}/api/translate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            language: language || "English",
            content: {
              summary: documentData.summary,
              simplified_text: documentData.simplified_text,
              simplified_explanation: documentData.simplified_explanation,
              key_points: documentData.key_points,
              entities: documentData.entities,
              t5_simplified: documentData.t5_summary,
            },
          }),
        });

        if (!response.ok) {
          throw new Error(`Translate status ${response.status}`);
        }

        const translated = await response.json();
        if (translated.error) {
          console.warn("Translate API responded with error", translated);
          return;
        }

        setDocumentData((prev) => {
          const merged = {
            ...prev,
            summary: translated.summary || prev.summary,
            simplified_text: translated.simplified_text || prev.simplified_text,
            simplified_explanation: translated.simplified_explanation || prev.simplified_explanation,
            key_points: Array.isArray(translated.key_points) ? translated.key_points : prev.key_points,
            entities: translated.entities || prev.entities,
            t5_summary: translated.t5_simplified || prev.t5_summary,
          };
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          return merged;
        });
      } catch (error) {
        console.warn("Failed to translate document data:", error);
      }
    }

    if ((language || "English") !== "English") {
      translateDocumentData();
    }
  }, [language, documentData.document_id, documentData.apiBase, documentData.summary, documentData.simplified_text, documentData.t5_summary]);

  const value = useMemo(
    () => ({
      documentData,
      hasDocument,
      loadingFullDocument,
      replaceDocumentData,
    }),
    [documentData, hasDocument, loadingFullDocument, replaceDocumentData]
  );

  return <DocumentContext.Provider value={value}>{children}</DocumentContext.Provider>;
}

export function useDocument() {
  const context = useContext(DocumentContext);
  if (!context) {
    throw new Error("useDocument must be used within a DocumentProvider");
  }
  return context;
}
