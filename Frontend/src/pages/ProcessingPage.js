import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

function ProcessingPage() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/output");
    return undefined;
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center overflow-hidden">
      {/* Background Blobs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-lime-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      </div>

      {/* Processing Card */}
      <div className="relative z-10 flex flex-col items-center gap-6 p-12 rounded-2xl backdrop-blur-xl bg-white/80 border border-green-100 shadow-2xl max-w-md">
        {/* Animated Spinner */}
          <div className="relative w-24 h-24">
          <svg className="w-full h-full animate-spin" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="url(#grad)" strokeWidth="4" pathLength="100" />
            <defs>
              <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 opacity-20 blur-lg"></div>
          </div>
        </div>

        {/* Text Content */}
        <div className="text-center space-y-2">
          <h2 className="text-xl md:text-2xl font-bold text-green-800">Processing Document</h2>
          <p className="text-gray-600 text-sm">Advanced AI is analyzing your document...</p>
        </div>

        {/* Step Indicators */}
          <div className="w-full space-y-3 mt-6 pt-6 border-t border-gray-200">
          {[
            { icon: '📄', text: 'Extracting content' },
            { icon: '🤖', text: 'Analyzing with AI' },
            { icon: '✨', text: 'Generating summary' }
          ].map((step, idx) => (
            <div key={idx} className="flex items-center gap-3 text-gray-700 animate-pulse" style={{ animationDelay: `${idx * 0.3}s` }}>
              <span className="text-base">{step.icon}</span>
              <span className="text-xs">{step.text}</span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(20px, -50px) scale(1.1); }
          50% { transform: translate(-20px, 20px) scale(0.9); }
          75% { transform: translate(50px, 50px) scale(1.05); }
        }
        .animate-blob {
          animation: blob 7s infinite;
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

export default ProcessingPage;
