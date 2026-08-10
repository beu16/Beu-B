import React, { useState, useEffect } from "react";
import { Lock, KeyRound, AlertCircle, Eye, EyeOff, ShieldCheck, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface BiometricPinLockProps {
  isOpen: boolean;
  mode: "unlock" | "setup";
  onSuccess: () => void;
  onCancel?: () => void;
  userName?: string;
}

export default function BiometricPinLock({
  isOpen,
  mode,
  onSuccess,
  onCancel,
  userName = "Valued User"
}: BiometricPinLockProps) {
  const [pin, setPin] = useState<string>("");
  const [confirmPin, setConfirmPin] = useState<string>("");
  const [showPinText, setShowPinText] = useState<boolean>(false);
  const [setupStep, setSetupStep] = useState<"set_pin" | "confirm_pin" | "complete">("set_pin");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [savedPin, setSavedPin] = useState<string | null>(() => {
    return localStorage.getItem("beu_verify_security_pin");
  });

  useEffect(() => {
    if (isOpen) {
      setPin("");
      setConfirmPin("");
      setErrorMsg(null);
      setSuccessMsg(null);
      setSetupStep("set_pin");
    }
  }, [isOpen, mode]);

  // Handle PIN digit press
  const handlePinPress = (digit: string) => {
    setErrorMsg(null);
    if (mode === "unlock") {
      if (pin.length < 4) {
        const nextPin = pin + digit;
        setPin(nextPin);
        if (nextPin.length === 4) {
          validateUnlockPin(nextPin);
        }
      }
    } else {
      // Setup Mode
      if (setupStep === "set_pin") {
        if (pin.length < 4) {
          const nextPin = pin + digit;
          setPin(nextPin);
          if (nextPin.length === 4) {
            setTimeout(() => {
              setSetupStep("confirm_pin");
            }, 200);
          }
        }
      } else if (setupStep === "confirm_pin") {
        if (confirmPin.length < 4) {
          const nextConfirm = confirmPin + digit;
          setConfirmPin(nextConfirm);
          if (nextConfirm.length === 4) {
            validateSetupPin(pin, nextConfirm);
          }
        }
      }
    }
  };

  const handleBackspace = () => {
    setErrorMsg(null);
    if (mode === "unlock" || setupStep === "set_pin") {
      setPin(prev => prev.slice(0, -1));
    } else if (setupStep === "confirm_pin") {
      setConfirmPin(prev => prev.slice(0, -1));
    }
  };

  const validateUnlockPin = (inputPin: string) => {
    const currentPin = savedPin || localStorage.getItem("beu_verify_security_pin") || "1234";
    if (inputPin === currentPin) {
      setSuccessMsg("PIN Match! Unlocking...");
      setTimeout(() => {
        onSuccess();
      }, 350);
    } else {
      setErrorMsg("Incorrect PIN. Please try again.");
      setPin("");
    }
  };

  const validateSetupPin = (originalPin: string, verificationPin: string) => {
    if (originalPin === verificationPin) {
      localStorage.setItem("beu_verify_security_pin", originalPin);
      localStorage.setItem("beu_verify_security_pin_enabled", "true");
      setSavedPin(originalPin);
      setSuccessMsg("Security PIN created successfully!");
      setSetupStep("complete");
      setTimeout(() => {
        onSuccess();
      }, 700);
    } else {
      setErrorMsg("PINs do not match. Please re-enter your PIN.");
      setPin("");
      setConfirmPin("");
      setSetupStep("set_pin");
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="w-full max-w-sm bg-[#0e0e12] border border-zinc-800/90 rounded-3xl p-6 shadow-2xl relative overflow-hidden text-zinc-100 flex flex-col items-center text-center"
        >
          {/* Subtle Accent Glow */}
          <div className="absolute -top-20 -left-20 w-48 h-48 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -right-20 w-48 h-48 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />

          {/* Cancel Button */}
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="absolute top-4 right-4 text-xs font-semibold text-zinc-400 hover:text-zinc-200 bg-zinc-800/50 px-3 py-1 rounded-full transition-colors cursor-pointer"
            >
              Cancel
            </button>
          )}

          {/* Mode Header */}
          <div className="flex flex-col items-center space-y-2 mt-2">
            <div className="w-14 h-14 bg-amber-400/10 border border-amber-400/30 rounded-2xl flex items-center justify-center text-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.15)]">
              {mode === "unlock" ? <KeyRound size={28} /> : <ShieldCheck size={30} />}
            </div>
            <h2 className="text-xl font-black text-white font-display tracking-tight">
              {mode === "unlock" ? (
                <>Unlock Beu<span className="text-amber-400">Verify</span></>
              ) : (
                "Set Security PIN"
              )}
            </h2>
            <p className="text-xs text-zinc-400">
              {mode === "unlock" ? (
                <>Enter 4-Digit Security PIN for <span className="text-zinc-200 font-semibold">{userName}</span></>
              ) : (
                setupStep === "set_pin" ? "Create a new 4-digit passcode for offline unlock" :
                setupStep === "confirm_pin" ? "Re-enter your 4-digit passcode to confirm" : "Security PIN configured!"
              )}
            </p>
          </div>

          {/* Errors & Success Banners */}
          {errorMsg && (
            <div className="w-full bg-red-500/10 border border-red-500/30 text-red-400 px-3 py-2 rounded-xl text-xs flex items-center justify-center gap-2 mt-3 font-medium">
              <AlertCircle size={14} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="w-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-3 py-2 rounded-xl text-xs flex items-center justify-center gap-2 mt-3 font-medium">
              <Check size={14} className="shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* PIN Pad Content */}
          <div className="w-full mt-6 flex flex-col items-center">
            {mode === "unlock" && !(savedPin || localStorage.getItem("beu_verify_security_pin")) && (
              <p className="text-[11px] text-zinc-500 mb-4 font-mono">
                Default PIN: <span className="text-amber-400 font-bold">1234</span>
              </p>
            )}

            {/* PIN Display Boxes */}
            <div className="flex items-center justify-center gap-2 mb-6">
              <div className="flex gap-2.5">
                {[0, 1, 2, 3].map(idx => {
                  const activeVal = mode === "unlock"
                    ? pin
                    : setupStep === "set_pin" ? pin : confirmPin;

                  return (
                    <div
                      key={idx}
                      className={`w-10 h-12 rounded-xl border-2 flex items-center justify-center font-mono font-black text-xl transition-all ${
                        activeVal.length > idx
                          ? "border-amber-400 bg-amber-400/10 text-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.3)] scale-105"
                          : "border-zinc-800 bg-zinc-900/90 text-zinc-600"
                      }`}
                    >
                      {activeVal.length > idx ? (showPinText ? activeVal[idx] : "●") : ""}
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setShowPinText(!showPinText)}
                className="p-2.5 text-zinc-400 hover:text-amber-400 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl transition-all cursor-pointer shadow-sm active:scale-90 ml-1"
                title={showPinText ? "Hide PIN" : "Show PIN"}
              >
                {showPinText ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Numeric Numpad */}
            <div className="grid grid-cols-3 gap-3 w-full max-w-[240px]">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map(num => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handlePinPress(num)}
                  className="h-12 bg-[#16161c] hover:bg-zinc-800 active:bg-amber-400 active:text-black border border-zinc-800/80 rounded-2xl font-bold text-lg text-white transition-all cursor-pointer select-none"
                >
                  {num}
                </button>
              ))}
              <div />
              <button
                type="button"
                onClick={() => handlePinPress("0")}
                className="h-12 bg-[#16161c] hover:bg-zinc-800 active:bg-amber-400 active:text-black border border-zinc-800/80 rounded-2xl font-bold text-lg text-white transition-all cursor-pointer select-none"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                className="h-12 bg-[#16161c] hover:bg-zinc-800 active:bg-red-500/20 border border-zinc-800/80 rounded-2xl font-semibold text-xs text-zinc-400 hover:text-white transition-all cursor-pointer select-none flex items-center justify-center"
              >
                ⌫
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
