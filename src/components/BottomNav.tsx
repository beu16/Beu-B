import React from "react";
import { Home, Scan, History as HistoryIcon, BarChart3, User, Shield } from "lucide-react";

export type AndroidTabType = "home" | "scan" | "history" | "analytics" | "profile" | "admin";

interface BottomNavProps {
  activeTab: AndroidTabType;
  onTabChange: (tab: AndroidTabType) => void;
  isAdmin?: boolean;
}

export default function BottomNav({ activeTab, onTabChange, isAdmin = false }: BottomNavProps) {
  const tabs = [
    { id: "home", label: "Home", icon: Home },
    { id: "history", label: "History", icon: HistoryIcon },
    { id: "scan", label: "Scan", icon: Scan },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "profile", label: "Profile", icon: User },
  ];

  if (isAdmin) {
    tabs.push({ id: "admin", label: "Admin", icon: Shield });
  }

  return (
    <div className="w-full h-[62px] bg-[#0A0A0C] border-t border-zinc-800/80 px-2 flex items-center justify-around shrink-0 z-40 select-none relative">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        if (tab.id === "scan") {
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange("scan")}
              className="flex flex-col items-center justify-center -mt-5 z-50 cursor-pointer group"
            >
              <div className={`w-13 h-13 rounded-full flex items-center justify-center shadow-[0_0_25px_rgba(255,215,0,0.5)] transition-all ${
                isActive 
                  ? "bg-[#FFD700] text-black ring-4 ring-black scale-105" 
                  : "bg-[#FFD700] text-black hover:scale-105"
              }`}>
                <div className="w-6 h-6 border-2 border-black rounded-sm flex items-center justify-center">
                  <Scan size={16} className="text-black stroke-[2.5]" />
                </div>
              </div>
            </button>
          );
        }

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id as AndroidTabType)}
            className={`flex flex-col items-center justify-center py-1 flex-1 transition-all cursor-pointer relative ${
              isActive ? "text-[#FFD700]" : "text-[#777777] hover:text-zinc-300"
            }`}
          >
            <Icon size={20} className={isActive ? "stroke-[2.5]" : "stroke-[1.75]"} />
            <span className={`text-[10px] mt-0.5 tracking-tight font-medium ${isActive ? "font-bold text-[#FFD700]" : "text-[#888888]"}`}>
              {tab.label}
            </span>
            {isActive && (
              <span className="w-4 h-0.5 bg-[#FFD700] rounded-full absolute bottom-0" />
            )}
          </button>
        );
      })}
    </div>
  );
}
