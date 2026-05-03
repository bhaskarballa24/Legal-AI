import React, { useContext, useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import ChatbotWidget from "../components/ChatbotWidget";
import { LanguageContext } from "../context/LanguageContext";

function OutputPage() {
  const createEmptyTranslatedData = () => ({
    summary: null,
    simplified_explanation: null,
    key_points: null,
    full_text: null,
    entities: null
  });

  const navigate = useNavigate();
  const { state: routeState } = useLocation();
  const { language, setLanguage } = useContext(LanguageContext);
  let persistedState = null;
  try {
    persistedState = JSON.parse(sessionStorage.getItem("lastOutputState") || "null");
  } catch (e) {
    persistedState = null;
  }
  const state = routeState || persistedState || {};
  const summary =
    typeof state?.summary === "string"
      ? state.summary
      : (state?.summary && typeof state.summary.summary === "string"
          ? state.summary.summary
          : "No summary available.");
  
  // Simplified Explanation - new field name from API
  const simplifiedExplanation =
    typeof state?.simplified_explanation === "string"
      ? state.simplified_explanation
      : (typeof state?.detailedSummary === "string"
          ? state.detailedSummary  // Backward compatibility
          : (state?.summary && typeof state.summary.detailedSummary === "string"
              ? state.summary.detailedSummary
              : ""));
  const docText =
    state?.original_document ||
    state?.docText ||
    state?.textExcerpt ||
    state?.extractedText ||
    state?.originalText ||
    "";
  const documentId = state?.documentId || "";
  const textChars = state?.textChars || docText.length;
  const filename = state?.filename || "Uploaded Document";
  const keyPoints = Array.isArray(state?.keyPoints) ? state.keyPoints : [];
  const entities = state?.entities && typeof state.entities === "object" ? state.entities : null;
  
  // Calculate document metadata
  const wordCount = docText.trim() ? docText.trim().split(/\s+/).length : 0;
  const estimatedReadingTime = Math.max(1, Math.ceil(wordCount / 200)); // ~200 words per minute
  const fileType = filename.split('.').pop()?.toUpperCase() || "DOCUMENT";
  
  // Create simplified summary from key points (short bullet format)
  const simplifiedSummary = keyPoints.length > 0 
    ? keyPoints.map((point, index) => `${index + 1}. ${point}`).join('\n')
    : "No key points available.";

  const [showFullDoc, setShowFullDoc] = useState(false);
  const [showEntities, setShowEntities] = useState(false);
  const [translating, setTranslating] = useState(false);
  const translationRequestRef = useRef(0);
  const fullDocumentRequestRef = useRef(0);

  // State for translated content
  const [translatedData, setTranslatedData] = useState(createEmptyTranslatedData);

  // State for full document and T5 summary
  const [fullDocumentData, setFullDocumentData] = useState({
    full_text: null,
    t5_simplified: null,
    t5_summary_translated: null,
    t5SummaryLocked: false,
    translatedLanguage: "English",
    loading: false
  });

  // Use language from context for the selector
  const currentLanguage = language || "English";

  // Derived values for fullText and t5Summary
  const fullText = fullDocumentData.full_text || docText;
  const t5Summary = fullDocumentData.t5_simplified || "";
  const t5SummaryTranslated = fullDocumentData.t5_summary_translated || "";

  // Sync context language when state has a different language
  useEffect(() => {
    const stateLanguage = (state?.language || "").trim();
    if (stateLanguage && stateLanguage !== language) {
      setLanguage(stateLanguage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.language]);

  // Function to perform translation
  const performTranslation = async () => {
    if (currentLanguage === "English") {
      translationRequestRef.current += 1;
      // Reset to original content when English
      setTranslatedData(createEmptyTranslatedData());
      return;
    }

    if (!docText) return;

    const requestId = ++translationRequestRef.current;
    setTranslating(true);
    try {
      const apiBase = state?.apiBase || "http://localhost:5000";
      const response = await fetch(`${apiBase}/api/translate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: {
            summary: summary,
            simplified_explanation: simplifiedExplanation,
            key_points: keyPoints,
            full_text: fullText,
            entities: entities
          },
          language: currentLanguage,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (requestId !== translationRequestRef.current) {
          return;
        }
        setTranslatedData({
          summary: data.summary || null,
          simplified_explanation: data.simplified_explanation || null,
          key_points: data.key_points || null,
          full_text: data.full_text || null,
          entities: data.entities || null
        });
      }
    } catch (error) {
      console.error("Translation error:", error);
    } finally {
      setTranslating(false);
    }
  };

  // Translate content when language changes
  useEffect(() => {
    if (!docText || currentLanguage === "English") {
      return;
    }
    
    performTranslation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLanguage]);

  // Fetch full document text and T5 simplified summary
  useEffect(() => {
    const fetchFullDocument = async () => {
      if (!documentId) return;

      const requestId = ++fullDocumentRequestRef.current;
      setFullDocumentData((prev) => ({
        ...prev,
        loading: true,
        t5_summary_translated: null,
        t5SummaryLocked: false,
        translatedLanguage: currentLanguage
      }));
      
      try {
        const apiBase = state?.apiBase || "http://localhost:5000";
        const response = await fetch(
          `${apiBase}/api/document/${documentId}/full?language=${encodeURIComponent(currentLanguage)}`
        );
        
        if (response.ok) {
          const data = await response.json();
          if (requestId !== fullDocumentRequestRef.current) {
            return;
          }

          console.log("T5 summary before translation:", data.t5_simplified);
          console.log("T5 summary after translation:", data.t5_simplified);

          setFullDocumentData((prev) => {
            if (prev.t5SummaryLocked && prev.translatedLanguage === currentLanguage) {
              return { ...prev, loading: false };
            }

            return {
              full_text: data.full_text || null,
              t5_simplified: data.t5_simplified || null,
              t5_summary_translated: data.t5_simplified || null,
              t5SummaryLocked: Boolean(data.t5_simplified),
              translatedLanguage: currentLanguage,
              loading: false
            };
          });
        }
      } catch (error) {
        console.error("Error fetching full document:", error);
        setFullDocumentData((prev) => ({ ...prev, loading: false }));
      }
    };
    
    fetchFullDocument();
  }, [documentId, state?.apiBase, currentLanguage]);

  // Use translated content if available, otherwise use original
  const displaySummary = translatedData.summary || summary;
  const displaySimplifiedExplanation = translatedData.simplified_explanation || simplifiedExplanation;
  const displayKeyPoints = translatedData.key_points || keyPoints;
  const displayT5Summary = t5SummaryTranslated || t5Summary;
  const displayEntities = entities;
  const displaySimplifiedSummary = displayKeyPoints.length > 0 
    ? displayKeyPoints.map((point, index) => `${index + 1}. ${point}`).join('\n')
    : "No key points available.";

  const truncatedLength = 1800;
  const displayedDocText =
    showFullDoc || fullText.length <= truncatedLength
      ? fullText
      : `${fullText.slice(0, truncatedLength)}...`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 overflow-hidden">
      {/* Background Blobs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-lime-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Navigation Bar */}
      <nav className="relative z-10 bg-white/70 backdrop-blur border-b border-green-100">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">AI</span>
            </div>
            <span className="text-white font-bold text-xl">Multi-AI</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-[11px] font-semibold text-gray-500 uppercase tracking-widest">
              Output language
            </div>
            <select
              value={currentLanguage}
              onChange={(e) => {
                const next = e.target.value;
                setLanguage(next);
                // Reset translated data when English is selected
                if (next === "English") {
                  setTranslatedData(createEmptyTranslatedData());
                }
                const nextState = { ...(state || {}), language: next };
                try {
                  sessionStorage.setItem("lastOutputState", JSON.stringify(nextState));
                } catch (err) {
                  // ignore storage failures
                }
              }}
              className="px-3 py-2 rounded-xl border border-gray-200 bg-white/80 text-sm text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
            >
              <option>English</option>
              <option>Hindi</option>
              <option>Tamil</option>
              <option>Telugu</option>
              <option>Kannada</option>
              <option>Malayalam</option>
              <option>Bengali</option>
              <option>Marathi</option>
              <option>Gujarati</option>
              <option>Punjabi</option>
            </select>
            <button
              onClick={performTranslation}
              disabled={translating || currentLanguage === "English"}
              className="px-3 py-2 rounded-xl border border-gray-200 bg-white/80 text-sm text-gray-800 shadow-sm hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {translating ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Translating...
                </span>
              ) : (
                "Translate"
              )}
            </button>
          <button
            onClick={() => navigate("/upload")}
            className="text-white/80 hover:text-white transition-colors"
          >
            ← Back
          </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative z-10 min-h-[calc(100vh-80px)] flex flex-col bg-gradient-to-br from-gray-50 via-white to-gray-50">
        {/* Floating background elements */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-green-100 rounded-full opacity-5 blur-3xl -z-10"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-emerald-100 rounded-full opacity-5 blur-3xl -z-10"></div>

        {/* Message Container */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto w-full px-4 md:px-8 pt-8 md:pt-12 pb-4">
            <div className="grid gap-8 md:grid-cols-12 items-start">
              {/* Left column: document + summaries + key points */}
              <div className="md:col-span-8 space-y-6">
                {/* 1️⃣ Original Document */}
                {docText && (
                  <div className="space-y-3 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-8 h-8 bg-slate-100 rounded-full">
                          <svg
                            className="w-4 h-4 text-slate-600"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h8.5a2 2 0 001.414-.586l2.5-2.5A2 2 0 0017 13.5V5a2 2 0 00-2-2H4z" />
                          </svg>
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                            Original Document
                          </span>
                          <p className="text-[11px] text-gray-400">
                            First 1500–2000 characters of your upload
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white/90 backdrop-blur-lg rounded-2xl p-5 shadow-lg border border-slate-200/70">
                      <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-gray-800 whitespace-pre-wrap">
                        {displayedDocText}
                      </div>
                      {docText.length > truncatedLength && (
                        <div className="mt-3 flex justify-end">
                          <button
                            onClick={() => setShowFullDoc((prev) => !prev)}
                            className="text-xs font-semibold text-green-700 hover:text-green-800 bg-green-50 hover:bg-green-100 px-3 py-1 rounded-full border border-green-200 transition-colors"
                          >
                            {showFullDoc ? "Show Less" : "Show More"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 1️⃣B Original Document Info */}
                <div className="space-y-3 animate-fadeIn">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
                      <svg
                        className="w-4 h-4 text-blue-600"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                        Original Document Info
                      </span>
                      <p className="text-[11px] text-gray-400">
                        Details about your uploaded document
                      </p>
                    </div>
                  </div>
                  <div className="bg-blue-50/90 backdrop-blur-lg rounded-2xl p-5 shadow-lg border border-blue-200/70">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                          File Name
                        </span>
                        <p className="text-gray-800 font-medium truncate" title={filename}>
                          {filename}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                          File Type
                        </span>
                        <p className="text-gray-800 font-medium">{fileType}</p>
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                          Characters
                        </span>
                        <p className="text-gray-800 font-medium">{textChars.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                          Words (est.)
                        </span>
                        <p className="text-gray-800 font-medium">{wordCount.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                          Est. Reading Time
                        </span>
                        <p className="text-gray-800 font-medium">{estimatedReadingTime} min</p>
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                          Language
                        </span>
                        <p className="text-gray-800 font-medium">{currentLanguage}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2️⃣ Summarized Document */}
                <div className="space-y-3 animate-fadeIn">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full">
                      {translating ? (
                        <svg className="w-4 h-4 text-green-600 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg
                          className="w-4 h-4 text-green-600"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                        Summarized Document
                      </span>
                      <p className="text-[11px] text-gray-400">
                        {translating ? "Translating..." : "High-level overview generated by AI"}
                      </p>
                    </div>
                  </div>
                  <div className="bg-green-50/90 backdrop-blur-lg rounded-2xl p-7 shadow-lg border border-green-200/70">
                    <p className="text-gray-900 leading-relaxed text-base whitespace-pre-wrap font-medium">
                      {displaySummary}
                    </p>
                  </div>
                </div>

                {displaySimplifiedExplanation && (
                  <div className="space-y-3 animate-fadeIn">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-8 h-8 bg-emerald-100 rounded-full">
                        <svg
                          className="w-4 h-4 text-emerald-600"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-9-1a1 1 0 012 0v3a1 1 0 11-2 0V9zm1-4a1.25 1.25 0 100 2.5A1.25 1.25 0 0010 5z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                          Simplified Explanation
                        </span>
                        <p className="text-[11px] text-gray-400">
                          Plain-language explanation generated after summarization
                        </p>
                      </div>
                    </div>
                    <div className="bg-emerald-50/90 backdrop-blur-lg rounded-2xl p-7 shadow-lg border border-emerald-200/70">
                      <p className="text-gray-900 leading-relaxed text-base whitespace-pre-wrap font-medium">
                        {displaySimplifiedExplanation}
                      </p>
                    </div>
                  </div>
                )}

                {/* 2️⃣B T5 Simplified Summary */}
                {displayT5Summary && (
                  <div className="space-y-3 animate-fadeIn">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-8 h-8 bg-teal-100 rounded-full">
                        {fullDocumentData.loading ? (
                          <svg className="w-4 h-4 text-teal-600 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <svg
                            className="w-4 h-4 text-teal-600"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                          T5 Simplified Summary
                        </span>
                        <p className="text-[11px] text-gray-400">
                          {fullDocumentData.loading ? "Generating..." : "Quick summary using T5 model"}
                        </p>
                      </div>
                    </div>
                    <div className="bg-teal-50/90 backdrop-blur-lg rounded-2xl p-7 shadow-lg border border-teal-200/70">
                      <div className="text-gray-900 leading-relaxed text-base whitespace-pre-wrap font-medium">
                        {displayT5Summary}
                      </div>
                    </div>
                  </div>
                )}

                {/* 3️⃣ Key Points */}
                {displayKeyPoints.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-8 h-8 bg-lime-100 rounded-full">
                        <svg
                          className="w-4 h-4 text-lime-600"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M10 3a1 1 0 011 1v1h2a1 1 0 110 2h-2v2h2a1 1 0 110 2h-2v2h2a1 1 0 110 2h-2v1a1 1 0 11-2 0v-1H7a1 1 0 010-2h2v-2H7a1 1 0 010-2h2V7H7a1 1 0 010-2h2V4a1 1 0 011-1z" />
                        </svg>
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                          Key Points
                        </span>
                        <p className="text-[11px] text-gray-400">
                          Bullet points extracted from the document
                        </p>
                      </div>
                    </div>
                    <div className="bg-white/90 backdrop-blur-lg rounded-2xl p-7 shadow-lg border border-lime-200/60">
                      <ul className="space-y-2 text-gray-800">
                        {displayKeyPoints.map((p, i) => (
                          <li
                            key={i}
                            className="text-base flex items-start gap-2"
                          >
                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-lime-500 flex-shrink-0" />
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              {/* Right column: entities + document meta */}
              <div className="md:col-span-4 space-y-6">
                {displayEntities && (
                  <div className="space-y-3">
                    {/* 4️⃣ Extract Entities Button */}
                    <button
                      onClick={() => setShowEntities((prev) => !prev)}
                      className="inline-flex items-center justify-center w-full gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-md hover:shadow-lg transition-all"
                    >
                      <svg
                        className={`w-4 h-4 transition-transform duration-300 ${showEntities ? "rotate-45" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                      {showEntities ? "Hide Entities" : "Extract Entities"}
                    </button>

                    {/* 5️⃣ Important Sections (Entities) */}
                    {showEntities && (
                      <div className="space-y-3 pt-2">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center justify-center w-8 h-8 bg-emerald-100 rounded-full">
                            <svg
                              className="w-4 h-4 text-emerald-600"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm2 3h8v2H6V6zm0 4h8v2H6v-2z" />
                            </svg>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                              Important Sections
                            </span>
                            <span className="text-[11px] text-gray-500">
                              View grouped legal terms
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                          {/* Acts & Laws */}
                          <div className="rounded-xl shadow-md p-4 bg-white">
                            <h3 className="text-sm font-semibold text-gray-700 mb-2">
                              Acts &amp; Laws
                            </h3>
                            <ul className="text-sm text-gray-800 space-y-1">
                              <li>{displayEntities.act || "Not Found"}</li>
                            </ul>
                          </div>

                          {/* Sections */}
                          <div className="rounded-xl shadow-md p-4 bg-white">
                            <h3 className="text-sm font-semibold text-gray-700 mb-2">
                              Sections
                            </h3>
                            <ul className="text-sm text-gray-800 space-y-1">
                              {(Array.isArray(displayEntities.sections)
                                ? displayEntities.sections
                                : []
                              ).length > 0
                                ? displayEntities.sections.map((s, i) => (
                                    <li key={i}>• {s}</li>
                                  ))
                                : "Not Found"}
                            </ul>
                          </div>

                          {/* Parties */}
                          <div className="rounded-xl shadow-md p-4 bg-white">
                            <h3 className="text-sm font-semibold text-gray-700 mb-2">
                              Parties
                            </h3>
                            <ul className="text-sm text-gray-800 space-y-1">
                              {(Array.isArray(displayEntities.parties)
                                ? displayEntities.parties
                                : []
                              ).length > 0
                                ? displayEntities.parties.map((p, i) => (
                                    <li key={i}>• {p}</li>
                                  ))
                                : "Not Found"}
                            </ul>
                          </div>

                          {/* Courts */}
                          <div className="rounded-xl shadow-md p-4 bg-white">
                            <h3 className="text-sm font-semibold text-gray-700 mb-2">
                              Courts
                            </h3>
                            <ul className="text-sm text-gray-800 space-y-1">
                              {(Array.isArray(displayEntities.courts)
                                ? displayEntities.courts
                                : []
                              ).length > 0
                                ? displayEntities.courts.map((c, i) => (
                                    <li key={i}>• {c}</li>
                                  ))
                                : "Not Found"}
                            </ul>
                          </div>

                          {/* Dates */}
                          <div className="rounded-xl shadow-md p-4 bg-white">
                            <h3 className="text-sm font-semibold text-gray-700 mb-2">
                              Dates
                            </h3>
                            <ul className="text-sm text-gray-800 space-y-1">
                              {(Array.isArray(displayEntities.dates)
                                ? displayEntities.dates
                                : []
                              ).length > 0
                                ? displayEntities.dates.map((d, i) => (
                                    <li key={i}>• {d}</li>
                                  ))
                                : "Not Found"}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Document meta card */}
                <div className="bg-white/90 rounded-2xl shadow-md border border-gray-200 p-4 text-sm text-gray-700 space-y-2">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">
                    Document Info
                  </h3>
                  <p>
                    <span className="font-medium">ID:</span>{" "}
                    <span className="font-mono text-[11px] bg-gray-50 px-2 py-1 rounded">
                      {documentId || "Not available"}
                    </span>
                  </p>
                  <p>
                    <span className="font-medium">Language:</span>{" "}
                    <span>{currentLanguage}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Action Area */}
        <div className="border-t border-gray-200/50 bg-white/40 backdrop-blur-xl">
          <div className="max-w-3xl mx-auto w-full px-4 md:px-8 py-6">
            {/* Action Buttons */}
            <div className="flex gap-3 pt-5 border-t border-gray-150">
              <button
                onClick={() => navigate("/upload")}
                className="flex-1 group relative px-5 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg hover:shadow-green-500/40 transition-all duration-300 overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-300"></div>
                <span className="relative flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Upload Another
                </span>
              </button>
              
              <button
                onClick={() => navigate("/")}
                className="flex-1 group relative px-5 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-lg hover:shadow-emerald-500/40 transition-all duration-300 overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-300"></div>
                <span className="relative flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12a9 9 0 009-9m0 0a9 9 0 019 9m-9-9v.01M12 3a9.009 9.009 0 01.695 17.803" />
                  </svg>
                  Back Home
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Chatbot */}
      <ChatbotWidget
        documentId={documentId}
        apiBase={state?.apiBase || "http://localhost:5000"}
        language={currentLanguage || "English"}
      />

      {/* CSS for animations */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out forwards;
        }
        .delay-100 {
          animation-delay: 0.2s;
        }
      `}</style>

      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(20px, -50px) scale(1.1); }
          50% { transform: translate(-20px, 20px) scale(0.9); }
          75% { transform: translate(50px, 50px) scale(1.05); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}

export default OutputPage;
