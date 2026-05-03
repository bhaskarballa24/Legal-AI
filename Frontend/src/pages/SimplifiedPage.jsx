import React from "react";
import { BookOpenText, Sparkles } from "lucide-react";
import { Navigate } from "react-router-dom";
import PageSectionCard from "../components/PageSectionCard";
import { useDocument } from "../context/DocumentContext.jsx";

export default function SimplifiedPage() {
  const { documentData, hasDocument } = useDocument();

  if (!hasDocument) {
    return <Navigate to="/" replace />;
  }

  const bulletSource = documentData.simplified_text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 6);

  return (
    <div className="grid gap-6 justify-center">
      <div className="w-full max-w-[80vw]">
        <PageSectionCard
          icon={BookOpenText}
          title="Simplified Summary"
          subtitle="A clearer explanation designed for easy reading and demo-friendly presentation."
        >
          <div className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-6">
            <p className="whitespace-pre-wrap text-[15px] leading-8 text-slate-700">
              {documentData.simplified_text || "Simplified explanation will appear here after processing."}
            </p>
          </div>
        </PageSectionCard>
      </div>

      <div className="w-full max-w-[80vw]">
        <PageSectionCard
          icon={Sparkles}
          title="T5 Simplified Summary"
          subtitle="Parallel T5-based summary output below, now included in same screen."
          accent="sky"
        >
          <div className="rounded-3xl border border-sky-100 bg-sky-50/50 p-6">
            <p className="whitespace-pre-wrap text-[15px] leading-8 text-slate-700">
              {documentData.t5_summary || "T5 simplified summary will appear here after processing."}
            </p>
          </div>
        </PageSectionCard>
      </div>

      {/* <PageSectionCard
        icon={Lightbulb}
        title="Easy-To-Read Highlights"
        subtitle="Short bullets for quick revision."
        accent="amber"
      >
        {bulletSource.length > 0 ? (
          <ul className="space-y-3">
            {bulletSource.map((point, index) => (
              <li
                key={`${point}-${index}`}
                className="rounded-2xl border border-amber-100 bg-amber-50/70 px-4 py-3 text-sm leading-6 text-slate-700"
              >
                {point}
              </li>
            ))}
          </ul>
        ) : documentData.key_points.length > 0 ? (
          <ul className="space-y-3">
            {documentData.key_points.map((point, index) => (
              <li
                key={`${point}-${index}`}
                className="rounded-2xl border border-amber-100 bg-amber-50/70 px-4 py-3 text-sm leading-6 text-slate-700"
              >
                {point}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">Upload a document to generate simplified bullet points.</p>
        )}
      </PageSectionCard> */}
    </div>
  );
}
