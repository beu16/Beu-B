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
}

const SUPPORTED_BANKS = [
  { id: "universal", name: "Universal Smart Router (Auto Detect)", placeholder: "CBE Receipt URL, SMS text, or Reference Code" },
  { id: "cbe", name: "Commercial Bank of Ethiopia (CBE)", placeholder: "Receipt Number, Receipt Link or Reference" },
  { id: "boa", name: "Bank of Abyssinia (BOA)", placeholder: "Reference Number or Transaction ID" },
  { id: "telebirr", name: "Telebirr (Ethio Telecom)", placeholder: "10-character alphanumeric Transaction Number" },
  { id: "mpesa", name: "M-Pesa (Safaricom)", placeholder: "Transaction/Reference Number (or SMS text)" },
  { id: "dashen", name: "Dashen Bank", placeholder: "Reference Number" },
  { id: "cbebirr", name: "CBE Birr", placeholder: "Receipt Number or Reference" },
  { id: "awash", name: "Awash Bank", placeholder: "Reference Number or Receipt Link" },
  { id: "siinqee", name: "Siinqee Bank", placeholder: "Reference Number or Receipt Link" }
];

export default function ManualForm({ onVerify, isLoading, prefilledReference = "", themeConfig, t }: ManualFormProps) {
  const [bank, setBank] = useState("universal");
  const [reference, setReference] = useState(prefilledReference);
  const [suffix, setSuffix] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

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
      // Clipboard read fallback if denied
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};

    if (!reference.trim()) {
      newErrors.reference = t.errorRefRequired;
    }

    if (bank === "boa" && suffix.trim() && suffix.trim().length !== 5) {
      newErrors.suffix = t.errorBOASuffix;
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
    onVerify({
      bank,
      reference: reference.trim(),
      suffix: suffix.trim() || undefined,
      phoneNumber: phoneNumber.trim() || undefined
    });
  };

  const selectedBankInfo = SUPPORTED_BANKS.find(b => b.id === bank);

  return (
    <form id="manual-verify-form" onSubmit={handleSubmit} className="w-full bg-[#111114] border border-amber-400/30 rounded-2xl p-4 shadow-xl flex flex-col gap-3.5 text-left">
      <div className="border-b border-zinc-800/80 pb-2.5 flex items-center justify-between">
        <h3 className="font-extrabold text-xs tracking-wider uppercase flex items-center gap-1.5 font-display text-white">
          <Zap size={14} className="text-[#FFD700] fill-[#FFD700]" />
          <span>Manual Entry Verification</span>
        </h3>
        <span className="bg-amber-400/10 border border-amber-400/30 text-amber-300 px-2 py-0.5 rounded text-[9px] font-mono font-bold">
          LIVE NODE
        </span>
      </div>

      {/* Select Bank / Wallet */}
      <div className="flex flex-col gap-1">
        <label htmlFor="bank-select" className="text-zinc-400 text-[10px] font-extrabold tracking-wider uppercase">
          {t.bankSelectLabel}
        </label>
        <select
          id="bank-select"
          value={bank}
          onChange={(e) => {
            setBank(e.target.value);
            setErrors({});
          }}
          className="w-full px-3 py-2 bg-[#18181C] border border-zinc-800 focus:border-amber-400/80 rounded-xl text-xs font-semibold text-zinc-100 outline-none transition-all cursor-pointer"
        >
          {SUPPORTED_BANKS.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      {/* Reference Input with Paste Button */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <label htmlFor="reference-input" className="text-zinc-400 text-[10px] font-extrabold tracking-wider uppercase">
            {t.refInputLabel}
          </label>
          <button
            type="button"
            onClick={handlePasteClipboard}
            className="flex items-center gap-1 text-[10px] text-amber-400 font-bold hover:text-amber-300 transition-colors"
          >
            <Clipboard size={11} />
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
          placeholder={selectedBankInfo?.placeholder}
          rows={2}
          className="w-full px-3 py-2 bg-[#18181C] border border-zinc-800 focus:border-amber-400/80 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 outline-none transition-all font-mono resize-none"
        />
        {errors.reference && (
          <span id="reference-error" className="text-rose-400 text-[10px] font-semibold">{errors.reference}</span>
        )}
      </div>

      {/* Disambiguators (Suffix and Phone) based on bank selection */}
      {(bank === "boa" || bank === "cbe" || bank === "universal") && (
        <div className="flex flex-col gap-1.5 p-2.5 bg-[#18181C] border border-zinc-800/80 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-zinc-300 text-[10px] font-extrabold uppercase tracking-wider">
              <EyeOff size={11} className="text-amber-400" />
              <span>{t.accountSuffixLabel}</span>
            </div>
            <span className="text-[8px] px-1.5 py-0.2 rounded font-mono uppercase font-bold bg-zinc-800 text-zinc-400">
              {bank === "boa" ? "5 Digits" : bank === "cbe" ? "8 Digits" : "Optional"}
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
            maxLength={bank === "boa" ? 5 : bank === "cbe" ? 8 : 12}
            placeholder={bank === "boa" ? "e.g., 54321" : bank === "cbe" ? "e.g., 10002345" : "e.g., 5-8 digits"}
            className="w-full px-2.5 py-1.5 bg-[#111114] border border-zinc-800 focus:border-amber-400/80 rounded-lg text-xs text-zinc-100 placeholder-zinc-600 outline-none transition-all font-mono"
          />
          {errors.suffix && (
            <span id="suffix-error" className="text-rose-400 text-[10px] font-semibold">{errors.suffix}</span>
          )}
        </div>
      )}

      {/* CBE Birr needs Phone Number */}
      {(bank === "cbebirr" || bank === "universal") && (
        <div className="flex flex-col gap-1.5 p-2.5 bg-[#18181C] border border-zinc-800/80 rounded-xl">
          <div className="flex items-center gap-1 text-zinc-300 text-[10px] font-extrabold uppercase tracking-wider">
            <Smartphone size={11} className="text-amber-400" />
            <span>{t.phoneLabel} {bank === "cbebirr" ? t.phoneRequired : t.phoneOptional}</span>
          </div>
          <input
            type="tel"
            id="phone-input"
            value={phoneNumber}
            onChange={(e) => {
              setPhoneNumber(e.target.value);
              if (errors.phoneNumber) setErrors(prev => ({ ...prev, phoneNumber: "" }));
            }}
            placeholder={t.phonePlaceholder || "e.g., 0912345678"}
            className="w-full px-2.5 py-1.5 bg-[#111114] border border-zinc-800 focus:border-amber-400/80 rounded-lg text-xs text-zinc-100 placeholder-zinc-600 outline-none transition-all font-mono"
          />
          {errors.phoneNumber && (
            <span id="phone-error" className="text-rose-400 text-[10px] font-semibold">{errors.phoneNumber}</span>
          )}
        </div>
      )}

      {/* Submit button */}
      <button
        type="submit"
        disabled={isLoading}
        id="verify-submit-btn"
        className="w-full py-2.5 px-3 bg-[#FFD700] hover:bg-amber-300 text-black font-extrabold text-xs rounded-xl shadow-[0_0_15px_rgba(255,215,0,0.3)] transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-[0.98] disabled:opacity-50"
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
            <span>Verify Reference Now</span>
          </>
        )}
      </button>
    </form>
  );
}
