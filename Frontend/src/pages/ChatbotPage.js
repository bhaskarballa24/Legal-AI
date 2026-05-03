import React, { useState, useContext } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LanguageContext } from "../context/LanguageContext";

function ChatbotPage() {
	const location = useLocation();
	const navigate = useNavigate();
	const state = location.state || {};
	const { language } = useContext(LanguageContext);
	const [documentId] = useState(state.documentId || "");
	const [summary] = useState(
		typeof state.summary === "string"
			? state.summary
			: (state.summary && typeof state.summary.summary === "string" ? state.summary.summary : "")
	);
	const [detailedSummary] = useState(
		typeof state.detailedSummary === "string"
			? state.detailedSummary
			: (state.summary && typeof state.summary.detailedSummary === "string" ? state.summary.detailedSummary : "")
	);
	const [question, setQuestion] = useState("");
	const [chatHistory, setChatHistory] = useState([]);
	const [loading, setLoading] = useState(false);
	const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

	// If no document ID was provided via navigation state, prompt user to upload first
	if (!documentId) {
		return (
			<div className="min-h-screen flex flex-col items-center justify-center p-10 bg-gradient-to-br from-gray-50 to-gray-100">
				<div className="max-w-md text-center">
					<div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
						<svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
					</div>
					<h2 className="text-2xl font-bold text-gray-800 mb-2">No Document Found</h2>
					<p className="text-gray-600 mb-6">Please upload a document first to start chatting with AI.</p>
					<button 
						onClick={() => navigate("/upload")} 
						className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg"
					>
						↑ Go to Upload
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 via-white to-gray-50">
			{/* Floating background elements */}
			<div className="fixed top-0 left-1/4 w-96 h-96 bg-green-100 rounded-full opacity-5 blur-3xl -z-10"></div>
			<div className="fixed bottom-1/4 right-1/4 w-80 h-80 bg-emerald-100 rounded-full opacity-5 blur-3xl -z-10"></div>

			{/* Header */}
			<div className="border-b border-gray-200/50 bg-white/40 backdrop-blur-lg sticky top-0 z-50">
				<div className="max-w-4xl mx-auto px-4 md:px-8 py-5 flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-bold text-gray-900">AI Document Assistant</h1>
						<p className="text-sm text-gray-500 mt-1">Doc ID: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{documentId}</span></p>
					</div>
					<button
						onClick={() => navigate("/upload")}
						className="text-gray-600 hover:text-gray-900 transition-colors p-2 hover:bg-gray-100 rounded-lg"
					>
						<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
						</svg>
					</button>
				</div>
			</div>

			{/* Main Content Area */}
			<div className="flex-1 overflow-y-auto">
				<div className="max-w-4xl mx-auto w-full px-4 md:px-8 py-8">
					{/* Summary Cards */}
					{(summary || detailedSummary) && (
						<div className="mb-10 grid grid-cols-1 md:grid-cols-2 gap-5">
							{summary && (
								<div className="bg-white/70 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-green-200/40 hover:border-green-300/60 transition-all">
									<div className="flex items-center gap-2 mb-3">
										<div className="w-1 h-5 bg-gradient-to-b from-green-500 to-emerald-500 rounded-full"></div>
										<h3 className="font-bold text-gray-700 uppercase tracking-wide text-sm">Quick Summary</h3>
									</div>
									<p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap line-clamp-4">{summary}</p>
								</div>
							)}
							{detailedSummary && (
								<div className="bg-white/70 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-emerald-200/40 hover:border-emerald-300/60 transition-all">
									<div className="flex items-center gap-2 mb-3">
										<div className="w-1 h-5 bg-gradient-to-b from-emerald-500 to-lime-500 rounded-full"></div>
										<h3 className="font-bold text-gray-700 uppercase tracking-wide text-sm">Detailed Analysis</h3>
									</div>
									<p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap line-clamp-4">{detailedSummary}</p>
								</div>
							)}
						</div>
					)}

					{/* Chat History */}
					<div className="space-y-4 mb-6">
						{chatHistory.length === 0 && (
							<div className="text-center py-12">
								<div className="w-16 h-16 bg-green-100/50 rounded-full flex items-center justify-center mx-auto mb-3">
									<svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
									</svg>
								</div>
								<p className="text-gray-500 text-sm">Ask a question about the document to get started</p>
							</div>
						)}

						{chatHistory.map((msg) => (
							<div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fadeIn`}>
								<div
									className={`max-w-2xl rounded-2xl px-5 py-3 shadow-md transition-all ${
										msg.role === "user"
											? "bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-br-none"
											: "bg-white/80 backdrop-blur-lg border border-gray-200/50 text-gray-800 rounded-bl-none"
									}`}
								>
									<div className={`text-xs font-semibold mb-1 ${msg.role === "user" ? "text-green-100" : "text-gray-500"} uppercase tracking-wide`}>
										{msg.role === "user" ? "You" : "AI Assistant"}
									</div>
									<p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
								</div>
							</div>
						))}

						{loading && (
							<div className="flex justify-start animate-fadeIn">
								<div className="bg-white/80 backdrop-blur-lg border border-gray-200/50 text-gray-800 rounded-2xl rounded-bl-none px-5 py-4 shadow-md">
									<div className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">AI Assistant</div>
									<div className="flex gap-2">
										<div className="w-2 h-2 bg-green-500 rounded-full animate-bounce"></div>
										<div className="w-2 h-2 bg-green-500 rounded-full animate-bounce delay-100"></div>
										<div className="w-2 h-2 bg-green-500 rounded-full animate-bounce delay-200"></div>
									</div>
								</div>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Input Area */}
			<div className="border-t border-gray-200/50 bg-white/40 backdrop-blur-xl sticky bottom-0">
				<div className="max-w-4xl mx-auto w-full px-4 md:px-8 py-5">
					<div className="flex gap-3">
						<input
							type="text"
							value={question}
							onChange={(e) => setQuestion(e.target.value)}
							placeholder="Ask anything about your document..."
							className="flex-1 px-5 py-3 rounded-xl bg-white/80 backdrop-blur-lg border border-gray-200/50 focus:border-green-400/50 focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-all text-gray-800 placeholder-gray-500"
							disabled={loading}
							onKeyDown={(e) => {
								if (e.key === "Enter" && !e.shiftKey && !loading) {
									e.preventDefault();
									handleAsk();
								}
							}}
						/>
						<button
							onClick={handleAsk}
							className="px-6 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold hover:from-green-600 hover:to-emerald-700 shadow-lg hover:shadow-green-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
							disabled={loading || !question.trim()}
						>
							{loading ? (
								<span className="flex items-center gap-2">
									<svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v20m10-10H2" />
									</svg>
									Thinking...
								</span>
							) : (
								"Send"
							)}
						</button>
					</div>
				</div>
			</div>

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
					animation: fadeIn 0.5s ease-out forwards;
				}
				.delay-100 {
					animation-delay: 0.1s;
				}
				.delay-200 {
					animation-delay: 0.2s;
				}
				.line-clamp-4 {
					display: -webkit-box;
					-webkit-line-clamp: 4;
					-webkit-box-orient: vertical;
					overflow: hidden;
				}
			`}</style>
		</div>
	);

	async function handleAsk() {
		const q = question.trim();
		if (!q || loading || !documentId) return;

		setLoading(true);
		const userMsg = { id: Date.now() + "_u", role: "user", text: q };
		setChatHistory((prev) => [...prev, userMsg]);
		setQuestion("");

		try {
			const res = await fetch(`${API_BASE}/api/ask`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					doc_id: documentId,
					question: q,
					language: language,
				}),
			});

			if (!res.ok) {
				const txt = await res.text();
				throw new Error(txt || `Status ${res.status}`);
			}

			const data = await res.json();
			const botMsg = {
				id: Date.now() + "_b",
				role: "bot",
				text: data.answer || "No answer returned.",
			};
			setChatHistory((prev) => [...prev, botMsg]);
		} catch (err) {
			console.error("Ask error:", err);
			const errMsg = {
				id: Date.now() + "_e",
				role: "bot",
				text: `⚠️ Error: ${err.message || err}`,
			};
			setChatHistory((prev) => [...prev, errMsg]);
		} finally {
			setLoading(false);
		}
	}
}

export default ChatbotPage;
