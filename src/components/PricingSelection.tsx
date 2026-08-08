import React, { useState } from "react";
import { Sparkles, Check, ArrowRight, ShieldCheck, Landmark, Smartphone, MessageSquare, ExternalLink, RefreshCw, AlertTriangle, ArrowLeft, Copy } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { getApiUrl } from "../api";

interface PricingSelectionProps {
  user: any;
  onPaymentVerified: () => void;
  onLogout?: () => void;
  onBack?: () => void;
  locale: "am" | "en";
  t: any;
}

const PLANS = [
  {
    id: "starter",
    name: "Starter (Trial)",
    nameAm: "ጀማሪ (የሙከራ)",
    price: 99,
    verifications: 25,
    tagline: "Try our speed & reliability.",
    taglineAm: "የአገልግሎታችንን ፍጥነትና አስተማማኝነት ይሞክሩ።",
    features: ["25 transaction verifications", "Standard automated router", "No duplicate check bounds", "Standard support via Email"],
    featuresAm: ["25 ክፍያዎችን ማረጋገጥ", "መደበኛ የራስ-ሰር ራውተር", "መደበኛ የኢሜል ድጋፍ"]
  },
  {
    id: "business",
    name: "Business (Medium)",
    nameAm: "ቢዝነስ (መካከለኛ)",
    price: 1200,
    verifications: 2500,
    tagline: "Smooth additions & priority support.",
    taglineAm: "ለስላሳ ስራዎች እና ቀዳሚ የቴክኒክ ድጋፍ።",
    features: ["2,500 transaction verifications", "Automated priority router", "Duplicate transaction prevention", "Priority support channel"],
    featuresAm: ["2,500 ክፍያዎችን ማረጋገጥ", "ቅድሚያ የሚሰጠው አውቶማቲክ ራውተር", "የተደጋገሙ ክፍያዎችን መከላከል", "ቅድሚያ የሚሰጠው የድጋፍ መስመር"]
  },
  {
    id: "enterprise",
    name: "Enterprise (Pro)",
    nameAm: "ኢንተርፕራይዝ (ፕሮ)",
    price: 6500,
    verifications: 20000,
    tagline: "Fast, includes transaction summary & reports.",
    taglineAm: "እጅግ ፈጣን፣ የክፍያ ማጠቃለያ እና ሪፖርቶችን ያካትታል።",
    features: ["20,000 transaction verifications", "Dedicated routing capacity", "Live analytics & total volumes", "24/7 dedicated support representative"],
    featuresAm: ["20,000 ክፍያዎችን ማረጋገጥ", "የተለየ የኔትወርክ አቅም", "የቀጥታ ገቢ ማጠቃለያዎችና ሪፖርቶች", "የ 24/7 ቀጥተኛ ድጋፍ"]
  }
];

export default function PricingSelection({ user, onPaymentVerified, onLogout, onBack, locale, t }: PricingSelectionProps) {
  const [step, setStep] = useState<"pricing" | "payment">("pricing");
  const [selectedPlan, setSelectedPlan] = useState<typeof PLANS[0] | null>(null);
  
  // Payment Verification States
  const [referenceNumber, setReferenceNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copiedPhone, setCopiedPhone] = useState(false);

  const handleCopyPhone = () => {
    navigator.clipboard.writeText("0920017478");
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  // If user already has a selected plan and is pending verification, skip directly to payment instructions
  React.useEffect(() => {
    if (user.selectedPlan && step === "pricing") {
      const plan = PLANS.find(p => p.id === user.selectedPlan);
      if (plan) {
        setSelectedPlan(plan);
        setStep("payment");
      }
    }
  }, [user]);

  const handleSelectPlan = async (plan: typeof PLANS[0]) => {
    setIsLoading(true);
    setError(null);
    
    // Always transition immediately to payment view so user is never stuck
    setSelectedPlan(plan);
    setStep("payment");

    try {
      const userId = user?.id || user?.userId;
      if (userId) {
        await fetch(getApiUrl("/api/subscription/select-plan"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: userId,
            plan: plan.id
          })
        });
      }
    } catch (err) {
      console.warn("Background plan selection network note:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!referenceNumber.trim()) {
      setError(locale === "am" ? "እባክዎ የቴሌብር ማጣቀሻ ቁጥር ያስገቡ" : "Please enter the transaction reference number.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(getApiUrl("/api/subscription/verify-payment"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          referenceNumber: referenceNumber.trim(),
          plan: selectedPlan?.id || "business"
        })
      });

      const data = await response.json();
      if (data.success) {
        setSuccess(locale === "am" ? "ክፍያዎ በተሳካ ሁኔታ ተረጋግጧል! ወደ ዳሽቦርድ በመሄድ ላይ..." : "Payment verified successfully! Launching your workspace...");
        setTimeout(() => {
          onPaymentVerified();
        }, 1500);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError(locale === "am" 
        ? "የክፍያ ማረጋገጥ አልተቻለም። እባክዎ በቴሌግራም @beuverify ያግኙን።" 
        : "Payment Verification Failed! Please contact our support team on Telegram via @beuverify and describe the problem you faced. We will help you resolve it quickly."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`w-full mx-auto px-4 py-8 transition-all duration-500 ${step === "payment" ? "max-w-6xl" : "max-w-4xl"}`}>
      {/* Top Header Navigation */}
      <div className="flex items-center justify-between mb-6">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 text-xs font-semibold transition-all cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>{locale === "am" ? "ወደ ዋናው ገጽ ተመለስ" : "Back to Workspace"}</span>
          </button>
        ) : <div />}

        {step === "payment" && (
          <button
            type="button"
            onClick={() => setStep("pricing")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-400 hover:bg-amber-400/20 text-xs font-bold transition-all cursor-pointer"
          >
            <RefreshCw size={14} />
            <span>{locale === "am" ? "ሁሉንም ጥቅሎች ይመልከቱ" : "View All Subscription Plans"}</span>
          </button>
        )}
      </div>

      {/* Top Title */}
      <div className="flex flex-col items-center text-center mb-10">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 bg-amber-400 rounded-lg flex items-center justify-center text-black">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-xs font-black tracking-widest text-zinc-500 uppercase">
            {locale === "am" ? "የክፍያ ደረጃዎች" : "SUBSCRIPTION PLANS & PRICING"}
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
          {step === "pricing" 
            ? (locale === "am" ? "የንግድዎን እቅድ ይምረጡ" : "Choose the Perfect Plan for Your Business")
            : (locale === "am" ? "የቴሌብር ክፍያ መመሪያዎች" : "Telebirr Payment Verification")
          }
        </h1>
        <p className="text-sm text-zinc-400 max-w-lg mt-2 leading-relaxed">
          {step === "pricing"
            ? (locale === "am" ? "ከታች ካሉት ሶስት እቅዶች አንዱን በመምረጥ የንግድዎን ክፍያ በራስ-ሰር ማረጋገጥ ይጀምሩ።" : "Select from our 3 monthly subscriptions to unlock instant automated bank receipt and mobile wallet verification.")
            : (locale === "am" ? "አውቶማቲክ ክፍያ ማረጋገጫ ስርዓት" : "Our systems will verify your payment details automatically in real-time.")
          }
        </p>
      </div>

      <AnimatePresence mode="wait">
        {step === "pricing" ? (
          <motion.div
            key="pricing-grid"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {error && (
              <div className="p-4 bg-red-950/40 border border-red-900/50 rounded-xl flex items-center gap-2 text-xs text-red-200">
                <AlertTriangle size={18} className="text-red-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLANS.map((plan) => (
              <div 
                key={plan.id}
                className={`bg-[#0a0a0a] border ${
                  plan.id === "business" ? "border-amber-400 shadow-[0_0_30px_rgba(255,215,0,0.05)]" : "border-zinc-800"
                } rounded-2xl p-6 flex flex-col relative overflow-hidden`}
              >
                {plan.id === "business" && (
                  <div className="absolute top-3 right-3 bg-amber-400 text-black text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider shadow">
                    POPULAR
                  </div>
                )}
                
                <h3 className="text-lg font-black text-white">{locale === "am" ? plan.nameAm : plan.name}</h3>
                <p className="text-xs text-zinc-500 mt-1 min-h-[32px]">{locale === "am" ? plan.taglineAm : plan.tagline}</p>

                {/* Price Display */}
                <div className="mt-5 mb-5 flex items-baseline gap-1">
                  <span className="text-3xl font-black text-white">{plan.price}</span>
                  <span className="text-xs text-zinc-400 font-bold">ETB / {locale === "am" ? "በወር" : "Month"}</span>
                </div>

                {/* Subtitle features */}
                <div className="border-t border-zinc-900 pt-5 flex-1 space-y-3">
                  <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-extrabold">
                    {locale === "am" ? "ምን ያካትታል?" : "PLAN SPECIFICATIONS:"}
                  </div>
                  {(locale === "am" ? plan.featuresAm : plan.features).map((feat, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-zinc-300">
                      <Check size={14} className="text-amber-400 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handleSelectPlan(plan)}
                  disabled={isLoading}
                  className={`w-full py-3 px-4 rounded-xl text-xs font-extrabold uppercase tracking-wider mt-6 flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    plan.id === "business"
                      ? "bg-amber-400 text-black hover:bg-amber-500 shadow-[0_4px_15px_rgba(245,158,11,0.2)]"
                      : "bg-[#141414] hover:bg-zinc-800 text-white border border-zinc-800"
                  }`}
                >
                  {locale === "am" ? "ይህን እቅድ ይምረጡ" : "SELECT THIS PACKAGE"}
                  <ArrowRight size={13} />
                </button>
              </div>
            ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="payment-instructions"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="w-full bg-[#0a0a0a] border border-zinc-800 rounded-2xl p-6 sm:p-8"
          >
            <style>{`
              @keyframes receipt-pulse-circle {
                0% {
                  transform: scale(0.97);
                  box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7), inset 0 0 6px rgba(239, 68, 68, 0.3);
                }
                50% {
                  transform: scale(1.03);
                  box-shadow: 0 0 0 10px rgba(239, 68, 68, 0), inset 0 0 12px rgba(239, 68, 68, 0.15);
                }
                100% {
                  transform: scale(0.97);
                  box-shadow: 0 0 0 0 rgba(239, 68, 68, 0), inset 0 0 6px rgba(239, 68, 68, 0);
                }
              }
              @keyframes hover-bounce {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-4px); }
              }
              .receipt-circle-glow {
                animation: receipt-pulse-circle 2.2s infinite ease-in-out;
              }
              .tip-bounce {
                animation: hover-bounce 2s infinite ease-in-out;
              }
            `}</style>

            {/* Header info */}
            <div className="flex justify-between items-center border-b border-zinc-900 pb-4 mb-6">
              <button
                onClick={() => {
                  setStep("pricing");
                  setError(null);
                  setSuccess(null);
                }}
                className="text-xs text-zinc-500 hover:text-white flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft size={14} />
                {locale === "am" ? "ወደ እቅድ ምርጫ ይመለሱ" : "Go back to packages"}
              </button>
              <div className="text-right">
                <span className="text-[10px] text-zinc-500 font-bold uppercase block">
                  {locale === "am" ? "የተመረጠው እቅድ" : "SELECTED SUBSCRIPTION"}
                </span>
                <span className="text-sm font-black text-amber-400">
                  {locale === "am" ? selectedPlan?.nameAm : selectedPlan?.name}
                </span>
              </div>
            </div>

            {/* Side-by-Side 2 Column Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* LEFT COLUMN: Billing Instructions & Verification Form */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* Payment Instructions Details */}
                <div className="bg-[#121212] border border-zinc-900 rounded-xl p-5 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider border-b border-zinc-900/50 pb-2">
                    <Smartphone size={16} />
                    {locale === "am" ? "ክፍያ መፈጸሚያ ዝርዝር" : "Telebirr Billing Instructions"}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-black/40 p-3 rounded-lg border border-zinc-900/30">
                      <span className="text-[10px] text-zinc-500 font-bold uppercase block">{locale === "am" ? "ለማን ይከፈላል" : "PAY TO RECIPIENT"}</span>
                      <span className="text-sm font-black text-white lowercase">biniyam haile</span>
                    </div>
                    <div className="bg-black/40 p-3 rounded-lg border border-zinc-900/30 flex justify-between items-center">
                      <div>
                        <span className="text-[10px] text-zinc-500 font-bold uppercase block">{locale === "am" ? "የቴሌብር ስልክ ቁጥር" : "TELEBIRR MOBILE NUMBER"}</span>
                        <span className="text-sm font-black text-amber-400 select-all font-mono">0920017478</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyPhone}
                        className="p-1.5 rounded-lg bg-[#141414] hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all border border-zinc-800 flex items-center gap-1 cursor-pointer"
                        title={locale === "am" ? "ቁጥሩን ቅዳ" : "Copy phone number"}
                      >
                        {copiedPhone ? (
                          <>
                            <Check size={12} className="text-emerald-400 animate-pulse" />
                            <span className="text-[9px] text-emerald-400 font-black tracking-wider uppercase">{locale === "am" ? "ኮፒ" : "Copied"}</span>
                          </>
                        ) : (
                          <>
                            <Copy size={12} />
                            <span className="text-[9px] font-black tracking-wider uppercase">{locale === "am" ? "ቅዳ" : "Copy"}</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="bg-black/40 p-3 rounded-lg border border-zinc-900/30">
                      <span className="text-[10px] text-zinc-500 font-bold uppercase block">{locale === "am" ? "የክፍያ መጠን" : "EXACT BILLING AMOUNT"}</span>
                      <span className="text-sm font-black text-white">{selectedPlan?.price} ETB</span>
                    </div>
                    <div className="bg-black/40 p-3 rounded-lg border border-zinc-900/30">
                      <span className="text-[10px] text-zinc-500 font-bold uppercase block">{locale === "am" ? "የማረጋገጫ ስም" : "RECIPIENT NAME FOR VERIFY"}</span>
                      <span className="text-sm font-bold text-emerald-400 lowercase">biniyam haile</span>
                    </div>
                  </div>

                  <div className="p-3 bg-amber-400/5 border border-amber-400/10 rounded-lg text-xs text-zinc-300 leading-relaxed">
                    <strong>{locale === "am" ? "ክሪቲካል መመሪያ" : "Critical Instruction"}:</strong>{" "}
                    {locale === "am" 
                      ? "ክፍያውን ከላይ ባለው የቴሌብር ቁጥር ላይ ይላኩ። ክፍያውን ከጨረሱ በኋላ ከቴሌብር የግብይት ማጣቀሻ ቁጥር (Transaction Reference Number) ይደርስዎታል። ያንን ቁጥር ከታች በማስገባት ክፍያዎን በፍጥነት ያረጋግጡ።"
                      : "Send the payment to the above Telebirr number. After completing the payment, you will receive a transaction reference number from Telebirr. Enter this reference number below to verify your payment instantly."
                    }
                  </div>
                </div>

                {/* Error/Success Displays */}
                {error && (
                  <div className="p-4 bg-red-950/40 border border-red-900/50 rounded-xl space-y-3">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-red-200 leading-relaxed">
                        {error.includes("@beuverify") || error.includes("@Beutechsupport") || error.includes("Telegram") ? (
                          <>
                            Payment Failed! Please contact our support team on Telegram via{" "}
                            <a 
                              href="https://t.me/beuverify" 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-amber-400 font-black underline hover:text-amber-300 inline-flex items-center gap-0.5"
                            >
                              @beuverify <ExternalLink size={10} />
                            </a>{" "}
                            and describe the problem you faced. We will help you resolve it quickly.
                          </>
                        ) : (
                          error
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => {
                          setReferenceNumber("");
                          setError(null);
                        }}
                        className="bg-red-500/15 border border-red-500/20 text-red-200 text-[10px] font-black uppercase px-3 py-1.5 rounded hover:bg-red-500/20 transition-all cursor-pointer"
                      >
                        {locale === "am" ? "በድጋሚ ሞክር" : "Try Again"}
                      </button>
                      <button
                        onClick={() => {
                          setStep("pricing");
                          setError(null);
                          setReferenceNumber("");
                        }}
                        className="bg-zinc-900 text-zinc-400 border border-zinc-800 text-[10px] font-black uppercase px-3 py-1.5 rounded hover:text-white transition-all cursor-pointer"
                      >
                        {locale === "am" ? "ወደ ኋላ ተመለስ" : "Go Back"}
                      </button>
                    </div>
                  </div>
                )}

                {success && (
                  <div className="p-4 bg-emerald-950/40 border border-emerald-900/50 text-emerald-200 text-xs rounded-xl flex items-start gap-2.5">
                    <Check size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">{success}</p>
                  </div>
                )}

                {/* Form Input Field */}
                <form onSubmit={handleVerifyPayment} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest mb-2">
                      {locale === "am" ? "የቴሌብር ግብይት ማጣቀሻ ቁጥር (Reference Number)" : "Enter Telebirr Transaction Reference Number"}
                    </label>
                    <input
                      type="text"
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                      placeholder="e.g. DGF8UP32GM or DEMO_99"
                      className="w-full bg-[#121212] border border-zinc-800 focus:border-amber-400 rounded-xl px-4 py-3.5 text-sm tracking-wide text-white focus:outline-none transition-all placeholder-zinc-700 font-mono"
                      disabled={isLoading || !!success}
                      required
                    />
                    <span className="text-[9px] text-zinc-500 mt-1 block leading-normal">
                      {locale === "am" 
                        ? "ማሳሰቢያ፡ ለፈጣን ፈተና 'DEMO_99'፣ 'DEMO_1200' ወይም 'DEMO_6500' ብለው ያስገቡ"
                        : "Tip: For offline local sandbox testing, enter 'DEMO_99', 'DEMO_1200', or 'DEMO_6500' based on plan."
                      }
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !!success}
                    className="w-full bg-amber-400 hover:bg-amber-500 disabled:bg-amber-400/20 disabled:text-black/50 text-black font-extrabold uppercase tracking-wider py-3.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer shadow-[0_4px_25px_rgba(245,158,11,0.15)]"
                  >
                    {isLoading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin mr-1" />
                        {locale === "am" ? "ክፍያውን በማረጋገጥ ላይ..." : "AUTOMATED VERIFICATION IN PROGRESS..."}
                      </>
                    ) : (
                      <>
                        {locale === "am" ? "ክፍያውን አረጋግጥ" : "VERIFY PAYMENT INSTANTLY"}
                        <ShieldCheck size={14} />
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* RIGHT COLUMN: Interactive High-Fidelity Telebirr Receipt Guide */}
              <div className="lg:col-span-5 flex flex-col items-center">
                
                {/* Header Badge */}
                <div className="w-full flex items-center justify-between px-2 mb-3">
                  <span className="text-[10px] font-black tracking-wider text-zinc-500 uppercase font-mono">
                    {locale === "am" ? "📌 የደረሰኝ ማሳያ መመሪያ" : "📌 RECEIPT INFORMATION GUIDE"}
                  </span>
                  <span className="text-[9px] bg-emerald-500/10 text-emerald-400 font-bold px-2 py-0.5 rounded-full uppercase border border-emerald-500/20">
                    {locale === "am" ? "ንቁ" : "ACTIVE GUIDE"}
                  </span>
                </div>

                {/* High Fidelity Telebirr Receipt Wrapper */}
                <div className="w-full max-w-[340px] bg-white text-zinc-900 rounded-[28px] p-5 shadow-2xl border border-zinc-200 select-none relative overflow-hidden flex flex-col">
                  
                  {/* Top Mobile Status Header bar representation */}
                  <div className="flex justify-between items-center text-[9px] text-zinc-400 font-bold font-mono px-1 mb-4 border-b border-zinc-100 pb-2">
                    <span>11:48</span>
                    <div className="flex items-center gap-1">
                      <span>4G</span>
                      <span>🔋 63%</span>
                    </div>
                  </div>

                  {/* Successful Check Circle badge */}
                  <div className="flex flex-col items-center text-center mb-5 mt-1">
                    <div className="w-12 h-12 bg-[#52B743] rounded-full flex items-center justify-center text-white mb-2 shadow-md">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 stroke-[3px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-sm font-black text-[#52B743] tracking-tight">Successful</span>
                  </div>

                  {/* Pricing Amount dynamically linked to chosen plan */}
                  <div className="text-center mb-6">
                    <span className="text-3xl font-black text-black tracking-tight">
                      -{selectedPlan ? selectedPlan.price : 99}.00
                    </span>
                    <span className="text-xs text-zinc-600 font-bold ml-1">(ETB)</span>
                  </div>

                  {/* Receipt Details rows */}
                  <div className="border-t border-zinc-100 pt-4 space-y-3.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-500 font-medium">{locale === "am" ? "የክፍያ ሰዓት:" : "Transaction Time:"}</span>
                      <span className="text-zinc-950 font-bold">2026/07/15 11:48:25</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-500 font-medium">{locale === "am" ? "የክፍያ ዓይነት:" : "Transaction Type:"}</span>
                      <span className="text-zinc-950 font-semibold">Transfer Money</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-500 font-medium">{locale === "am" ? "ተከፋይ:" : "Transaction To:"}</span>
                      <span className="text-zinc-950 font-bold text-sm lowercase">biniyam haile</span>
                    </div>

                    {/* KEY ITEM: Transaction Number (Glow-circled) */}
                    <div 
                      onClick={() => {
                        setReferenceNumber("DGF8UP32GM");
                        // Trigger simple pulse wiggle highlight in form for peak clarity
                        const inputEl = document.querySelector("input[placeholder*='e.g. DGF8UP32GM']");
                        if (inputEl) {
                          inputEl.classList.add("ring-2", "ring-amber-400", "scale-102");
                          setTimeout(() => {
                            inputEl.classList.remove("ring-2", "ring-amber-400", "scale-102");
                          }, 1000);
                        }
                      }}
                      title={locale === "am" ? "ይህንን ቁጥር ለመቅዳት ጠቅ ያድርጉ!" : "Click to auto-fill this transaction number!"}
                      className="flex justify-between items-center py-2 px-2.5 bg-red-500/5 rounded-xl border border-red-500/25 relative cursor-pointer hover:bg-red-500/10 transition-all group"
                    >
                      <span className="text-red-600 font-extrabold text-[11px] uppercase tracking-wide">
                        {locale === "am" ? "የግብይት ቁጥር:" : "Transaction Number:"}
                      </span>
                      <span className="text-zinc-950 font-mono font-black text-sm tracking-wider z-10 select-all group-hover:scale-105 transition-all">
                        DGF8UP32GM
                      </span>

                      {/* Glowing Pulsing Red Circle Overlay precisely enclosing the Transaction Number value */}
                      <div className="absolute right-1 top-1 bottom-1 w-32 pointer-events-none rounded-lg border-2 border-red-500/90 receipt-circle-glow" />
                    </div>
                  </div>

                  {/* TelePlay Mini Banner mockup */}
                  <div className="mt-5 bg-[#76C043]/10 rounded-xl p-2.5 border border-[#76C043]/20 flex items-center justify-between text-left relative overflow-hidden">
                    <div className="space-y-0.5 z-10">
                      <div className="text-[9px] font-black text-[#558B2F] uppercase">Above 60 Million ETB</div>
                      <div className="text-[11px] font-black text-[#33691E]">TelePlay Prizes!</div>
                    </div>
                    <div className="w-12 h-6 bg-[#76C043] rounded flex items-center justify-center text-[9px] font-bold text-white z-10">
                      PLAY
                    </div>
                    {/* decorative background circle */}
                    <div className="absolute -right-3 -bottom-3 w-10 h-10 rounded-full bg-[#76C043]/20" />
                  </div>

                  {/* Finished button at receipt bottom */}
                  <div className="mt-4 border-t border-zinc-100 pt-3">
                    <div className="w-full py-2 bg-[#8BC34A] text-white text-center rounded-xl text-xs font-black uppercase tracking-wider">
                      Finished
                    </div>
                  </div>
                </div>

                {/* Annotation pointing tip beneath receipt */}
                <div className="mt-3.5 bg-red-500/10 border border-red-500/25 p-3 rounded-xl w-full max-w-[340px] text-center tip-bounce">
                  <p className="text-xs text-red-400 font-extrabold leading-normal">
                    {locale === "am" 
                      ? "⚠️ ከላይ በክብ የተቀመጠውን 'DGF8UP32GM' የሚለውን የግብይት ቁጥር (Transaction Number) ከታች ባለው ሳጥን ውስጥ ማስገባት አለብዎት!" 
                      : "⚠️ Enter the circled Transaction Number (e.g. DGF8UP32GM) from your receipt in the reference number input field!"
                    }
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-1">
                    {locale === "am" ? "💡 በደረሰኙ ላይ ጠቅ በማድረግ በራስ-ሰር መሙላት ይችላሉ" : "💡 Click on the receipt transaction row to auto-fill instantly!"}
                  </p>
                </div>

              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="text-center mt-12 flex items-center justify-center gap-4 text-xs text-zinc-600">
        <button onClick={onLogout} className="hover:text-zinc-400 underline cursor-pointer">
          {locale === "am" ? "ይውጡ" : "Sign out from account"}
        </button>
      </div>
    </div>
  );
}
