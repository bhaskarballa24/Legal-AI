import React from "react";
import { useNavigate } from "react-router-dom";
import { getAuth } from "../utils/auth";

function LandingPage() {
  const navigate = useNavigate();
  const auth = getAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-100 overflow-hidden relative">
      
      {/* Animated Background Blobs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-72 h-72 bg-green-300 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-72 h-72 bg-emerald-300 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 w-72 h-72 bg-lime-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      {/* Navbar */}
      <nav className="relative z-10 bg-white/70 backdrop-blur border-b border-green-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 hover:scale-105 transition">
            <div className="w-9 h-9 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-md">
              <span className="text-white font-bold">AI</span>
            </div>
            <span className="text-green-800 font-bold text-lg">Legal AI</span>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative z-10 min-h-[calc(100vh-80px)] flex items-center justify-center px-6 py-16">
        <div className="text-center max-w-3xl mx-auto">

          {/* Heading */}
          <div className="space-y-4 mb-10">
            <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-600 hover:scale-105 transition">
              Transform Complex Documents
            </h1>
            <p className="text-2xl md:text-3xl font-semibold text-gray-800">
              Into Clear Insights
            </p>
            <p className="text-base md:text-lg text-gray-600 max-w-xl mx-auto">
              Simplify legal, technical & complex documents using AI in your preferred language.
            </p>
          </div>

          {/* Feature Pills */}
          <div className="flex flex-wrap gap-3 justify-center mb-10">
            {['Multi-Language', 'AI-Powered', 'Lightning Fast'].map((feature) => (
              <div
                key={feature}
                className="px-4 py-2 rounded-full border border-green-300 bg-white hover:bg-green-50 hover:scale-105 transition shadow-sm hover:shadow-md cursor-pointer"
              >
                <span className="text-green-700 text-sm font-medium flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  {feature}
                </span>
              </div>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-wrap gap-4 justify-center">
            {auth ? (
              <button
                onClick={() => navigate("/upload")}
                className="px-7 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all flex items-center gap-2"
              >
                Continue as {auth.user?.name || "User"}
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </button>
            ) : (
              <>
                <button
                  onClick={() => navigate("/login")}
                  className="px-7 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all"
                >
                  Login
                </button>

                <button
                  onClick={() => navigate("/register")}
                  className="px-7 py-3 rounded-xl font-semibold text-green-700 border border-green-400 bg-white hover:bg-green-50 hover:shadow-xl hover:-translate-y-1 transition-all"
                >
                  Get Started
                </button>
              </>
            )}
          </div>

          {/* Stats removed per request */}

        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(20px, -30px) scale(1.05); }
          50% { transform: translate(-20px, 20px) scale(0.95); }
          75% { transform: translate(30px, 30px) scale(1.05); }
        }
        .animate-blob {
          animation: blob 10s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}

export default LandingPage;
