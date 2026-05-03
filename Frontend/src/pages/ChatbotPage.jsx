import React, { useContext, useEffect, useRef, useState } from "react";
import { Bot, Languages, SendHorizontal } from "lucide-react";
import { Navigate } from "react-router-dom";
import PageSectionCard from "../components/PageSectionCard";
import { LanguageContext } from "../context/LanguageContext";
import { useDocument } from "../context/DocumentContext.jsx";

const languageOptions = [
  "English",
  "Hindi",
  "Tamil",
  "Telugu",
  "Kannada",
  "Malayalam",
  "Bengali",
  "Marathi",
  "Gujarati",
  "Punjabi",
];

export default function ChatbotPage() {
  const { language, setLanguage } = useContext(LanguageContext);
  const { documentData, hasDocument } = useDocument();
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const messagesRef = useRef(null);

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages, loading]);

  if (!hasDocument || !documentData.document_id) {
    return <Navigate to="/" replace />;
  }

  async function handleAsk() {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || loading) {
      return;
    }

    setMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-user`,
        role: "user",
        text: trimmedQuestion,
      },
    ]);
    setQuestion("");
    setLoading(true);

    try {
      const response = await fetch(`${documentData.apiBase}/api/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doc_id: documentData.document_id,
          question: trimmedQuestion,
          language,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Status ${response.status}`);
      }

      const data = await response.json();
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-bot`,
          role: "bot",
          text: data.answer || "No answer returned.",
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-error`,
          role: "bot",
          text: `Unable to fetch an answer right now: ${error.message || error}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <PageSectionCard
        icon={Languages}
        title="Chat Controls"
        subtitle="Ask questions about the uploaded document in your preferred language."
        accent="amber"
      >
        <div className="space-y-5">
          <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-amber-700">Document ID</p>
            <p className="mt-2 break-all font-mono text-sm text-slate-700">{documentData.document_id}</p>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Language selection</span>
            <select
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-emerald-300"
            >
              {languageOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-sm leading-6 text-slate-600">
            <p className="font-semibold text-slate-800">Quick context</p>
            <p className="mt-2">{documentData.summary || "Upload a document to see its summary here."}</p>
          </div>
        </div>
      </PageSectionCard>

      <PageSectionCard
        icon={Bot}
        title="Document Chatbot"
        subtitle="Interactive Q&A using your stored document context."
      >
        <div className="flex h-[620px] flex-col overflow-hidden rounded-[26px] border border-slate-100 bg-slate-50/80">
          <div ref={messagesRef} className="flex-1 space-y-4 overflow-y-auto p-5">
            {messages.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <div className="max-w-sm rounded-3xl border border-dashed border-emerald-200 bg-white/90 p-6 text-center text-sm text-slate-500">
                  Start the conversation with a question like "What is the main issue in this case?"
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-3xl px-4 py-3 text-sm leading-6 shadow-sm ${
                      message.role === "user"
                        ? "bg-emerald-600 text-white"
                        : "border border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    {message.text}
                  </div>
                </div>
              ))
            )}

            {loading ? (
              <div className="flex justify-start">
                <div className="rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
                  Thinking...
                </div>
              </div>
            ) : null}
          </div>

          <div className="border-t border-slate-200 bg-white p-4">
            <div className="flex gap-3">
              <input
                type="text"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleAsk();
                  }
                }}
                placeholder="Ask anything about the current document..."
                className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-emerald-300"
              />
              <button
                onClick={handleAsk}
                disabled={loading || !question.trim()}
                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <SendHorizontal className="h-4 w-4" />
                Send
              </button>
            </div>
          </div>
        </div>
      </PageSectionCard>
    </div>
  );
}
