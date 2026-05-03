import React from "react";
import { Highlighter, Sparkles } from "lucide-react";
import { Navigate } from "react-router-dom";
import PageSectionCard from "../components/PageSectionCard";
import { useDocument } from "../context/DocumentContext.jsx";

function getHighlightedSentences(text) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .map((sentence, index) => ({
      sentence,
      highlighted: index < 2 || sentence.length > 120,
    }));
}

export default function T5SummaryPage() {
  const { documentData, hasDocument, loadingFullDocument } = useDocument();

  if (!hasDocument) {
    return <Navigate to="/" replace />;
  }

  const sentences = getHighlightedSentences(documentData.t5_summary || "");

  return (
    <div className="grid gap-6 justify-center">
      <div className="w-full max-w-[80vw]">
        <PageSectionCard
          icon={Sparkles}
          title="T5 Simplified Summary"
          subtitle={loadingFullDocument ? "Generating T5 summary from the saved document..." : "Clean T5-generated version of the document."}
          accent="sky"
        >
          <div className="space-y-3">
            {sentences.length > 0 ? (
              sentences.map(({ sentence }, index) => (
                <p
                  key={`${sentence}-${index}`}
                  className="rounded-2xl border border-slate-100 bg-white px-4 py-3 text-[15px] leading-7 text-slate-700"
                >
                  {sentence}
                </p>
              ))
            ) : (
              <p className="text-sm text-slate-500">The T5 summary will appear once the full document is loaded.</p>
            )}
          </div>
        </PageSectionCard>
      </div>

      {/* <PageSectionCard
        icon={Highlighter}
        title="Important Sentences"
        subtitle="Highlighted lines call attention to the most presentation-worthy points."
        accent="emerald"
      >
        {sentences.filter((item) => item.highlighted).length > 0 ? (
          <ul className="space-y-3">
            {sentences
              .filter((item) => item.highlighted)
              .map(({ sentence }, index) => (
                <li
                  key={`${sentence}-${index}`}
                  className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-sm leading-6 text-slate-700"
                >
                  {sentence}
                </li>
              ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">Important T5 sentences will appear here.</p>
        )}
      </PageSectionCard> */}
    </div>
  );
}
