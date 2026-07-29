import React, { useState, useEffect, useRef } from "react";
import { Zap, ShieldCheck, HelpCircle, Smartphone, AlertTriangle, ShieldAlert, Sparkles, Check, RefreshCw, LogOut, Info, X, ExternalLink, Shield } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Components
import QrScanner from "./components/QrScanner";
import ManualForm from "./components/ManualForm";
import ResultDisplay from "./components/ResultDisplay";
import HistoryLogs from "./components/HistoryLogs";
import FinancialSummary from "./components/FinancialSummary";
import AuthScreen from "./components/AuthScreen";
import PricingSelection from "./components/PricingSelection";
import AdminPanel from "./components/AdminPanel";
import AndroidFrame from "./components/AndroidFrame";
import AndroidAppView from "./components/AndroidAppView";
import SplashScreen from "./components/SplashScreen";
import BiometricPinLock from "./components/BiometricPinLock";

// Lazy load OnboardingTour for peak load performance
const OnboardingTour = React.lazy(() => import("./components/OnboardingTour"));

// Types / Themes
import { ActiveVerification, ProcessingStatus, VerificationStatus, VerificationLog } from "./types";
import { THEMES } from "./themes";
import { TRANSLATIONS, Locale } from "./translations";
import { getApiUrl } from "./api";

export default function App() {
  // Splash Screen State
  const [showSplash, setShowSplash] = useState(true);

  // Locale state
  const [localeSelected, setLocaleSelected] = useState<boolean>(() => {
    return !!localStorage.getItem("beu_verify_locale_selected");
  });
  const [locale, setLocale] = useState<Locale>(() => {
    return (localStorage.getItem("beu_verify_locale") as Locale) || "en";
  });
  
  const t = TRANSLATIONS[locale];
  const themeConfig = THEMES["gold"];

  // Authentication State
  const [user, setUser] = useState<any | null>(() => {
    const saved = localStorage.getItem("beu_verify_user");
    return saved ? JSON.parse(saved) : null;
  });

  // Home Page state toggles
  const [showAuthScreen, setShowAuthScreen] = useState(false);

  // Navigation state
  const [viewMode, setViewMode] = useState<"dashboard" | "admin">("dashboard");
  const [activeTab, setActiveTab] = useState<"scan" | "manual">("scan");
  
  // Verification core states
  const [currentVerification, setCurrentVerification] = useState<ActiveVerification | null>(null);
  const [prefilledReference, setPrefilledReference] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<VerificationLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);

  // Warning, Modal, and Onboarding Tour states
  const [showLowCreditWarning, setShowLowCreditWarning] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showTour, setShowTour] = useState(false);

  // Polling management
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollCountRef = useRef(0);
  const MAX_POLLS = 15; // Max 15 polls (~22 seconds)

  // Sync user session details & check for notifications
  useEffect(() => {
    if (user && user.id) {
      checkUserSession();
      fetchLogs();
    }
    return () => {
      clearPolling();
    };
  }, [user?.id]);

  const checkUserSession = async () => {
    if (!user || !user.id) return;
    try {
      const response = await fetch(getApiUrl(`/api/auth/me/${user.id}`));
      const data = await response.json();
      if (data.success && data.user) {
        const freshUser = data.user;
        setUser(freshUser);
        localStorage.setItem("beu_verify_user", JSON.stringify(freshUser));

        // Enforce Low Credit Warning: If credits fall below 20% of their plan
        const planSpecs: Record<string, number> = { starter: 25, business: 2500, enterprise: 20000 };
        const totalPlanCredits = planSpecs[freshUser.selectedPlan || ""] || 0;
        if (totalPlanCredits > 0 && !freshUser.isAdmin) {
          const threshold = totalPlanCredits * 0.2;
          if (freshUser.credits < threshold) {
            setShowLowCreditWarning(true);
            // Auto dismiss after 3 seconds
            setTimeout(() => {
              setShowLowCreditWarning(false);
            }, 3000);
          }
        }

        // One-time Approval modal logic: When they log in for the first time after payment is verified
        if (freshUser.status === "Active" && freshUser.hasSeenFirstTimeApproval === false && !freshUser.isAdmin) {
          setShowApprovalModal(true);
        }
      }
    } catch (err) {
      console.error("Session health check failure:", err);
    }
  };

  // Device Security State
  const [showSecurityPrompt, setShowSecurityPrompt] = useState(false);

  const fetchLogs = async () => {
    if (!user || !user.id) return;
    setIsLoadingLogs(true);
    const storageKey = `beu_verify_logs_${user.id}`;
    
    // Read cached local device history
    const cachedLogsRaw = localStorage.getItem(storageKey);
    const cachedLogs: VerificationLog[] = cachedLogsRaw ? JSON.parse(cachedLogsRaw) : [];

    try {
      // Fetch user-specific logs from API
      const res = await fetch(getApiUrl(`/api/logs/${user.id}`));
      const data = await res.json();
      if (data.success && data.logs) {
        // Merge server and local logs without duplicate requestId
        const mergedMap = new Map<string, VerificationLog>();
        [...data.logs, ...cachedLogs].forEach(item => {
          if (item.requestId) {
            mergedMap.set(item.requestId, item);
          }
        });
        const finalLogs = Array.from(mergedMap.values()).sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        setLogs(finalLogs);
        localStorage.setItem(storageKey, JSON.stringify(finalLogs));
      } else if (cachedLogs.length > 0) {
        setLogs(cachedLogs);
      }
    } catch (e) {
      console.warn("API logs unreachable, relying on local device storage:", e);
      if (cachedLogs.length > 0) {
        setLogs(cachedLogs);
      }
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleSelectLanguage = (selected: Locale) => {
    setLocale(selected);
    localStorage.setItem("beu_verify_locale", selected);
    localStorage.setItem("beu_verify_locale_selected", "true");
    setLocaleSelected(true);
  };

  const handleAuthSuccess = (authenticatedUser: any) => {
    setUser(authenticatedUser);
    localStorage.setItem("beu_verify_user", JSON.stringify(authenticatedUser));
    setViewMode(authenticatedUser.isAdmin ? "admin" : "dashboard");

    // After signup or login, prompt device PIN or Fingerprint biometrics setup if not configured
    const pinConfigured = localStorage.getItem("beu_verify_security_pin");
    const bioConfigured = localStorage.getItem("beu_verify_biometrics_enabled");
    if (!pinConfigured && !bioConfigured) {
      setTimeout(() => {
        setShowSecurityPrompt(true);
      }, 800);
    }
  };

  const handleLogout = () => {
    clearPolling();
    setUser(null);
    localStorage.removeItem("beu_verify_user");
    setViewMode("dashboard");
    setCurrentVerification(null);
    setLogs([]);
  };

  const handleDismissApprovalModal = () => {
    setShowApprovalModal(false);
    setShowTour(true);
  };

  // Onboarding tour dynamic step controller for peak interactivity
  const handleTourStepChange = (stepIndex: number, step?: any) => {
    const targetId = step?.targetId;

    if (targetId === "reference-input") {
      // Paste input simulation
      setActiveTab("manual");
      // Typewriter typing simulation of a fake Telebirr receipt
      const text = "RFT9210984";
      let idx = 0;
      setPrefilledReference("");
      const interval = setInterval(() => {
        setPrefilledReference(text.substring(0, idx + 1));
        idx++;
        if (idx >= text.length) clearInterval(interval);
      }, 120);
      return () => clearInterval(interval);
    } else if (targetId === "verification-result-container") {
      // Results panel preview
      setCurrentVerification({
        requestId: "tour_mock",
        bank: "telebirr",
        reference: "RFT9210984",
        processingStatus: ProcessingStatus.Completed,
        status: VerificationStatus.Success,
        verified: true,
        senderName: locale === "am" ? "አልማዝ በቀለ" : "Almaz Bekele",
        receiverName: locale === "am" ? "ቤዩ ቴክ ኢንፎ" : "Beu Tech Info",
        amount: 1500,
        transactionDate: new Date().toISOString()
      });
    } else {
      // Clear mock if we go back/forward out of results panel
      setCurrentVerification(prev => {
        if (prev?.requestId === "tour_mock") {
          return null;
        }
        return prev;
      });
    }
  };

  // Auto-trigger tour if first time active user and not showing approval modal
  useEffect(() => {
    if (user && user.status === "Active" && user.hasSeenFirstTimeApproval === false && !user.isAdmin && !showApprovalModal) {
      setShowTour(true);
    }
  }, [user?.id, user?.hasSeenFirstTimeApproval, showApprovalModal]);

  const clearPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    pollCountRef.current = 0;
  };

  const startPolling = (requestId: string, bank: string, reference: string) => {
    clearPolling();
    pollCountRef.current = 0;

    pollingIntervalRef.current = setInterval(async () => {
      pollCountRef.current += 1;

      if (pollCountRef.current > MAX_POLLS) {
        clearPolling();
        setIsLoading(false);
        setCurrentVerification(prev => {
          if (!prev) return null;
          return {
            ...prev,
            processingStatus: ProcessingStatus.Failed,
            status: VerificationStatus.Failed,
            errorMessage: "Verification timed out. The banking server did not respond in time. Please check the transaction history on your bank app or retry."
          };
        });
        return;
      }

      try {
        const response = await fetch(getApiUrl(`/api/verify/${requestId}`));
        const data = await response.json();

        if (data.success) {
          const v = data.verification || data.data || {};
          const isTerminal = v.processingStatus === "completed" || v.processingStatus === "failed";
          const resultObj = v.result || {};

          setCurrentVerification({
            requestId: requestId,
            bank: bank,
            reference: reference,
            processingStatus: v.processingStatus as ProcessingStatus,
            status: v.status as VerificationStatus,
            verified: v.verified || false,
            senderName: resultObj.senderName || resultObj.sender || resultObj.payer || resultObj.sender_name,
            receiverName: resultObj.receiverName || resultObj.receiver || resultObj.payee || resultObj.receiver_name,
            amount: resultObj.amount ? parseFloat(resultObj.amount) : undefined,
            transactionDate: resultObj.transactionDate || resultObj.date || resultObj.timestamp,
            errorMessage: data.error?.message
          });

          if (isTerminal) {
            clearPolling();
            setIsLoading(false);
            fetchLogs(); 
            checkUserSession(); // Sync remaining credit tally after verification completes
          }
        } else {
          clearPolling();
          setIsLoading(false);
          setCurrentVerification({
            requestId,
            bank,
            reference,
            processingStatus: ProcessingStatus.Failed,
            status: VerificationStatus.Failed,
            verified: false,
            errorMessage: data.message || "Failed to poll verification status."
          });
        }
      } catch (err: any) {
        console.error("Polling error:", err);
      }
    }, 1500);
  };

  const handleVerify = async (inputData: {
    bank: string;
    reference: string;
    suffix?: string;
    phoneNumber?: string;
  }) => {
    if (!user || !user.id) return;
    setIsLoading(true);
    setScanFeedback(null);
    clearPolling();

    // Check pre-emptively if regular user is Expired
    if (user.status !== "Active" && !user.isAdmin) {
      alert(`Dashboard access restricted. Your status is current: "${user.status}". Please select or renew your package.`);
      setIsLoading(false);
      return;
    }

    const tempId = `temp_${Date.now()}`;
    setCurrentVerification({
      requestId: tempId,
      bank: inputData.bank,
      reference: inputData.reference,
      suffix: inputData.suffix,
      phoneNumber: inputData.phoneNumber,
      processingStatus: ProcessingStatus.Running,
      status: VerificationStatus.Pending,
      verified: false
    });

    try {
      const response = await fetch(getApiUrl("/api/verify"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bank: inputData.bank,
          reference: inputData.reference,
          suffix: inputData.suffix,
          phoneNumber: inputData.phoneNumber,
          userId: user.id, // Authenticated proxy
          waitMs: 5000
        })
      });

      const responseData = await response.json();

      if (response.status === 200 && responseData.success) {
        const v = responseData.verification || {};
        const dataItem = responseData.data && responseData.data[0] ? responseData.data[0] : {};
        const resultObj = v.result || dataItem.result || responseData.data || {};

        setCurrentVerification({
          requestId: responseData.requestId || v.requestId || "verified",
          bank: inputData.bank || dataItem.bank || "universal",
          reference: inputData.reference,
          suffix: inputData.suffix,
          phoneNumber: inputData.phoneNumber,
          processingStatus: ProcessingStatus.Completed,
          status: VerificationStatus.Success,
          verified: v.verified || dataItem.verified || false,
          senderName: resultObj.senderName || resultObj.sender || resultObj.payer || resultObj.sender_name,
          receiverName: resultObj.receiverName || resultObj.receiver || resultObj.payee || resultObj.receiver_name,
          amount: resultObj.amount ? parseFloat(resultObj.amount) : undefined,
          transactionDate: resultObj.transactionDate || resultObj.date || resultObj.timestamp,
        });
        setIsLoading(false);
        fetchLogs();
        checkUserSession(); // Sync credits
      } else if (response.status === 202 && responseData.success) {
        const requestId = responseData.requestId || responseData.verification?.requestId;
        setCurrentVerification({
          requestId: requestId,
          bank: inputData.bank,
          reference: inputData.reference,
          suffix: inputData.suffix,
          phoneNumber: inputData.phoneNumber,
          processingStatus: ProcessingStatus.Queued,
          status: VerificationStatus.Pending,
          verified: false
        });
        startPolling(requestId, inputData.bank, inputData.reference);
      } else {
        setCurrentVerification({
          requestId: responseData.requestId || "failed",
          bank: inputData.bank,
          reference: inputData.reference,
          suffix: inputData.suffix,
          phoneNumber: inputData.phoneNumber,
          processingStatus: ProcessingStatus.Failed,
          status: VerificationStatus.Failed,
          verified: false,
          errorMessage: responseData.message || responseData.error?.message || "Verification request failed."
        });
        setIsLoading(false);
      }
    } catch (error: any) {
      console.error("Verification error:", error);
      setCurrentVerification({
        requestId: "error",
        bank: inputData.bank,
        reference: inputData.reference,
        suffix: inputData.suffix,
        phoneNumber: inputData.phoneNumber,
        processingStatus: ProcessingStatus.Failed,
        status: VerificationStatus.Failed,
        verified: false,
        errorMessage: "Network error occurred. Please check your connection."
      });
      setIsLoading(false);
    }
  };

  const handleQrScanSuccess = (decodedUrl: string, bank: string) => {
    setPrefilledReference(decodedUrl);
    setScanFeedback("Receipt QR Code Scanned! Auto-verifying...");
    handleVerify({
      bank: bank || "universal",
      reference: decodedUrl
    });
  };

  const handleQrScanError = (errorMessage: string) => {
    setScanFeedback(null);
    alert(errorMessage);
  };

  const handleSelectLog = (log: VerificationLog) => {
    clearPolling();
    setIsLoading(false);
    setCurrentVerification({
      requestId: log.requestId,
      bank: log.bank,
      reference: log.reference,
      suffix: log.suffix,
      phoneNumber: log.phoneNumber,
      processingStatus: ProcessingStatus.Completed,
      status: log.status as VerificationStatus,
      verified: log.verified,
      senderName: log.senderName,
      receiverName: log.receiverName,
      amount: log.amount,
      transactionDate: log.transactionDate
    });
  };

  const handleClearActiveResult = () => {
    clearPolling();
    setIsLoading(false);
    setCurrentVerification(null);
    setPrefilledReference("");
    setScanFeedback(null);
  };

  // ============================================
  // RENDER LEVEL 0: Android Mobile Splash Screen (shown for 2s on app launch)
  // ============================================
  if (showSplash) {
    return (
      <AndroidFrame locale={locale}>
        <SplashScreen onFinish={() => setShowSplash(false)} />
      </AndroidFrame>
    );
  }

  // ============================================
  // RENDER LEVEL 1: First-time Language Selector Screen
  // ============================================
  if (!localeSelected) {
    return (
      <AndroidFrame locale={locale}>
        <div className="w-full h-full bg-[#070709] text-white flex flex-col items-center justify-center p-6 font-sans">
          <div className="w-full max-w-sm text-center space-y-6 bg-zinc-950/90 border border-zinc-900 p-6 rounded-3xl shadow-[0_0_50px_rgba(255,215,0,0.02)]">
            {/* Logo */}
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 bg-amber-400 rounded-2xl flex items-center justify-center text-black shadow-[0_0_30px_rgba(245,158,11,0.25)] mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-9 h-9 fill-current" viewBox="0 0 24 24">
                  <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h1 className="text-2xl font-black tracking-tight font-display text-white uppercase">
                Beu <span className="text-amber-400">Verify</span>
              </h1>
              <p className="text-zinc-500 text-[11px] mt-1 font-mono">
                Fintech Android Node App
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold text-zinc-300">
                Select Your App Language / ቋንቋ ይምረጡ
              </p>

              <div className="grid grid-cols-1 gap-2.5">
                <button
                  onClick={() => handleSelectLanguage("en")}
                  className="w-full py-3.5 bg-zinc-900 hover:bg-amber-400 hover:text-black border border-zinc-800 hover:border-amber-400 text-xs font-bold rounded-xl transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 group"
                >
                  ENGLISH
                  <span className="text-[10px] opacity-60 font-normal group-hover:text-black">/ Proceed</span>
                </button>
                <button
                  onClick={() => handleSelectLanguage("am")}
                  className="w-full py-3.5 bg-zinc-900 hover:bg-amber-400 hover:text-black border border-zinc-800 hover:border-amber-400 text-xs font-bold rounded-xl transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 group"
                >
                  አማርኛ
                  <span className="text-[10px] opacity-60 font-normal group-hover:text-black">/ ይቀጥሉ</span>
                </button>
              </div>
            </div>

            <p className="text-[10px] text-zinc-600 leading-relaxed font-mono">
              Real-time transaction scanner for CBE, Telebirr &amp; Abyssinia.
            </p>
          </div>
        </div>
      </AndroidFrame>
    );
  }

  // ============================================
  // RENDER LEVEL 2: Sign-in / Sign-up Authentication Forms (Inside Android Container)
  // ============================================
  if (!user) {
    return (
      <AndroidFrame locale={locale}>
        <div className="w-full h-full bg-[#070709] text-white flex flex-col items-center justify-center p-4 relative">
          {/* Language selector in header */}
          <div className="absolute top-4 right-4 flex items-center gap-1.5 z-20">
            <select
              value={locale}
              onChange={(e) => handleSelectLanguage(e.target.value as Locale)}
              className="bg-zinc-900 border border-zinc-800 text-[10px] text-amber-400 font-extrabold py-1 px-2 rounded-lg focus:outline-none cursor-pointer font-mono"
            >
              <option value="am">አማርኛ</option>
              <option value="en">English</option>
            </select>
          </div>
          
          <AuthScreen onAuthSuccess={handleAuthSuccess} locale={locale} t={t} />
        </div>
      </AndroidFrame>
    );
  }

  // ============================================
  // RENDER LEVEL 3: Admin god dashboard routing
  // ============================================
  if (user.isAdmin && viewMode === "admin") {
    return (
      <div className="min-h-screen bg-black">
        <AdminPanel adminUser={user} onGoBack={() => setViewMode("dashboard")} locale={locale} />
      </div>
    );
  }

  // ============================================
  // RENDER LEVEL 4: Pricing/Package Selection Screen
  // ============================================
  const isPendingPay = user.status === "Pending Verification";
  const hasNoPlanSelected = !user.selectedPlan;

  if (isPendingPay && hasNoPlanSelected && !user.isAdmin) {
    return (
      <div className="min-h-screen bg-black flex flex-col">
        {/* Header toolbar */}
        <header className="h-16 border-b border-zinc-900 flex items-center justify-between px-6 bg-zinc-950/80">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-amber-400 rounded flex items-center justify-center text-black">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-sm font-black text-white">Beu Verify</span>
          </div>
          <button onClick={handleLogout} className="text-xs text-zinc-500 hover:text-white flex items-center gap-1.5">
            <LogOut size={13} />
            {locale === "am" ? "ይውጡ" : "Log out"}
          </button>
        </header>

        <main className="flex-1 overflow-y-auto">
          <PricingSelection 
            user={user} 
            onPaymentVerified={checkUserSession} 
            onLogout={handleLogout} 
            locale={locale} 
            t={t} 
          />
        </main>
      </div>
    );
  }

  // ============================================
  // RENDER LEVEL 5: Payment Reference Verification (Waiting for Telebirr matching)
  // ============================================
  const hasPlanSelected = !!user.selectedPlan;
  if (isPendingPay && hasPlanSelected && !user.isAdmin) {
    return (
      <div className="min-h-screen bg-black flex flex-col">
        {/* Header toolbar */}
        <header className="h-16 border-b border-zinc-900 flex items-center justify-between px-6 bg-zinc-950/80">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-amber-400 rounded flex items-center justify-center text-black">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-sm font-black text-white">Beu Verify</span>
          </div>
          <button onClick={handleLogout} className="text-xs text-zinc-500 hover:text-white flex items-center gap-1.5">
            <LogOut size={13} />
            {locale === "am" ? "ይውጡ" : "Log out"}
          </button>
        </header>

        <main className="flex-1 overflow-y-auto">
          <PricingSelection 
            user={user} 
            onPaymentVerified={checkUserSession} 
            onLogout={handleLogout} 
            locale={locale} 
            t={t} 
          />
        </main>
      </div>
    );
  }

  // ============================================
  // RENDER LEVEL 6: Main Transaction Verification Android Application
  // ============================================
  return (
    <AndroidFrame locale={locale}>
      <AndroidAppView
        user={user}
        onLogout={handleLogout}
        locale={locale}
        onLanguageChange={(lang) => handleSelectLanguage(lang)}
        logs={logs}
        onVerifyReference={(ref, bank, suffix, phoneNumber) => handleVerify({ reference: ref, bank, suffix, phoneNumber })}
        currentVerification={currentVerification}
        setCurrentVerification={setCurrentVerification}
        isLoadingVerification={isLoading}
      />

      <BiometricPinLock
        isOpen={showSecurityPrompt}
        mode="setup"
        onSuccess={() => setShowSecurityPrompt(false)}
        onCancel={() => setShowSecurityPrompt(false)}
        userName={user?.ownerName || user?.businessName || "Valued User"}
      />
    </AndroidFrame>
  );
}
