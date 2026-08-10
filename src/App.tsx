import React, { useState, useEffect } from "react";
import AuthScreen from "./components/AuthScreen";
import PricingSelection from "./components/PricingSelection";
import AndroidAppView from "./components/AndroidAppView";
import BiometricPinLock from "./components/BiometricPinLock";
import { TRANSLATIONS, Locale } from "./translations";
import { ActiveVerification, VerificationLog, ProcessingStatus, VerificationStatus } from "./types";
import { LogOut } from "lucide-react";
import { getApiUrl } from "./api";

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [locale, setLocale] = useState<Locale>("en");
  const [isPinLocked, setIsPinLocked] = useState(true);
  const [currentVerification, setCurrentVerification] = useState<ActiveVerification | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<VerificationLog[]>([]);

  const t = TRANSLATIONS[locale] || TRANSLATIONS.en;

  const fetchUserLogs = async () => {
    let token = localStorage.getItem("BEU_AUTH_TOKEN") || user?.id || user?.email;
    if (!token) return;
    try {
      const targetUserId = user?.id || token;
      const res = await fetch(getApiUrl(`/api/logs/${targetUserId}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.logs)) {
        setLogs(data.logs);
      }
    } catch (err) {
      console.error("Fetch logs error:", err);
    }
  };

  const checkUserSession = async () => {
    let token = localStorage.getItem("BEU_AUTH_TOKEN");
    if (!token && user?.id) {
      token = String(user.id);
      localStorage.setItem("BEU_AUTH_TOKEN", token);
    }
    if (!token) {
      if (!user) setLoading(false);
      return;
    }

    try {
      const response = await fetch(getApiUrl("/api/auth/me"), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success && data.user) {
        setUser(data.user);
      }
    } catch (err) {
      console.error("Session check error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkUserSession();
  }, []);

  useEffect(() => {
    if (user?.id) {
      fetchUserLogs();
    }
  }, [user?.id]);

  const handleLogout = () => {
    localStorage.removeItem("BEU_AUTH_TOKEN");
    setUser(null);
  };

  const handleVerifyReference = async (
    refNo: string, 
    bank: string = "universal", 
    suffix?: string, 
    phoneNumber?: string,
    extractedData?: { payer?: string; receiver?: string; amount?: number; date?: string }
  ) => {
    if (!user) return;
    setIsLoading(true);

    try {
      const token = localStorage.getItem("BEU_AUTH_TOKEN") || user.id || user.email;
      const res = await fetch(getApiUrl("/api/verify/reference"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          referenceNumber: refNo,
          bank,
          suffix,
          phoneNumber,
          extractedPayer: extractedData?.payer,
          extractedReceiver: extractedData?.receiver,
          extractedAmount: extractedData?.amount,
          userId: user.id || user.email
        })
      });

      const data = await res.json();
      if (data.success) {
        const details = data.details || (data.data && data.data[0]?.result) || {};
        setCurrentVerification({
          requestId: data.requestId || `req_${Date.now()}`,
          bank: details.bank || bank || "telebirr",
          reference: details.reference || details.transaction_id || refNo,
          processingStatus: ProcessingStatus.Completed,
          status: VerificationStatus.Success,
          verified: true,
          senderName: details.senderName || details.payer || "Selamawit Kebede",
          receiverName: details.receiverName || details.receiver || user?.businessName || user?.ownerName || "Merchant",
          amount: typeof details.amount === "number" ? details.amount : parseFloat(details.amount) || 0,
          transactionDate: details.transactionDate || details.date || new Date().toISOString()
        });
        checkUserSession();
        fetchUserLogs();
      } else {
        const isDup = data.isDuplicate || data.status === "Duplicate Transaction" || (data.message && data.message.toLowerCase().includes("duplicate"));
        setCurrentVerification({
          requestId: `req_${Date.now()}`,
          bank: bank || "telebirr",
          reference: refNo,
          processingStatus: ProcessingStatus.Completed,
          status: VerificationStatus.Failed,
          verified: false,
          errorMessage: isDup 
            ? (data.message || `⚠️ DUPLICATE TRANSACTION DETECTED: Reference #${refNo.toUpperCase()} has already been verified!`)
            : (data.message || "Reference verification failed"),
          amount: 0,
          transactionDate: new Date().toISOString()
        });
      }
    } catch (err: any) {
      setCurrentVerification({
        requestId: `req_${Date.now()}`,
        bank: bank || "telebirr",
        reference: refNo,
        processingStatus: ProcessingStatus.Completed,
        status: VerificationStatus.Failed,
        verified: false,
        errorMessage: err?.message || "Network communication error",
        amount: 0,
        transactionDate: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-zinc-400 font-mono text-xs tracking-widest uppercase">Initializing Beu Verify Security Layer...</p>
      </div>
    );
  }

  // RENDER LEVEL 1: Unauthenticated Users (Auth Screen)
  if (!user) {
    return (
      <AuthScreen
        onAuthSuccess={(userData) => {
          if (userData?.id || userData?.email) {
            localStorage.setItem("BEU_AUTH_TOKEN", String(userData.id || userData.email));
          }
          setUser(userData);
          setIsPinLocked(false);
        }}
        locale={locale}
        t={t}
      />
    );
  }

  // RENDER LEVEL 2: Pricing / Total Subscription Page (Unpaid Users Gate)
  const isNotActive = user.status !== "Active";

  if (isNotActive && !user.isAdmin) {
    return (
      <div className="min-h-screen bg-black flex flex-col">
        <header className="h-16 border-b border-zinc-900 flex items-center justify-between px-6 bg-zinc-950/80">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-amber-400 rounded flex items-center justify-center text-black">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-sm font-black text-white">Beu Verify</span>
          </div>
          <button onClick={handleLogout} className="text-xs text-zinc-500 hover:text-white flex items-center gap-1.5 cursor-pointer">
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

  // RENDER LEVEL 3: App PIN Lock Screen
  if (isPinLocked) {
    return (
      <BiometricPinLock
        isOpen={isPinLocked}
        mode="unlock"
        onSuccess={() => setIsPinLocked(false)}
        userName={user?.ownerName || user?.businessName || user?.email}
      />
    );
  }

  // RENDER LEVEL 4: Active Verified Workspace / Android View
  return (
    <div className="min-h-screen bg-[#070709] text-white flex flex-col">
      <AndroidAppView
        user={user}
        locale={locale}
        onLanguageChange={setLocale}
        onLogout={handleLogout}
        logs={logs}
        onVerifyReference={handleVerifyReference}
        currentVerification={currentVerification}
        setCurrentVerification={setCurrentVerification}
        isLoadingVerification={isLoading}
        checkUserSession={checkUserSession}
      />
    </div>
  );
}
