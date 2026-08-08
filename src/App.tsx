import React, { useState, useEffect } from "react";
import AuthScreen from "./components/AuthScreen";
import PricingSelection from "./components/PricingSelection";
import AndroidAppView from "./components/AndroidAppView";
import BiometricPinLock from "./components/BiometricPinLock";
import { TRANSLATIONS, Locale } from "./translations";
import { ActiveVerification, VerificationLog } from "./types";
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

  const checkUserSession = async () => {
    const token = localStorage.getItem("BEU_AUTH_TOKEN");
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(getApiUrl("/api/auth/me"), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success && data.user) {
        setUser(data.user);
      } else {
        localStorage.removeItem("BEU_AUTH_TOKEN");
        setUser(null);
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

  const handleLogout = () => {
    localStorage.removeItem("BEU_AUTH_TOKEN");
    setUser(null);
  };

  const handleVerifyReference = async (refNo: string, bank: string = "CBO", suffix?: string, phoneNumber?: string) => {
    if (!user) return;
    setIsLoading(true);

    try {
      const token = localStorage.getItem("BEU_AUTH_TOKEN");
      const res = await fetch(getApiUrl("/api/verify/reference"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ referenceNumber: refNo, bank, suffix, phoneNumber })
      });

      const data = await res.json();
      if (data.success) {
        setCurrentVerification({
          referenceNumber: refNo,
          amount: data.details?.amount || 0,
          status: "SUCCESS",
          verifiedAt: new Date().toISOString(),
          details: data.details
        });
        checkUserSession();
      } else {
        setCurrentVerification({
          referenceNumber: refNo,
          amount: 0,
          status: "FAILED",
          verifiedAt: new Date().toISOString(),
          errorReason: data.message || "Reference verification failed"
        });
      }
    } catch (err: any) {
      setCurrentVerification({
        referenceNumber: refNo,
        amount: 0,
        status: "FAILED",
        verifiedAt: new Date().toISOString(),
        errorReason: err?.message || "Network communication error"
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
