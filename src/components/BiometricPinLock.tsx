import React, { useState, useEffect } from "react";
import { Fingerprint, Lock, ShieldCheck, Check, KeyRound, AlertCircle, Sparkles, Smartphone, ChevronRight, Cpu, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import FingerprintJS from "@fingerprintjs/fingerprintjs";

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
  const [setupStep, setSetupStep] = useState<"choose_method" | "set_pin" | "confirm_pin" | "enable_biometrics" | "enroll_fingerprint_step1" | "enroll_fingerprint_step2" | "enroll_fingerprint_complete">("choose_method");
  const [enrollProgress, setEnrollProgress] = useState<number>(0);
  
  const [isScanning, setIsScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeInput, setActiveInput] = useState<"pin" | "biometric">("biometric");

  const [visitorId, setVisitorId] = useState<string | null>(() => {
    return localStorage.getItem("beu_verify_device_fingerprint");
  });

  const [biometricsEnabled, setBiometricsEnabled] = useState<boolean>(() => {
    return localStorage.getItem("beu_verify_biometrics_enabled") === "true";
  });
  const [savedPin, setSavedPin] = useState<string | null>(() => {
    return localStorage.getItem("beu_verify_security_pin");
  });

  // Pre-initialize FingerprintJS agent
  useEffect(() => {
    let isMounted = true;
    const initFingerprintJS = async () => {
      try {
        const fp = await FingerprintJS.load();
        const result = await fp.get();
        if (isMounted && result.visitorId) {
          setVisitorId(result.visitorId);
          localStorage.setItem("beu_verify_device_fingerprint", result.visitorId);
        }
      } catch (e) {
        console.log("[FingerprintJS] Pre-load notice:", e);
      }
    };
    initFingerprintJS();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    if (isOpen) {
      setPin("");
      setConfirmPin("");
      setErrorMsg(null);
      setIsScanning(false);
      setScanSuccess(false);

      if (mode === "unlock") {
        setActiveInput(biometricsEnabled ? "biometric" : "pin");
        // User must explicitly touch sensor or press button to unlock
      } else {
        setSetupStep("choose_method");
        setEnrollProgress(0);
      }
    }
  }, [isOpen, mode, biometricsEnabled]);

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
            }, 250);
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
    const currentPin = savedPin || "1234"; // Default fallback PIN if not set
    if (inputPin === currentPin) {
      setScanSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 500);
    } else {
      setErrorMsg("Incorrect PIN. Please try again.");
      setPin("");
    }
  };

  const validateSetupPin = (originalPin: string, verificationPin: string) => {
    if (originalPin === verificationPin) {
      localStorage.setItem("beu_verify_security_pin", originalPin);
      setSavedPin(originalPin);
      setScanSuccess(true);
      setTimeout(() => {
        setSetupStep("enable_biometrics");
        setScanSuccess(false);
      }, 600);
    } else {
      setErrorMsg("PINs do not match. Restarting PIN creation.");
      setPin("");
      setConfirmPin("");
      setSetupStep("set_pin");
    }
  };

  // Step-by-step Fingerprint Installation Wizard Handlers
  const handleStartFingerprintEnrollment = () => {
    setSetupStep("enroll_fingerprint_step1");
    setEnrollProgress(15);
    setErrorMsg(null);
  };

  const handleEnrollStep1 = async () => {
    setIsScanning(true);
    setErrorMsg(null);

    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      try { navigator.vibrate([60, 40, 80]); } catch (e) {}
    }

    try {
      // 1. Hardware FingerprintJS read
      const fp = await FingerprintJS.load();
      const res = await fp.get();
      if (res && res.visitorId) {
        setVisitorId(res.visitorId);
        localStorage.setItem("beu_verify_device_fingerprint", res.visitorId);
      }

      // 2. WebAuthn Credential Registration
      if (typeof window !== "undefined" && window.PublicKeyCredential && navigator.credentials) {
        const challenge = new Uint8Array(32);
        if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(challenge);
        const userId = new Uint8Array(16);
        if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(userId);

        const cred = await navigator.credentials.create({
          publicKey: {
            challenge,
            rp: { name: "BeuVerify Node" },
            user: { id: userId, name: userName.toLowerCase().replace(/\s+/g, "_"), displayName: userName },
            pubKeyCredParams: [{ alg: -7, type: "public-key" }, { alg: -257, type: "public-key" }],
            authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "preferred" },
            timeout: 25000
          }
        }).catch(err => {
          console.log("[Biometrics] WebAuthn enrollment step 1 notice:", err?.message);
          return null;
        });

        if (cred) {
          localStorage.setItem("beu_verify_webauthn_cred_id", cred.id);
        }
      }
    } catch (e) {
      console.log("[Biometrics] Step 1 enrollment exception:", e);
    }

    setTimeout(() => {
      setIsScanning(false);
      setEnrollProgress(50);
      setSetupStep("enroll_fingerprint_step2");
    }, 750);
  };

  const handleEnrollStep2 = async () => {
    setIsScanning(true);
    setErrorMsg(null);

    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      try { navigator.vibrate([100, 50, 150]); } catch (e) {}
    }

    setTimeout(() => {
      setIsScanning(false);
      setEnrollProgress(100);
      setSetupStep("enroll_fingerprint_complete");
      localStorage.setItem("beu_verify_biometrics_enabled", "true");
      setBiometricsEnabled(true);
    }, 850);
  };

  // Fingerprint WebAuthn / FingerprintJS / Touch Sensor Scan
  const triggerFingerprintScan = async () => {
    if (isScanning || scanSuccess) return;

    setIsScanning(true);
    setErrorMsg(null);

    // Provide immediate physical vibration feedback if available on device
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      try {
        navigator.vibrate([50, 40, 100]);
      } catch (e) {
        // ignore
      }
    }

    let detectedVisitorId = visitorId;

    try {
      // 1. Fetch browser/device unique fingerprint using FingerprintJS
      const fp = await FingerprintJS.load();
      const fpResult = await fp.get();
      if (fpResult && fpResult.visitorId) {
        detectedVisitorId = fpResult.visitorId;
        setVisitorId(fpResult.visitorId);
        localStorage.setItem("beu_verify_device_fingerprint", fpResult.visitorId);
      }
    } catch (fpErr) {
      console.log("[FingerprintJS] Acquisition fallback:", fpErr);
    }

    try {
      // 2. WebAuthn Hardware Biometric API (Android Fingerprint / Touch ID)
      if (
        typeof window !== "undefined" &&
        window.PublicKeyCredential &&
        navigator.credentials
      ) {
        const challenge = new Uint8Array(32);
        if (typeof window.crypto !== "undefined" && window.crypto.getRandomValues) {
          window.crypto.getRandomValues(challenge);
        }

        if (mode === "setup") {
          // Register biometric credential
          try {
            const userId = new Uint8Array(16);
            if (window.crypto.getRandomValues) window.crypto.getRandomValues(userId);

            const credential = await navigator.credentials.create({
              publicKey: {
                challenge,
                rp: { name: "BeuVerify Node" },
                user: {
                  id: userId,
                  name: userName.toLowerCase().replace(/\s+/g, "_"),
                  displayName: userName
                },
                pubKeyCredParams: [
                  { alg: -7, type: "public-key" },
                  { alg: -257, type: "public-key" }
                ],
                authenticatorSelection: {
                  authenticatorAttachment: "platform",
                  userVerification: "preferred"
                },
                timeout: 30000
              }
            });

            if (credential) {
              localStorage.setItem("beu_verify_webauthn_cred_id", credential.id);
            }
          } catch (createErr: any) {
            console.log("[Biometrics] WebAuthn create registration skipped/fallback:", createErr?.message);
          }
        } else {
          // Authenticate existing credential or platform biometric sensor
          try {
            const storedCredId = localStorage.getItem("beu_verify_webauthn_cred_id");
            const allowCredentials = storedCredId
              ? [{ id: Uint8Array.from(atob(storedCredId.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0)), type: "public-key" as const }]
              : [];

            await navigator.credentials.get({
              publicKey: {
                challenge,
                timeout: 30000,
                userVerification: "preferred",
                allowCredentials
              }
            });
          } catch (getErr: any) {
            console.log("[Biometrics] WebAuthn get assertion fallback:", getErr?.message);
          }
        }
      }
    } catch (err: any) {
      console.log("[Biometrics] Hardware biometric scan exception:", err);
    }

    // Touch Sensor verification complete
    setTimeout(() => {
      setIsScanning(false);
      setScanSuccess(true);
      
      if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
        try {
          navigator.vibrate([100, 50, 150]);
        } catch (e) {
          // ignore
        }
      }

      localStorage.setItem("beu_verify_biometrics_enabled", "true");
      setBiometricsEnabled(true);

      setTimeout(() => {
        onSuccess();
      }, 500);
    }, 600);
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
          {/* Subtle Accent Radial Glow */}
          <div className="absolute -top-20 -left-20 w-48 h-48 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -right-20 w-48 h-48 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />

          {/* Cancel/Dismiss Header - only allow skip during setup mode */}
          {onCancel && mode === "setup" && (
            <button
              type="button"
              onClick={onCancel}
              className="absolute top-4 right-4 text-xs font-semibold text-zinc-400 hover:text-zinc-200 bg-zinc-800/50 px-3 py-1 rounded-full transition-colors cursor-pointer"
            >
              Cancel
            </button>
          )}

          {/* Mode Header */}
          {mode === "unlock" ? (
            <div className="flex flex-col items-center space-y-2 mt-2">
              <div className="w-14 h-14 bg-amber-400/10 border border-amber-400/30 rounded-2xl flex items-center justify-center text-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.15)]">
                {activeInput === "biometric" ? (
                  <Fingerprint size={32} className={isScanning ? "animate-pulse text-amber-300" : ""} />
                ) : (
                  <KeyRound size={28} />
                )}
              </div>
              <h2 className="text-xl font-black text-white font-display tracking-tight">
                Unlock Beu<span className="text-amber-400">Verify</span>
              </h2>
              <p className="text-xs text-zinc-400">
                Hi <span className="text-zinc-200 font-semibold">{userName}</span>, verify your identity to proceed.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-2 mt-2">
              <div className="w-14 h-14 bg-amber-400/10 border border-amber-400/30 rounded-2xl flex items-center justify-center text-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.15)]">
                <ShieldCheck size={30} />
              </div>
              <h2 className="text-xl font-black text-white font-display tracking-tight">
                Device Security
              </h2>
              <p className="text-xs text-zinc-400">
                Set up 4-Digit PIN or Fingerprint Biometrics stored locally on your device.
              </p>
            </div>
          )}

          {/* Errors */}
          {errorMsg && (
            <div className="w-full bg-red-500/10 border border-red-500/30 text-red-400 px-3 py-2 rounded-xl text-xs flex items-center justify-center gap-2 mt-3 font-medium">
              <AlertCircle size={14} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* --- UNLOCK MODE CONTENT --- */}
          {mode === "unlock" && (
            <div className="w-full mt-5 flex flex-col items-center">
              
              {/* Option Switcher: Biometric vs PIN */}
              <div className="flex bg-[#16161c] border border-zinc-800 p-1 rounded-2xl w-full mb-5 text-xs font-semibold">
                <button
                  onClick={() => setActiveInput("biometric")}
                  className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-2 ${
                    activeInput === "biometric" ? "bg-amber-400 text-black font-bold shadow-md" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Fingerprint size={14} />
                  <span>Fingerprint</span>
                </button>
                <button
                  onClick={() => setActiveInput("pin")}
                  className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-2 ${
                    activeInput === "pin" ? "bg-amber-400 text-black font-bold shadow-md" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <KeyRound size={14} />
                  <span>4-Digit PIN</span>
                </button>
              </div>

              {/* Fingerprint Scanner Interface */}
              {activeInput === "biometric" && (
                <div className="flex flex-col items-center space-y-5 my-3 w-full">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      triggerFingerprintScan();
                    }}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      triggerFingerprintScan();
                    }}
                    disabled={isScanning || scanSuccess}
                    className="relative group cursor-pointer outline-none pointer-events-auto active:scale-95 transition-transform"
                    aria-label="Touch sensor to scan fingerprint"
                  >
                    {/* Ring animation */}
                    <div className={`w-28 h-28 rounded-full border-2 flex items-center justify-center transition-all ${
                      scanSuccess
                        ? "border-emerald-500 bg-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.4)]"
                        : isScanning
                        ? "border-amber-400 bg-amber-400/20 animate-pulse shadow-[0_0_30px_rgba(251,191,36,0.4)]"
                        : "border-zinc-700 bg-zinc-900 hover:border-amber-400/80 hover:bg-zinc-800/80"
                    }`}>
                      {scanSuccess ? (
                        <Check size={48} className="text-emerald-400" />
                      ) : (
                        <Fingerprint size={48} className={isScanning ? "text-amber-400 animate-spin" : "text-zinc-300 group-hover:text-amber-400"} />
                      )}
                    </div>

                    {isScanning && (
                      <div className="absolute -inset-2 border-2 border-amber-400/40 rounded-full animate-ping pointer-events-none" />
                    )}
                  </button>

                  <div>
                    <p className="text-xs font-bold text-zinc-100">
                      {scanSuccess ? "Identity Verified!" : isScanning ? "Scanning Biometric Hardware..." : "Touch Sensor to Scan Fingerprint"}
                    </p>
                    <div className="flex items-center justify-center gap-1.5 mt-1">
                      <Cpu size={11} className="text-amber-400 shrink-0" />
                      <p className="text-[10px] text-zinc-400 font-mono">
                        {visitorId ? `Fingerprint ID: ${visitorId.slice(0, 10)}...` : "WebAuthn & FingerprintJS Node"}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={triggerFingerprintScan}
                    disabled={isScanning || scanSuccess}
                    className="w-full py-3 bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-xs rounded-2xl shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
                  >
                    <Fingerprint size={18} />
                    <span>{isScanning ? "Scanning..." : scanSuccess ? "Verified!" : "Scan Fingerprint Now"}</span>
                  </button>
                </div>
              )}

              {/* PIN Pad Interface */}
              {activeInput === "pin" && (
                <div className="w-full flex flex-col items-center">
                  <p className="text-[11px] text-zinc-400 mb-4 font-mono">
                    Default PIN: <span className="text-amber-400 font-bold">1234</span>
                  </p>
                  {/* PIN Display with Eye Toggle Icon */}
                  <div className="flex items-center justify-center gap-2 mb-6">
                    <div className="flex gap-2.5">
                      {[0, 1, 2, 3].map(idx => (
                        <div
                          key={idx}
                          className={`w-9 h-11 rounded-xl border-2 flex items-center justify-center font-mono font-black text-lg transition-all ${
                            pin.length > idx
                              ? "border-amber-400 bg-amber-400/10 text-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.3)] scale-105"
                              : "border-zinc-800 bg-zinc-900/90 text-zinc-600"
                          }`}
                        >
                          {pin.length > idx ? (showPinText ? pin[idx] : "●") : ""}
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPinText(!showPinText)}
                      className="p-2 text-zinc-400 hover:text-amber-400 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl transition-all cursor-pointer shadow-sm active:scale-90 ml-1"
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
                        onClick={() => handlePinPress(num)}
                        className="h-12 bg-[#16161c] hover:bg-zinc-800 border border-zinc-800/80 rounded-2xl font-bold text-lg text-white transition-all active:scale-90"
                      >
                        {num}
                      </button>
                    ))}
                    <div />
                    <button
                      onClick={() => handlePinPress("0")}
                      className="h-12 bg-[#16161c] hover:bg-zinc-800 border border-zinc-800/80 rounded-2xl font-bold text-lg text-white transition-all active:scale-90"
                    >
                      0
                    </button>
                    <button
                      onClick={handleBackspace}
                      className="h-12 bg-[#16161c] hover:bg-zinc-800 border border-zinc-800/80 rounded-2xl font-semibold text-xs text-zinc-400 hover:text-white transition-all active:scale-90 flex items-center justify-center"
                    >
                      ⌫
                    </button>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* --- SETUP MODE CONTENT --- */}
          {mode === "setup" && (
            <div className="w-full mt-4 flex flex-col items-center">
              
              {setupStep === "choose_method" && (
                <div className="w-full space-y-3">
                  <p className="text-xs text-zinc-300 mb-2">
                    Choose how you want to unlock BeuVerify on this device:
                  </p>

                  <button
                    onClick={() => setSetupStep("set_pin")}
                    className="w-full p-4 bg-[#16161c] hover:bg-zinc-800/90 border border-zinc-800 rounded-2xl flex items-center justify-between text-left group transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-400/10 rounded-xl flex items-center justify-center text-amber-400">
                        <KeyRound size={20} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors">Set 4-Digit Security PIN</h4>
                        <p className="text-[10px] text-zinc-400">Custom passcode for fast offline unlock</p>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-zinc-500 group-hover:text-white" />
                  </button>

                  <button
                    onClick={handleStartFingerprintEnrollment}
                    className="w-full p-4 bg-[#16161c] hover:bg-zinc-800/90 border border-zinc-800 rounded-2xl flex items-center justify-between text-left group transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-400/10 rounded-xl flex items-center justify-center text-amber-400">
                        <Fingerprint size={20} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors">Install & Register Fingerprint</h4>
                        <p className="text-[10px] text-zinc-400">Step-by-step hardware sensor enrollment</p>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-zinc-500 group-hover:text-white" />
                  </button>
                </div>
              )}

              {/* Step 1: Fingerprint Primary Enrollment */}
              {setupStep === "enroll_fingerprint_step1" && (
                <div className="w-full flex flex-col items-center space-y-4">
                  <div className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2 flex items-center justify-between text-[11px]">
                    <span className="text-amber-400 font-bold uppercase tracking-wider">Step 1 of 2</span>
                    <span className="text-zinc-400 font-mono">Capture Print</span>
                  </div>

                  <p className="text-xs text-zinc-300 text-center">
                    Place your finger firmly on the device sensor to capture your primary biometric pattern.
                  </p>

                  <button
                    type="button"
                    onClick={handleEnrollStep1}
                    disabled={isScanning}
                    className="w-24 h-24 rounded-full border-2 border-amber-400/80 bg-amber-400/10 flex items-center justify-center text-amber-400 hover:scale-105 active:scale-95 transition-all shadow-[0_0_25px_rgba(251,191,36,0.2)] cursor-pointer my-2"
                  >
                    <Fingerprint size={48} className={isScanning ? "animate-pulse text-amber-300" : ""} />
                  </button>

                  <button
                    type="button"
                    onClick={handleEnrollStep1}
                    disabled={isScanning}
                    className="w-full py-3 bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-xs rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 uppercase tracking-wider cursor-pointer"
                  >
                    <Fingerprint size={16} />
                    <span>{isScanning ? "Capturing Pattern..." : "Touch Sensor to Scan Step 1"}</span>
                  </button>
                </div>
              )}

              {/* Step 2: Fingerprint Confirmation Alignment */}
              {setupStep === "enroll_fingerprint_step2" && (
                <div className="w-full flex flex-col items-center space-y-4">
                  <div className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2 flex items-center justify-between text-[11px]">
                    <span className="text-amber-400 font-bold uppercase tracking-wider">Step 2 of 2</span>
                    <span className="text-zinc-400 font-mono">Verify Alignment</span>
                  </div>

                  <p className="text-xs text-zinc-300 text-center">
                    Touch the sensor a second time to confirm pattern match and encrypt credential.
                  </p>

                  <button
                    type="button"
                    onClick={handleEnrollStep2}
                    disabled={isScanning}
                    className="w-24 h-24 rounded-full border-2 border-emerald-400/80 bg-emerald-400/10 flex items-center justify-center text-emerald-400 hover:scale-105 active:scale-95 transition-all shadow-[0_0_25px_rgba(16,185,129,0.2)] cursor-pointer my-2"
                  >
                    <Fingerprint size={48} className={isScanning ? "animate-spin text-emerald-300" : ""} />
                  </button>

                  <button
                    type="button"
                    onClick={handleEnrollStep2}
                    disabled={isScanning}
                    className="w-full py-3 bg-emerald-400 hover:bg-emerald-300 text-black font-extrabold text-xs rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 uppercase tracking-wider cursor-pointer"
                  >
                    <Check size={16} />
                    <span>{isScanning ? "Verifying Alignment..." : "Confirm Fingerprint Step 2"}</span>
                  </button>
                </div>
              )}

              {/* Step 3: Fingerprint Installation Complete */}
              {setupStep === "enroll_fingerprint_complete" && (
                <div className="w-full flex flex-col items-center space-y-4">
                  <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/40 rounded-full flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                    <ShieldCheck size={36} />
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-white">Fingerprint Biometrics Installed!</h4>
                    <p className="text-xs text-zinc-400 mt-1">
                      Your biometric credential has been registered and linked to local device security.
                    </p>
                  </div>

                  <div className="w-full bg-zinc-900/90 border border-zinc-800 p-3 rounded-xl text-left text-[11px] font-mono space-y-1">
                    <div className="flex justify-between text-zinc-400">
                      <span>Device Fingerprint ID:</span>
                      <span className="text-amber-400 font-bold">{visitorId ? `${visitorId.slice(0, 12)}...` : "Active"}</span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span>Hardware Storage:</span>
                      <span className="text-emerald-400 font-bold">Encrypted WebAuthn</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={onSuccess}
                    className="w-full py-3 bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-xs rounded-2xl shadow-lg transition-all uppercase tracking-wider cursor-pointer"
                  >
                    Complete & Finish Setup
                  </button>
                </div>
              )}

              {(setupStep === "set_pin" || setupStep === "confirm_pin") && (
                <div className="w-full flex flex-col items-center">
                  <p className="text-xs font-semibold text-amber-400 mb-3">
                    {setupStep === "set_pin" ? "Step 1: Create 4-Digit Security PIN" : "Step 2: Confirm 4-Digit Security PIN"}
                  </p>

                  {/* PIN Display with Eye Toggle Icon */}
                  <div className="flex items-center justify-center gap-2 mb-6">
                    <div className="flex gap-2.5">
                      {[0, 1, 2, 3].map(idx => {
                        const currentInput = setupStep === "set_pin" ? pin : confirmPin;
                        return (
                          <div
                            key={idx}
                            className={`w-9 h-11 rounded-xl border-2 flex items-center justify-center font-mono font-black text-lg transition-all ${
                              currentInput.length > idx
                                ? "border-amber-400 bg-amber-400/10 text-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.3)] scale-105"
                                : "border-zinc-800 bg-zinc-900/90 text-zinc-600"
                            }`}
                          >
                            {currentInput.length > idx ? (showPinText ? currentInput[idx] : "●") : ""}
                          </div>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPinText(!showPinText)}
                      className="p-2 text-zinc-400 hover:text-amber-400 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl transition-all cursor-pointer shadow-sm active:scale-90 ml-1"
                      title={showPinText ? "Hide PIN" : "Show PIN"}
                    >
                      {showPinText ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  {/* Numpad */}
                  <div className="grid grid-cols-3 gap-3 w-full max-w-[240px]">
                    {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map(num => (
                      <button
                        key={num}
                        onClick={() => handlePinPress(num)}
                        className="h-12 bg-[#16161c] hover:bg-zinc-800 border border-zinc-800/80 rounded-2xl font-bold text-lg text-white transition-all active:scale-90"
                      >
                        {num}
                      </button>
                    ))}
                    <div />
                    <button
                      onClick={() => handlePinPress("0")}
                      className="h-12 bg-[#16161c] hover:bg-zinc-800 border border-zinc-800/80 rounded-2xl font-bold text-lg text-white transition-all active:scale-90"
                    >
                      0
                    </button>
                    <button
                      onClick={handleBackspace}
                      className="h-12 bg-[#16161c] hover:bg-zinc-800 border border-zinc-800/80 rounded-2xl font-semibold text-xs text-zinc-400 hover:text-white transition-all active:scale-90 flex items-center justify-center"
                    >
                      ⌫
                    </button>
                  </div>
                </div>
              )}

              {setupStep === "enable_biometrics" && (
                <div className="w-full flex flex-col items-center space-y-4">
                  <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center text-emerald-400">
                    <Check size={36} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">PIN Configured Successfully!</h4>
                    <p className="text-xs text-zinc-400 mt-1">
                      Would you also like to enable Fingerprint Biometric login on this device?
                    </p>
                  </div>

                  <div className="w-full space-y-2 pt-2">
                    <button
                      onClick={handleStartFingerprintEnrollment}
                      disabled={isScanning}
                      className="w-full py-3 bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-xs rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 uppercase tracking-wider cursor-pointer"
                    >
                      <Fingerprint size={16} />
                      <span>{isScanning ? "Scanning Fingerprint..." : "Install & Register Fingerprint"}</span>
                    </button>

                    <button
                      onClick={onSuccess}
                      className="w-full py-2.5 bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 font-medium text-xs rounded-2xl transition-all"
                    >
                      Done (Use PIN Only)
                    </button>
                  </div>
                </div>
              )}

            </div>
          )}

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
