import { BaseReceiptProvider } from "./BaseReceiptProvider.js";
import { CBEProvider } from "./CBEProvider.js";
import { TelebirrProvider } from "./TelebirrProvider.js";
import { BOAProvider } from "./BOAProvider.js";
import { DashenProvider } from "./DashenProvider.js";
import { AwashProvider } from "./AwashProvider.js";
import { CoopProvider } from "./CoopProvider.js";
import {
  NormalizedReceiptData,
  ProviderOptions,
  VerificationResult
} from "./types.js";

export class ReceiptProviderRegistry {
  private providers: BaseReceiptProvider[] = [];

  constructor() {
    this.registerProvider(new CBEProvider());
    this.registerProvider(new TelebirrProvider());
    this.registerProvider(new BOAProvider());
    this.registerProvider(new DashenProvider());
    this.registerProvider(new AwashProvider());
    this.registerProvider(new CoopProvider());
  }

  public registerProvider(provider: BaseReceiptProvider) {
    this.providers.push(provider);
  }

  public getProviders(): BaseReceiptProvider[] {
    return this.providers;
  }

  /**
   * Finds the best matching bank receipt provider based on input string or explicit bank choice.
   */
  public selectProvider(input: string, bankCode?: string, options?: ProviderOptions): BaseReceiptProvider | null {
    if (!input && !bankCode) return null;

    const cleanBank = (bankCode || "").trim().toLowerCase();

    // 1. If explicit bank choice provided
    if (cleanBank && cleanBank !== "universal" && cleanBank !== "auto") {
      const match = this.providers.find(
        p =>
          p.bankCode.toLowerCase() === cleanBank ||
          p.bankName.toLowerCase().includes(cleanBank)
      );
      if (match) return match;
    }

    // 2. Auto-detect based on input string (URL pattern, reference prefix, or SMS contents)
    const matchedProvider = this.providers.find(p => p.canHandle(input, options));
    if (matchedProvider) {
      return matchedProvider;
    }

    // 3. Fallback heuristic matching
    const cleanInput = input.trim().toLowerCase();
    if (cleanInput.startsWith("ft") || cleanInput.includes("cbe")) {
      return this.providers.find(p => p.bankCode === "CBE") || null;
    }
    if (cleanInput.length === 10 && /^\d+$/.test(cleanInput) || cleanInput.includes("telebirr")) {
      return this.providers.find(p => p.bankCode === "Telebirr") || null;
    }
    if (cleanInput.startsWith("boa") || cleanInput.startsWith("at") || cleanInput.includes("abyssinia")) {
      return this.providers.find(p => p.bankCode === "BOA") || null;
    }
    if (cleanInput.startsWith("ds") || cleanInput.includes("dashen")) {
      return this.providers.find(p => p.bankCode === "Dashen") || null;
    }
    if (cleanInput.startsWith("aw") || cleanInput.includes("awash")) {
      return this.providers.find(p => p.bankCode === "Awash") || null;
    }

    // Default to CBE if FT format or Telebirr if numeric
    if (/^\d+$/.test(cleanInput)) {
      return this.providers.find(p => p.bankCode === "Telebirr") || null;
    }

    return this.providers.find(p => p.bankCode === "CBE") || null;
  }

  /**
   * Main verification entry point.
   */
  public async verifyReceipt(
    input: string,
    bankCode?: string,
    options: ProviderOptions = {}
  ): Promise<VerificationResult> {
    const cleanInput = (input || "").trim();

    if (!cleanInput) {
      return {
        status: "Invalid Receipt",
        success: false,
        message: "No receipt URL, QR code, or transaction reference provided."
      };
    }

    // 1. Check for Sandbox / Demo simulation references
    const lowerInput = cleanInput.toLowerCase();
    if (
      lowerInput.startsWith("demo_") ||
      lowerInput.startsWith("test_") ||
      lowerInput.startsWith("sandbox_") ||
      lowerInput === "rft9210984"
    ) {
      const demoBank = bankCode && bankCode !== "universal" ? bankCode.toUpperCase() : "CBE";
      const demoAmount = lowerInput.includes("99") ? "99.00" : lowerInput.includes("1200") ? "1200.00" : "1500.00";
      const demoRef = cleanInput.toUpperCase();

      const demoData: NormalizedReceiptData = {
        verified: true,
        bank: demoBank,
        transaction_id: demoRef,
        payer: "Abebe Bikila (Demo)",
        receiver: options.expectedReceiver || "Beu Verify Merchant",
        amount: demoAmount,
        currency: "ETB",
        date: new Date().toISOString(),
        reference: demoRef,
        receipt_url: `https://mbreciept.cbe.com.et/receipt/${demoRef}`,
        raw_details: { mode: "sandbox_demo" }
      };

      return {
        status: "Verified",
        success: true,
        message: `Transaction Verified Successfully! (Sandbox/Demo Match for ${demoBank})`,
        data: demoData
      };
    }

    // 2. Select matching provider
    const provider = this.selectProvider(cleanInput, bankCode, options);

    if (!provider) {
      return {
        status: "Unsupported Bank",
        success: false,
        message: `Unsupported Bank or unrecognized receipt format for input: "${cleanInput}". Supported banks: CBE, Telebirr, BOA, Dashen, Awash, COOP.`
      };
    }

    // 3. Execute verification on selected provider
    console.log(`[ProviderRegistry] Routing verification to ${provider.bankName} (${provider.bankCode}) for input: "${cleanInput}"`);
    const result = await provider.verify(cleanInput, options);

    // 4. If initial provider returned "Receipt Not Found" or "Invalid Receipt" and bank was auto/universal, attempt secondary fallback providers
    if (
      !result.success &&
      (!bankCode || bankCode === "universal" || bankCode === "auto") &&
      result.status !== "Receipt Mismatch"
    ) {
      const fallbackProviders = this.providers.filter(p => p.bankCode !== provider.bankCode);
      for (const fallbackProvider of fallbackProviders) {
        if (fallbackProvider.canHandle(cleanInput, options)) {
          console.log(`[ProviderRegistry] Retrying fallback provider ${fallbackProvider.bankName}...`);
          const fallbackResult = await fallbackProvider.verify(cleanInput, options);
          if (fallbackResult.success) {
            return fallbackResult;
          }
        }
      }
    }

    return result;
  }
}

export const registry = new ReceiptProviderRegistry();
