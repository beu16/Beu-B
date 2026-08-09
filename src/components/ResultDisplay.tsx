import React from "react";
import { CheckCircle, XCircle, AlertTriangle, Clock, Calendar, User, ArrowRightLeft, ShieldCheck, HelpCircle } from "lucide-react";
import { motion } from "motion/react";
import { ActiveVerification, VerificationStatus, ProcessingStatus } from "../types";
import { ThemeConfig } from "../themes";

interface ResultDisplayProps {
  result: ActiveVerification | null;
  onClose: () => void;
  themeConfig: ThemeConfig;
  t: any;
}

export default function ResultDisplay({ result, onClose, themeConfig, t }: ResultDisplayProps) {
  if (!result) return null;

  const isVerified = result.verified && result.status === VerificationStatus.Success;
  const isPending = result.processingStatus === ProcessingStatus.Queued || result.processingStatus === ProcessingStatus.Running;
  const isFailed = !isPending && !isVerified;

  // Calculate elapsed time from transaction date if present
  const getElapsedTimeInfo = () => {
    if (!result.transactionDate) return null;

    try {
      const txTime = new Date(result.transactionDate).getTime();
      const now = Date.now(); // Current local time in milliseconds
      
      if (isNaN(txTime)) return null;

      const diffMs = now - txTime;
      const diffMins = Math.floor(diffMs / 60000);

      if (diffMins < 0) return null;

      let formattedTime = "";
      if (diffMins < 60) {
        formattedTime = `+0h ${diffMins}m`;
      } else {
        const hrs = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        formattedTime = `+${hrs}h ${mins}m`;
      }

      const isMoreThanThreeMins = diffMins >= 3;

      return {
        formattedTime,
        isMoreThanThreeMins,
        diffMins
      };
    } catch (e) {
      return null;
    }
  };

  const elapsedInfo = getElapsedTimeInfo();

  // Helper to get integer and decimal parts of currency
  const getAmountParts = (amt?: number) => {
    if (amt === undefined || isNaN(amt)) return { integer: "---", decimal: "00" };
    const formatted = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amt);
    const parts = formatted.split(".");
    return {
      integer: parts[0],
      decimal: parts[1] || "00"
    };
  };

  const amountParts = getAmountParts(result.amount);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98, y: 15 }}
      id="verification-result-container"
      className="w-full mt-2"
    >
      <div
        className={`border-2 rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)] ${
          isVerified
            ? "border-emerald-500/40 bg-[#0d120f]"
            : isPending
            ? "border-amber-500/40 bg-[#14100c]"
            : "border-rose-500/40 bg-[#160d0d]"
        }`}
      >
        {/* Dynamic Status Banner matching template layout */}
        <div className={`border-b px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          isVerified
            ? "bg-emerald-500/5 border-emerald-500/20"
            : isPending
            ? "bg-amber-500/5 border-amber-500/20"
            : "bg-[#1f0f0f] border-rose-500/20"
        }`}>
          <div className="flex items-center gap-4">
            {isVerified ? (
              <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.4)] text-white shrink-0">
                <CheckCircle size={24} />
              </div>
            ) : isPending ? (
              <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.4)] text-white shrink-0">
                <Clock className="animate-spin" size={24} />
              </div>
            ) : (
              <div className="w-12 h-12 bg-rose-500 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.4)] text-white shrink-0">
                <XCircle size={24} />
              </div>
            )}
            <div>
              <h1 className={`text-xl font-bold tracking-tight font-display ${
                isVerified ? "text-emerald-400" : isPending ? "text-amber-400" : "text-rose-400"
              }`}>
                {isVerified && t.successTitle}
                {isPending && t.pendingTitle}
                {isFailed && t.failedTitle}
              </h1>
              <p className="text-zinc-500 text-xs font-mono tracking-wider mt-0.5 uppercase">
                {result.reference || "NO REFERENCE PROVIDED"}
              </p>
            </div>
          </div>
          
          <div className={`px-4 py-2 rounded border self-start sm:self-center font-mono font-black text-[10px] tracking-widest ${
            isVerified 
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              : isPending
              ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
              : "bg-rose-500/10 border-rose-500/20 text-rose-400"
          }`}>
            {(result.bank || "CBO").toUpperCase()} SECURE {isVerified ? "CHECKPASS" : isPending ? "PENDING" : "CHECKFAIL"}
          </div>
        </div>

        {/* Content Area */}
        <div className={`p-6 sm:p-8 flex flex-col gap-6 bg-black/40 border-t ${themeConfig.borderMuted}`}>
          
          {/* Big Verified Amount Display */}
          <div className="flex flex-col items-center justify-center bg-black/40 py-8 rounded-2xl border border-white/5 shadow-inner">
            <span className={`text-[10px] font-bold tracking-[0.2em] uppercase mb-2 text-center ${themeConfig.accentMuted}`}>
              {t.verifiedAmount}
            </span>
            <div className="text-5xl sm:text-6xl font-black text-white tracking-tighter font-display">
              {amountParts.integer}.<span className={themeConfig.accentText}>{amountParts.decimal}</span>
              <span className="text-lg font-light text-zinc-500 ml-2 uppercase">{t.etbSuffix}</span>
            </div>
          </div>

          {/* Warning banner for time-elapsed */}
          {isVerified && elapsedInfo?.isMoreThanThreeMins && (
            <div className="p-3 bg-[#2a1a1a] border border-red-500/20 rounded-lg flex items-start gap-3">
              <AlertTriangle className="text-red-500 shrink-0 mt-0.5 animate-pulse" size={16} />
              <div className="text-[11px] text-zinc-400 leading-relaxed">
                <span className="text-red-400 font-bold uppercase tracking-wider block mb-0.5">{t.duplicateAlertTitle}</span>
                {t.duplicateAlertDesc.replace("{timeAgo}", elapsedInfo.formattedTime)}
              </div>
            </div>
          )}

          {/* Information Cards (Two Columns matching aesthetic layout) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Parties Card */}
            <div className={`${themeConfig.subCardBg} p-5 rounded-xl border ${themeConfig.borderMuted} flex flex-col gap-4`}>
              <div className="space-y-1">
                <label className={`text-[9px] uppercase font-bold tracking-widest block ${themeConfig.accentMuted}`}>{t.fromSender}</label>
                <p className="text-base font-bold text-white truncate">
                  {result.senderName || t.unknownPayer}
                </p>
              </div>
              <div className="h-[1px] bg-white/5"></div>
              <div className="space-y-1">
                <label className={`text-[9px] uppercase font-bold tracking-widest block ${themeConfig.accentMuted}`}>{t.toReceiver}</label>
                <p className={`text-base font-bold truncate ${themeConfig.accentText}`}>
                  {result.receiverName || t.defaultReceiver}
                </p>
              </div>
            </div>

            {/* Time & Reference details Card */}
            <div className={`${themeConfig.subCardBg} p-5 rounded-xl border ${themeConfig.borderMuted} flex flex-col justify-between gap-4`}>
              <div className="space-y-1">
                <label className={`text-[9px] uppercase font-bold tracking-widest block ${themeConfig.accentMuted}`}>{t.transactionDate}</label>
                <p className="text-base font-bold text-white">
                  {result.transactionDate ? new Date(result.transactionDate).toLocaleString() : t.syncingDate}
                </p>
              </div>
              
              {isVerified && elapsedInfo ? (
                <div className="bg-[#2a1a1a] border border-red-500/20 p-2.5 rounded-lg flex items-center justify-between">
                  <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider">{t.timeElapsedLabel}</span>
                  <span className="text-base font-black text-red-500 font-mono tracking-wide">
                    {elapsedInfo.formattedTime}
                  </span>
                </div>
              ) : (
                <div className="h-10 flex items-center text-[10px] text-zinc-500 italic">
                  {t.noDelayLabel}
                </div>
              )}
            </div>

          </div>

          {/* Polling Details Loader */}
          {isPending && (
            <div id="pending-status-loader" className={`flex flex-col items-center justify-center p-6 border ${themeConfig.border} rounded-xl ${themeConfig.badgeBg}`}>
              <div className="relative w-10 h-10 mb-3">
                <div className="absolute inset-0 rounded-full border-2 border-white/10" />
                <div className={`absolute inset-0 rounded-full border-2 border-t-transparent animate-spin ${
                  themeConfig.id === "gold" ? "border-[#FFD700]" :
                  themeConfig.id === "slate" ? "border-blue-500" :
                  themeConfig.id === "forest" ? "border-[#10B981]" : "border-orange-500"
                }`} />
              </div>
              <span className={`font-bold text-xs uppercase tracking-wider ${themeConfig.accentText}`}>{t.pollingLiveAPI}</span>
              <p className="text-zinc-500 text-[10px] text-center mt-1 max-w-xs">
                {t.pollingDesc}
              </p>
            </div>
          )}

          {/* Failure Box */}
          {isFailed && (
            <div id="failed-status-box" className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-xs flex flex-col gap-1.5">
              <span className="font-bold uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle size={14} /> {t.failedTitle}
              </span>
              <p className="text-zinc-400 leading-relaxed">
                {result.errorMessage || t.failedDesc}
              </p>
            </div>
          )}

          {/* Bottom branding inside result card */}
          <div className={`h-12 px-6 flex items-center justify-between ${themeConfig.subCardBg} rounded-xl border ${themeConfig.borderMuted}`}>
            <div className="flex gap-4 items-center">
              <span className="text-[9px] text-zinc-500 tracking-wider">NODE: BEU-VERIFY-API-v2</span>
              <span className="text-[9px] text-emerald-500 font-bold uppercase flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                ONLINE
              </span>
            </div>
            <div className="flex items-center gap-1 text-[9px] text-zinc-400 font-mono">
              <span>REQUEST ID:</span>
              <span className={`font-bold ${themeConfig.accentText}`}>{((result.requestId || "REQ-BEU").toString()).slice(0, 10)}...</span>
            </div>
          </div>

          {/* Action buttons */}
          <button
            id="close-result-btn"
            onClick={onClose}
            className={`w-full py-3 bg-zinc-900/60 hover:bg-zinc-850 ${themeConfig.accentText} hover:text-white font-bold text-xs uppercase tracking-widest rounded-lg transition-all border ${themeConfig.borderMuted}`}
          >
            {t.clearScanNextBtn}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
