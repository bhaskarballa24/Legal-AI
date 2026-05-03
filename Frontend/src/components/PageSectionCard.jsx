import React from "react";

export default function PageSectionCard({ icon: Icon, title, subtitle, accent = "emerald", children }) {
  const accentStyles = {
    emerald: "from-emerald-500/15 via-emerald-500/5 to-white text-emerald-700",
    sky: "from-sky-500/15 via-sky-500/5 to-white text-sky-700",
    amber: "from-amber-500/15 via-amber-500/5 to-white text-amber-700",
    slate: "from-slate-500/15 via-slate-500/5 to-white text-slate-700",
  };

  return (
    <section className="overflow-hidden rounded-[28px] border border-white/70 bg-white/85 shadow-[0_24px_60px_-32px_rgba(15,23,42,0.28)] backdrop-blur">
      <div className={`bg-gradient-to-r ${accentStyles[accent] || accentStyles.emerald} px-6 py-5`}>
        <div className="flex items-start gap-4">
          {Icon ? (
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 shadow-sm">
              <Icon className="h-5 w-5" />
            </div>
          ) : null}
          <div>
            <h2 className="text-xl font-semibold text-slate-900 [font-family:Georgia,ui-serif,serif]">{title}</h2>
            {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
          </div>
        </div>
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}
