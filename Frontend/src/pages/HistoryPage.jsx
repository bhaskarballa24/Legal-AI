import React, { useEffect, useState } from "react";
import { Clock3, FolderOpen, History, ScrollText, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageSectionCard from "../components/PageSectionCard";
import { useDocument } from "../context/DocumentContext.jsx";
import { getAuthToken } from "../utils/auth";

function formatUploadDate(value) {
  if (!value) {
    return "Unknown date";
  }

  const date = new Date(Number(value) * 1000);
  return Number.isNaN(date.getTime()) ? "Unknown date" : date.toLocaleString();
}

function SummaryPopup({ isOpen, onClose, summary, filename }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-800">Document Summary</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="mb-4">
          <p className="text-sm font-medium text-slate-600">Filename:</p>
          <p className="text-sm text-slate-800 mt-1">{filename || "Untitled document"}</p>
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          <p className="text-sm font-medium text-slate-600 mb-2">Summary:</p>
          <div className="text-sm text-slate-700 leading-6 bg-slate-50 rounded-lg p-4">
            {summary || "No summary available."}
          </div>
        </div>
        
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const { replaceDocumentData } = useDocument();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const apiBase = process.env.REACT_APP_API_BASE || "http://localhost:5000";

  useEffect(() => {
    let cancelled = false;

    async function fetchHistory() {
      setLoading(true);
      setError("");
      try {
        const token = getAuthToken();
        const response = await fetch(`${apiBase}/api/history`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!response.ok) {
          throw new Error(`Status ${response.status}`);
        }

        const data = await response.json();
        if (!cancelled) {
          setItems(Array.isArray(data.items) ? data.items : []);
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError.message || "Failed to load history.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchHistory();

    return () => {
      cancelled = true;
    };
  }, [apiBase]);

  function openSummaryPopup(item) {
    setSelectedItem(item);
    setShowPopup(true);
  }

  function closePopup() {
    setShowPopup(false);
    setSelectedItem(null);
  }

  function openFullDocument(item) {
    replaceDocumentData({
      document_id: item.doc_id,
      filename: item.filename,
      summary: item.summary,
      apiBase,
      uploaded_at: item.uploaded_at,
    });
    navigate("/summary");
  }

  return (
    <>
      <PageSectionCard
        icon={History}
        title="Document History"
        subtitle="Recent uploads pulled from the backend history endpoint."
        accent="slate"
      >
        {loading ? <p className="text-sm text-slate-500">Loading history...</p> : null}
        {error ? <p className="text-sm text-rose-600">Unable to load history: {error}</p> : null}

        {!loading && !error && items.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center text-sm text-slate-500">
            No uploaded documents were found for this account yet.
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          {items.map((item) => (
            <div
              key={item.doc_id}
              className="group rounded-[26px] border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                    <ScrollText className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{item.filename || "Untitled document"}</p>
                    <p className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                      <Clock3 className="h-3.5 w-3.5" />
                      {formatUploadDate(item.uploaded_at)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openSummaryPopup(item)}
                    className="rounded-lg p-2 text-slate-300 hover:bg-emerald-50 hover:text-emerald-500 transition-colors"
                    title="View summary"
                  >
                    <ScrollText className="h-5 w-5" />
                  </button>
                {/** 
                  <button
                    onClick={() => openFullDocument(item)}
                    className="rounded-lg p-2 text-slate-300 hover:bg-emerald-50 hover:text-emerald-500 transition-colors"
                    title="Open full document"
                  >
                    <FolderOpen className="h-5 w-5" />
                  </button> */}
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-600">
                {(item.summary || "No summary preview available.").slice(0, 220)}
                {(item.summary || "").length > 220 ? "..." : ""}
              </p>
            </div>
          ))}
        </div>
      </PageSectionCard>

      <SummaryPopup
        isOpen={showPopup}
        onClose={closePopup}
        summary={selectedItem?.summary}
        filename={selectedItem?.filename}
      />
    </>
  );
}
