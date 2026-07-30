import React from "react";

interface AndroidFrameProps {
  children: React.ReactNode;
  activeTab?: string;
  onTabChange?: (tab: "scan" | "manual") => void;
  locale?: "am" | "en";
}

export default function AndroidFrame({ children }: AndroidFrameProps) {
  return (
    <div className="w-full h-screen h-[100dvh] bg-[#070709] text-zinc-100 flex flex-col font-sans overflow-hidden antialiased m-0 p-0">
      <div className="w-full flex-1 flex flex-col h-full relative overflow-hidden m-0 p-0">
        {children}
      </div>
    </div>
  );
}

