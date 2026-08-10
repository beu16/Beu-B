import React, { useState, useEffect } from "react";
import { 
  Zap, 
  ShieldCheck, 
  Bell, 
  Search, 
  SlidersHorizontal, 
  CheckCircle2, 
  ChevronRight, 
  ArrowLeft, 
  Upload, 
  QrCode, 
  BarChart3, 
  User, 
  Home, 
  History as HistoryIcon, 
  CreditCard, 
  Settings as SettingsIcon, 
  HelpCircle, 
  Share2, 
  LogOut, 
  X, 
  Camera, 
  Flashlight, 
  RefreshCw, 
  Coins, 
  Activity, 
  Lock, 
  Smartphone, 
  Sparkles,
  Check,
  Building2,
  Calendar,
  Shield,
  FileText,
  Moon,
  Sun,
  Globe,
  Fingerprint,
  Mail,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Types
import { ActiveVerification, ProcessingStatus, VerificationStatus, VerificationLog } from "../types";
import { TRANSLATIONS, Locale } from "../translations";
import { THEMES } from "../themes";
import QrScanner from "./QrScanner";
import ManualForm from "./ManualForm";
import ResultDisplay from "./ResultDisplay";
import BiometricPinLock from "./BiometricPinLock";
import PricingSelection from "./PricingSelection";
import { sendReceiptEmailViaBrevo } from "../lib/brevo";

interface AndroidAppViewProps {
  user: any;
  onLogout: () => void;
  locale: Locale;
  onLanguageChange: (lang: Locale) => void;
  logs?: VerificationLog[];
  onVerifyReference?: (ref: string, bank: string, suffix?: string, phoneNumber?: string) => void;
  currentVerification: ActiveVerification | null;
  setCurrentVerification: (v: ActiveVerification | null) => void;
  isLoadingVerification?: boolean;
  checkUserSession?: () => void;
}

export type AndroidTab = "home" | "history" | "scan" | "analytics" | "profile";
export type AndroidSubScreen = "none" | "splash" | "onboarding" | "topup" | "settings" | "result" | "empty" | "about" | "privacy" | "terms";

export default function AndroidAppView({
  user,
  onLogout,
  locale,
  onLanguageChange,
  logs = [],
  onVerifyReference,
  currentVerification,
  setCurrentVerification,
  isLoadingVerification = false,
  checkUserSession
}: AndroidAppViewProps) {
  const t = TRANSLATIONS[locale] || TRANSLATIONS.en;

  // Navigation States
  const [activeTab, setActiveTab] = useState<AndroidTab>("home");
  const [subScreen, setSubScreen] = useState<AndroidSubScreen>("none");
  const [showDrawer, setShowDrawer] = useState(false);
  
  // Package & Subscription state
  const [activePlan, setActivePlan] = useState<string>("Pro");
  const [selectedPackage, setSelectedPackage] = useState<{ credits: number; etb: number; plan: string }>({ credits: 50, etb: 500, plan: "Pro" });
  const [userCredits, setUserCredits] = useState<number>(user?.credits ?? 999999);
  const [paymentMethod, setPaymentMethod] = useState<"mobile" | "bank">("mobile");
  const [telebirrRefInput, setTelebirrRefInput] = useState("");
  
  // Settings toggles state
  const [darkMode, setDarkMode] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [biometricLock, setBiometricLock] = useState(true);
  
  // Search history state
  const [historySearch, setHistorySearch] = useState("");
  const [historyFilter, setHistoryFilter] = useState<"all" | "today" | "yesterday">("all");

  // Biometric & PIN Lock Modal State - Starts locked on app open every time
  const [showSecurityModal, setShowSecurityModal] = useState(true);
  const [securityModalMode, setSecurityModalMode] = useState<"unlock" | "setup">("unlock");
  const [sendingBrevoReceipt, setSendingBrevoReceipt] = useState(false);

  // Helper function to dispatch receipt via Brevo
  const handleSendBrevoReceipt = async (merchant: string, amount: number, reference: string) => {
    const email = user?.email || "user@example.com";
    setSendingBrevoReceipt(true);
    const res = await sendReceiptEmailViaBrevo({
      recipientEmail: email,
      recipientName: userName,
      merchant,
      amount,
      reference,
      date: new Date().toLocaleString()
    });
    setSendingBrevoReceipt(false);
    if (res.success) {
      alert(`Receipt copy sent to ${email} via Brevo!`);
    } else {
      alert(`Brevo notice: ${res.message}`);
    }
  };

  // User details fallback
  const userName = user?.ownerName || user?.businessName || "abc";
  const userRole = user?.isAdmin ? "Admin Node" : `${activePlan} Node`;

  // Dynamic Realtime Statistics computed directly from actual user logs
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const todayLogs = (logs || []).filter(l => new Date(l.timestamp || Date.now()) >= todayStart);
  const todayVolume = todayLogs.reduce((sum, item) => sum + (item.amount || 0), 0);
  const receiptsTodayCount = todayLogs.length;

  const weeklyLogs = (logs || []).filter(l => new Date(l.timestamp || Date.now()) >= sevenDaysAgo);
  const weeklyVolume = weeklyLogs.reduce((sum, item) => sum + (item.amount || 0), 0);
  const weeklyCount = weeklyLogs.length;

  const totalSavedCount = (logs || []).length;
  const myEarnings = (logs || []).reduce((sum, item) => sum + (item.amount || 0), 0);

  // Group real logs by merchant / receiver name
  const merchantMap = (logs || []).reduce((acc: Record<string, { name: string; count: number; totalAmount: number }>, log) => {
    const name = log.receiverName || log.bank?.toUpperCase() || "Merchant";
    if (!acc[name]) {
      acc[name] = { name, count: 0, totalAmount: 0 };
    }
    acc[name].count += 1;
    acc[name].totalAmount += log.amount || 0;
    return acc;
  }, {});

  const topMerchants = Object.values(merchantMap)
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, 5);

  // Helper triggers for scan modes
  const [scanTabMode, setScanTabMode] = useState<"camera" | "upload" | "manual">("camera");

  const handleOpenScanCamera = () => {
    setScanTabMode("camera");
    setActiveTab("scan");
    setSubScreen("none");
  };

  const handleOpenScanUpload = () => {
    setScanTabMode("upload");
    setActiveTab("scan");
    setSubScreen("none");
  };

  const handleOpenManual = () => {
    setScanTabMode("manual");
    setActiveTab("scan");
    setSubScreen("none");
  };

  const handleOpenScan = () => {
    handleOpenManual();
  };

  // Switch tab & clear subscreen
  const handleTabSelect = (tab: AndroidTab) => {
    setActiveTab(tab);
    setSubScreen("none");
  };

  return (
    <div className={`w-full h-screen h-[100dvh] flex flex-col justify-between relative select-none font-sans transition-colors duration-300 overflow-hidden ${
      darkMode ? "bg-[#070709] text-zinc-100" : "bg-slate-100 text-slate-900"
    }`}>
      
      {/* 1. TOP HEADER */}
      <div className={`w-full border-b px-3 py-2.5 flex items-center justify-between shrink-0 z-30 backdrop-blur-md ${
        darkMode ? "bg-[#08080A]/95 border-zinc-900/80" : "bg-white/95 border-slate-200 text-slate-900 shadow-sm"
      }`}>
        {/* Left: Menu Drawer Trigger & Brand Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <button 
            type="button"
            id="menu-drawer-button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowDrawer(true);
            }}
            className={`p-1.5 rounded-lg transition-all shrink-0 cursor-pointer active:scale-95 z-30 pointer-events-auto flex items-center justify-center ${
              darkMode ? "bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 border border-zinc-800" : "bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300"
            }`}
            title="Open Menu Drawer"
            aria-label="Open Navigation Drawer"
          >
            <div className="w-4 flex flex-col gap-0.5 pointer-events-none">
              <span className={`w-4 h-0.5 rounded-full ${darkMode ? "bg-zinc-200" : "bg-slate-800"}`} />
              <span className="w-2.5 h-0.5 bg-[#FFD700] rounded-full" />
              <span className={`w-4 h-0.5 rounded-full ${darkMode ? "bg-zinc-200" : "bg-slate-800"}`} />
            </div>
          </button>

          <div 
            onClick={() => handleTabSelect("home")}
            className="flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <div className="w-6 h-6 bg-[#FFD700] rounded-full flex items-center justify-center text-black shadow-[0_0_10px_rgba(255,215,0,0.35)] shrink-0">
              <Zap size={13} className="fill-black" />
            </div>
            <h1 className={`font-black text-xs sm:text-sm tracking-tight leading-none font-display whitespace-nowrap ${
              darkMode ? "text-white" : "text-slate-900"
            }`}>
              Beu<span className="text-amber-500">Verify</span>
            </h1>
          </div>
        </div>

        {/* Right: Credits, Language & Theme Buttons */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Credits Box */}
          <button 
            onClick={() => setSubScreen("topup")}
            className={`flex items-center gap-1 border px-1.5 py-0.5 rounded-lg text-left transition-all cursor-pointer ${
              darkMode 
                ? "bg-[#121215] border-zinc-800/80 hover:border-amber-400/50" 
                : "bg-slate-100 border-slate-300 hover:border-amber-500"
            }`}
          >
            <Coins size={11} className="text-amber-500 shrink-0" />
            <div className="flex items-baseline gap-0.5">
              <span className={`text-[8px] ${darkMode ? "text-zinc-400" : "text-slate-500"}`}>Credits</span>
              <span className={`text-[11px] font-black font-mono ${darkMode ? "text-white" : "text-slate-900"}`}>{userCredits}</span>
            </div>
          </button>

          {/* Language Dropdown */}
          <button 
            onClick={() => onLanguageChange(locale === "en" ? "am" : "en")}
            className={`flex items-center gap-0.5 border px-1.5 py-1 rounded-lg text-[10px] font-bold ${
              darkMode ? "bg-[#121215] border-zinc-800/80 text-zinc-300" : "bg-slate-100 border-slate-300 text-slate-700"
            }`}
          >
            <Globe size={11} className={darkMode ? "text-zinc-400" : "text-slate-500"} />
            <span>{locale === "en" ? "EN" : "AM"}</span>
          </button>

          {/* Light/Dark Toggle Icon */}
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className={`p-1 border rounded-lg transition-colors cursor-pointer ${
              darkMode ? "bg-[#121215] border-zinc-800/80 text-amber-400 hover:bg-zinc-800" : "bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200"
            }`}
            title={darkMode ? "Switch to Morning Light Mode" : "Switch to Night Dark Mode"}
          >
            {darkMode ? (
              <Sun size={13} className="text-[#FFD700] fill-[#FFD700]" />
            ) : (
              <Moon size={13} className="text-slate-800 fill-slate-800" />
            )}
          </button>
        </div>
      </div>

      {/* 2. MAIN APP CONTENT CONTAINER */}
      <div className={`flex-1 overflow-y-auto overflow-x-hidden relative scrollbar-none pb-24 touch-pan-y ${
        darkMode ? "bg-[#070709]" : "bg-slate-50"
      }`}>
        
        {/* SCREEN OVERLAYS: Splash, Onboarding, Top Up Credits, Settings, Verification Result, Empty State */}
        <AnimatePresence mode="wait">
          
          {/* 1. SPLASH SCREEN (Matches Screen #1 in Mockup Image) */}
          {subScreen === "splash" && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#070709] z-40 p-6 flex flex-col items-center justify-between text-center select-none"
            >
              <div className="pt-8" />
              <div className="flex flex-col items-center space-y-4">
                <div className="w-20 h-20 bg-[#FFD700] rounded-3xl flex items-center justify-center text-black shadow-[0_0_40px_rgba(255,215,0,0.5)] border border-amber-300/40">
                  <Zap size={44} className="fill-black" />
                </div>
                <div>
                  <h1 className="text-3xl font-black tracking-tight text-white font-display">
                    Beu<span className="text-[#FFD700]">Verify</span>
                  </h1>
                </div>
              </div>

              <div className="flex flex-col items-center space-y-4 pb-8">
                <div className="w-7 h-7 border-2 border-amber-400/20 border-t-amber-400 rounded-full animate-spin" />
                <p className="text-[11px] font-medium text-zinc-500 font-mono tracking-widest uppercase">
                  Secure. Verify. Empower.
                </p>
                <button 
                  onClick={() => setSubScreen("none")}
                  className="text-xs text-amber-400 font-bold hover:underline pt-2 cursor-pointer"
                >
                  Enter App
                </button>
              </div>
            </motion.div>
          )}

          {/* 2. ONBOARDING SCREEN (Matches Screen #2 in Mockup Image) */}
          {subScreen === "onboarding" && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="absolute inset-0 bg-[#070709] z-30 p-5 flex flex-col justify-between items-center text-center overflow-y-auto"
            >
              <div className="w-full flex justify-end">
                <button 
                  onClick={() => setSubScreen("none")}
                  className="p-1.5 text-zinc-400 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Graphic: 3D phone with receipt & yellow check badge */}
              <div className="relative w-48 h-56 my-2 flex items-center justify-center">
                <div className="absolute inset-0 bg-[#FFD700]/15 rounded-full blur-2xl pointer-events-none" />
                
                {/* Stand / Device Box */}
                <div className="w-40 h-52 bg-[#121215] border-2 border-zinc-700/80 rounded-2xl shadow-2xl relative overflow-hidden flex flex-col items-center justify-center p-3">
                  {/* Receipt Paper */}
                  <div className="w-30 bg-zinc-100 text-black p-3 rounded-lg shadow-xl space-y-2 transform -rotate-1 border border-zinc-300">
                    <div className="w-14 h-2 bg-black rounded" />
                    <div className="w-full h-0.5 bg-zinc-300" />
                    <div className="space-y-1">
                      <div className="w-full h-1 bg-zinc-400 rounded" />
                      <div className="w-3/4 h-1 bg-zinc-400 rounded" />
                      <div className="w-1/2 h-1 bg-zinc-400 rounded" />
                    </div>
                    <div className="pt-1 flex justify-center">
                      <div className="w-9 h-9 bg-black/10 rounded border border-black/20 flex items-center justify-center">
                        <QrCode size={22} className="text-black" />
                      </div>
                    </div>
                  </div>

                  {/* Floating Yellow Shield Check Badge */}
                  <div className="absolute -bottom-1 -right-1 w-12 h-12 bg-[#FFD700] rounded-2xl flex items-center justify-center text-black shadow-[0_0_20px_rgba(255,215,0,0.6)] border-2 border-black transform rotate-6">
                    <CheckCircle2 size={26} className="text-black fill-black stroke-[#FFD700]" />
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="space-y-3 px-2">
                <h2 className="text-2xl font-black text-white font-display tracking-tight leading-snug">
                  Verify Receipts<br />
                  <span className="text-[#FFD700]">Earn Trust</span>
                </h2>
                <p className="text-xs text-zinc-400 leading-relaxed max-w-xs mx-auto font-sans">
                  BeuVerify ensures every transaction is real, secure, and verifiable.
                </p>

                {/* Dots Indicator */}
                <div className="flex justify-center items-center gap-1.5 pt-2">
                  <span className="w-6 h-1.5 bg-[#FFD700] rounded-full" />
                  <span className="w-1.5 h-1.5 bg-zinc-700 rounded-full" />
                  <span className="w-1.5 h-1.5 bg-zinc-700 rounded-full" />
                </div>
              </div>

              {/* Get Started Button */}
              <div className="w-full pt-4">
                <button 
                  onClick={() => setSubScreen("none")}
                  className="w-full py-3.5 bg-[#FFD700] hover:bg-amber-300 text-black font-extrabold text-sm rounded-xl shadow-[0_0_25px_rgba(255,215,0,0.4)] transition-all cursor-pointer"
                >
                  Get Started
                </button>
              </div>
            </motion.div>
          )}

          {/* 11. EMPTY STATE SCREEN (Matches Screen #11 in Mockup Image) */}
          {subScreen === "empty" && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute inset-0 bg-[#070709] z-30 p-6 flex flex-col justify-between items-center text-center overflow-y-auto"
            >
              <div className="w-full flex justify-end">
                <button onClick={() => setSubScreen("none")} className="p-1.5 text-zinc-400 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              <div className="flex flex-col items-center space-y-5 max-w-xs my-auto">
                {/* Magnifier icon over receipt container */}
                <div className="w-24 h-28 bg-[#111114] border border-zinc-800 rounded-2xl flex flex-col items-center justify-center relative shadow-xl p-3">
                  <div className="w-12 h-1.5 bg-zinc-700 rounded mb-2" />
                  <div className="w-full space-y-1 mb-2">
                    <div className="w-full h-1 bg-zinc-800 rounded" />
                    <div className="w-3/4 h-1 bg-zinc-800 rounded" />
                    <div className="w-1/2 h-1 bg-zinc-800 rounded" />
                  </div>
                  <div className="w-8 h-8 bg-zinc-800 rounded flex items-center justify-center">
                    <FileText size={18} className="text-zinc-500" />
                  </div>

                  {/* Floating Magnifier Circle */}
                  <div className="absolute -bottom-2 -right-2 w-11 h-11 bg-zinc-900 border-2 border-zinc-700 rounded-full flex items-center justify-center text-amber-400 shadow-[0_0_20px_rgba(250,204,21,0.3)]">
                    <Search size={20} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-xl font-black text-white font-display">No receipts yet</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Scan your first receipt to get started.
                  </p>
                </div>
              </div>

              <div className="w-full space-y-2.5 pb-2">
                <button 
                  onClick={handleOpenScan}
                  className="w-full py-3.5 bg-[#FFD700] hover:bg-amber-300 text-black font-extrabold text-xs rounded-xl shadow-[0_0_20px_rgba(255,215,0,0.3)] flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Camera size={16} className="text-black" />
                  <span>Scan Receipt</span>
                </button>

                <button 
                  onClick={() => { setActiveTab("scan"); setSubScreen("none"); }}
                  className="w-full py-3 px-3 bg-[#18181C] hover:bg-zinc-800 border border-zinc-700/80 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Upload size={16} className="text-zinc-300" />
                  <span>Upload QR</span>
                </button>
              </div>
            </motion.div>
          )}
          
          {/* A. TOTAL SUBSCRIPTION PAGE / TOP UP SCREEN */}
          {subScreen === "topup" && (
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              className="absolute inset-0 bg-[#070709] z-30 overflow-y-auto"
            >
              <PricingSelection
                user={user}
                onPaymentVerified={() => {
                  if (checkUserSession) checkUserSession();
                  setSubScreen("none");
                }}
                onBack={() => setSubScreen("none")}
                onLogout={onLogout}
                locale={locale}
                t={t}
              />
            </motion.div>
          )}

          {/* B. SETTINGS SCREEN */}
          {subScreen === "settings" && (
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              className="absolute inset-0 bg-[#070709] z-30 p-4 space-y-4 overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-2 border-b border-zinc-900">
                <button 
                  onClick={() => setSubScreen("none")} 
                  className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white font-bold"
                >
                  <ArrowLeft size={16} />
                  <span>Settings</span>
                </button>
              </div>

              {/* Settings Groups */}
              <div className="space-y-4 text-xs">
                
                {/* Cloud Integrations (Supabase & Brevo) */}
                <div className="space-y-2">
                  <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Device Security & Biometrics</h4>
                  <div className="bg-[#121216] border border-amber-400/30 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Fingerprint size={16} className="text-[#FFD700]" />
                        <div>
                          <p className="font-bold text-white text-xs">Fingerprint & PIN Lock</p>
                          <p className="text-[10px] text-zinc-400">Local device authentication & access control</p>
                        </div>
                      </div>
                      <button
                        onClick={() => { setSecurityModalMode("setup"); setShowSecurityModal(true); }}
                        className="py-1.5 px-3 bg-[#FFD700] hover:bg-amber-300 text-black font-extrabold text-[11px] rounded-lg shadow-sm cursor-pointer transition-all"
                      >
                        Configure
                      </button>
                    </div>
                  </div>
                </div>

                {/* Appearance */}
                <div className="space-y-2">
                  <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Appearance</h4>
                  <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl divide-y divide-zinc-800/60">
                    <div className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Moon size={15} className="text-amber-400" />
                        <span>Dark Mode</span>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={darkMode} 
                        onChange={e => setDarkMode(e.target.checked)}
                        className="accent-amber-400 w-4 h-4 cursor-pointer"
                      />
                    </div>
                    <div 
                      onClick={() => onLanguageChange(locale === "en" ? "am" : "en")}
                      className="p-3 flex items-center justify-between cursor-pointer hover:bg-zinc-800/40"
                    >
                      <div className="flex items-center gap-2">
                        <Globe size={15} className="text-amber-400" />
                        <span>Language</span>
                      </div>
                      <span className="text-amber-400 font-bold">{locale === "en" ? "English >" : "አማርኛ >"}</span>
                    </div>
                  </div>
                </div>

                {/* Notifications */}
                <div className="space-y-2">
                  <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Notifications</h4>
                  <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl divide-y divide-zinc-800/60">
                    <div className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bell size={15} className="text-amber-400" />
                        <span>Push Notifications</span>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={pushNotifications} 
                        onChange={e => setPushNotifications(e.target.checked)}
                        className="accent-amber-400 w-4 h-4 cursor-pointer"
                      />
                    </div>
                    <div className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText size={15} className="text-amber-400" />
                        <span>Email Alerts</span>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={emailAlerts} 
                        onChange={e => setEmailAlerts(e.target.checked)}
                        className="accent-amber-400 w-4 h-4 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Security */}
                <div className="space-y-2">
                  <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Security & Biometrics</h4>
                  <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl divide-y divide-zinc-800/60">
                    <div 
                      onClick={() => { setSecurityModalMode("unlock"); setShowSecurityModal(true); }}
                      className="p-3 flex items-center justify-between cursor-pointer hover:bg-zinc-800/40 text-amber-400 font-bold"
                    >
                      <div className="flex items-center gap-2">
                        <Lock size={15} className="text-amber-400" />
                        <span>Lock App Now</span>
                      </div>
                      <ChevronRight size={14} className="text-amber-400" />
                    </div>
                    <div 
                      onClick={() => { setSecurityModalMode("setup"); setShowSecurityModal(true); }}
                      className="p-3 flex items-center justify-between cursor-pointer hover:bg-zinc-800/40"
                    >
                      <div className="flex items-center gap-2">
                        <Lock size={15} className="text-amber-400" />
                        <span>Change Security PIN</span>
                      </div>
                      <ChevronRight size={14} className="text-zinc-500" />
                    </div>
                    <div className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Fingerprint size={15} className="text-amber-400" />
                        <span>Biometric Lock (Fingerprint)</span>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={biometricLock} 
                        onChange={e => {
                          const val = e.target.checked;
                          setBiometricLock(val);
                          localStorage.setItem("beu_verify_biometrics_enabled", val ? "true" : "false");
                          if (val) {
                            setSecurityModalMode("setup");
                            setShowSecurityModal(true);
                          }
                        }}
                        className="accent-amber-400 w-4 h-4 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* More Info */}
                <div className="space-y-2">
                  <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">More</h4>
                  <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl divide-y divide-zinc-800/60">
                    <div 
                      onClick={() => setSubScreen("about")}
                      className="p-3 flex items-center justify-between cursor-pointer hover:bg-zinc-800/40 text-white"
                    >
                      <span>About BeuVerify</span>
                      <ChevronRight size={14} className="text-zinc-500" />
                    </div>
                    <div 
                      onClick={() => setSubScreen("privacy")}
                      className="p-3 flex items-center justify-between cursor-pointer hover:bg-zinc-800/40 text-white"
                    >
                      <span>Privacy Policy</span>
                      <ChevronRight size={14} className="text-zinc-500" />
                    </div>
                    <div 
                      onClick={() => setSubScreen("terms")}
                      className="p-3 flex items-center justify-between cursor-pointer hover:bg-zinc-800/40 text-white"
                    >
                      <span>Terms of Service</span>
                      <ChevronRight size={14} className="text-zinc-500" />
                    </div>
                  </div>
                </div>

              </div>
            </motion.div>
          )}

          {/* ABOUT BEUVERIFY SCREEN */}
          {subScreen === "about" && (
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              className="absolute inset-0 bg-[#070709] z-30 p-4 space-y-4 overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-2 border-b border-zinc-900">
                <button 
                  onClick={() => setSubScreen("settings")} 
                  className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white font-bold"
                >
                  <ArrowLeft size={16} />
                  <span>About BeuVerify</span>
                </button>
              </div>

              <div className="p-4 bg-zinc-900 border border-amber-400/30 rounded-2xl space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-400 rounded-xl flex items-center justify-center text-black font-black">
                    <Zap size={22} className="fill-black" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-white text-base">BeuVerify v2.4</h3>
                    <p className="text-[10px] text-amber-400 font-mono">Ethiopian Financial Verification Platform</p>
                  </div>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  BeuVerify is an advanced receipt verification engine engineered specifically for Commercial Bank of Ethiopia (CBE), Bank of Abyssinia (BOA), and Telebirr digital receipts. Our system verifies reference validity, detects duplicates, and prevents fraudulent payments in real-time.
                </p>
              </div>
            </motion.div>
          )}

          {/* PRIVACY POLICY SCREEN */}
          {subScreen === "privacy" && (
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              className="absolute inset-0 bg-[#070709] z-30 p-4 space-y-4 overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-2 border-b border-zinc-900">
                <button 
                  onClick={() => setSubScreen("settings")} 
                  className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white font-bold"
                >
                  <ArrowLeft size={16} />
                  <span>Privacy Policy</span>
                </button>
              </div>

              <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-3 text-xs text-zinc-300 leading-relaxed">
                <h3 className="font-bold text-white text-sm">Data Privacy & Security</h3>
                <p>
                  BeuVerify values your privacy. Account numbers, reference codes, and receipt details processed through our app are encrypted end-to-end. We do not store full payment credentials on unencrypted servers.
                </p>
                <p>
                  Verification logs are stored locally on your device and linked to your account history to prevent duplicate transactions.
                </p>
              </div>
            </motion.div>
          )}

          {/* TERMS OF SERVICE SCREEN */}
          {subScreen === "terms" && (
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              className="absolute inset-0 bg-[#070709] z-30 p-4 space-y-4 overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-2 border-b border-zinc-900">
                <button 
                  onClick={() => setSubScreen("settings")} 
                  className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white font-bold"
                >
                  <ArrowLeft size={16} />
                  <span>Terms of Service</span>
                </button>
              </div>

              <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-3 text-xs text-zinc-300 leading-relaxed">
                <h3 className="font-bold text-white text-sm">User Agreement</h3>
                <p>
                  By using BeuVerify, you agree to submit legitimate financial transaction details for verification purposes only.
                </p>
                <p>
                  Attempting to forge, manipulate, or re-verify already claimed receipt reference numbers is strictly prohibited and logged by our security system.
                </p>
              </div>
            </motion.div>
          )}

          {/* C. VERIFICATION RESULT OVERLAY SCREEN */}
          {(currentVerification || subScreen === "result") && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute inset-0 bg-[#070709] z-30 p-4 space-y-4 overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-2 border-b border-zinc-900">
                <button 
                  onClick={() => {
                    setCurrentVerification(null);
                    setSubScreen("none");
                  }} 
                  className="p-2 bg-zinc-900 hover:bg-zinc-800 rounded-full text-zinc-300"
                >
                  <ArrowLeft size={16} />
                </button>
                <span className="text-xs font-bold text-zinc-400">Verification Result</span>
                <div className="w-8 h-8" />
              </div>

              <ResultDisplay
                result={currentVerification || {
                  requestId: "req_demo",
                  bank: "telebirr",
                  reference: "FT98234120",
                  processingStatus: ProcessingStatus.Completed,
                  status: VerificationStatus.Success,
                  verified: true,
                  senderName: "Abebe Kebede",
                  receiverName: userName,
                  amount: 245.50,
                  transactionDate: new Date().toISOString()
                }}
                onClose={() => {
                  setCurrentVerification(null);
                  setSubScreen("none");
                }}
                themeConfig={THEMES.gold}
                t={TRANSLATIONS[locale]}
              />
            </motion.div>
          )}

        </AnimatePresence>

        {/* 3. TAB 1: HOME SCREEN */}
        {activeTab === "home" && subScreen === "none" && (
          <div className="p-2.5 space-y-2.5">
            
            {/* User Greeting & System Heartbeat Card */}
            <div className="p-2.5 bg-[#111114] border border-zinc-800/80 rounded-xl flex items-center justify-between shadow-md">
              <div className="flex items-center gap-2">
                {/* Yellow Circle Avatar with Thunder & Green Dot */}
                <div className="relative shrink-0">
                  <div className="w-9 h-9 bg-[#FFD700] rounded-full flex items-center justify-center text-black shadow-[0_0_12px_rgba(255,215,0,0.3)]">
                    <Zap size={18} className="fill-black" />
                  </div>
                  <span className="w-2.5 h-2.5 bg-emerald-400 border-2 border-[#111114] rounded-full absolute bottom-0 right-0" />
                </div>

                <div className="min-w-0">
                  <p className="text-[9px] text-zinc-400 font-medium">Good Afternoon</p>
                  <h3 className="text-xs font-extrabold text-white leading-tight font-display truncate">
                    {userName}
                  </h3>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="inline-flex items-center gap-1 text-[8px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-1.5 py-0.2 rounded-full">
                      <span className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse" />
                      Online
                    </span>
                    <span className="text-[8px] font-medium text-zinc-400 bg-zinc-800/80 px-1.5 py-0.2 rounded-full truncate">
                      {userRole}
                    </span>
                  </div>
                </div>
              </div>

              {/* Heartbeat Status */}
              <div className="text-right pl-2 border-l border-zinc-800/60 shrink-0">
                <div className="flex items-center justify-end gap-1 text-[9px] text-zinc-400">
                  <span>♡</span>
                  <span>Heartbeat</span>
                </div>
                <div className="flex items-center justify-end gap-1 text-white font-mono font-black text-xs my-0.5">
                  <span>72 <span className="text-[8px] text-zinc-400 font-normal">BPM</span></span>
                  <svg width="20" height="10" viewBox="0 0 24 12" fill="none" className="text-emerald-400 stroke-current stroke-2">
                    <path d="M0 6H4L6 2L9 10L12 4L14 7L16 6H24" />
                  </svg>
                </div>
                <p className="text-[8px] text-emerald-400 flex items-center justify-end gap-0.5 font-medium">
                  <CheckCircle2 size={9} />
                  <span>Healthy</span>
                </p>
              </div>
            </div>

            {/* Today's Verified Volume Hero Card */}
            <div className="p-3 bg-[#111114] border border-zinc-800/80 rounded-xl relative overflow-hidden shadow-lg space-y-2.5">
              <div className="flex justify-between items-start relative z-10">
                <div className="space-y-0.5">
                  <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest font-mono">
                    TODAY'S VERIFIED VOLUME
                  </p>
                  <div className="flex items-baseline gap-1.5">
                    <h2 className="text-2xl font-black text-white font-mono tracking-tight">
                      {todayVolume.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </h2>
                    <span className="text-xs font-bold text-amber-400 font-mono">ETB</span>
                  </div>
                  <p className="text-[9px] text-emerald-400 flex items-center gap-1 font-medium">
                    <CheckCircle2 size={11} />
                    <span>{receiptsTodayCount} Verified Today ({totalSavedCount} Saved Total)</span>
                  </p>
                </div>

                {/* Styled 3D Gold Coin Stack (Clicking opens Manual Entry ⚡) */}
                <button
                  onClick={handleOpenManual}
                  title="Manual Entry ⚡"
                  className="relative w-12 h-12 shrink-0 flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition-transform"
                >
                  <div className="absolute inset-0 bg-amber-400/20 rounded-full blur-md pointer-events-none" />
                  <div className="w-10 h-10 bg-gradient-to-b from-amber-300 via-amber-500 to-amber-700 rounded-lg shadow-[0_3px_10px_rgba(245,158,11,0.4)] border border-amber-200/50 flex flex-col items-center justify-center text-black transform rotate-6">
                    <Zap size={16} className="fill-black text-black stroke-black" />
                  </div>
                </button>
              </div>

              {/* Action Buttons Row */}
              <div className="grid grid-cols-3 gap-1.5 relative z-10">
                <button
                  onClick={handleOpenScanCamera}
                  className="py-2.5 px-1.5 bg-[#FFD700] hover:bg-amber-300 text-black font-extrabold text-[10px] rounded-lg shadow-[0_0_15px_rgba(255,215,0,0.3)] flex items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 truncate"
                >
                  <Camera size={13} className="text-black shrink-0" />
                  <span className="truncate">Scan Receipt</span>
                </button>

                <button
                  onClick={handleOpenScanUpload}
                  className="py-2.5 px-1.5 bg-[#18181C] hover:bg-zinc-800 border border-zinc-700/80 text-white font-bold text-[10px] rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 truncate"
                >
                  <Upload size={13} className="text-zinc-300 shrink-0" />
                  <span className="truncate">Upload QR</span>
                </button>

                <button
                  onClick={handleOpenManual}
                  className="py-2.5 px-1.5 bg-[#18181C] hover:bg-zinc-800 border border-amber-400/40 text-amber-300 font-bold text-[10px] rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 truncate"
                >
                  <Zap size={13} className="text-[#FFD700] fill-[#FFD700] shrink-0" />
                  <span className="truncate">Manual</span>
                </button>
              </div>
            </div>

            {/* 4 Metric Grid Cards */}
            <div className="grid grid-cols-2 gap-2">
              
              {/* Card 1: Receipts Today */}
              <div className="p-2.5 bg-[#111114] border border-zinc-800/80 rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <div className="w-7 h-7 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                    <FileText size={13} className="text-amber-400" />
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-400 font-medium">Receipts Today</p>
                  <p className="text-lg font-black text-white font-mono leading-tight mt-0.5">{receiptsTodayCount}</p>
                  <p className="text-[8px] text-zinc-500 font-mono">verified today</p>
                </div>
              </div>

              {/* Card 2: Weekly Volume */}
              <div className="p-2.5 bg-[#111114] border border-zinc-800/80 rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <div className="w-7 h-7 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                    <BarChart3 size={13} className="text-amber-400" />
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-400 font-medium">Weekly Volume</p>
                  <p className="text-lg font-black text-white font-mono leading-tight mt-0.5">
                    {weeklyVolume.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} <span className="text-[10px] text-zinc-400 font-normal">ETB</span>
                  </p>
                  <p className="text-[8px] text-zinc-500 font-mono">{weeklyCount} {weeklyCount === 1 ? "receipt" : "receipts"} this week</p>
                </div>
              </div>

              {/* Card 3: Transactions */}
              <div className="p-2.5 bg-[#111114] border border-zinc-800/80 rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <div className="w-7 h-7 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                    <RefreshCw size={13} className="text-amber-400" />
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-400 font-medium">Transactions</p>
                  <p className="text-lg font-black text-white font-mono leading-tight mt-0.5">{totalSavedCount}</p>
                  <p className="text-[8px] text-zinc-500 font-mono">total saved</p>
                </div>
              </div>

              {/* Card 4: Accuracy */}
              <div className="p-2.5 bg-[#111114] border border-zinc-800/80 rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <div className="w-7 h-7 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                    <ShieldCheck size={13} className="text-amber-400" />
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-400 font-medium">Accuracy</p>
                  <p className="text-lg font-black text-amber-400 font-mono leading-tight mt-0.5">100%</p>
                  <p className="text-[8px] text-zinc-500 font-mono">direct node checked</p>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* 4. TAB 2: HISTORY SCREEN (Matches Screen #6 in Mockup Image) */}
        {activeTab === "history" && subScreen === "none" && (
          <div className="p-4 space-y-4">
            
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-white tracking-tight">History</h2>
            </div>

            {/* Search & Filter Bar */}
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 flex items-center gap-2 text-xs">
                <Search size={15} className="text-zinc-400" />
                <input 
                  type="text" 
                  value={historySearch}
                  onChange={e => setHistorySearch(e.target.value)}
                  placeholder="Search receipts, merchants..." 
                  className="bg-transparent text-white focus:outline-none w-full placeholder:text-zinc-500"
                />
              </div>

              <button className="p-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-zinc-300">
                <SlidersHorizontal size={15} />
              </button>
            </div>

            {/* History List from Real Saved Logs */}
            <div className="space-y-4 text-xs">
              {(logs || []).length === 0 ? (
                <div className="p-8 text-center bg-zinc-900/60 border border-zinc-800 rounded-2xl space-y-2">
                  <FileText size={32} className="mx-auto text-zinc-600" />
                  <p className="font-bold text-zinc-300 text-sm">Fresh Account Start</p>
                  <p className="text-[11px] text-zinc-500 max-w-xs mx-auto">
                    No verified transactions recorded yet. Tap Scan or Manual to verify your first receipt.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    All Saved Verifications ({(logs || []).length})
                  </h4>
                  <div className="space-y-2">
                    {(logs || [])
                      .filter(item => {
                        if (!historySearch.trim()) return true;
                        const query = historySearch.toLowerCase();
                        return (
                          (item.reference && item.reference.toLowerCase().includes(query)) ||
                          (item.senderName && item.senderName.toLowerCase().includes(query)) ||
                          (item.receiverName && item.receiverName.toLowerCase().includes(query)) ||
                          (item.bank && item.bank.toLowerCase().includes(query))
                        );
                      })
                      .map((logItem, idx) => (
                        <div 
                          key={logItem.requestId || logItem.id || logItem.reference || idx}
                          onClick={() => {
                            setCurrentVerification({
                              requestId: logItem.requestId || logItem.id || `req_${idx}`,
                              bank: logItem.bank || "telebirr",
                              reference: logItem.reference,
                              processingStatus: ProcessingStatus.Completed,
                              status: VerificationStatus.Success,
                              verified: true,
                              senderName: logItem.senderName || "Payer",
                              receiverName: logItem.receiverName || userName,
                              amount: logItem.amount || 0,
                              transactionDate: logItem.timestamp || new Date().toISOString()
                            });
                          }}
                          className="p-3 bg-zinc-900/90 border border-zinc-800/90 hover:border-amber-400/50 rounded-xl flex items-center justify-between cursor-pointer transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-zinc-800 border border-zinc-700 rounded-xl flex items-center justify-center text-amber-400 shrink-0">
                              <Building2 size={16} />
                            </div>
                            <div>
                              <p className="font-bold text-white">{logItem.senderName || logItem.bank?.toUpperCase() || "Payer"}</p>
                              <p className="text-[10px] text-zinc-400 font-mono">
                                {new Date(logItem.timestamp).toLocaleString()}
                              </p>
                            </div>
                          </div>

                          <div className="text-right flex items-center gap-2">
                            <div>
                              <p className="font-bold text-white font-mono">
                                ETB {(logItem.amount || 0).toFixed(2)}
                              </p>
                              <p className="text-[9px] text-amber-400 font-mono uppercase">{logItem.bank}</p>
                            </div>
                            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

        {/* 5. TAB 3: SCAN / MANUAL VERIFICATION SCREEN */}
        {activeTab === "scan" && subScreen === "none" && (
          <div className="p-3 space-y-3 h-full flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between text-xs border-b border-zinc-900 pb-2 shrink-0">
              <button onClick={() => setActiveTab("home")} className="p-1 text-zinc-400 hover:text-white flex items-center gap-1.5 font-bold">
                <X size={16} />
                <span className="text-[11px] font-bold text-white">
                  {scanTabMode === "manual" ? "Manual Verification Methods" : "Scan Receipt"}
                </span>
              </button>
              
              {/* 3-Way Mode Switcher Pill */}
              <div className="flex bg-[#121215] border border-zinc-800 rounded-lg p-0.5 text-[10px] font-bold">
                <button
                  onClick={() => setScanTabMode("manual")}
                  className={`px-2 py-1 rounded-md flex items-center gap-1 transition-all ${
                    scanTabMode === "manual" ? "bg-[#FFD700] text-black font-extrabold" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Zap size={11} className={scanTabMode === "manual" ? "fill-black" : ""} />
                  <span>Manual</span>
                </button>
                <button
                  onClick={() => setScanTabMode("camera")}
                  className={`px-2 py-1 rounded-md flex items-center gap-1 transition-all ${
                    scanTabMode === "camera" ? "bg-[#FFD700] text-black font-extrabold" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Camera size={11} />
                  <span>Camera</span>
                </button>
                <button
                  onClick={() => setScanTabMode("upload")}
                  className={`px-2 py-1 rounded-md flex items-center gap-1 transition-all ${
                    scanTabMode === "upload" ? "bg-[#FFD700] text-black font-extrabold" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Upload size={11} />
                  <span>Upload</span>
                </button>
              </div>
            </div>

            {/* Dynamic Content: Manual Form vs QR Scanner */}
            {scanTabMode === "manual" ? (
              <div className="flex-1 overflow-y-auto pt-1">
                <ManualForm 
                  onVerify={(data) => {
                    if (onVerifyReference) onVerifyReference(data.reference, data.bank);
                  }}
                  onSwitchToScan={() => setScanTabMode("camera")}
                  isLoading={isLoadingVerification}
                  themeConfig={{ ...THEMES.gold, mode: darkMode ? "dark" : "light" }}
                  t={TRANSLATIONS[locale]}
                />
              </div>
            ) : (
              <div className="flex-1 flex flex-col gap-3">
                <div className="flex-1 rounded-2xl overflow-hidden border border-amber-400/30 relative">
                  <QrScanner 
                    initialTab={scanTabMode}
                    onScanSuccess={(ref, bank) => {
                      if (onVerifyReference) onVerifyReference(ref, bank);
                    }}
                    onScanError={(err) => alert(err)}
                    themeConfig={THEMES.gold}
                    t={TRANSLATIONS[locale]}
                  />
                </div>
                
                {/* Switch to manual button shortcut */}
                <button
                  onClick={() => setScanTabMode("manual")}
                  className="w-full py-2 bg-[#121215] hover:bg-zinc-800 border border-zinc-800/80 rounded-xl text-zinc-300 font-bold text-[10px] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Zap size={12} className="text-[#FFD700] fill-[#FFD700]" />
                  <span>Or Enter Receipt Reference Manually</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* 6. TAB 4: ANALYTICS SCREEN (Matches Screen #7 in Mockup Image) */}
        {activeTab === "analytics" && subScreen === "none" && (
          <div className="p-4 space-y-4">
            
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-white tracking-tight">Analytics</h2>
              <select className="bg-zinc-900 border border-zinc-800 text-xs font-bold text-amber-400 rounded-lg px-2 py-1 focus:outline-none">
                <option>This Week</option>
                <option>This Month</option>
              </select>
            </div>

            {/* Verified Volume Daily Chart Card */}
            <div className="p-4 bg-zinc-900/90 border border-zinc-800 rounded-2xl space-y-3">
              <div>
                <p className="text-xs text-zinc-400">Total Verified Volume</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-black text-white font-mono">
                    ETB {(logs || []).reduce((sum, item) => sum + (item.amount || 0), 0).toFixed(2)}
                  </h3>
                  <span className="text-xs font-bold text-emerald-400">Realtime Daily Log</span>
                </div>
              </div>

              {/* Day-by-Day Volume Bar Chart */}
              <div className="h-28 w-full pt-3 flex items-end justify-between gap-2 px-1">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((dayName, dayIndex) => {
                  // Calculate total volume for this day of the week from real logs
                  const dayLogs = (logs || []).filter(l => {
                    const d = new Date(l.timestamp || Date.now());
                    const jsDay = d.getDay(); // 0 is Sun, 1 is Mon...
                    const mappedIdx = jsDay === 0 ? 6 : jsDay - 1;
                    return mappedIdx === dayIndex;
                  });
                  const dayVolume = dayLogs.reduce((acc, l) => acc + (l.amount || 0), 0);
                  const maxVol = Math.max(...["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((_, idx) => {
                    return (logs || []).filter(l => {
                      const d = new Date(l.timestamp || Date.now());
                      const jsDay = d.getDay();
                      const mappedIdx = jsDay === 0 ? 6 : jsDay - 1;
                      return mappedIdx === idx;
                    }).reduce((acc, l) => acc + (l.amount || 0), 0);
                  }), 100);

                  const barPercent = Math.min(100, Math.max(12, Math.round((dayVolume / maxVol) * 100)));

                  return (
                    <div key={dayName} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                      {dayVolume > 0 && (
                        <span className="text-[8px] font-mono text-amber-300 font-bold opacity-90 truncate max-w-[36px]">
                          {dayVolume >= 1000 ? `${(dayVolume/1000).toFixed(1)}k` : dayVolume.toFixed(0)}
                        </span>
                      )}
                      <div className="w-full bg-zinc-800 rounded-t-lg relative overflow-hidden flex items-end" style={{ height: "70%" }}>
                        <div 
                          className={`w-full rounded-t-lg transition-all duration-500 ${
                            dayVolume > 0 ? "bg-gradient-to-t from-amber-500 to-amber-300 shadow-[0_0_10px_rgba(250,204,21,0.4)]" : "bg-zinc-800"
                          }`}
                          style={{ height: `${barPercent}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-zinc-400 font-mono font-bold uppercase">{dayName}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-xl space-y-1">
                <span className="text-[11px] text-zinc-400">Total Receipts</span>
                <p className="text-lg font-black text-white font-mono">{(logs || []).length}</p>
                <p className="text-[10px] text-emerald-400">Saved</p>
              </div>

              <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-xl space-y-1">
                <span className="text-[11px] text-zinc-400">Node Accuracy</span>
                <p className="text-lg font-black text-emerald-400 font-mono">100%</p>
                <p className="text-[10px] text-emerald-400">Direct Verified</p>
              </div>
            </div>

            {/* Top Merchants Section */}
            <div className="space-y-2 text-xs">
              <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Top Merchants</h4>
              {topMerchants.length === 0 ? (
                <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl text-center space-y-1">
                  <Building2 size={20} className="mx-auto text-zinc-600 mb-1" />
                  <p className="text-[11px] text-zinc-400 font-bold">No Merchants Recorded Yet</p>
                  <p className="text-[10px] text-zinc-500 max-w-xs mx-auto">
                    Verified receipts will automatically group and display top merchant statistics here.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {topMerchants.map((m, idx) => (
                    <div key={m.name + idx} className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center text-amber-400 font-bold">
                          <Building2 size={16} />
                        </div>
                        <div>
                          <p className="font-bold text-white">{m.name}</p>
                          <p className="text-[10px] text-zinc-400">{m.count} {m.count === 1 ? "receipt" : "receipts"}</p>
                        </div>
                      </div>
                      <span className="font-bold text-white font-mono">ETB {m.totalAmount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* 7. TAB 5: PROFILE SCREEN (Matches Screen #8 in Mockup Image) */}
        {activeTab === "profile" && subScreen === "none" && (
          <div className="p-4 space-y-4">
            
            {/* Top User Header */}
            <div className="flex flex-col items-center justify-center pt-2 space-y-2 text-center">
              <div className="w-16 h-16 bg-amber-400 text-black rounded-full flex items-center justify-center font-black text-2xl shadow-[0_0_25px_rgba(250,204,21,0.4)]">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">{userName}</h3>
                <p className="text-xs text-amber-400 font-mono font-bold flex items-center justify-center gap-1 mt-0.5">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                  <span>{userRole} • Online</span>
                </p>
              </div>
            </div>

            {/* Credits Balance Card */}
            <div className="p-4 bg-zinc-900/90 border border-zinc-800 rounded-2xl flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-xs text-zinc-400">Credits Balance</p>
                <div className="flex items-center gap-1.5 text-xl font-black text-white font-mono">
                  <Coins size={18} className="text-amber-400" />
                  <span>{userCredits}</span>
                </div>
              </div>

              <button
                onClick={() => setSubScreen("topup")}
                className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-xs rounded-xl shadow-md cursor-pointer"
              >
                Top Up
              </button>
            </div>

            {/* Profile Menu List */}
            <div className="space-y-2 text-xs">
              
              <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl divide-y divide-zinc-800/60">
                <div className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-zinc-800/40">
                  <div className="flex items-center gap-2.5">
                    <User size={16} className="text-amber-400" />
                    <span>Personal Information</span>
                  </div>
                  <ChevronRight size={15} className="text-zinc-500" />
                </div>

                <div className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-zinc-800/40">
                  <div className="flex items-center gap-2.5">
                    <Globe size={16} className="text-amber-400" />
                    <span>Node Status</span>
                  </div>
                  <span className="text-emerald-400 font-bold font-mono">Online &gt;</span>
                </div>

                <div className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-zinc-800/40">
                  <div className="flex items-center gap-2.5">
                    <CreditCard size={16} className="text-amber-400" />
                    <span>My Earnings</span>
                  </div>
                  <span className="text-amber-400 font-bold font-mono">ETB {myEarnings.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} &gt;</span>
                </div>

                <div className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-zinc-800/40">
                  <div className="flex items-center gap-2.5">
                    <Sparkles size={16} className="text-amber-400" />
                    <span>Achievements</span>
                  </div>
                  <ChevronRight size={15} className="text-zinc-500" />
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={onLogout}
                className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all mt-4 cursor-pointer"
              >
                <LogOut size={15} />
                <span>Log Out</span>
              </button>

            </div>

          </div>
        )}

      </div>

      {/* 8. DRAWER SLIDE OVERLAY (Matches Screen #12 Sidebar in Mockup Image) */}
      <AnimatePresence>
        {showDrawer && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex"
          >
            <motion.div 
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-4/5 h-full bg-[#0D0D10] border-r border-zinc-800 p-5 flex flex-col justify-between"
            >
              {/* Drawer Top Header */}
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-400 text-black rounded-full flex items-center justify-center font-black text-lg">
                      {userName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-white text-sm">{userName}</h4>
                      <p className="text-[10px] text-zinc-400">{userRole}</p>
                    </div>
                  </div>

                  <button 
                    onClick={() => setShowDrawer(false)}
                    className="p-1.5 text-zinc-400 hover:text-white"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Credits badge inside drawer */}
                <div className="p-3 bg-zinc-900 border border-amber-400/20 rounded-xl flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Credits</span>
                  <span className="font-mono font-bold text-amber-400">{userCredits}</span>
                </div>

                {/* Drawer Links */}
                <div className="space-y-1 text-xs font-bold text-zinc-300">
                  <button 
                    onClick={() => { handleTabSelect("home"); setShowDrawer(false); }}
                    className="w-full p-2.5 rounded-xl hover:bg-zinc-800/60 flex items-center gap-3 transition-colors"
                  >
                    <Home size={16} className="text-[#FFD700]" />
                    <span>Home</span>
                  </button>

                  <button 
                    onClick={() => { handleTabSelect("history"); setShowDrawer(false); }}
                    className="w-full p-2.5 rounded-xl hover:bg-zinc-800/60 flex items-center gap-3 transition-colors"
                  >
                    <HistoryIcon size={16} className="text-[#FFD700]" />
                    <span>History</span>
                  </button>

                  <button 
                    onClick={() => { handleTabSelect("analytics"); setShowDrawer(false); }}
                    className="w-full p-2.5 rounded-xl hover:bg-zinc-800/60 flex items-center gap-3 transition-colors"
                  >
                    <BarChart3 size={16} className="text-[#FFD700]" />
                    <span>Analytics</span>
                  </button>

                  <button 
                    onClick={() => { setSubScreen("topup"); setShowDrawer(false); }}
                    className="w-full p-2.5 rounded-xl hover:bg-zinc-800/60 flex items-center gap-3 transition-colors"
                  >
                    <Coins size={16} className="text-[#FFD700]" />
                    <span>Top Up Credits</span>
                  </button>

                  <button 
                    onClick={() => { setSubScreen("settings"); setShowDrawer(false); }}
                    className="w-full p-2.5 rounded-xl hover:bg-zinc-800/60 flex items-center gap-3 transition-colors"
                  >
                    <SettingsIcon size={16} className="text-[#FFD700]" />
                    <span>Settings</span>
                  </button>

                  <button 
                    onClick={() => { setSecurityModalMode("setup"); setShowSecurityModal(true); setShowDrawer(false); }}
                    className="w-full p-2.5 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center gap-3 transition-colors text-amber-300"
                  >
                    <Fingerprint size={16} className="text-[#FFD700]" />
                    <span>Fingerprint & PIN Security</span>
                  </button>

                  <div className="pt-2 pb-1 border-t border-zinc-800/60 text-[10px] uppercase font-mono text-zinc-500 font-bold px-1">
                    Screen Previews
                  </div>

                  <button 
                    onClick={() => { setSubScreen("onboarding"); setShowDrawer(false); }}
                    className="w-full p-2.5 rounded-xl hover:bg-zinc-800/60 flex items-center gap-3 transition-colors"
                  >
                    <Smartphone size={16} className="text-[#FFD700]" />
                    <span>Onboarding Screen</span>
                  </button>

                  <button 
                    onClick={() => { setSubScreen("result"); setShowDrawer(false); }}
                    className="w-full p-2.5 rounded-xl hover:bg-zinc-800/60 flex items-center gap-3 transition-colors"
                  >
                    <CheckCircle2 size={16} className="text-emerald-400" />
                    <span>Verification Result</span>
                  </button>

                  <button 
                    onClick={() => { setSubScreen("empty"); setShowDrawer(false); }}
                    className="w-full p-2.5 rounded-xl hover:bg-zinc-800/60 flex items-center gap-3 transition-colors"
                  >
                    <FileText size={16} className="text-[#FFD700]" />
                    <span>Empty State</span>
                  </button>

                  <button 
                    onClick={() => { setSubScreen("splash"); setShowDrawer(false); }}
                    className="w-full p-2.5 rounded-xl hover:bg-zinc-800/60 flex items-center gap-3 transition-colors"
                  >
                    <Zap size={16} className="text-[#FFD700]" />
                    <span>Splash Screen</span>
                  </button>

                  <button 
                    onClick={() => { alert("BeuVerify Support: Contact @beuverify on Telegram"); setShowDrawer(false); }}
                    className="w-full p-2.5 rounded-xl hover:bg-zinc-800/60 flex items-center gap-3 transition-colors"
                  >
                    <HelpCircle size={16} className="text-zinc-400" />
                    <span>Support</span>
                  </button>

                  <button 
                    onClick={() => { alert("Share link copied to clipboard!"); setShowDrawer(false); }}
                    className="w-full p-2.5 rounded-xl hover:bg-zinc-800/60 flex items-center gap-3 transition-colors"
                  >
                    <Share2 size={16} className="text-zinc-400" />
                    <span>Share BeuVerify</span>
                  </button>
                </div>
              </div>

              {/* Drawer Bottom Logout */}
              <button 
                onClick={() => { setShowDrawer(false); onLogout(); }}
                className="w-full p-3 bg-red-500/10 text-red-400 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </motion.div>

            {/* Backdrop click dismiss */}
            <div className="flex-1" onClick={() => setShowDrawer(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 9. BOTTOM NAVIGATION BAR (Fixed Native Mobile Layout) */}
      <div className={`w-full h-16 border-t px-2 flex items-center justify-around shrink-0 z-30 backdrop-blur-md ${
        darkMode ? "bg-[#0D0D10]/95 border-zinc-900/80" : "bg-white/95 border-slate-200 shadow-lg text-slate-800"
      }`}>
        
        {/* Tab 1: Home */}
        <button
          onClick={() => handleTabSelect("home")}
          className={`flex flex-col items-center justify-center gap-1 w-12 py-1 transition-all ${
            activeTab === "home" && subScreen === "none" ? "text-amber-400 font-bold" : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <Home size={18} />
          <span className="text-[9px]">Home</span>
        </button>

        {/* Tab 2: History */}
        <button
          onClick={() => handleTabSelect("history")}
          className={`flex flex-col items-center justify-center gap-1 w-12 py-1 transition-all ${
            activeTab === "history" && subScreen === "none" ? "text-amber-400 font-bold" : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <HistoryIcon size={18} />
          <span className="text-[9px]">History</span>
        </button>

        {/* Center Floating Yellow Scan Button */}
        <div className="relative -top-5">
          <button
            onClick={handleOpenScan}
            className="w-13 h-13 bg-amber-400 text-black rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(250,204,21,0.5)] border-4 border-[#070709] hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            <Zap size={24} className="fill-black" />
          </button>
        </div>

        {/* Tab 3: Analytics */}
        <button
          onClick={() => handleTabSelect("analytics")}
          className={`flex flex-col items-center justify-center gap-1 w-12 py-1 transition-all ${
            activeTab === "analytics" && subScreen === "none" ? "text-amber-400 font-bold" : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <BarChart3 size={18} />
          <span className="text-[9px]">Analytics</span>
        </button>

        {/* Tab 4: Profile */}
        <button
          onClick={() => handleTabSelect("profile")}
          className={`flex flex-col items-center justify-center gap-1 w-12 py-1 transition-all ${
            activeTab === "profile" && subScreen === "none" ? "text-amber-400 font-bold" : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <User size={18} />
          <span className="text-[9px]">Profile</span>
        </button>

      </div>

      {/* 9. SIDE NAVIGATION DRAWER (3 Lines Menu Icon) */}
      <AnimatePresence>
        {showDrawer && (
          <div className="absolute inset-0 z-50 flex pointer-events-auto overflow-hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDrawer(false)}
              className="absolute inset-0 bg-black/75 backdrop-blur-sm cursor-pointer"
            />

            {/* Sliding Panel */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className={`relative w-[82%] max-w-[320px] h-full flex flex-col shadow-2xl z-10 overflow-hidden ${
                darkMode ? "bg-[#0c0c0e] text-white border-r border-zinc-800" : "bg-white text-slate-900 border-r border-slate-200"
              }`}
            >
              {/* Drawer Header */}
              <div className={`p-4 border-b flex items-center justify-between shrink-0 ${
                darkMode ? "bg-[#111115] border-zinc-800" : "bg-slate-50 border-slate-200"
              }`}>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-[#FFD700] rounded-xl flex items-center justify-center text-black font-extrabold shadow-md shrink-0">
                    <Zap size={18} className="fill-black" />
                  </div>
                  <div>
                    <h2 className="font-extrabold text-sm tracking-tight font-display flex items-center gap-1.5">
                      BeuVerify <span className="text-amber-500 text-[10px] font-mono px-1.5 py-0.2 bg-amber-400/10 border border-amber-400/30 rounded uppercase">{activePlan}</span>
                    </h2>
                    <p className={`text-[10px] ${darkMode ? "text-zinc-400" : "text-slate-500"}`}>{userName} • Financial Node</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDrawer(false)}
                  className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                    darkMode ? "bg-zinc-800/80 border-zinc-700 text-zinc-300 hover:text-white" : "bg-slate-200 border-slate-300 text-slate-700 hover:text-black"
                  }`}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Scrollable Navigation Body */}
              <div className="flex-1 overflow-y-auto p-3 space-y-4 scrollbar-none">
                {/* Active Credits Card */}
                <div 
                  onClick={() => { setSubScreen("topup"); setShowDrawer(false); }}
                  className="p-3 bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent border border-amber-400/30 rounded-xl flex items-center justify-between cursor-pointer hover:border-amber-400 transition-all"
                >
                  <div>
                    <span className="text-[10px] text-amber-500 font-extrabold uppercase tracking-wider block font-mono">Active Balance</span>
                    <span className="text-base font-black font-mono">{userCredits} Credits</span>
                  </div>
                  <span className="px-2 py-1 bg-[#FFD700] text-black text-[10px] font-extrabold rounded-lg uppercase tracking-wider flex items-center gap-1 shadow-sm">
                    <Coins size={11} />
                    Upgrade
                  </span>
                </div>

                {/* Primary Nav Menu */}
                <div className="space-y-1">
                  <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
                    Navigation Menu
                  </span>
                  
                  <button
                    onClick={() => { setActiveTab("home"); setSubScreen("none"); setShowDrawer(false); }}
                    className={`w-full p-2.5 rounded-xl flex items-center gap-3 text-xs font-bold transition-all cursor-pointer ${
                      activeTab === "home" && subScreen === "none" 
                        ? "bg-amber-400 text-black shadow-sm font-extrabold" 
                        : darkMode ? "hover:bg-zinc-800/80 text-zinc-200" : "hover:bg-slate-100 text-slate-800"
                    }`}
                  >
                    <Home size={16} />
                    <span>Home Dashboard</span>
                  </button>

                  <button
                    onClick={() => { setActiveTab("scan"); setScanTabMode("manual"); setSubScreen("none"); setShowDrawer(false); }}
                    className={`w-full p-2.5 rounded-xl flex items-center gap-3 text-xs font-bold transition-all cursor-pointer ${
                      activeTab === "scan" && scanTabMode === "manual" && subScreen === "none"
                        ? "bg-amber-400 text-black shadow-sm font-extrabold" 
                        : darkMode ? "hover:bg-zinc-800/80 text-zinc-200" : "hover:bg-slate-100 text-slate-800"
                    }`}
                  >
                    <Zap size={16} className="text-amber-500 fill-amber-500" />
                    <span>Manual Verification</span>
                  </button>

                  <button
                    onClick={() => { setActiveTab("scan"); setScanTabMode("camera"); setSubScreen("none"); setShowDrawer(false); }}
                    className={`w-full p-2.5 rounded-xl flex items-center gap-3 text-xs font-bold transition-all cursor-pointer ${
                      activeTab === "scan" && scanTabMode === "camera" && subScreen === "none"
                        ? "bg-amber-400 text-black shadow-sm font-extrabold" 
                        : darkMode ? "hover:bg-zinc-800/80 text-zinc-200" : "hover:bg-slate-100 text-slate-800"
                    }`}
                  >
                    <Camera size={16} className="text-amber-400" />
                    <span>CBE QR Code Scanner</span>
                  </button>

                  <button
                    onClick={() => { setSubScreen("topup"); setShowDrawer(false); }}
                    className={`w-full p-2.5 rounded-xl flex items-center gap-3 text-xs font-bold transition-all cursor-pointer ${
                      subScreen === "topup"
                        ? "bg-amber-400 text-black shadow-sm font-extrabold" 
                        : darkMode ? "hover:bg-zinc-800/80 text-zinc-200" : "hover:bg-slate-100 text-slate-800"
                    }`}
                  >
                    <Coins size={16} className="text-amber-400" />
                    <span>Upgrade Credit Package</span>
                  </button>

                  <button
                    onClick={() => { setActiveTab("history"); setSubScreen("none"); setShowDrawer(false); }}
                    className={`w-full p-2.5 rounded-xl flex items-center gap-3 text-xs font-bold transition-all cursor-pointer ${
                      activeTab === "history" && subScreen === "none"
                        ? "bg-amber-400 text-black shadow-sm font-extrabold" 
                        : darkMode ? "hover:bg-zinc-800/80 text-zinc-200" : "hover:bg-slate-100 text-slate-800"
                    }`}
                  >
                    <HistoryIcon size={16} />
                    <span>Verification Log History</span>
                  </button>

                  <button
                    onClick={() => { setActiveTab("analytics"); setSubScreen("none"); setShowDrawer(false); }}
                    className={`w-full p-2.5 rounded-xl flex items-center gap-3 text-xs font-bold transition-all cursor-pointer ${
                      activeTab === "analytics" && subScreen === "none"
                        ? "bg-amber-400 text-black shadow-sm font-extrabold" 
                        : darkMode ? "hover:bg-zinc-800/80 text-zinc-200" : "hover:bg-slate-100 text-slate-800"
                    }`}
                  >
                    <BarChart3 size={16} />
                    <span>Analytics & Reports</span>
                  </button>

                  <button
                    onClick={() => { setSubScreen("settings"); setShowDrawer(false); }}
                    className={`w-full p-2.5 rounded-xl flex items-center gap-3 text-xs font-bold transition-all cursor-pointer ${
                      subScreen === "settings"
                        ? "bg-amber-400 text-black shadow-sm font-extrabold" 
                        : darkMode ? "hover:bg-zinc-800/80 text-zinc-200" : "hover:bg-slate-100 text-slate-800"
                    }`}
                  >
                    <SettingsIcon size={16} />
                    <span>Settings & Security</span>
                  </button>

                  <button
                    onClick={() => { setSecurityModalMode("unlock"); setShowSecurityModal(true); setShowDrawer(false); }}
                    className="w-full p-2.5 rounded-xl flex items-center gap-3 text-xs font-bold text-amber-500 hover:bg-amber-400/10 transition-all cursor-pointer"
                  >
                    <Lock size={16} />
                    <span>Lock App (Biometric/PIN)</span>
                  </button>
                </div>

                {/* Preferences Quick Toggles */}
                <div className="space-y-1 pt-2 border-t border-zinc-800/60">
                  <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
                    Preferences
                  </span>

                  {/* Morning Light / Dark Mode toggle */}
                  <div className={`p-2.5 rounded-xl flex items-center justify-between text-xs font-bold ${
                    darkMode ? "bg-zinc-900/60 border border-zinc-800/80" : "bg-slate-100 border border-slate-200"
                  }`}>
                    <div className="flex items-center gap-2">
                      {darkMode ? <Sun size={15} className="text-amber-400 fill-amber-400" /> : <Moon size={15} className="text-slate-700 fill-slate-700" />}
                      <span>{darkMode ? "Night Mode (Dark)" : "Morning Mode (Light)"}</span>
                    </div>
                    <button
                      onClick={() => setDarkMode(!darkMode)}
                      className="px-2.5 py-1 bg-amber-400 hover:bg-amber-300 text-black text-[10px] font-extrabold rounded-lg uppercase cursor-pointer"
                    >
                      Toggle
                    </button>
                  </div>

                  {/* Language switch */}
                  <div className={`p-2.5 rounded-xl flex items-center justify-between text-xs font-bold ${
                    darkMode ? "bg-zinc-900/60 border border-zinc-800/80" : "bg-slate-100 border border-slate-200"
                  }`}>
                    <div className="flex items-center gap-2">
                      <Globe size={15} className="text-amber-500" />
                      <span>Language ({locale === "en" ? "English" : "አማርኛ"})</span>
                    </div>
                    <button
                      onClick={() => onLanguageChange(locale === "en" ? "am" : "en")}
                      className="px-2.5 py-1 bg-zinc-800 text-amber-300 border border-zinc-700 text-[10px] font-extrabold rounded-lg uppercase cursor-pointer"
                    >
                      {locale === "en" ? "Switch to AM" : "Switch to EN"}
                    </button>
                  </div>
                </div>

                {/* About & Policies */}
                <div className="space-y-1 pt-2 border-t border-zinc-800/60 text-[11px] font-bold">
                  <button onClick={() => { setSubScreen("about"); setShowDrawer(false); }} className={`w-full p-2 rounded-lg text-left flex items-center gap-2 cursor-pointer ${darkMode ? "text-zinc-400 hover:text-white" : "text-slate-600 hover:text-black"}`}>
                    <Info size={14} />
                    <span>About BeuVerify</span>
                  </button>
                  <button onClick={() => { setSubScreen("privacy"); setShowDrawer(false); }} className={`w-full p-2 rounded-lg text-left flex items-center gap-2 cursor-pointer ${darkMode ? "text-zinc-400 hover:text-white" : "text-slate-600 hover:text-black"}`}>
                    <Shield size={14} />
                    <span>Privacy Policy</span>
                  </button>
                  <button onClick={() => { setSubScreen("terms"); setShowDrawer(false); }} className={`w-full p-2 rounded-lg text-left flex items-center gap-2 cursor-pointer ${darkMode ? "text-zinc-400 hover:text-white" : "text-slate-600 hover:text-black"}`}>
                    <FileText size={14} />
                    <span>Terms of Service</span>
                  </button>
                </div>
              </div>

              {/* Drawer Footer */}
              <div className={`p-3 border-t text-center shrink-0 ${darkMode ? "bg-[#111115] border-zinc-800 text-zinc-500" : "bg-slate-50 border-slate-200 text-slate-500"}`}>
                <p className="text-[10px] font-mono font-bold">BeuVerify Engine v2.4 • Secured Node</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 10. FINGERPRINT & PIN SECURITY LOCK MODAL */}
      <BiometricPinLock
        isOpen={showSecurityModal}
        mode={securityModalMode}
        onSuccess={() => setShowSecurityModal(false)}
        onCancel={() => setShowSecurityModal(false)}
        userName={userName}
      />

    </div>
  );
}
