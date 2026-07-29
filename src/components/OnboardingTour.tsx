import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Zap, HelpCircle, X, ChevronRight, ChevronLeft, Sparkles, Check } from "lucide-react";

interface OnboardingTourProps {
  userId: string;
  locale: "en" | "am";
  onComplete: () => void;
  onStepChange?: (stepIndex: number, step?: TourStep) => void;
}

interface TourStep {
  targetId?: string;
  titleEn: string;
  titleAm: string;
  descEn: string;
  descAm: string;
  icon: string;
  position: "top" | "bottom" | "left" | "right" | "center";
}

const TOUR_STEPS: TourStep[] = [
  {
    targetId: "beu-dashboard",
    titleEn: "👋 Welcome to Beu Verify!",
    titleAm: "👋 ወደ ቤዩ ቬሪፋይ እንኳን በደህና መጡ!",
    descEn: "This is your verification command center. Let's learn how to catch fake payments in under 2 minutes.",
    descAm: "ይህ የእርስዎ ክፍያ ማረጋገጫ ማዕከል ነው። በ2 ደቂቃ ውስጥ የውሸት ክፍያዎችን እንዴት መለየት እንደምንችል እንማር።",
    icon: "⚡",
    position: "center"
  },
  {
    targetId: "beu-credits",
    titleEn: "💎 Your Credits",
    titleAm: "💎 የእርስዎ ክሬዲቶች",
    descEn: "Each credit = 1 transaction verification. Your monthly plan gives you a set number. Keep an eye on this — when it's low, you'll get a warning!",
    descAm: "እያንዳንዱ ክሬዲት = 1 የክፍያ ማረጋገጫ ነው። ወርሃዊ ፕላንዎ የተወሰነ ቁጥር ይሰጥዎታል። ይህንን ይከታተሉ — ዝቅተኛ ሲሆን ማስጠንቀቂያ ይደርስዎታል።",
    icon: "💎",
    position: "bottom"
  },
  {
    targetId: "reference-input",
    titleEn: "🔍 The Magic Box",
    titleAm: "🔍 አስማተኛው ሳጥን",
    descEn: "This is where the action happens! Paste any Telebirr transaction reference number here, select the bank, and hit Verify. We'll check if the payment is real, fake, or already used.",
    descAm: "ዋናው ስራ የሚሰራው እዚህ ነው! ማንኛውንም የቴሌብር ማጣቀሻ ቁጥር እዚህ ይለጥፉ፣ ባንኩን ይምረጡ እና ‘አረጋግጥ’ የሚለውን ይጫኑ። ክፍያው እውነተኛ፣ የውሸት ወይም ቀደም ሲል የተመዘገበ መሆኑን እናረጋግጣለን።",
    icon: "🔍",
    position: "bottom"
  },
  {
    targetId: "verification-result-container",
    titleEn: "✅ Results Appear Here",
    titleAm: "✅ ውጤቶች እዚህ ይታያሉ",
    descEn: "After verification, you'll instantly see: Green = Real payment. Red = Fake or suspicious. Yellow = Duplicate (someone already used this reference). Fast and clear.",
    descAm: "ካረጋገጡ በኋላ ወዲያውኑ ያያሉ: አረንጓዴ = እውነተኛ ክፍያ። ቀይ = የውሸት ወይም አጠራጣሪ። ቢጫ = የተደገመ (አንድ ሰው ይህንን ማጣቀሻ ተጠቅሞበታል)። ፈጣን እና ግልጽ።",
    icon: "✅",
    position: "top"
  },
  {
    targetId: "financial-summary-card",
    titleEn: "📊 Visual Business Insights",
    titleAm: "📊 የእይታ የንግድ ግንዛቤዎች",
    descEn: "Track your total verified amount, transaction success rate, and active channels distribution live. This gives you high-level visibility over your shop's revenue.",
    descAm: "የተረጋገጠውን አጠቃላይ የገንዘብ መጠን፣ የግብይት ስኬት መጠን እና ንቁ የክፍያ መንገዶችን በቀጥታ ይከታተሉ። ይህ ስለ ሱቅዎ ገቢ ከፍተኛ እይታ ይሰጥዎታል።",
    icon: "📊",
    position: "left"
  },
  {
    targetId: "history-logs-card",
    titleEn: "📋 Your Verification History",
    titleAm: "📋 የእርስዎ ማረጋገጫ ታሪክ",
    descEn: "Every verification you run is saved here. You can search, filter, and review past checks anytime. Perfect for end-of-day reconciliation.",
    descAm: "የሚያካሂዱት እያንዳንዱ ማረጋገጫ እዚህ ይቀመጣል። ያለፉትን ቼኮች በማንኛውም ጊዜ መፈለግ፣ ማጣራት እና መገምገም ይችላሉ። ለቀን መጨረሻ ሪፖርት ፍጹም ነው።",
    icon: "📋",
    position: "top"
  },
  {
    targetId: "lang-select",
    titleEn: "🌐 Quick Language Toggle",
    titleAm: "🌐 ፈጣን ቋንቋ መቀያየሪያ",
    descEn: "Instantly switch the entire workspace, SMS decrypters, and receipts between English and Amharic with a single click.",
    descAm: "ሙሉውን ዳሽቦርድ፣ የኤስኤምኤስ ዲክሪፕተሮችን እና ደረሰኞችን በአንድ ጠቅታ በእንግሊዝኛ እና በአማርኛ መካከል በፍጥነት ይቀይሩ።",
    icon: "🌐",
    position: "bottom"
  },
  {
    targetId: "beu-upgrade-btn",
    titleEn: "⬆️ Need More Power?",
    titleAm: "⬆️ ተጨማሪ ክሬዲት ይፈልጋሉ?",
    descEn: "Running low on credits? Upgrade your plan here anytime. We have packages for small shops (99 ETB), growing businesses (1,200 ETB), and enterprises (6,500 ETB).",
    descAm: "ክሬዲት እያለቀብዎት ነው? በማንኛውም ጊዜ እዚህ ፕላንዎን ያሻሽሉ። ለአነስተኛ ሱቆች (99 ብር)፣ እያደጉ ላሉ ንግዶች (1,200 ብር) እና ለትላልቅ ድርጅቶች (6,500 ብር) ፓኬጆች አሉን።",
    icon: "⬆️",
    position: "left"
  },
  {
    targetId: "beu-dashboard",
    titleEn: "🎉 You're Ready!",
    titleAm: "🎉 ዝግጁ ነዎት!",
    descEn: "You now know everything you need. Start verifying payments, stop losing money to fake screenshots, and grow your business with confidence. Welcome aboard!",
    descAm: "አሁን ማወቅ ያለብዎትን ሁሉ ያውቃሉ። ክፍያዎችን ማረጋገጥ ይጀምሩ፣ በውሸት ስክሪንሾቶች ገንዘብ ማጣትን ያቁሙ እና ንግድዎን በልበ ሙሉነት ያሳድጉ። እንኳን ደህና መጡ!",
    icon: "🎉",
    position: "center"
  }
];

export default function OnboardingTour({ userId, locale, onComplete, onStepChange }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const step = TOUR_STEPS[currentStep];

  // Auto-focus container for Keyboard traps
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.focus();
    }
  }, [currentStep]);

  // Handle step updates & inform parent to adjust page views/simulate entries
  useEffect(() => {
    if (onStepChange) {
      onStepChange(currentStep, step);
    }
  }, [currentStep, step]);

  // Scroll target element into view once when step changes
  useEffect(() => {
    if (step.position === "center" || !step.targetId) {
      return;
    }
    const element = document.getElementById(step.targetId);
    if (element) {
      element.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [currentStep, step.targetId]);

  // Recalculate target element position coordinates (purely viewport-relative for fixed overlays)
  const updateCoords = () => {
    if (step.position === "center" || !step.targetId) {
      setCoords(null);
      return;
    }

    const element = document.getElementById(step.targetId);
    if (element) {
      const rect = element.getBoundingClientRect();
      setCoords({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      });
    } else {
      setCoords(null);
    }
  };

  useEffect(() => {
    updateCoords();
    window.addEventListener("resize", updateCoords);
    window.addEventListener("scroll", updateCoords, { passive: true });
    return () => {
      window.removeEventListener("resize", updateCoords);
      window.removeEventListener("scroll", updateCoords);
    };
  }, [currentStep, step.targetId]);

  // Keyboard controls
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      handleNext();
    } else if (e.key === "ArrowLeft") {
      handlePrev();
    } else if (e.key === "Escape") {
      handleSkip();
    }
  };

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    // Call backend API to persist dismiss status
    fetch(`/api/auth/dismiss-approval/${userId}`, { method: "POST" })
      .then(() => {
        console.log("Successfully persisted hasSeenFirstTimeApproval to true.");
      })
      .catch(err => {
        console.error("Failed to dismiss tour approval flag:", err);
      });
    onComplete();
  };

  // Determine tooltip style based on coordinates
  const getTooltipStyle = () => {
    if (!coords) {
      return {
        position: "fixed" as const,
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 50,
        width: "90%",
        maxWidth: "400px"
      };
    }

    const isMobile = window.innerWidth < 640;
    if (isMobile) {
      return {
        position: "fixed" as const,
        bottom: "16px",
        left: "16px",
        right: "16px",
        zIndex: 50
      };
    }

    const padding = 12;
    const tooltipWidth = 320;
    
    // Default fallback
    let style: React.CSSProperties = {
      position: "absolute" as const,
      zIndex: 50,
      width: `${tooltipWidth}px`
    };

    switch (step.position) {
      case "bottom":
        style.top = `${coords.top + coords.height + padding}px`;
        style.left = `${coords.left + coords.width / 2 - tooltipWidth / 2}px`;
        break;
      case "top":
        style.top = `${coords.top - 200 - padding}px`; // estimated height
        style.left = `${coords.left + coords.width / 2 - tooltipWidth / 2}px`;
        break;
      case "left":
        style.top = `${coords.top + coords.height / 2 - 80}px`;
        style.left = `${coords.left - tooltipWidth - padding}px`;
        break;
      case "right":
        style.top = `${coords.top + coords.height / 2 - 80}px`;
        style.left = `${coords.left + coords.width + padding}px`;
        break;
      default:
        style.top = `${coords.top + coords.height + padding}px`;
        style.left = `${coords.left + coords.width / 2 - tooltipWidth / 2}px`;
    }

    // Edge boundaries correction
    if (parseFloat(style.left as string) < 16) {
      style.left = "16px";
    } else if (parseFloat(style.left as string) + tooltipWidth > window.innerWidth - 16) {
      style.left = `${window.innerWidth - tooltipWidth - 16}px`;
    }

    return style;
  };

  const titleText = locale === "am" ? step.titleAm : step.titleEn;
  const descText = locale === "am" ? step.descAm : step.descEn;

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      className="fixed inset-0 z-[999] outline-none overflow-x-hidden overflow-y-auto"
      style={{ 
        background: coords ? "transparent" : "rgba(9, 9, 11, 0.25)",
        backdropFilter: coords ? "none" : "blur(1px)"
      }}
    >
      <style>{`
        @keyframes tour-pulse-ring {
          0% {
            transform: scale(0.96);
            opacity: 0.9;
            box-shadow: 0 0 0 0 rgba(255, 215, 0, 0.8), inset 0 0 8px rgba(255, 215, 0, 0.3);
          }
          50% {
            transform: scale(1.06);
            opacity: 0.5;
            box-shadow: 0 0 0 16px rgba(255, 215, 0, 0), inset 0 0 16px rgba(255, 215, 0, 0.1);
          }
          100% {
            transform: scale(0.96);
            opacity: 0;
            box-shadow: 0 0 0 0 rgba(255, 215, 0, 0), inset 0 0 8px rgba(255, 215, 0, 0);
          }
        }
        @keyframes tour-rotate-dash {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>

      {/* 1. Backdrop highlight cutout overlay */}
      {coords && (
        <>
          {/* Main Cutout and Light Tint Backdrop */}
          <div
            className="fixed pointer-events-none transition-all duration-300"
            style={{
              top: `${coords.top - 8}px`,
              left: `${Math.max(4, coords.left - 8)}px`,
              width: `${Math.min(window.innerWidth - Math.max(4, coords.left - 8) - 4, coords.width + 16)}px`,
              height: `${coords.height + 16}px`,
              borderRadius: "16px",
              border: "3px solid #FFD700",
              boxShadow: "0 0 35px rgba(255, 215, 0, 0.5), 0 0 0 9999px rgba(0, 0, 0, 0.12)",
              zIndex: 40
            }}
          />

          {/* Glowing/Pulsing Radar Ring */}
          <div
            className="fixed pointer-events-none transition-all duration-300"
            style={{
              top: `${coords.top - 12}px`,
              left: `${Math.max(2, coords.left - 12)}px`,
              width: `${Math.min(window.innerWidth - Math.max(2, coords.left - 12) - 2, coords.width + 24)}px`,
              height: `${coords.height + 24}px`,
              borderRadius: "20px",
              border: "2px solid rgba(255, 215, 0, 0.35)",
              animation: "tour-pulse-ring 2.2s infinite ease-in-out",
              zIndex: 39
            }}
          />

          {/* Circling/Rotating Dashed Targeter */}
          <div
            className="fixed pointer-events-none transition-all duration-300"
            style={{
              top: `${coords.top - 16}px`,
              left: `${Math.max(2, coords.left - 16)}px`,
              width: `${Math.min(window.innerWidth - Math.max(2, coords.left - 16) - 2, coords.width + 32)}px`,
              height: `${coords.height + 32}px`,
              borderRadius: "24px",
              border: "2px dashed rgba(255, 215, 0, 0.65)",
              animation: "tour-rotate-dash 12s linear infinite",
              zIndex: 39
            }}
          />
        </>
      )}

      {/* 2. Tooltip Card container */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, scale: 0.95, y: coords ? 0 : 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: coords ? 0 : -20 }}
          transition={{ duration: 0.3 }}
          style={getTooltipStyle()}
          className="bg-[#161616] border-l-4 border-[#FFD700] rounded-r-2xl rounded-l-md p-6 shadow-[0_15px_40px_rgba(0,0,0,0.6)] border border-zinc-800 text-white relative flex flex-col gap-4 select-none"
        >
          {/* Beu Thunder Icon in top right */}
          <div className="absolute top-4 right-4 text-amber-400 opacity-20">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 fill-current" viewBox="0 0 24 24">
              <path d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>

          <div className="flex items-start gap-3">
            <span className="text-2xl mt-0.5">{step.icon}</span>
            <div className="space-y-1.5 flex-1 pr-6">
              <h4 className="text-base font-black text-[#FFD700] font-display uppercase tracking-wide">
                {titleText}
              </h4>
              <p className="text-zinc-300 text-xs leading-relaxed font-sans">
                {descText}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-1 mt-1">
            <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono font-bold">
              <span>{locale === "am" ? `ደረጃ ${currentStep + 1} ከ ${TOUR_STEPS.length}` : `STEP ${currentStep + 1} OF ${TOUR_STEPS.length}`}</span>
              <span>{Math.round(((currentStep + 1) / TOUR_STEPS.length) * 100)}%</span>
            </div>
            <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-[#FFD700]"
                initial={{ width: 0 }}
                animate={{ width: `${((currentStep + 1) / TOUR_STEPS.length) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          {/* Action Footer Button Group */}
          <div className="flex items-center justify-between pt-2 border-t border-zinc-900">
            <button
              onClick={handleSkip}
              className="text-zinc-500 hover:text-[#FFD700] text-[10px] font-mono font-black uppercase transition-colors cursor-pointer"
            >
              {locale === "am" ? "አሁን ዝለል" : "Skip Tour"}
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrev}
                disabled={currentStep === 0}
                className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed text-[10px] font-mono font-black text-zinc-300 rounded-lg border border-zinc-800 flex items-center gap-1 transition-all"
              >
                <ChevronLeft size={10} />
                {locale === "am" ? "ወደ ኋላ" : "Back"}
              </button>

              <button
                onClick={handleNext}
                className="px-4 py-1.5 bg-[#FFD700] hover:bg-amber-400 text-black text-[10px] font-mono font-black rounded-lg flex items-center gap-1 transition-all shadow-md shadow-amber-500/10 active:scale-95 cursor-pointer"
              >
                {currentStep === TOUR_STEPS.length - 1 ? (
                  <>
                    {locale === "am" ? "ማረጋገጥ ይጀምሩ!" : "Start Verifying!"}
                    <Check size={10} />
                  </>
                ) : (
                  <>
                    {locale === "am" ? "ቀጣይ" : "Next"}
                    <ChevronRight size={10} />
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
