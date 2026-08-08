import React, { useState } from "react";
import { Search, Info, Smartphone, EyeOff, Clipboard, Zap } from "lucide-react";
import { ThemeConfig } from "../themes";

interface ManualFormProps {
  onVerify: (data: {
    bank: string;
    reference: string;
    suffix?: string;
    phoneNumber?: string;
  }) => void;
  isLoading: boolean;
  prefilledReference?: string;
  themeConfig: ThemeConfig;
  t: any;
  onSwitchToScan?: () => void;
}

const SUPPORTED_BANKS = [
  { id: "universal", name: "Universal Smart Router (Auto Detect)", placeholder: "CBE Receipt URL, SMS text, or Reference Code" },
  { id: "cbe", name: "Commercial Bank of Ethiopia (CBE)", placeholder: "Receipt Number, Receipt Link or Reference" },
  { id: "telebirr", name: "Telebirr (Ethio Telecom)", placeholder: "10-character alphanumeric Transaction Number" },
  { id: "boa", name: "Bank of Abyssinia (BOA)", placeholder: "Reference Number or Transaction ID" },
  { id: "dashen", name: "Dashen Bank (Amole)", placeholder: "Reference Number" },
  { id: "awash", name: "Awash Bank", placeholder: "Reference Number or Receipt Link" },
  { id: "coop", name: "Cooperative Bank of Oromia (Coop)", placeholder: "Coop Digital Slip / Reference Number" },
  { id: "cbebirr", name: "CBE Birr", placeholder: "Receipt Number or Reference" },
  { id: "mpesa", name: "M-Pesa (Safaricom)", placeholder: "Transaction/Reference Number (or SMS text)" },
  { id: "siinqee", name: "Siinqee Bank", placeholder: "Reference Number or Receipt Link" }
];

export default function ManualForm({ onVerify, isLoading, prefilledReference = "", themeConfig, t, onSwitchToScan }: ManualFormProps) {
  const [bank, setBank] = useState("universal");
  const [reference, setReference] = useState(prefilledReference);
  const [suffix, setSuffix] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const isLight = themeConfig?.mode === "light";

  // Sync prefilled reference from QR scan
  React.useEffect(() => {
    if (prefilledReference) {
      setReference(prefilledReference);
    }
  }, [prefilledReference]);

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setReference(text);
        if (errors.reference) setErrors(prev => ({ ...prev, reference: "" }));
      }
    } catch (e) {
      // Fallback prompt if clipboard permissions restricted in iframe
      const manualPaste = prompt("Paste your receipt link or SMS text here:");
      if (manualPaste) {
        setReference(manualPaste);
        if (errors.reference) setErrors(prev => ({ ...prev, reference: "" }));
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};

    if (bank === "boa") {
      if (!reference.trim()) {
        newErrors.reference = t.errorRefRequired;
      } else if (!reference.trim().toUpperCase().startsWith("FT")) {
        newErrors.reference = "BOA reference number must start with FT (e.g. FT12345678)";
      }
      if (!suffix.trim()) {
        newErrors.suffix = "Sender account number is required";
      } else if (suffix.trim().length < 5) {
        newErrors.suffix = "Account number must be at least 5 digits";
      }
    }

    if (bank === "cbe" && suffix.trim() && suffix.trim().length !== 8) {
      newErrors.suffix = t.errorCBESuffix;
    }

    if (bank === "cbebirr" && phoneNumber.trim()) {
      const normalized = phoneNumber.trim().replace(/\D/g, "");
      if (normalized.length < 9) {
        newErrors.phoneNumber = t.errorPhoneInvalid;
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    const processedSuffix = bank === "boa" && suffix.trim() 
      ? suffix.trim().slice(-5) 
      : suffix.trim() || undefined;

    onVerify({
      bank,
      reference: reference.trim(),
      suffix: processedSuffix,
      phoneNumber: phoneNumber.trim() || undefined
    });
  };

  const selectedBankInfo = SUPPORTED_BANKS.find(b => b.id === bank);

  return (
    <form 
      id="manual-verify-form" 
      onSubmit={handleSubmit} 
      className={`w-full border rounded-2xl p-4 shadow-xl flex flex-col gap-3.5 text-left transition-all ${
        isLight 
          ? "bg-white border-slate-200 text-slate-900 shadow-sm" 
          : "bg-[#111114] border-amber-400/30 text-white"
      }`}
    >
      <div className={`border-b pb-2.5 flex items-center justify-between ${isLight ? "border-slate-100" : "border-zinc-800/80"}`}>
        <h3 className={`font-extrabold text-xs tracking-wider uppercase flex items-center gap-1.5 font-display ${isLight ? "text-slate-900" : "text-white"}`}>
          <Zap size={15} className="text-[#FFD700] fill-[#FFD700]" />
          <span>MANUAL ENTRY VERIFICATION</span>
        </h3>
        <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border ${
          isLight ? "bg-amber-100 border-amber-300 text-amber-800" : "bg-amber-400/10 border-amber-400/30 text-amber-300"
        }`}>
          LIVE NODE
        </span>
      </div>

      {/* Select Bank / Wallet */}
      <div className="flex flex-col gap-1">
        <label htmlFor="bank-select" className={`text-[10px] font-extrabold tracking-wider uppercase ${isLight ? "text-slate-600" : "text-zinc-400"}`}>
          {t.bankSelectLabel || "ባንክ / የሂሳብ ፎርም ይምረጡ"}
        </label>
        <select
          id="bank-select"
          value={bank}
          onChange={(e) => {
            const selected = e.target.value;
            setBank(selected);
            setErrors({});
            if (selected === "cbe" && onSwitchToScan) {
              // Trigger QR code scanner directly when CBE is selected
              onSwitchToScan();
            }
          }}
          className={`w-full px-3 py-2 border rounded-xl text-xs font-semibold outline-none transition-all cursor-pointer ${
            isLight
              ? "bg-slate-50 border-slate-300 text-slate-900 focus:border-amber-500 focus:bg-white"
              : "bg-[#18181C] border-zinc-800 text-zinc-100 focus:border-amber-400/80"
          }`}
        >
          {SUPPORTED_BANKS.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      {/* Prominent CBE QR Scan Quick Switch Callout */}
      {(bank === "cbe" || bank === "universal") && onSwitchToScan && (
        <div className={`p-3 rounded-xl border flex items-center justify-between gap-2.5 transition-all ${
          isLight ? "bg-amber-50 border-amber-300 text-amber-900" : "bg-amber-400/10 border-amber-400/40 text-amber-300"
        }`}>
          <div className="space-y-0.5">
            <p className="text-[11px] font-extrabold uppercase flex items-center gap-1 font-display">
              <Zap size={13} className="fill-amber-400 text-amber-400" />
              <span>CBE Receipt QR Scanner</span>
            </p>
            <p className="text-[10px] text-zinc-400 font-normal">
              Scan CBE printed or digital receipt QR codes instantly with your camera.
            </p>
          </div>
          <button
            type="button"
            onClick={onSwitchToScan}
            className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-[11px] rounded-lg shadow-sm shrink-0 uppercase tracking-wider cursor-pointer"
          >
            Scan QR Now
          </button>
        </div>
      )}

      {/* Reference Input with Paste Button */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <label htmlFor="reference-input" className={`text-[10px] font-extrabold tracking-wider uppercase ${isLight ? "text-slate-600" : "text-zinc-400"}`}>
            {t.refInputLabel || "ማመሳከሪያ ቁጥር ወይም ደረሰኝ ሊንክ"}
          </label>
          <button
            type="button"
            onClick={handlePasteClipboard}
            className={`flex items-center gap-1 text-[10px] font-bold transition-colors ${
              isLight ? "text-amber-600 hover:text-amber-700" : "text-amber-400 hover:text-amber-300"
            }`}
          >
            <Clipboard size={12} />
            <span>Paste</span>
          </button>
        </div>
        <textarea
          id="reference-input"
          value={reference}
          onChange={(e) => {
            setReference(e.target.value);
            if (errors.reference) setErrors(prev => ({ ...prev, reference: "" }));
          }}
          placeholder={selectedBankInfo?.placeholder || "CBE Receipt URL, SMS text, or Reference Code"}
          rows={2}
          className={`w-full px-3 py-2 border rounded-xl text-xs outline-none transition-all font-mono resize-none ${
            isLight
              ? "bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:bg-white"
              : "bg-[#18181C] border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:border-amber-400/80"
          }`}
        />
        {errors.reference && (
          <span id="reference-error" className="text-rose-500 text-[10px] font-semibold">{errors.reference}</span>
        )}
      </div>

      {/* Disambiguators (Suffix and Phone) based on bank selection */}
      {(bank === "boa" || bank === "cbe" || bank === "universal") && (
        <div className={`flex flex-col gap-1.5 p-3 border rounded-xl ${
          isLight ? "bg-slate-50 border-slate-200" : "bg-[#18181C] border-zinc-800/80"
        }`}>
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider ${
              isLight ? "text-slate-700" : "text-zinc-300"
            }`}>
              <EyeOff size={12} className="text-amber-500" />
              <span>{bank === "boa" ? "Sender Full Account Number" : (t.accountSuffixLabel || "የሂሳብ ማጠቃለያ ቁጥር (አማራጭ)")}</span>
            </div>
            <span className={`text-[8px] px-1.5 py-0.5 rounded font-mono uppercase font-bold border ${
              isLight ? "bg-amber-100 border-amber-300 text-amber-800" : "bg-zinc-800 border-zinc-700 text-amber-300"
            }`}>
              {bank === "boa" ? "Auto-extract Last 5 Digits" : bank === "cbe" ? "8 Digits" : "OPTIONAL"}
            </span>
          </div>
          <input
            type="text"
            id="suffix-input"
            value={suffix}
            onChange={(e) => {
              setSuffix(e.target.value.replace(/\D/g, ""));
              if (errors.suffix) setErrors(prev => ({ ...prev, suffix: "" }));
            }}
            maxLength={bank === "boa" ? 20 : bank === "cbe" ? 8 : 12}
            placeholder={bank === "boa" ? "e.g. 100012345678 (Full account number)" : (t.accountSuffixPlaceholder || "e.g., 5-8 digits")}
            className={`w-full px-3 py-2 border rounded-lg text-xs outline-none transition-all font-mono ${
              isLight
                ? "bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-amber-500"
                : "bg-[#111114] border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:border-amber-400/80"
            }`}
          />
          {bank === "boa" && suffix.length >= 5 && (
            <p className="text-[9px] text-amber-600 font-mono font-semibold">
              ✓ Using last 5 digits: <span className="underline font-bold">{suffix.slice(-5)}</span>
            </p>
          )}
          {errors.suffix && (
            <span id="suffix-error" className="text-rose-500 text-[10px] font-semibold">{errors.suffix}</span>
          )}
        </div>
      )}

      {/* Phone Number Field */}
      {(bank === "cbebirr" || bank === "universal") && (
        <div className={`flex flex-col gap-1.5 p-3 border rounded-xl ${
          isLight ? "bg-slate-50 border-slate-200" : "bg-[#18181C] border-zinc-800/80"
        }`}>
          <div className={`flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider ${
            isLight ? "text-slate-700" : "text-zinc-300"
          }`}>
            <Smartphone size={12} className="text-amber-500" />
            <span>{t.phoneLabel || "የከፋይ ስልክ ቁጥር (አማራጭ)"}</span>
          </div>
          <input
            type="tel"
            id="phone-input"
            value={phoneNumber}
            onChange={(e) => {
              setPhoneNumber(e.target.value);
              if (errors.phoneNumber) setErrors(prev => ({ ...prev, phoneNumber: "" }));
            }}
            placeholder={t.phonePlaceholder || "ለማብራሪያ: 0912345678 ወይም 251912345678"}
            className={`w-full px-3 py-2 border rounded-lg text-xs outline-none transition-all font-mono ${
              isLight
                ? "bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-amber-500"
                : "bg-[#111114] border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:border-amber-400/80"
            }`}
          />
          {errors.phoneNumber && (
            <span id="phone-error" className="text-rose-500 text-[10px] font-semibold">{errors.phoneNumber}</span>
          )}
        </div>
      )}

      {/* Submit button */}
      <button
        type="submit"
        disabled={isLoading}
        id="verify-submit-btn"
        className="w-full py-3 px-3 bg-[#FFD700] hover:bg-amber-300 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-[0_0_15px_rgba(255,215,0,0.3)] transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-[0.98] disabled:opacity-50"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin h-4 w-4 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>{t.verifyingBtn}</span>
          </>
        ) : (
          <>
            <Zap size={14} className="fill-black" />
            <span>{t.verifyBtn || "Verify Reference Now"}</span>
          </>
        )}
      </button>
    </form>
  );
}
