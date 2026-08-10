import React, { useState } from "react";
import { Mail, Lock, Building2, User as UserIcon, Phone, ShieldCheck, HelpCircle, ArrowRight, CheckCircle2, AlertCircle, Eye, EyeOff, KeyRound, Server, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { getApiUrl, getStoredServerUrl, setStoredServerUrl } from "../api";

interface AuthScreenProps {
  onAuthSuccess: (user: any) => void;
  locale: "am" | "en";
  t: any;
}

const BUSINESS_TYPES = [
  "Supermarket",
  "Bakery",
  "Restaurant",
  "Cafe",
  "Clothing Store",
  "Electronics Shop",
  "Pharmacy",
  "Wholesale Distributor",
  "Service Provider (e.g., Salon, Garage)",
  "Other"
];

const AMHARIC_BUSINESS_TYPES: Record<string, string> = {
  "Supermarket": "ሱፐርማርኬት",
  "Bakery": "ዳቦ ቤት / መጋገሪያ",
  "Restaurant": "ምግብ ቤት",
  "Cafe": "ካፌ",
  "Clothing Store": "የልብስ ሱቅ",
  "Electronics Shop": "የኤሌክትሮኒክስ ሱቅ",
  "Pharmacy": "ፋርማሲ",
  "Wholesale Distributor": "የጅምላ አከፋፋይ",
  "Service Provider (e.g., Salon, Garage)": "የአገልግሎት ሰጪ (ሳሎን፣ ጋራዥ)",
  "Other": "ሌላ"
};

export default function AuthScreen({ onAuthSuccess, locale, t }: AuthScreenProps) {
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");
  const [showCodeVerification, setShowCodeVerification] = useState(false);
  const [emailForVerification, setEmailForVerification] = useState("");

  // Form Fields
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [customBusinessType, setCustomBusinessType] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [appUnlockPin, setAppUnlockPin] = useState("1234");
  const [showAppUnlockPin, setShowAppUnlockPin] = useState(false);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Verification Code field
  const [verificationCode, setVerificationCode] = useState("");

  // General States
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showServerModal, setShowServerModal] = useState(false);
  const [serverUrlInput, setServerUrlInput] = useState(() => getStoredServerUrl() || "https://ais-pre-dydrdwywttbcz2jlgbntx2-283283379149.europe-west2.run.app");

  const handleSaveServerUrl = (url: string) => {
    setStoredServerUrl(url);
    setServerUrlInput(url.trim());
    setShowServerModal(false);
    setError(null);
    setSuccess(`Backend Server URL configured! Target: ${url || "Official Production Backend"}`);
  };

  const clearForm = () => {
    setBusinessName("");
    setBusinessType("");
    setCustomBusinessType("");
    setOwnerName("");
    setEmail("");
    setPhone("");
    setPassword("");
    setVerificationCode("");
    setError(null);
    setSuccess(null);
    setShowPassword(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError(locale === "am" ? "እባክዎ ሁሉንም መስኮች ይሙሉ" : "Please enter your email and password.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(getApiUrl("/api/auth/signin"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      let data;
      try {
        const responseText = await response.text();
        try {
          data = JSON.parse(responseText);
        } catch (jsonErr) {
          throw new Error(`Server returned non-JSON response (HTTP ${response.status}). Please verify your backend server URL.`);
        }
      } catch (readErr: any) {
        throw new Error(readErr?.message || `Server returned HTTP ${response.status} with invalid JSON.`);
      }

      if (data.success) {
        setSuccess(locale === "am" ? "በተሳካ ሁኔታ ገብተዋል!" : "Signed in successfully! Loading your workspace...");
        const token = data.token || data.user?.id || data.user?.email;
        if (token) {
          localStorage.setItem("BEU_AUTH_TOKEN", String(token));
        }
        setTimeout(() => {
          onAuthSuccess(data.user);
        }, 800);
      } else {
        setError(data.message || "Failed to sign in.");
      }
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      setError(locale === "am" ? `የአውታረ መረብ ግንኙነት ችግር ተፈጥሯል: ${errMsg}` : `Network error occurred: ${errMsg}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName || !businessType || !ownerName || !email || !phone || !password) {
      setError(locale === "am" ? "እባክዎ ሁሉንም መስኮች ይሙሉ" : "Please fill out all required fields.");
      return;
    }

    if (businessType === "Other" && !customBusinessType.trim()) {
      setError(locale === "am" ? "እባክዎ የንግድ አይነትዎን ያስገቡ" : "Please enter your custom business type.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    // Save user's chosen 4-digit App Unlock PIN directly to local device security storage
    const targetPin = appUnlockPin.trim().length === 4 ? appUnlockPin.trim() : "1234";
    localStorage.setItem("beu_verify_security_pin", targetPin);

    const typeValue = businessType === "Other" ? customBusinessType : businessType;

    try {
      const response = await fetch(getApiUrl("/api/auth/signup"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName,
          businessType: typeValue,
          ownerName,
          email,
          phone,
          password
        })
      });

      let data;
      try {
        const responseText = await response.text();
        try {
          data = JSON.parse(responseText);
        } catch (jsonErr) {
          throw new Error(`Server returned non-JSON response (HTTP ${response.status}). Please verify your backend server URL.`);
        }
      } catch (readErr: any) {
        throw new Error(readErr?.message || `Server returned HTTP ${response.status} with invalid JSON.`);
      }

      if (data.success) {
        setSuccess(locale === "am" ? "ምዝገባው ተጠናቋል! ወደ ጥቅል መምረጫ ገጽ በመሄድ ላይ..." : "Registration successful! Loading subscription plans...");
        // Auto sign in user immediately so they land directly on the Total Subscription Page
        setTimeout(async () => {
          try {
            const loginRes = await fetch(getApiUrl("/api/auth/signin"), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email, password })
            });
            const loginData = await loginRes.json();
            if (loginData.success && loginData.user) {
              if (loginData.token) {
                localStorage.setItem("BEU_AUTH_TOKEN", loginData.token);
              }
              onAuthSuccess(loginData.user);
            } else {
              setActiveTab("signin");
            }
          } catch (autoLoginErr) {
            setActiveTab("signin");
          }
        }, 1000);
      } else {
        setError(data.message || "Failed to register.");
      }
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      setError(locale === "am" ? `ምዝገባውን ማጠናቀቅ አልተቻለም: ${errMsg}` : `Signup failed due to network error: ${errMsg}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode || verificationCode.length < 4) {
      setError(locale === "am" ? "እባክዎ ባለ 4-ዲጂት የማረጋገጫ ኮድ ያስገቡ" : "Please enter the 4-digit verification code.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(getApiUrl("/api/auth/verify-code"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailForVerification || email,
          code: verificationCode.trim()
        })
      });

      let data;
      try {
        data = await response.json();
      } catch (jsonErr) {
        throw new Error(`Server returned HTTP ${response.status} (${response.statusText}) and invalid JSON response.`);
      }

      if (data.success) {
        setSuccess(locale === "am" ? "ኢሜልዎ በተሳካ ሁኔታ ተረጋግጧል! ወደ ጥቅል መምረጫ በመሄድ ላይ..." : "Email verified! Launching subscription plans...");
        setTimeout(async () => {
          try {
            const loginRes = await fetch(getApiUrl("/api/auth/signin"), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email: emailForVerification || email, password })
            });
            const loginData = await loginRes.json();
            if (loginData.success && loginData.user) {
              if (loginData.token) {
                localStorage.setItem("BEU_AUTH_TOKEN", loginData.token);
              }
              onAuthSuccess(loginData.user);
            } else {
              setActiveTab("signin");
              setEmail(emailForVerification || email);
            }
          } catch (loginErr) {
            setActiveTab("signin");
            setEmail(emailForVerification || email);
          }
        }, 1200);
      } else {
        setError(data.message || "Invalid verification code.");
      }
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      setError(locale === "am" ? `ማረጋገጥ አልተቻለም: ${errMsg}` : `Verification process failed: ${errMsg}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full min-h-full flex-1 flex flex-col justify-start px-3 py-4 pb-24 text-white font-sans overflow-y-auto scrollbar-none">
      {/* Mini Thunder Brand Header */}
      <div className="flex flex-col items-center mb-5 text-center shrink-0">
        <div className="w-13 h-13 bg-amber-400 rounded-2xl flex items-center justify-center text-black shadow-[0_0_25px_rgba(250,204,21,0.35)] mb-2.5 transition-transform hover:scale-105">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 fill-current" viewBox="0 0 24 24">
            <path d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h2 className="text-xl font-black tracking-tight font-display text-white uppercase">
          BEU <span className="text-amber-400">VERIFY</span>
        </h2>
        <p className="text-[11px] text-zinc-400 mt-0.5 font-mono">
          {locale === "am" ? "የባንክና የቴሌብር ክፍያዎችን ማረጋገጫ" : "Fintech Mobile Receipt Verifier"}
        </p>
      </div>

      <AnimatePresence mode="wait">
        {!showCodeVerification ? (
          <motion.div
            key="auth-forms"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="w-full max-w-md mx-auto"
          >
            {/* Animated Tab Switchers */}
            <div className="relative grid grid-cols-2 gap-1 bg-[#121215] p-1.5 rounded-xl border border-zinc-800/80 mb-5 shadow-inner">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("signin");
                  setError(null);
                  setShowPassword(false);
                }}
                className={`relative z-10 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer ${
                  activeTab === "signin" ? "text-black font-extrabold" : "text-zinc-400 hover:text-white"
                }`}
              >
                {activeTab === "signin" && (
                  <motion.div
                    layoutId="activeTabPill"
                    className="absolute inset-0 bg-amber-400 rounded-lg shadow-md -z-10"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                {locale === "am" ? "መግቢያ" : "LOGIN"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("signup");
                  setError(null);
                  setShowPassword(false);
                }}
                className={`relative z-10 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer ${
                  activeTab === "signup" ? "text-black font-extrabold" : "text-zinc-400 hover:text-white"
                }`}
              >
                {activeTab === "signup" && (
                  <motion.div
                    layoutId="activeTabPill"
                    className="absolute inset-0 bg-amber-400 rounded-lg shadow-md -z-10"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                {locale === "am" ? "አዲስ ምዝገባ" : "CREATE ACCOUNT"}
              </button>
            </div>

            {/* Error/Success alerts */}
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-3.5 mb-4 bg-red-950/50 border border-red-900/60 text-red-200 text-xs rounded-xl flex flex-col gap-2.5 shadow-sm"
                >
                  <div className="flex items-start gap-2.5">
                    <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed font-sans">{error}</span>
                  </div>
                  {(error.includes("Network error") || error.includes("non-JSON") || error.includes("host") || error.includes("Server") || error.includes("connect")) && (
                    <div className="flex items-center gap-2 pt-2 border-t border-red-900/40">
                      <button
                        type="button"
                        onClick={() => setShowServerModal(true)}
                        className="px-3 py-1.5 bg-amber-400 text-black font-extrabold text-[11px] uppercase rounded-lg flex items-center gap-1.5 hover:bg-amber-300 transition-all cursor-pointer shadow-sm active:scale-95"
                      >
                        <Server size={12} /> {locale === "am" ? "የሰርቨር URL አስተካክል" : "Configure Backend Server URL"}
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
              {success && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-3 mb-4 bg-emerald-950/40 border border-emerald-900/50 text-emerald-200 text-xs rounded-xl flex items-start gap-2.5 shadow-sm"
                >
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span>{success}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Smooth Tab Forms Transition */}
            <AnimatePresence mode="wait">
              {activeTab === "signin" ? (
                <motion.form
                  key="signin-form"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleSignIn}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                      {locale === "am" ? "የኢሜል አድራሻ" : "Email Address"}
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500">
                        <Mail size={16} />
                      </span>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="business@example.com"
                        className="w-full bg-[#121215] border border-zinc-800 focus:border-amber-400 rounded-xl pl-10 pr-3.5 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-400/50 transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                      {locale === "am" ? "የይለፍ ቃል" : "Password"}
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500">
                        <Lock size={16} />
                      </span>
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-[#121215] border border-zinc-800 focus:border-amber-400 rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-400/50 transition-all font-mono"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-zinc-500 hover:text-amber-400 transition-colors cursor-pointer"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-amber-400 hover:bg-amber-300 disabled:bg-amber-400/40 text-black font-extrabold uppercase tracking-wider py-3.5 px-4 rounded-xl text-xs mt-4 flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(245,158,11,0.2)] active:scale-[0.98] transition-all cursor-pointer"
                  >
                    {isLoading ? (
                      <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        {locale === "am" ? "ግባ" : "LOGIN TO WORKSPACE"}
                        <ArrowRight size={15} />
                      </>
                    )}
                  </button>
                </motion.form>
              ) : (
                <motion.form
                  key="signup-form"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleSignUp}
                  className="space-y-4"
                >
                  {/* Business Name */}
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                      {locale === "am" ? "የድርጅት ስም (የንግድ ስም)" : "Business Name"}
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500">
                        <Building2 size={16} />
                      </span>
                      <input
                        type="text"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        placeholder="e.g. BEU Restaurant"
                        className="w-full bg-[#121215] border border-zinc-800 focus:border-amber-400 rounded-xl pl-10 pr-3.5 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-400/50 transition-all"
                        required
                      />
                    </div>
                  </div>

                  {/* Business Type */}
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                      {locale === "am" ? "የንግድ አይነት" : "Business Type"}
                    </label>
                    <select
                      value={businessType}
                      onChange={(e) => setBusinessType(e.target.value)}
                      className="w-full bg-[#121215] border border-zinc-800 focus:border-amber-400 rounded-xl px-3.5 py-3 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-amber-400/50 transition-all cursor-pointer"
                      required
                    >
                      <option value="">{locale === "am" ? "-- ንግድ አይነት ይምረጡ --" : "-- Select Business Type --"}</option>
                      {BUSINESS_TYPES.map(type => (
                        <option key={type} value={type} className="bg-zinc-900 text-white">
                          {locale === "am" ? (AMHARIC_BUSINESS_TYPES[type] || type) : type}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Custom Business Type input if 'Other' is chosen */}
                  {businessType === "Other" && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                      <label className="block text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1.5">
                        {locale === "am" ? "እባክዎ ንግድ አይነትዎን ይግለጹ" : "Specify Business Type"}
                      </label>
                      <input
                        type="text"
                        value={customBusinessType}
                        onChange={(e) => setCustomBusinessType(e.target.value)}
                        placeholder="e.g. Boutique, Delivery service"
                        className="w-full bg-[#121215] border border-amber-400/60 focus:border-amber-400 rounded-xl px-3.5 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none transition-all"
                        required
                      />
                    </motion.div>
                  )}

                  {/* Owner Name */}
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                      {locale === "am" ? "የባለቤቱ ስም" : "Owner Name"}
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500">
                        <UserIcon size={16} />
                      </span>
                      <input
                        type="text"
                        value={ownerName}
                        onChange={(e) => setOwnerName(e.target.value)}
                        placeholder="e.g. Abebe Balcha"
                        className="w-full bg-[#121215] border border-zinc-800 focus:border-amber-400 rounded-xl pl-10 pr-3.5 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-400/50 transition-all"
                        required
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                      {locale === "am" ? "የኢሜል አድራሻ" : "Email Address"}
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500">
                        <Mail size={16} />
                      </span>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="owner@yourcompany.com"
                        className="w-full bg-[#121215] border border-zinc-800 focus:border-amber-400 rounded-xl pl-10 pr-3.5 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-400/50 transition-all"
                        required
                      />
                    </div>
                  </div>

                  {/* Stacked 4-Digit Security PIN (App Unlock Code) stacked right under Email */}
                  <div>
                    <label className="block text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span>{locale === "am" ? "መተግበሪያውን መክፈቻ ባለ 4-ዲጂት ፒን (App Unlock PIN)" : "4-Digit App Unlock PIN"}</span>
                      <span className="text-[9px] font-mono text-zinc-400 uppercase font-normal">(4 Digits)</span>
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-amber-400">
                        <KeyRound size={16} />
                      </span>
                      <input
                        type={showAppUnlockPin ? "text" : "password"}
                        maxLength={4}
                        value={appUnlockPin}
                        onChange={(e) => setAppUnlockPin(e.target.value.replace(/\D/g, ""))}
                        placeholder="1234"
                        className="w-full bg-[#121215] border border-amber-400/50 focus:border-amber-400 rounded-xl pl-10 pr-10 py-3 text-sm font-mono text-amber-300 font-black tracking-widest placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-400/50 transition-all"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowAppUnlockPin(!showAppUnlockPin)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-zinc-400 hover:text-amber-400 transition-colors cursor-pointer"
                        title={showAppUnlockPin ? "Hide PIN" : "Show PIN"}
                      >
                        {showAppUnlockPin ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-1">
                      {locale === "am" ? "መተግበሪያውን በፍጥነት ለመክፈት የሚያገለግል ባለ 4-ዲጂት ፒን ኮድ" : "4-digit security passcode stored on device to quickly unlock the app"}
                    </p>
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                      {locale === "am" ? "የስልክ ቁጥር" : "Phone Number"}
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500">
                        <Phone size={16} />
                      </span>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g. 0912345678"
                        className="w-full bg-[#121215] border border-zinc-800 focus:border-amber-400 rounded-xl pl-10 pr-3.5 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-400/50 transition-all"
                        required
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                      {locale === "am" ? "የይለፍ ቃል" : "Password"}
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500">
                        <Lock size={16} />
                      </span>
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Create secure password"
                        className="w-full bg-[#121215] border border-zinc-800 focus:border-amber-400 rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-400/50 transition-all font-mono"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-zinc-500 hover:text-amber-400 transition-colors cursor-pointer"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-amber-400 hover:bg-amber-300 disabled:bg-amber-400/40 text-black font-extrabold uppercase tracking-wider py-3.5 px-4 rounded-xl text-xs mt-4 flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(245,158,11,0.2)] active:scale-[0.98] transition-all cursor-pointer"
                  >
                    {isLoading ? (
                      <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        {locale === "am" ? "አሁን ይመዝገቡ" : "PROCEED TO VERIFICATION"}
                        <ArrowRight size={15} />
                      </>
                    )}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div
            key="code-verification"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col gap-4 text-center max-w-md mx-auto w-full"
          >
            <div className="flex justify-center text-amber-400 mb-1">
              <ShieldCheck size={44} className="animate-pulse" />
            </div>
            <h3 className="text-lg font-bold">
              {locale === "am" ? "ኢሜልዎን ያረጋግጡ" : "Email Verification Code Required"}
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-[290px] mx-auto">
              {locale === "am" ? `የ 6 ዲጂት ኮድ ወደ ${emailForVerification} ልከናል። እባክዎ ከታች ያስገቡ።` : `We sent a 6-digit confirmation key to ${emailForVerification}. Enter it below to unlock your setup.`}
            </p>

            {error && (
              <div className="p-3 bg-red-950/40 border border-red-900/50 text-red-200 text-xs rounded-xl flex items-start gap-2.5 text-left">
                <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-900/50 text-emerald-200 text-xs rounded-xl flex items-start gap-2.5 text-left">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleVerifyCode} className="space-y-4 text-left">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2 text-center">
                  {locale === "am" ? "ባለ 6-አሃዝ ኮድ" : "6-DIGIT VERIFICATION KEY"}
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  className="w-full bg-[#121215] border border-zinc-800 focus:border-amber-400 text-center text-2xl font-black tracking-widest rounded-xl py-3.5 focus:outline-none transition-all placeholder-zinc-800 text-white font-mono focus:ring-2 focus:ring-amber-400/40"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-amber-400 hover:bg-amber-300 disabled:bg-amber-400/40 text-black font-extrabold uppercase tracking-wider py-3.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer shadow-[0_4px_20px_rgba(245,158,11,0.2)]"
              >
                {isLoading ? (
                  <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    {locale === "am" ? "ኮዱን አረጋግጥ" : "CONFIRM VERIFICATION KEY"}
                    <CheckCircle2 size={16} />
                  </>
                )}
              </button>
            </form>

            <button
              type="button"
              onClick={() => {
                setShowCodeVerification(false);
                setError(null);
                setSuccess(null);
              }}
              className="text-xs text-zinc-400 hover:text-amber-400 underline mt-2 cursor-pointer transition-colors"
            >
              {locale === "am" ? "ወደ ኋላ ይመለሱ" : "Go back to register details"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backend Server URL Config Modal */}
      <AnimatePresence>
        {showServerModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-[#121215] border border-amber-400/40 rounded-2xl p-5 shadow-2xl text-left"
            >
              <div className="flex items-center gap-2.5 mb-3">
                <div className="p-2 bg-amber-400/10 rounded-xl text-amber-400">
                  <Server size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    {locale === "am" ? "የሰርቨር አድራሻ (Server URL)" : "Backend Server URL"}
                  </h3>
                  <p className="text-[10px] text-zinc-400 font-mono">Configure API endpoint location</p>
                </div>
              </div>

              <p className="text-xs text-zinc-300 mb-3 leading-relaxed">
                If running on Android APK or custom host, set your server base URL (e.g., Vercel, Render, or backend domain):
              </p>

              <div className="space-y-3 mb-4">
                <input
                  type="url"
                  value={serverUrlInput}
                  onChange={(e) => setServerUrlInput(e.target.value)}
                  placeholder="https://your-backend-server.com"
                  className="w-full bg-zinc-900 border border-zinc-700 focus:border-amber-400 text-xs font-mono text-amber-300 rounded-xl px-3 py-2.5 focus:outline-none transition-colors"
                />

                <div className="flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => setServerUrlInput("https://ais-pre-dydrdwywttbcz2jlgbntx2-283283379149.europe-west2.run.app")}
                    className="w-full py-2 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-bold rounded-lg transition-colors flex items-center justify-between text-left cursor-pointer"
                  >
                    <span>Use Official Cloud Backend</span>
                    <RefreshCw size={12} className="text-amber-400" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setServerUrlInput("")}
                    className="w-full py-1.5 px-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 text-[10px] font-mono rounded-lg transition-colors text-left cursor-pointer"
                  >
                    Reset to Default (Relative /api)
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowServerModal(false)}
                  className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs uppercase rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveServerUrl(serverUrlInput)}
                  className="flex-1 py-2.5 bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-xs uppercase rounded-xl transition-colors cursor-pointer shadow-md"
                >
                  Save URL
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
