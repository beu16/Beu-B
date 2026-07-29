import React, { useState } from "react";
import { TrendingUp, Wallet, ShieldCheck, Landmark, Sparkles, PieChart, Activity, ArrowUpRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { VerificationLog } from "../types";
import { ThemeConfig } from "../themes";

interface FinancialSummaryProps {
  logs: VerificationLog[];
  themeConfig: ThemeConfig;
  t: any;
}

export default function FinancialSummary({ logs, themeConfig, t }: FinancialSummaryProps) {
  const [activeSubTab, setActiveSubTab] = useState<"overview" | "channels">("overview");

  // Calculations
  const verifiedLogs = logs.filter(log => log.verified);
  const todayTotal = verifiedLogs.reduce((sum, log) => sum + (log.amount || 0), 0);
  const todayCount = verifiedLogs.length;
  const pendingCount = logs.filter(log => log.status === "pending").length;

  const averageAmount = todayCount > 0 ? todayTotal / todayCount : 0;

  // Group by bank/channel
  const bankLabels: Record<string, string> = {
    cbe: "CBE (የኢትዮጵያ ንግድ ባንክ)",
    telebirr: "Telebirr (ቴሌብር)",
    boa: "Bank of Abyssinia (አቢሲኒያ)",
    cbebirr: "CBE Birr (ሲቢኢ ብር)",
    awash: "Awash Bank (አዋሽ ባንክ)",
    dashen: "Dashen Bank (ዳሽን ባንክ)",
    siinqee: "Siinqee Bank (ሲንቄ ባንክ)",
    mpesa: "M-Pesa (ኤም-ፔሳ)",
    universal: "Universal Router"
  };

  const channelData = verifiedLogs.reduce((acc: Record<string, { amount: number; count: number }>, log) => {
    const bankKey = log.bank ? log.bank.toLowerCase() : "universal";
    if (!acc[bankKey]) {
      acc[bankKey] = { amount: 0, count: 0 };
    }
    acc[bankKey].amount += log.amount || 0;
    acc[bankKey].count += 1;
    return acc;
  }, {});

  // Convert to sorted list
  const channelList = Object.entries(channelData).map(([key, data]) => ({
    key,
    name: bankLabels[key] || key.toUpperCase(),
    amount: data.amount,
    count: data.count,
    percentage: todayTotal > 0 ? (data.amount / todayTotal) * 100 : 0
  })).sort((a, b) => b.amount - a.amount);

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amt) + " " + t.etbSuffix;
  };

  const successRate = logs.length > 0 
    ? Math.round((logs.filter(log => log.status === "success").length / logs.length) * 100) 
    : 100;

  return (
    <div id="financial-summary-card" className={`w-full ${themeConfig.cardBg} border ${themeConfig.border} rounded-xl p-5 ${themeConfig.glowShadow} flex flex-col gap-4 relative overflow-hidden`}>
      {/* Decorative ambient subtle radar background */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[#FFD700]/5 to-transparent rounded-bl-full pointer-events-none" />

      {/* Header */}
      <div className={`border-b ${themeConfig.borderMuted} pb-3 flex items-center justify-between`}>
        <h3 className={`font-bold text-xs tracking-widest uppercase flex items-center gap-2 font-display ${themeConfig.accentMuted}`}>
          <Activity size={14} className={themeConfig.accentText} /> {t.dashboardTitle}
        </h3>
        <span className="flex items-center gap-1.5 text-[9px] font-mono bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
          <span className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse"></span>
          LIVE
        </span>
      </div>

      {/* Segmented Sub-tab switcher */}
      <div className="grid grid-cols-2 bg-black/35 p-0.5 rounded-lg border border-white/5">
        <button
          onClick={() => setActiveSubTab("overview")}
          className={`py-1.5 text-[10px] font-extrabold uppercase tracking-wider rounded-md transition-all ${
            activeSubTab === "overview"
              ? `${themeConfig.id === "gold" ? "bg-[#D4AF37]/15 text-[#FFD700]" : "bg-blue-600/15 text-blue-400"} border border-${themeConfig.id === "gold" ? "[#D4AF37]" : "blue-500"}/20`
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          {t.appName === "BEU" ? "Overview" : "ማጠቃለያ"}
        </button>
        <button
          onClick={() => setActiveSubTab("channels")}
          className={`py-1.5 text-[10px] font-extrabold uppercase tracking-wider rounded-md transition-all ${
            activeSubTab === "channels"
              ? `${themeConfig.id === "gold" ? "bg-[#D4AF37]/15 text-[#FFD700]" : "bg-blue-600/15 text-blue-400"} border border-${themeConfig.id === "gold" ? "[#D4AF37]" : "blue-500"}/20`
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          {t.appName === "BEU" ? "Channels" : "ባንኮች"}
        </button>
      </div>

      {/* Tab Contents with animations */}
      <div className="min-h-[148px] flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {activeSubTab === "overview" && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col gap-4"
            >
              {/* Primary volume card */}
              <div className="bg-black/30 border border-white/5 p-3.5 rounded-xl flex flex-col relative">
                <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">
                  {t.todayTotalCalculated}
                </span>
                <span className="text-2xl sm:text-3xl font-black text-white mt-1 tracking-tight font-display flex items-baseline gap-1">
                  {formatCurrency(todayTotal)}
                </span>
                <span className="text-[9px] text-zinc-500 mt-1">
                  {t.todayTotalCalculatedDesc}
                </span>
              </div>

              {/* Multi-metric row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-black/20 border border-white/5 p-2.5 rounded-lg flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">{t.totalVerifiedTxns}</span>
                    <span className="text-base font-black text-white mt-0.5 font-mono">{todayCount}</span>
                  </div>
                  <ShieldCheck size={18} className="text-emerald-400 opacity-80" />
                </div>
                <div className="bg-black/20 border border-white/5 p-2.5 rounded-lg flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">{t.successRateLabel}</span>
                    <span className="text-base font-black text-white mt-0.5 font-mono">{successRate}%</span>
                  </div>
                  <TrendingUp size={18} className={`${themeConfig.accentText} opacity-80`} />
                </div>
              </div>
            </motion.div>
          )}

          {activeSubTab === "channels" && (
            <motion.div
              key="channels"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col gap-3"
            >
              <h4 className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">{t.distributionTitle}</h4>
              
              {channelList.length === 0 ? (
                <div className="py-8 text-center text-zinc-500 text-xs italic">
                  {t.appName === "BEU" ? "No verified volume data today." : "ዛሬ እስካሁን የተመዘገበ የገንዘብ መጠን የለም።"}
                </div>
              ) : (
                <div className="flex flex-col gap-2.5 max-h-[140px] overflow-y-auto pr-1">
                  {channelList.map((chan) => (
                    <div key={chan.key} className="flex flex-col gap-1">
                      <div className="flex justify-between text-[10px] font-semibold text-zinc-300">
                        <span className="truncate max-w-[170px]">{chan.name}</span>
                        <span className="font-mono text-zinc-400">{formatCurrency(chan.amount)} ({Math.round(chan.percentage)}%)</span>
                      </div>
                      <div className="h-1.5 w-full bg-black/45 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${chan.percentage}%` }}
                          transition={{ duration: 0.5, ease: "easeOut" }}
                          className={`h-full ${
                            chan.key === "cbe" ? "bg-amber-500" :
                            chan.key === "telebirr" ? "bg-blue-500" :
                            chan.key === "boa" ? "bg-red-500" :
                            "bg-zinc-400"
                          }`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Tiny Footer */}
      <div className={`border-t ${themeConfig.borderMuted} pt-2 flex items-center justify-between text-[9px] text-zinc-500 font-mono`}>
        <span>ACTIVE SETTLEMENTS: INSTANT</span>
        <span className="flex items-center gap-0.5 text-zinc-400">
          SECURE PAY <ArrowUpRight size={10} />
        </span>
      </div>
    </div>
  );
}
