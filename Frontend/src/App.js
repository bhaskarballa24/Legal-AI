import React, { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import AppShell from "./components/AppShell";
import { DocumentProvider, useDocument } from "./context/DocumentContext.jsx";
import UploadPage from "./pages/UploadPage.jsx";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import SummaryPage from "./pages/SummaryPage.jsx";
import SimplifiedPage from "./pages/SimplifiedPage.jsx";
import T5SummaryPage from "./pages/T5SummaryPage.jsx";
import ChatbotPage from "./pages/ChatbotPage.jsx";
import HistoryPage from "./pages/HistoryPage.jsx";
import LandingPage from "./pages/LandingPage.js";

function LegacyOutputRedirect() {
  const location = useLocation();
  const navigate = useNavigate();
  const { replaceDocumentData } = useDocument();

  useEffect(() => {
    if (location.state) {
      replaceDocumentData(location.state);
    }
    navigate("/summary", { replace: true });
  }, [location.state, navigate, replaceDocumentData]);

  return null;
}

function App() {
  return (
    <DocumentProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route element={<AppShell />}>
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/upload" element={<Navigate to="/upload" replace />} />
            <Route path="/summary" element={<SummaryPage />} />
            <Route path="/simplified" element={<SimplifiedPage />} />
            <Route path="/t5" element={<T5SummaryPage />} />
            <Route path="/chatbot" element={<ChatbotPage />} />
            <Route path="/history" element={<HistoryPage />} />
          </Route>

          <Route path="/output" element={<LegacyOutputRedirect />} />
          <Route path="/processing" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </DocumentProvider>
  );
}

export default App;
