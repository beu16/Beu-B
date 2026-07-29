import React from "react";

interface AndroidFrameProps {
  children: React.ReactNode;
  activeTab?: string;
  onTabChange?: (tab: "scan" | "manual") => void;
  locale?: "am" | "en";
}

export default function AndroidFrame({ children }: AndroidFrameProps) {
  return (
    <div className="min-h-screen max-h-screen bg-[#030304] text-zinc-100 flex items-center justify-center p-1 sm:p-4 select-none font-sans overflow-hidden">
      {/* Sleek, Realistic Clean Android Device Outer Frame */}
      <div className="relative w-[360px] h-[640px] max-w-full max-h-[calc(100vh-1rem)] bg-[#070709] rounded-[36px] border-[6px] sm:border-[8px] border-[#1d1d21] shadow-[0_0_50px_rgba(0,0,0,0.95)] ring-1 ring-zinc-800/80 flex flex-col overflow-hidden">
        
        {/* Android Top Status Bar / Notch Area */}
        <div className="w-full h-5 bg-[#070709] shrink-0 relative flex items-center justify-center z-50 select-none">
          {/* Punch-hole Camera */}
          <div className="w-3 h-3 bg-black rounded-full border border-zinc-800/80 flex items-center justify-center">
            <div className="w-1 h-1 bg-[#0a0d14] rounded-full border border-blue-900/40" />
          </div>
        </div>

        {/* Clean Android App Inner Content Area */}
        <div className="flex-1 w-full overflow-y-auto relative scrollbar-none flex flex-col">
          {children}
        </div>

        {/* Clean Android Gesture Navigation Pill at Bottom */}
        <div className="w-full h-5 bg-[#070709] flex items-center justify-center shrink-0 select-none z-40 border-t border-zinc-900/40">
          <div className="w-28 h-1 bg-zinc-600/80 rounded-full" />
        </div>

      </div>
    </div>
  );
}

