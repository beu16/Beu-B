import React from "react";
import { History, ShieldCheck, ShieldAlert, Clock, ArrowUpRight, HelpCircle } from "lucide-react";
import { VerificationLog } from "../types";
import { ThemeConfig } from "../themes";

interface HistoryLogsProps {
  logs: VerificationLog[];
  onSelectLog: (log: VerificationLog) => void;
  onClearLogs?: () => void;
  isLoadingLogs: boolean;
  themeConfig: ThemeConfig;
  t: any;
}

export default function HistoryLogs({ logs, onSelectLog, onClearLogs, isLoadingLogs, themeConfig, t }: HistoryLogsProps) {
  
  const formatCurrency = (amt?: number) => {
    if (amt === undefined || isNaN(amt)) return "";
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amt) + " ETB";
  };

  const getRelativeTime = (timestampStr: string) => {
    try {
      const ms = new Date(timestampStr).getTime();
      const diff = Date.now() - ms;
      const mins = Math.floor(diff / 60000);
      
      if (mins < 1) return t.justNow;
      if (mins < 60) return t.minsAgo.replace("{mins}", mins.toString());
      if (mins < 1440) return t.hoursAgo.replace("{hours}", Math.floor(mins / 60).toString());
      return t.daysAgo.replace("{days}", Math.floor(mins / 1440).toString());
    } catch (e) {
      return "";
    }
  };

  return (
    <div id="history-logs-card" className={`w-full ${themeConfig.cardBg} border ${themeConfig.border} rounded-xl p-5 ${themeConfig.glowShadow} flex flex-col gap-4`}>
      <div className={`border-b ${themeConfig.borderMuted} pb-3 flex items-center justify-between`}>
        <h3 className={`font-bold text-xs tracking-widest uppercase flex items-center gap-2 font-display ${themeConfig.accentMuted}`}>
          <History size={14} className={themeConfig.accentText} /> {t.historyTitle}
        </h3>
        <span className={`${themeConfig.badgeBg} px-2 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider`}>
          {logs.length} {t.historySubtitle}
        </span>
      </div>

      {isLoadingLogs ? (
        <div id="history-loading" className="flex items-center justify-center py-10">
          <svg className={`animate-spin h-5 w-5 ${themeConfig.accentText}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      ) : logs.length === 0 ? (
        <div id="history-empty" className="flex flex-col items-center justify-center py-10 text-center">
          <HelpCircle className="text-zinc-600 mb-2" size={32} />
          <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">{t.recordedLogs}</p>
          <p className="text-zinc-600 text-[11px] mt-2 max-w-[240px]">
            {t.noLogsYet}
          </p>
        </div>
      ) : (
        <div id="history-list-container" className="flex flex-col gap-2 max-h-[380px] overflow-y-auto pr-1">
          {logs.map((log) => {
            const isVerified = log.verified && log.status === "success";
            const isPending = log.status === "pending";
            
            return (
              <div
                key={log.requestId}
                id={`history-item-${log.requestId}`}
                onClick={() => onSelectLog(log)}
                className={`group flex items-center justify-between p-3 ${themeConfig.subCardBg} hover:bg-zinc-900/40 border ${themeConfig.borderMuted} hover:border-${themeConfig.id === "gold" ? "[#D4AF37]" : themeConfig.id === "slate" ? "blue-500" : themeConfig.id === "forest" ? "[#10B981]" : "orange-500"}/30 rounded-lg cursor-pointer transition-all duration-200`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  {/* Status Indicator Icon */}
                  <div className="shrink-0">
                    {isVerified ? (
                      <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-md">
                        <ShieldCheck size={14} />
                      </div>
                    ) : isPending ? (
                      <div className={`p-2 bg-amber-500/10 border border-amber-500/20 ${themeConfig.accentText} rounded-md`}>
                        <Clock size={14} className="animate-pulse" />
                      </div>
                    ) : (
                      <div className="p-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-md">
                        <ShieldAlert size={14} />
                      </div>
                    )}
                  </div>

                  <div className="overflow-hidden">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black uppercase tracking-wider ${themeConfig.accentText}`}>
                        {log.bank}
                      </span>
                      <span className="text-[9px] text-zinc-500 font-mono">
                        {getRelativeTime(log.timestamp)}
                      </span>
                    </div>
                    <p className="text-zinc-300 text-xs font-mono truncate mt-0.5 max-w-[130px] sm:max-w-[160px]">
                      {log.reference}
                    </p>
                    {log.senderName && (
                      <p className="text-zinc-500 text-[10px] truncate">
                        S: {log.senderName}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end shrink-0 pl-2">
                  <span className={`text-xs font-bold font-mono ${isVerified ? "text-emerald-400" : "text-zinc-500"}`}>
                    {log.amount !== undefined ? formatCurrency(log.amount) : "---"}
                  </span>
                  <span className={`text-[9px] text-zinc-500 group-hover:${themeConfig.accentText} transition-colors flex items-center gap-0.5 mt-0.5 font-mono uppercase tracking-widest font-semibold`}>
                    {t.viewLogBtn} <ArrowUpRight size={8} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
