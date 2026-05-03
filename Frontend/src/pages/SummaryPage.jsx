import React, { useState } from "react";
import { FileText, Landmark, ListChecks, Scale, ChevronDown, ChevronUp } from "lucide-react";
import { Navigate } from "react-router-dom";
import PageSectionCard from "../components/PageSectionCard";
import { useDocument } from "../context/DocumentContext.jsx";

function EntityBlock({ title, items }) {
  // Handle all possible edge cases: undefined, null, empty arrays, empty strings
  let values = [];
  
  if (Array.isArray(items)) {
    values = items.filter(item => item && typeof item === 'string' && item.trim() !== '');
  } else if (items && typeof items === 'string' && items.trim() !== '') {
    values = [items];
  }

  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      {values.length > 0 ? (
        <ul className="mt-3 space-y-2 text-sm text-slate-600">
          {values.map((item, index) => (
            <li key={`${title}-${index}`} className="rounded-xl bg-white px-3 py-2 shadow-sm">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-slate-500">No {title.toLowerCase()} found in document.</p>
      )}
    </div>
  );
}

export default function SummaryPage() {
  const { documentData, hasDocument, loadingFullDocument } = useDocument();
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);

  if (!hasDocument) {
    return <Navigate to="/" replace />;
  }

  const previewText = documentData.full_text || documentData.original_document;
  const displayText =
    previewText.length > 2200 ? `${previewText.slice(0, 2200)}...` : previewText || "No document preview available.";

  return (
    <div className="space-y-6">
      <div className="grid gap-3 l:grid-cols-[1fr_1fr]">
        <div className="max-w-full flex justify-center">
          <div className="w-full max-w-[100vw]">
            <PageSectionCard
              icon={FileText}
        title="Document Preview"
        subtitle="Original document content with expandable view."
        accent="blue"
      >
        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-100 bg-white p-5 max-h-[40vh] overflow-y-auto">
            <div className="text-[15px] leading-7 text-slate-700">
              {isPreviewExpanded ? (
                <div className="whitespace-pre-wrap">{previewText || "No document preview available."}</div>
              ) : (
                <div className="whitespace-pre-wrap">{displayText}</div>
              )}
            </div>
            {previewText && previewText.length > 2200 && (
              <button
                onClick={() => setIsPreviewExpanded(!isPreviewExpanded)}
                className="mt-4 flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors"
              >
                {isPreviewExpanded ? (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    Show Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    Show More
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </PageSectionCard>
          </div>
        </div>

        <PageSectionCard
          icon={Scale}
          title="Document Summary"
          subtitle="Main AI-generated summary for your uploaded document."
        >
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">Document ID</p>
                <p className="mt-2 break-all font-mono text-sm text-slate-700">
                  {documentData.document_id || "Unavailable"}
                </p>
              </div>
              <div className="rounded-2xl border border-sky-100 bg-sky-50/80 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-sky-700">Characters</p>
                <p className="mt-2 text-sm font-semibold text-slate-700">
                  {(documentData.textChars || previewText.length || 0).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="rounded-3xl border border-slate-100 bg-white p-5 text-[15px] leading-7 text-slate-700">
              {documentData.summary || "Summary will appear here after analysis."}
            </div>
          </div>
        </PageSectionCard>
      </div>


      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <PageSectionCard
          icon={ListChecks}
          title="Key Points"
          subtitle="Fast-scan takeaways for presentation and review."
          accent="amber"
        >
          {documentData.key_points.length > 0 ? (
            <ul className="space-y-3">
              {documentData.key_points.map((point, index) => (
                <li
                  key={`${point}-${index}`}
                  className="flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50/60 px-4 py-3 text-sm leading-6 text-slate-700"
                >
                  <span className="mt-1 inline-flex h-6 w-6 flex-none items-center justify-center rounded-full bg-amber-500 text-xs font-semibold text-white">
                    {index + 1}
                  </span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No key points available for this document yet.</p>
          )}
        </PageSectionCard>

        <PageSectionCard
          icon={Landmark}
          title="Extracted Entities"
          subtitle="Acts, sections, parties, courts, and important dates."
          accent="slate"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <EntityBlock title="Acts" items={documentData.entities?.act} />
            <EntityBlock title="Sections" items={documentData.entities?.sections} />
            <EntityBlock title="Parties" items={documentData.entities?.parties} />
            <EntityBlock title="Courts" items={documentData.entities?.courts || []} />
            <EntityBlock title="Dates" items={documentData.entities?.dates} />
          </div>
        </PageSectionCard>
      </div>
    </div>
  );
}
