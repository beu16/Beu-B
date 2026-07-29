import React, { useState } from "react";
import { Mail, Lock, Building2, User as UserIcon, Phone, ShieldCheck, HelpCircle, ArrowRight, CheckCircle2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { getApiUrl } from "../api";

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
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Verification Code field
  const [verificationCode, setVerificationCode] = useState("");

  // General States
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
        data = await response.json();
      } catch (jsonErr) {
        throw new Error(`Server returned HTTP ${response.status} (${response.statusText}) and invalid JSON response.`);
      }

      if (data.success) {
        setSuccess(locale === "am" ? "በተሳካ ሁኔታ ገብተዋል!" : "Signed in successfully! Loading your workspace...");
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
        data = await response.json();
      } catch (jsonErr) {
        throw new Error(`Server returned HTTP ${response.status} (${response.statusText}) and invalid JSON response.`);
      }

      if (data.success) {
        setEmailForVerification(email);
        setSuccess(locale === "am" ? "ምዝገባው ተጠናቋል! የማረጋገጫ ኮድ ወደ ኢሜልዎ ተልኳል" : "Registration success! Verification code dispatched to your email.");
        setTimeout(() => {
          setShowCodeVerification(true);
          setError(null);
          setSuccess(null);
        }, 1200);
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
    if (!verificationCode || verificationCode.length !== 6) {
      setError(locale === "am" ? "እባክዎ 6 ዲጂት የማረጋገጫ ኮድ ያስገቡ" : "Please enter the 6-digit code.");
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
          email: emailForVerification,
          code: verificationCode
        })
      });

      let data;
      try {
        data = await response.json();
      } catch (jsonErr) {
        throw new Error(`Server returned HTTP ${response.status} (${response.statusText}) and invalid JSON response.`);
      }

      if (data.success) {
        setSuccess(locale === "am" ? "ኢሜልዎ በተሳካ ሁኔታ ተረጋግጧል! አሁን መግባት ይችላሉ።" : "Email verified! You can now sign in.");
        setTimeout(() => {
          // Reset view to signin tab
          setShowCodeVerification(false);
          setActiveTab("signin");
          clearForm();
          setEmail(emailForVerification);
        }, 1500);
      } else {
        setError(data.message || "Verification code invalid.");
      }
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      setError(locale === "am" ? `ማረጋገጥ አልተቻለም: ${errMsg}` : `Verification process failed: ${errMsg}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col justify-center px-4 py-4 text-white font-sans">
      {/* Mini Thunder Brand Header */}
      <div className="flex flex-col items-center mb-5 text-center">
        <div className="w-12 h-12 bg-amber-400 rounded-2xl flex items-center justify-center text-black shadow-[0_0_25px_rgba(250,204,21,0.3)] mb-2.5">
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
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {/* Tab switchers */}
            <div className="grid grid-cols-2 gap-1 bg-[#121212] p-1 rounded-lg border border-zinc-900 mb-6">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("signin");
                  setError(null);
                  setShowPassword(false);
                }}
                className={`py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${
                  activeTab === "signin"
                    ? "bg-amber-400 text-black shadow-md font-black"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {locale === "am" ? "መግቢያ" : "LOGIN"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("signup");
                  setError(null);
                  setShowPassword(false);
                }}
                className={`py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${
                  activeTab === "signup"
                    ? "bg-amber-400 text-black shadow-md font-black"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {locale === "am" ? "አዲስ ምዝገባ" : "CREATE ACCOUNT"}
              </button>
            </div>

            {/* Error/Success alerts */}
            {error && (
              <div className="p-3 mb-4 bg-red-950/40 border border-red-900/50 text-red-200 text-xs rounded-lg flex items-start gap-2">
                <AlertCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="p-3 mb-4 bg-emerald-950/40 border border-emerald-900/50 text-emerald-200 text-xs rounded-lg flex items-start gap-2">
                <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                <span>{success}</span>
              </div>
            )}

            {/* Forms */}
            {activeTab === "signin" ? (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                    {locale === "am" ? "የኢሜል አድራሻ" : "Email Address"}
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
                      <Mail size={15} />
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="business@example.com"
                      className="w-full bg-[#121212] border border-zinc-800 focus:border-amber-400 rounded-lg pl-9 pr-3 py-2.5 text-base sm:text-sm text-white placeholder-zinc-600 focus:outline-none transition-all"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                    {locale === "am" ? "የይለፍ ቃል" : "Password"}
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
                      <Lock size={15} />
                    </span>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#121212] border border-zinc-800 focus:border-amber-400 rounded-lg pl-9 pr-10 py-2.5 text-base sm:text-sm text-white placeholder-zinc-600 focus:outline-none transition-all font-mono"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-500 hover:text-amber-400 transition-colors"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-amber-400 hover:bg-amber-500 disabled:bg-amber-400/40 text-black font-extrabold uppercase tracking-wider py-3 px-4 rounded-lg text-xs mt-3 flex items-center justify-center gap-1.5 shadow-[0_4px_20px_rgba(245,158,11,0.15)] active:scale-95 transition-all cursor-pointer"
                >
                  {isLoading ? (
                    <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      {locale === "am" ? "ግባ" : "LOGIN TO WORKSPACE"}
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSignUp} className="space-y-4">
                {/* Business Name */}
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                    {locale === "am" ? "የድርጅት ስም (የንግድ ስም)" : "Business Name"}
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
                      <Building2 size={14} />
                    </span>
                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g. BEU Restaurant"
                      className="w-full bg-[#121212] border border-zinc-800 focus:border-amber-400 rounded-lg pl-9 pr-3 py-2 text-base sm:text-sm text-white placeholder-zinc-600 focus:outline-none transition-all"
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
                    className="w-full bg-[#121212] border border-zinc-800 focus:border-amber-400 rounded-lg px-3 py-2.5 text-base sm:text-xs text-zinc-300 focus:outline-none transition-all"
                    required
                  >
                    <option value="">{locale === "am" ? "-- ንግድ አይነት ይምረጡ --" : "-- Select Business Type --"}</option>
                    {BUSINESS_TYPES.map(type => (
                      <option key={type} value={type}>
                        {locale === "am" ? (AMHARIC_BUSINESS_TYPES[type] || type) : type}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Custom Business Type input if 'Other' is chosen */}
                {businessType === "Other" && (
                  <div>
                    <label className="block text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1.5">
                      {locale === "am" ? "እባክዎ ንግድ አይነትዎን ይግለጹ" : "Specify Business Type"}
                    </label>
                    <input
                      type="text"
                      value={customBusinessType}
                      onChange={(e) => setCustomBusinessType(e.target.value)}
                      placeholder="e.g. Boutique, Delivery service"
                      className="w-full bg-[#121212] border border-amber-400/50 focus:border-amber-400 rounded-lg px-3 py-2 text-base sm:text-sm text-white placeholder-zinc-600 focus:outline-none transition-all animate-pulse"
                      required
                    />
                  </div>
                )}

                {/* Owner Name */}
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                    {locale === "am" ? "የባለቤቱ ስም" : "Owner Name"}
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
                      <UserIcon size={14} />
                    </span>
                    <input
                      type="text"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      placeholder="e.g. Abebe Balcha"
                      className="w-full bg-[#121212] border border-zinc-800 focus:border-amber-400 rounded-lg pl-9 pr-3 py-2 text-base sm:text-sm text-white placeholder-zinc-600 focus:outline-none transition-all"
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
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
                      <Mail size={14} />
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="owner@yourcompany.com"
                      className="w-full bg-[#121212] border border-zinc-800 focus:border-amber-400 rounded-lg pl-9 pr-3 py-2 text-base sm:text-sm text-white placeholder-zinc-600 focus:outline-none transition-all"
                      required
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                    {locale === "am" ? "የስልክ ቁጥር" : "Phone Number"}
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
                      <Phone size={14} />
                    </span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 0912345678"
                      className="w-full bg-[#121212] border border-zinc-800 focus:border-amber-400 rounded-lg pl-9 pr-3 py-2 text-base sm:text-sm text-white placeholder-zinc-600 focus:outline-none transition-all"
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
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
                      <Lock size={14} />
                    </span>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create secure password"
                      className="w-full bg-[#121212] border border-zinc-800 focus:border-amber-400 rounded-lg pl-9 pr-10 py-2 text-base sm:text-sm text-white placeholder-zinc-600 focus:outline-none transition-all font-mono"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-500 hover:text-amber-400 transition-colors"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-amber-400 hover:bg-amber-500 disabled:bg-amber-400/40 text-black font-extrabold uppercase tracking-wider py-3 px-4 rounded-lg text-xs mt-3 flex items-center justify-center gap-1.5 shadow-[0_4px_20px_rgba(245,158,11,0.15)] active:scale-95 transition-all cursor-pointer"
                >
                  {isLoading ? (
                    <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      {locale === "am" ? "አሁን ይመዝገቡ" : "PROCEED TO VERIFICATION"}
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </form>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="code-verification"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col gap-4 text-center"
          >
            <div className="flex justify-center text-amber-400 mb-1">
              <ShieldCheck size={40} className="animate-pulse" />
            </div>
            <h3 className="text-lg font-bold">
              {locale === "am" ? "ኢሜልዎን ያረጋግጡ" : "Email Verification Code Required"}
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-[280px] mx-auto">
              {locale === "am" ? `የ 6 ዲጂት ኮድ ወደ ${emailForVerification} ልከናል። እባክዎ ከታች ያስገቡ።` : `We sent a 6-digit confirmation key to ${emailForVerification}. Enter it below to unlock your setup.`}
            </p>

            {error && (
              <div className="p-3 bg-red-950/40 border border-red-900/50 text-red-200 text-xs rounded-lg flex items-start gap-2 text-left">
                <AlertCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-900/50 text-emerald-200 text-xs rounded-lg flex items-start gap-2 text-left">
                <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
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
                  className="w-full bg-[#121212] border border-zinc-800 focus:border-amber-400 text-center text-2xl font-black tracking-widest rounded-lg py-3 focus:outline-none transition-all placeholder-zinc-800 text-white font-mono"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-amber-400 hover:bg-amber-500 disabled:bg-amber-400/40 text-black font-extrabold uppercase tracking-wider py-3 px-4 rounded-lg text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer shadow-[0_4px_20px_rgba(245,158,11,0.2)]"
              >
                {isLoading ? (
                  <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    {locale === "am" ? "ኮዱን አረጋግጥ" : "CONFIRM VERIFICATION KEY"}
                    <CheckCircle2 size={14} />
                  </>
                )}
              </button>
            </form>

            <button
              onClick={() => {
                setShowCodeVerification(false);
                setError(null);
                setSuccess(null);
              }}
              className="text-[10px] text-zinc-500 hover:text-zinc-300 underline mt-2"
            >
              {locale === "am" ? "ወደ ኋላ ይመለሱ" : "Go back to register details"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
