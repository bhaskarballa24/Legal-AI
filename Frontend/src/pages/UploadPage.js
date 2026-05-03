import React, { useEffect, useRef, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { clearAuth, getAuth, getAuthToken } from "../utils/auth";
import { LanguageContext } from "../context/LanguageContext";

function UploadPage() {
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [apiBaseInput, setApiBaseInput] = useState(process.env.REACT_APP_API_BASE || "http://localhost:5000");
  const API_BASE = apiBaseInput.trim();
  const [healthStatus, setHealthStatus] = useState(null);
  const [selectedName, setSelectedName] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [truncateNote, setTruncateNote] = useState("");
  const [auth, setAuth] = useState(() => getAuth());
  const { setLanguage } = useContext(LanguageContext);

  useEffect(() => {
    const existingAuth = getAuth();
    if (!existingAuth?.token) {
      navigate("/login");
      return;
    }
    setLanguage("English");
    setAuth(existingAuth);
  }, [navigate, setLanguage]);

  async function handleLogout() {
    const token = getAuthToken();
    try {
      if (token) {
        await fetch(`${API_BASE.replace(/\/+$/,'')}/api/auth/logout`, {
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
    const f = selectedFile || fileRef.current?.files?.[0];
    if (!f) {
      setError("Please select a .txt, .pdf or .docx file.");
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      fd.append("language", "English");
      const token = getAuthToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      const res = await fetch(`${API_BASE}/api/upload_summary`, { method: "POST", headers, body: fd });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `Status ${res.status}`);
      }
      const data = await res.json();
      const docId = data.documentId || "";

      let summaryRaw = data.summary;
      let detailedRaw = data.simplified_text || data.simplified_explanation || data.detailedSummary;
      const keyPointsRaw = Array.isArray(data.keyPoints) ? data.keyPoints : (Array.isArray(data.key_points) ? data.key_points : []);
      const entitiesRaw = data.entities && typeof data.entities === "object" ? data.entities : null;

      // Backward/forward compatibility: if backend sends summary bundle object,
      // normalize it into plain strings for React rendering.
      if (summaryRaw && typeof summaryRaw === "object") {
        if (!detailedRaw && typeof summaryRaw.detailedSummary === "string") {
          detailedRaw = summaryRaw.detailedSummary;
        }
        if (typeof summaryRaw.summary === "string") {
          summaryRaw = summaryRaw.summary;
        }
      }

      const summary = typeof summaryRaw === "string" ? summaryRaw : (summaryRaw ? String(summaryRaw) : "");
      const detailed = typeof detailedRaw === "string" ? detailedRaw : (detailedRaw ? String(detailedRaw) : "");
      if (data.truncated) setTruncateNote(data.truncatedReason || "Document was truncated for faster processing.");

      const outputState = {
        summary,
        simplified_text: detailed,
        simplified_explanation: detailed,
        detailedSummary: detailed,
        documentId: docId,
        apiBase: API_BASE,
        language: "English",
        keyPoints: keyPointsRaw,
        entities: entitiesRaw,
        original_document: data.original_document || "",
        textChars: data.textChars || 0,
        filename: f.name || "Uploaded Document",
      };
      try {
        sessionStorage.setItem("lastOutputState", JSON.stringify(outputState));
      } catch (e) {
        // ignore storage failures (private mode / quota)
      }

      navigate("/output", {
        state: outputState,
      });
    } catch (err) {
      const msg = err.message || String(err);
      setError("Upload/processing error: " + msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg">
            <div className="max-w-6xl mx-auto px-8 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Multi-AI Document Analyzer</h1>
            <p className="text-green-50 mt-1 text-xs">Smart summaries and detailed insights</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-sm text-green-100">Welcome back</p>
              <p className="text-lg font-semibold">{auth?.user?.name || auth?.user?.email || "User"}</p>
            </div>
            <button onClick={handleLogout} className="px-6 py-2 bg-white text-green-600 font-medium rounded-lg hover:bg-green-50 transition-colors shadow-md hover:shadow-lg">
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Left Sidebar */}
          <div className="md:col-span-4 space-y-6">
            <div className="bg-white p-5 rounded-xl shadow-md hover:shadow-lg transition-shadow">
              <h2 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <svg className="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M6 6V2a1 1 0 011-1h6a1 1 0 011 1v4a1 1 0 001 1h7a2 2 0 012 2v7a2 2 0 01-2 2H3a2 2 0 01-2-2V9a2 2 0 012-2h1a1 1 0 001-1z" />
                </svg>
                Why use this tool?
              </h2>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex gap-3">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>Fast summaries in your chosen language</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>Context-aware Q&A via smart chatbot</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>Supports PDF, DOCX, and TXT (max 64MB)</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>Large docs auto-truncated for speed</span>
                </li>
              </ul>
            </div>

            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
            {truncateNote && (
              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-lg">
                <p className="text-sm text-yellow-700">{truncateNote}</p>
              </div>
            )}
          </div>

          {/* Main Upload Area */}
          <div className="md:col-span-8">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-6 py-4 text-white">
                <h2 className="text-lg font-bold mb-1">Upload Your Document</h2>
                <p className="text-green-50 text-sm">Drop your file here or click to browse. We'll analyze and summarize it instantly.</p>
              </div>

              <div className="p-6">
                <input
                  id="file-input"
                  ref={fileRef}
                  type="file"
                  accept=".txt,.pdf,.docx"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    setSelectedFile(f || null);
                    setSelectedName(f?.name || "");
                  }}
                />

                <div
                  onClick={() => fileRef.current && fileRef.current.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const f = e.dataTransfer?.files?.[0];
                    if (f) {
                      setSelectedFile(f);
                      setSelectedName(f.name || "");
                    }
                  }}
                  className={`relative border-2 border-dashed rounded-2xl p-8 transition-all cursor-pointer min-h-[200px] flex flex-col items-center justify-center ${selectedFile ? 'border-green-400 bg-green-50' : 'border-gray-300 bg-gray-50 hover:border-green-400 hover:bg-green-50'}`}
                >
                  <div className="text-center">
                    <div className="flex justify-center mb-4">
                      {selectedFile ? (
                        <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                          <svg className="h-8 w-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                      ) : (
                        <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                          <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-gray-800">{selectedName || 'Drop your file here'}</h3>
                    <p className="text-sm text-gray-500 mt-2">or click to browse your computer</p>
                    <p className="text-xs text-gray-400 mt-3">Supported formats: PDF, DOCX, TXT (max 64MB)</p>
                    {selectedFile && (
                      <div className="mt-2 space-y-1">
                        <p className="text-xs text-gray-700 font-medium">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (fileRef.current) fileRef.current.value = '';
                            setSelectedName('');
                            setSelectedFile(null);
                          }}
                          className="text-sm text-red-600 hover:text-red-700 font-medium"
                        >
                          ✕ Remove file
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 space-y-5">
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => {
                        setSelectedFile(null);
                        setSelectedName('');
                        if (fileRef.current) fileRef.current.value = '';
                      }}
                      className="flex-1 px-5 py-2 border-2 border-gray-300 text-gray-700 font-medium text-sm rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-all"
                    >
                      Reset
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={loading || !selectedFile}
                      className={`flex-1 px-6 py-3 text-white font-medium text-sm rounded-lg transition-all flex items-center justify-center gap-2 ${
                        loading || !selectedFile
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:shadow-lg hover:shadow-green-200'
                      }`}
                    >
                      {loading ? (
                        <>
                          <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                          </svg>
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" />
                          </svg>
                          Analyze Document
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UploadPage;
