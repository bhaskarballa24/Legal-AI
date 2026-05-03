import React, { useState, useContext } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  AlignJustify,
  Bot,
  FileText,
  History,
  Home,
  LogOut,
  ScanText,
  Sparkles,
  X,
  Languages,
} from "lucide-react";
import { clearAuth, getAuth } from "../utils/auth";
import { LanguageContext } from "../context/LanguageContext";

const navItems = [
  { to: "/", label: "Home", icon: Home },
  { to: "/summary", label: "Document Summary", icon: FileText },
  { to: "/simplified", label: "Simplified Summary", icon: ScanText },
  { to: "/chatbot", label: "Chatbot", icon: Bot },
  { to: "/history", label: "History", icon: History },
];

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

function navClassName({ isActive }) {
  return [
    "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all",
    isActive
      ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/20"
      : "text-slate-700 hover:bg-white hover:text-emerald-700",
  ].join(" ");
}

export default function AppNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const navigate = useNavigate();
  const auth = getAuth();
  const { language, setLanguage, isTranslating } = useContext(LanguageContext);

  function handleLogout() {
    clearAuth();
    navigate("/login");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-emerald-100/80 bg-[rgba(248,250,252,0.88)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-sky-500 text-white shadow-lg shadow-emerald-900/20">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <p className="text-lg font-semibold tracking-tight text-slate-900 [font-family:Georgia,ui-serif,serif]">
              Legal-AI 
            </p>
            {/* <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Document intelligence workspace</p> */}
          </div>
        </div>

        <div className="hidden items-center gap-2 xl:flex">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={navClassName}>
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>

        <div className="hidden items-center gap-3 xl:flex">
          {/* Language Selector */}
          <div className="relative">
            <button
              onClick={() => setLanguageOpen(!languageOpen)}
              disabled={isTranslating}
              className={`inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium transition ${
                isTranslating
                  ? "opacity-75 text-slate-500 cursor-not-allowed"
                  : "text-slate-700 hover:border-emerald-200 hover:text-emerald-700"
              }`}
            >
              {isTranslating ? (
                <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-600"></div>
              ) : (
                <Languages className="h-4 w-4" />
              )}
              <span>{language}</span>
            </button>
            
            {languageOpen && !isTranslating && (
              <div className="absolute right-0 mt-2 w-48 rounded-2xl border border-slate-200 bg-white shadow-lg z-50">
                {languageOptions.map((lang) => (
                  <button
                    key={lang}
                    onClick={() => {
                      setLanguage(lang);
                      setLanguageOpen(false);
                    }}
                    className={`w-full px-4 py-3 text-left text-sm font-medium transition rounded-full mx-1 my-1 ${
                      language === lang
                        ? "bg-emerald-100 text-emerald-700"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-2 text-right shadow-sm">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Signed in</p>
            <p className="text-sm font-semibold text-slate-800">{auth?.user?.name || auth?.user?.email || "User"}</p>
          </div>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-emerald-200 hover:text-emerald-700"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>

        <button
          onClick={() => setMobileOpen((prev) => !prev)}
          className="inline-flex rounded-2xl border border-slate-200 bg-white p-3 text-slate-700 xl:hidden"
          aria-label="Toggle navigation"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <AlignJustify className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen ? (
        <div className="border-t border-emerald-100 bg-white/95 px-4 py-4 shadow-lg xl:hidden">
          <div className="flex flex-col gap-2">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={navClassName}
                onClick={() => setMobileOpen(false)}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </NavLink>
            ))}
            
            {/* Mobile Language Selector */}
            <div className="mt-3 pt-3 border-t border-slate-200">
              <label className="block text-xs font-medium text-slate-700 mb-2">
                {isTranslating ? (
                  <>
                    <div className="inline-block h-3.5 w-3.5 mr-2 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-600"></div>
                    Translating...
                  </>
                ) : (
                  <>
                    <Languages className="inline h-4 w-4 mr-1" />
                    Language
                  </>
                )}
              </label>
              <select
                value={language}
                onChange={(event) => {
                  setLanguage(event.target.value);
                  setMobileOpen(false);
                }}
                disabled={isTranslating}
                className={`w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-emerald-300 ${
                  isTranslating ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {languageOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            
            <button
              onClick={handleLogout}
              className="mt-2 inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      ) : null}
    </header>
  );
}
