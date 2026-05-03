import React, { useContext, useEffect, useRef, useState } from "react";
import { ArrowRight, FileUp, RefreshCcw, ShieldCheck, Sparkles, TextSearch } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { clearAuth, getAuth, getAuthToken } from "../utils/auth";
import { LanguageContext } from "../context/LanguageContext";
import { useDocument } from "../context/DocumentContext.jsx";
import PageSectionCard from "../components/PageSectionCard";

export default function UploadPage() {
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [apiBaseInput] = useState(process.env.REACT_APP_API_BASE || "http://localhost:5000");
  const API_BASE = apiBaseInput.trim();
  const [selectedName, setSelectedName] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [truncateNote, setTruncateNote] = useState("");
  const [auth, setAuth] = useState(() => getAuth());
  const { language, setLanguage } = useContext(LanguageContext);
  const { replaceDocumentData } = useDocument();

  useEffect(() => {
    const existingAuth = getAuth();
    if (!existingAuth?.token) {
      navigate("/login");
      return;
    }
    // do not overwrite the user-selected language from the navbar
    // (LanguageContext default is English)
    setAuth(existingAuth);
  }, [navigate]);

  async function handleLogout() {
    const token = getAuthToken();
    try {
      if (token) {
        await fetch(`${API_BASE.replace(/\/+$/, "")}/api/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch (err) {
      // ignore
    } finally {
      clearAuth();
      navigate("/login");
    }
  }

  async function handleSubmit() {
    setError("");
    setTruncateNote("");
    const file = selectedFile || fileRef.current?.files?.[0];
    if (!file) {
      setError("Please select a .txt, .pdf or .docx file.");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
    formData.append("language", language || "English");
      const token = getAuthToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      const response = await fetch(`${API_BASE}/api/upload_summary`, {
        method: "POST",
        headers,
        body: formData,
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || `Status ${response.status}`);
      }

      const data = await response.json();
      if (data.truncated) {
        setTruncateNote(data.truncatedReason || "Document was truncated for faster processing.");
      }

      replaceDocumentData({
        summary: typeof data.summary === "string" ? data.summary : "",
        simplified_text: data.simplified_text || data.simplified_explanation || "",
        simplified_explanation: data.simplified_text || data.simplified_explanation || "",
        documentId: data.documentId || "",
        apiBase: API_BASE,
        keyPoints: Array.isArray(data.key_points) ? data.key_points : [],
        entities: data.entities && typeof data.entities === "object" ? data.entities : null,
        original_document: data.original_document || "",
        textChars: data.textChars || 0,
        filename: file.name || "Uploaded Document",
      });

      navigate("/summary");
    } catch (err) {
      setError(`Upload/processing error: ${err.message || String(err)}`);
    } finally {
      setLoading(false);
    }
  }

  function resetFileSelection() {
    setSelectedFile(null);
    setSelectedName("");
    if (fileRef.current) {
      fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[32px] border border-white/70 bg-[linear-gradient(135deg,rgba(16,185,129,0.94),rgba(14,165,233,0.86))] p-8 text-white shadow-[0_30px_80px_-40px_rgba(15,23,42,0.7)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.3em] text-emerald-50">project demo flow</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight [font-family:Georgia,ui-serif,serif]">
              Upload once, then explore every output from dedicated pages.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-emerald-50/90">
              Your document moves into a cleaner navigation flow with summary, simplified explanation, T5 summary,
              chatbot, and history available from the navbar.
            </p>
          </div>
          <div className="rounded-[28px] border border-white/20 bg-white/10 p-5 backdrop-blur-sm">
            <p className="text-xs uppercase tracking-[0.22em] text-emerald-50/80">Current user</p>
            <p className="mt-2 text-lg font-semibold">{auth?.user?.name || auth?.user?.email || "User"}</p>
            <button
              onClick={handleLogout}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50"
            >
              <ShieldCheck className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <PageSectionCard
          icon={Sparkles}
          title="Why This Layout Works"
          subtitle="Everything important stays easier to present, explain, and navigate."
          accent="amber"
        >
          <div className="space-y-4 text-sm leading-7 text-slate-600">
            <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
              Separate pages prevent summary, simplified text, T5 output, and chatbot UI from competing for attention.
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
              Uploaded document data is stored globally so every page can reuse the same processed result.
            </div>
            <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-4">
              The history view lets you reopen earlier uploads for a smoother demo story.
            </div>
            {error ? <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-rose-700">{error}</div> : null}
            {truncateNote ? (
              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-amber-800">{truncateNote}</div>
            ) : null}
          </div>
        </PageSectionCard>

        <PageSectionCard
          icon={FileUp}
          title="Upload Your Document"
          subtitle="Supports PDF, DOCX, and TXT files up to the configured backend limit."
        >
          <div className="space-y-6">
            <input
              id="file-input"
              ref={fileRef}
              type="file"
              accept=".txt,.pdf,.docx"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                setSelectedFile(file || null);
                setSelectedName(file?.name || "");
              }}
            />

            <div
              onClick={() => fileRef.current && fileRef.current.click()}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const file = event.dataTransfer?.files?.[0];
                if (file) {
                  setSelectedFile(file);
                  setSelectedName(file.name || "");
                }
              }}
              className={`group rounded-[28px] border-2 border-dashed p-8 transition ${
                selectedFile
                  ? "border-emerald-400 bg-emerald-50/70"
                  : "border-slate-300 bg-slate-50/80 hover:border-emerald-300 hover:bg-emerald-50/50"
              }`}
            >
              <div className="flex flex-col items-center text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-white text-emerald-600 shadow-md">
                  <TextSearch className="h-9 w-9" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-slate-800">
                  {selectedName || "Drop your file here or click to browse"}
                </h3>
                <p className="mt-2 text-sm text-slate-500">The app will analyze the document and redirect you to the summary page.</p>
                <p className="mt-4 text-xs uppercase tracking-[0.22em] text-slate-400">PDF • DOCX • TXT</p>
                {selectedFile ? (
                  <div className="mt-5 rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB selected
                  </div>
                ) : null}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                onClick={resetFileSelection}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <RefreshCcw className="h-4 w-4" />
                Reset
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || !selectedFile}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {loading ? "Analyzing..." : "Analyze Document"}
                {!loading ? <ArrowRight className="h-4 w-4" /> : null}
              </button>
            </div>
          </div>
        </PageSectionCard>
      </div>
    </div>
  );
}
