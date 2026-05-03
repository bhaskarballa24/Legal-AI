import React, { useState, useRef, useEffect } from "react";

/**
 * ChatbotWidget Component
 * ========================
 * Floating chat widget for document-aware Q&A
 * 
 * Features:
 * - Uses semantic embeddings to find relevant document chunks
 * - Prevents hallucination by only using document content
 * - Smooth animations and UX
 * - Fallback to extractive summary if OpenAI unavailable
 * 
 * Props:
 * - documentId: UUID of uploaded document (required for QA)
 * - apiBase: Base URL of backend API (e.g., "http://localhost:5000")
 * - language: Document language for multilingual support
 */
export default function ChatbotWidget({ 
  documentId = "", 
  apiBase = "http://localhost:5000", 
  language = "English" 
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(language || "English");
  const [lastQuestion, setLastQuestion] = useState("");
  const messagesRef = useRef(null);

  // Keep widget language in sync with parent language.
  useEffect(() => {
    const next = (language || "English").trim() || "English";
    setSelectedLanguage(next);
  }, [language]);

  // Auto-scroll to latest message
  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages, open]);

  /**
   * Send message to backend and get document-aware answer
   * 
   * Flow:
   * 1. Add user message to chat
   * 2. Send doc_id + question to /api/ask
   * 3. Backend retrieves relevant document chunks using embeddings
   * 4. Backend sends chunks + question to OpenAI
   * 5. OpenAI returns answer based ONLY on document (no hallucination)
   * 6. Display answer in chat
   */
  async function sendMessage() {
    const question = input.trim();
    if (!question || !documentId) return;

    // Add user message to UI immediately
    const userMsg = { sender: "user", text: question };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setLastQuestion(question);

    try {
      // Call backend /api/ask endpoint with document ID
      const response = await fetch(`${apiBase}/api/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doc_id: documentId,  // Use doc_id format (not document_id)
          question: question,
          language: selectedLanguage,
          answer_mode: "short",
        }),
      });

      const data = await response.json();

      if (response.ok && data.answer) {
        // Add bot answer to chat
        setMessages((prev) => [...prev, { sender: "bot", text: data.answer, mode: "short" }]);
      } else {
        // Show error message
        const errorMsg = data.error || "Failed to get answer";
        setMessages((prev) => [...prev, { sender: "bot", text: `⚠️ ${errorMsg}` }]);
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: `❌ Network error: ${error.message}` }
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function explainMore() {
    if (!lastQuestion || !documentId) return;
    setLoading(true);
    try {
      const response = await fetch(`${apiBase}/api/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doc_id: documentId,
          question: lastQuestion,
          language: selectedLanguage,
          answer_mode: "detailed",
        }),
      });
      const data = await response.json();
      if (response.ok && data.answer) {
        setMessages((prev) => [...prev, { sender: "bot", text: data.answer, mode: "detailed" }]);
      } else {
        const errorMsg = data.error || "Failed to get detailed explanation";
        setMessages((prev) => [...prev, { sender: "bot", text: `⚠️ ${errorMsg}` }]);
      }
    } catch (error) {
      setMessages((prev) => [...prev, { sender: "bot", text: `❌ Network error: ${error.message}` }]);
    } finally {
      setLoading(false);
    }
  }

  // Don't show widget if no document
  if (!documentId) {
    return null;
  }

  return (
    <>
      {/* Floating Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setOpen((prev) => !prev)}
          title={open ? "Close chat" : "Ask AI"}
          className="w-14 h-14 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg flex items-center justify-center transition-all transform hover:scale-110 active:scale-95"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-7 w-7"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        </button>
      </div>

      {/* Chat Window */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-80 md:w-96 bg-white border border-gray-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[70vh]">
          {/* Header */}
          <div className="flex items-center justify-between bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-3">
            <h3 className="font-bold text-sm">AI Assistant</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMessages([])}
                title="Clear conversation"
                className="text-xs opacity-75 hover:opacity-100 transition-opacity px-2 py-1 rounded hover:bg-white/10"
              >
                Clear
              </button>
              <button
                onClick={() => setOpen(false)}
                className="text-lg font-bold leading-none opacity-75 hover:opacity-100 transition-opacity"
                title="Close"
              >
                ×
              </button>
            </div>
          </div>

          {/* Messages Container */}
          <div
            ref={messagesRef}
            className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-gray-50 to-white min-h-0"
          >
            {messages.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">Ask any question about the document</p>
                <p className="text-xs text-gray-400 mt-2">AI will answer using document content only</p>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"} animate-slideIn`}
              >
                <div
                  className={`max-w-xs rounded-2xl px-4 py-2 text-sm ${
                    msg.sender === "user"
                      ? "bg-gradient-to-br from-green-500 to-emerald-500 text-white rounded-br-none shadow-md"
                      : "bg-white text-gray-800 border border-gray-200 rounded-bl-none shadow-sm"
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                  {msg.sender === "bot" && msg.mode === "short" && (
                    <div className="mt-2">
                      {/* <button
                        onClick={explainMore}
                        className="text-xs px-2 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50"
                        disabled={loading}
                      >
                        Explain more
                      </button> */}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start animate-slideIn">
                <div className="bg-white text-gray-800 border border-gray-200 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm">
                  <div className="flex gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce delay-100"></div>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce delay-200"></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-200 bg-white p-3">
            <div className="flex gap-2">
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                disabled={loading}
                className="border border-gray-300 rounded-lg px-2 py-2 text-sm bg-white"
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
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !loading) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Ask about the document..."
                disabled={loading}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 disabled:opacity-50 transition-all"
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-medium hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? "..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideIn {
          animation: slideIn 0.3s ease-out forwards;
        }
        .delay-100 {
          animation-delay: 0.1s;
        }
        .delay-200 {
          animation-delay: 0.2s;
        }
      `}</style>
    </>
  );
}

